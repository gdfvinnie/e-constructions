/**
 * Site navigation.
 *
 * Each navigation item is a real page, so the active state comes from the
 * markup (`aria-current="page"`). This module only handles the mobile menu,
 * focus containment, and the scrolled header treatment.
 */
export function initNav() {
  const header = document.querySelector("[data-header]");
  const toggle = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-mobile-menu]");
  const main = document.querySelector("main");
  const footer = document.querySelector(".site-footer");

  if (!header) return;

  const toggleText = toggle?.querySelector(".menu-toggle__text");
  const menuLinks = menu ? Array.from(menu.querySelectorAll("a[href]")) : [];
  let isOpen = false;

  function focusableItems() {
    return Array.from(
      header.querySelectorAll("a[href], button:not([disabled])")
    ).filter((element) => element.offsetParent !== null);
  }

  function openMenu() {
    if (!toggle || !menu || isOpen) return;
    isOpen = true;
    menu.hidden = false;
    toggle.setAttribute("aria-expanded", "true");
    if (toggleText) toggleText.textContent = "Close";
    document.body.classList.add("menu-open");
    if (main) main.inert = true;
    if (footer) footer.inert = true;
    window.requestAnimationFrame(() => {
      menuLinks[0]?.focus();
    });
  }

  function closeMenu({ restoreFocus = true } = {}) {
    if (!toggle || !menu || !isOpen) return;
    isOpen = false;
    menu.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    if (toggleText) toggleText.textContent = "Menu";
    document.body.classList.remove("menu-open");
    if (main) main.inert = false;
    if (footer) footer.inert = false;
    if (restoreFocus) toggle.focus();
  }

  toggle?.addEventListener("click", () => {
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  });

  menuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu({ restoreFocus: false });
    });
  });

  document.addEventListener("keydown", (event) => {
    if (!isOpen) return;

    if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    }

    if (event.key !== "Tab") return;

    const items = focusableItems();
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 1100 && isOpen) {
      closeMenu({ restoreFocus: false });
    }
  });

  const updateHeader = () => {
    header.classList.toggle("is-scrolled", window.scrollY > 8);
  };
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  // A link to the current page should not reload it.
  document.querySelectorAll('a[href=""], a[aria-current="page"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const href = link.getAttribute("href");
      if (!href || href === window.location.pathname.split("/").pop()) {
        event.preventDefault();
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    });
  });
}
