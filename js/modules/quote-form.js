import { siteConfig } from "../config.js";

const FIELD_ORDER = [
  "fullName",
  "email",
  "phone",
  "projectType",
  "projectLocation",
  "budget",
  "description",
];

function digitsOnly(value) {
  return value.replace(/[^\d]/g, "");
}

export function initQuoteForm() {
  const form = document.querySelector("[data-quote-form]");
  if (!form) return;

  const submit = form.querySelector("[data-submit]");
  const submitLabel = form.querySelector("[data-submit-label]");
  const status = form.querySelector("[data-form-status]");
  const errorRegion = form.querySelector("[data-form-error]");
  const notice = form.querySelector("[data-endpoint-notice]");
  const endpoint = (
    siteConfig.quoteEndpoint ||
    form.dataset.endpoint ||
    ""
  ).trim();

  const hasEndpoint = endpoint.length > 0;
  let inFlight = false;

  if (!submit) return;

  if (hasEndpoint) {
    submit.disabled = false;
    if (notice) notice.hidden = true;
  } else {
    submit.disabled = true;
    submit.setAttribute("aria-describedby", "form-setup-note");
    if (notice) notice.hidden = false;
  }

  function fieldWrapper(name) {
    const control = form.elements.namedItem(name);
    if (!control || !control.closest) return null;
    return control.closest(".field");
  }

  function errorEl(name) {
    return form.querySelector(`[data-error-for="${name}"]`);
  }

  function setFieldError(name, message) {
    const wrapper = fieldWrapper(name);
    const el = errorEl(name);
    const control = form.elements.namedItem(name);

    if (el) el.textContent = message;
    if (!control) return;

    if (message) {
      control.setAttribute("aria-invalid", "true");
      wrapper?.classList.add("has-error");
    } else {
      control.removeAttribute("aria-invalid");
      wrapper?.classList.remove("has-error");
    }
  }

  function validateField(name) {
    const control = form.elements.namedItem(name);
    if (!control) return "";

    const value = String(control.value ?? "").trim();
    let message = "";

    switch (name) {
      case "fullName":
        if (!value) message = "Enter your full name.";
        else if (value.length < 2) message = "Enter at least two characters.";
        break;
      case "email":
        if (!value) {
          message = "Enter your email address.";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
          message = "Enter a valid email address, e.g. name@example.com.";
        }
        break;
      case "phone":
        if (value && digitsOnly(value).length < 7) {
          message = "Enter at least 7 digits, or leave this field blank.";
        }
        break;
      case "projectType":
        if (!value) message = "Choose a project type.";
        break;
      case "projectLocation":
        if (!value) message = "Add a project location (city or area).";
        else if (value.length < 2) message = "Enter at least two characters.";
        break;
      case "description":
        if (!value) {
          message = "Describe the project you have in mind.";
        } else if (value.length < 20) {
          message = "Add at least 20 characters so we can understand the request.";
        }
        break;
      default:
        break;
    }

    setFieldError(name, message);
    return message;
  }

  function clearAllErrors() {
    FIELD_ORDER.forEach((name) => setFieldError(name, ""));
    hideErrorRegion();
  }

  function hideErrorRegion() {
    if (!errorRegion) return;
    errorRegion.hidden = true;
    errorRegion.textContent = "";
  }

  function showErrorRegion(message) {
    if (!errorRegion) return;
    errorRegion.textContent = message;
    errorRegion.hidden = false;
  }

  function setLoading(loading) {
    submit.classList.toggle("is-loading", loading);
    form.setAttribute("aria-busy", String(loading));
    if (submitLabel) {
      submitLabel.textContent = loading
        ? "Sending request…"
        : "Submit Request";
    }
    submit.disabled = loading || !hasEndpoint;
  }

  form.addEventListener("input", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const name = target.getAttribute("name");
    if (!name || !FIELD_ORDER.includes(name)) return;

    const wrapper = target.closest(".field");
    if (wrapper?.classList.contains("has-error")) {
      validateField(name);
    }
  });

  form.addEventListener("change", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const name = target.getAttribute("name");
    if (!name || !FIELD_ORDER.includes(name)) return;
    const wrapper = target.closest(".field");
    if (wrapper?.classList.contains("has-error")) {
      validateField(name);
    }
  });

  form.addEventListener(
    "focusout",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const name = target.getAttribute("name");
      if (!name || !FIELD_ORDER.includes(name)) return;

      const wrapper = target.closest(".field");
      const value = String(target.value ?? "").trim();
      if (wrapper?.classList.contains("has-error") || value.length > 0) {
        validateField(name);
      }
    },
    true
  );

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (inFlight) return;

    hideErrorRegion();

    const firstInvalid = FIELD_ORDER.map((name) => ({
      name,
      message: validateField(name),
    })).find((field) => field.message);

    if (firstInvalid) {
      showErrorRegion("Please correct the highlighted fields and try again.");
      if (status) status.textContent = "";
      const control = form.elements.namedItem(firstInvalid.name);
      if (control instanceof HTMLElement) {
        control.focus({ preventScroll: false });
      }
      return;
    }

    if (!hasEndpoint) {
      showErrorRegion(
        "Form delivery is not configured. Add a submission endpoint in js/config.js before accepting requests."
      );
      return;
    }

    inFlight = true;
    setLoading(true);
    if (status) {
      status.classList.remove("is-success");
      status.textContent = "Sending your request…";
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      Number(siteConfig.requestTimeoutMs) || 15000
    );

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.submittedAt = new Date().toISOString();
    payload.page = window.location.href;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const serverErrors = result && result.errors;
        if (serverErrors && typeof serverErrors === "object") {
          Object.entries(serverErrors).forEach(([name, message]) => {
            if (typeof message === "string") setFieldError(name, message);
          });
          const firstName = Object.keys(serverErrors).find((name) =>
            FIELD_ORDER.includes(name)
          );
          const control = firstName ? form.elements.namedItem(firstName) : null;
          if (control instanceof HTMLElement) control.focus();
        }
        const message =
          result && typeof result.message === "string" && result.message
            ? result.message
            : response.status === 429
              ? "Too many requests from this connection. Please try again shortly."
              : "The request was not accepted. Please review your details and try again.";
        showErrorRegion(message);
        if (status) status.textContent = "";
        return;
      }

      const reference =
        result && typeof result.reference === "string" ? result.reference : "";

      if (status) {
        status.classList.add("is-success");
        status.textContent = reference
          ? `Request received. Your reference is ${reference}. We will be in touch about the next step.`
          : "Request received. Thank you — your details have been sent successfully.";
      }
      form.reset();
      clearAllErrors();
    } catch (error) {
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      showErrorRegion(
        timedOut
          ? "The request timed out before it could be confirmed. Please try again."
          : "Your request could not be sent. Check your connection and try again, or call (503) 555-0142."
      );
      if (status) status.textContent = "";
    } finally {
      window.clearTimeout(timeout);
      inFlight = false;
      setLoading(false);
    }
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => clearAllErrors(), 0);
  });
}
