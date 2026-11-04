import { siteConfig } from "../config.js";

const FIELD_ORDER = [
  "fullName",
  "email",
  "phone",
  "position",
  "location",
  "portfolio",
  "cv",
  "coverNote",
  "consent",
];

const MAX_CV_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx"];

function digitsOnly(value) {
  return value.replace(/[^\d]/g, "");
}

function fileExtension(name) {
  return String(name).split(".").pop().toLowerCase();
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initCareersForm() {
  const form = document.querySelector("[data-careers-form]");
  if (!form) return;

  const submit = form.querySelector("[data-submit]");
  const submitLabel = form.querySelector("[data-submit-label]");
  const status = form.querySelector("[data-form-status]");
  const errorRegion = form.querySelector("[data-form-error]");
  const notice = form.querySelector("[data-endpoint-notice]");
  const cvInput = form.querySelector("[data-cv-input]");
  const fileMeta = form.querySelector("[data-file-meta]");
  const endpoint = (
    siteConfig.careersEndpoint ||
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
    submit.setAttribute("aria-describedby", "careers-form-setup-note");
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

  function validateCv() {
    const file = cvInput?.files?.[0];
    if (!cvInput) return "";
    if (!file) return "Attach your CV to continue.";
    if (!ALLOWED_EXTENSIONS.includes(fileExtension(file.name))) {
      return "Upload a PDF, DOC, or DOCX file.";
    }
    if (file.size > MAX_CV_BYTES) {
      return `Your file is ${formatBytes(file.size)}. The maximum size is 5 MB.`;
    }
    return "";
  }

  function validateField(name) {
    const control = form.elements.namedItem(name);
    if (!control) return "";

    if (name === "consent") {
      const message = control.checked
        ? ""
        : "Confirm that your information is accurate to continue.";
      setFieldError(name, message);
      return message;
    }

    if (name === "cv") {
      const message = validateCv();
      setFieldError(name, message);
      return message;
    }

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
      case "position":
        if (!value) message = "Choose the role you are applying for.";
        break;
      case "location":
        if (value && value.length < 2) message = "Enter at least two characters.";
        break;
      case "portfolio":
        if (value) {
          try {
            const url = new URL(value);
            if (!["http:", "https:"].includes(url.protocol)) {
              message = "Use a link beginning with http:// or https://.";
            }
          } catch {
            message = "Enter a full link, including https://.";
          }
        }
        break;
      case "coverNote":
        if (value.length > 1200) {
          message = "Keep your cover note under 1,200 characters.";
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

  function updateFileMeta() {
    if (!fileMeta) return;
    const file = cvInput?.files?.[0];
    if (!file) {
      fileMeta.textContent = "No file selected.";
      return;
    }
    fileMeta.textContent = `${file.name} · ${formatBytes(file.size)}`;
  }

  function setLoading(loading) {
    submit.classList.toggle("is-loading", loading);
    form.setAttribute("aria-busy", String(loading));
    if (submitLabel) {
      submitLabel.textContent = loading
        ? "Sending application…"
        : "Submit Application";
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

    if (target === cvInput) {
      updateFileMeta();
    }

    if (!name || !FIELD_ORDER.includes(name)) return;
    const wrapper = target.closest(".field");
    if (wrapper?.classList.contains("has-error") || name === "cv") {
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
      if (name === "consent" || name === "cv") return;

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
        "Application delivery is not configured. Add a submission endpoint in js/config.js before accepting applications."
      );
      return;
    }

    inFlight = true;
    setLoading(true);
    if (status) {
      status.classList.remove("is-success");
      status.textContent = "Sending your application…";
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(
      () => controller.abort(),
      Number(siteConfig.requestTimeoutMs) || 20000
    );

    const formData = new FormData(form);
    formData.append("submittedAt", new Date().toISOString());
    formData.append("page", window.location.href);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json" },
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      if (status) {
        status.classList.add("is-success");
        status.textContent =
          "Application received. Thank you — your CV has been sent successfully. We will be in touch if there is a fit.";
      }
      form.reset();
      updateFileMeta();
      clearAllErrors();
    } catch (error) {
      const timedOut =
        error instanceof DOMException && error.name === "AbortError";
      showErrorRegion(
        timedOut
          ? "The application timed out before it could be confirmed. Please try again."
          : "Your application could not be sent. Please try again, or email careers@northformbuild.com directly."
      );
      if (status) status.textContent = "";
    } finally {
      window.clearTimeout(timeout);
      inFlight = false;
      setLoading(false);
    }
  });

  form.addEventListener("reset", () => {
    window.setTimeout(() => {
      clearAllErrors();
      updateFileMeta();
    }, 0);
  });

  // Prefill the role from "Apply for this role" links and ?role= URLs.
  const position = form.elements.namedItem("position");
  if (position instanceof HTMLSelectElement) {
    const options = Array.from(position.options);
    const setRole = (value) => {
      if (!value) return;
      const match = options.find(
        (option) =>
          option.value.toLowerCase() === value.trim().toLowerCase() ||
          option.textContent.trim().toLowerCase() === value.trim().toLowerCase()
      );
      if (match) {
        position.value = match.value;
        setFieldError("position", "");
      }
    };

    document.querySelectorAll("[data-role]").forEach((link) => {
      link.addEventListener("click", () => {
        setRole(link.getAttribute("data-role") || "");
      });
    });

    const requestedRole = new URLSearchParams(window.location.search).get("role");
    if (requestedRole) setRole(requestedRole);
  }
}
