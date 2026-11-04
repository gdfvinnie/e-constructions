import { motionQuery, prefersReducedMotion } from "./motion.js";

export function initReveal() {
  const elements = Array.from(document.querySelectorAll(".reveal"));
  if (!elements.length) return;

  if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
    elements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  // Hiding content only happens once the reveal system is ready. If this
  // module fails to load, all content stays visible.
  document.documentElement.classList.add("reveal-enabled");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -7% 0px" }
  );

  elements.forEach((element) => observer.observe(element));
}

export function initParallax() {
  const mediaElements = Array.from(
    document.querySelectorAll(".hero__media")
  );
  if (!mediaElements.length) return;

  let frameRequested = false;

  const reset = () => {
    mediaElements.forEach((element) =>
      element.style.setProperty("--hero-shift", "0px")
    );
  };

  const update = () => {
    frameRequested = false;

    if (
      prefersReducedMotion() ||
      window.innerWidth < 900 ||
      window.scrollY > window.innerHeight * 1.15
    ) {
      reset();
      return;
    }

    const shift = Math.min(window.scrollY * 0.07, 28);
    mediaElements.forEach((element) =>
      element.style.setProperty("--hero-shift", `${shift.toFixed(2)}px`)
    );
  };

  const requestUpdate = () => {
    if (frameRequested) return;
    frameRequested = true;
    window.requestAnimationFrame(update);
  };

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate, { passive: true });
  motionQuery.addEventListener?.("change", () => {
    if (prefersReducedMotion()) reset();
    else requestUpdate();
  });

  update();
}
