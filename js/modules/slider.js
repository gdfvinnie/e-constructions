import { motionQuery, prefersReducedMotion } from "./motion.js";

const SLIDE_DURATION = 8000;

/**
 * Home hero slider.
 *
 * The homepage shows no carousel controls by design: slides advance
 * automatically. The rotation still pauses while the pointer is over the
 * hero, while focus is inside it, and when the tab is hidden. Users who
 * prefer reduced motion get a static first slide.
 */
export function initSlider() {
  const slider = document.querySelector("[data-slider]");
  if (!slider) return;

  const slides = Array.from(slider.querySelectorAll("[data-slide]"));
  const viewport = slider.querySelector(".hero__viewport");
  if (!slides.length) return;

  let index = 0;
  let elapsed = 0;
  let lastFrame = performance.now();
  let hoverPaused = false;
  let focusPaused = false;

  slides.forEach((slide, slideIndex) => {
    const active = slideIndex === 0;
    slide.classList.toggle("is-active", active);
    slide.setAttribute("aria-hidden", String(!active));
    slide.inert = !active;
  });

  function paused() {
    return (
      prefersReducedMotion() ||
      hoverPaused ||
      focusPaused ||
      document.hidden
    );
  }

  function goTo(nextIndex) {
    const target = (nextIndex + slides.length) % slides.length;
    if (target === index) return;

    slides[index].classList.remove("is-active");
    slides[index].setAttribute("aria-hidden", "true");
    slides[index].inert = true;

    slides[target].classList.add("is-active");
    slides[target].setAttribute("aria-hidden", "false");
    slides[target].inert = false;

    index = target;
    elapsed = 0;
  }

  slider.addEventListener("mouseenter", () => {
    hoverPaused = true;
  });
  slider.addEventListener("mouseleave", () => {
    hoverPaused = false;
  });

  slider.addEventListener("focusin", () => {
    focusPaused = true;
  });
  slider.addEventListener("focusout", (event) => {
    if (!slider.contains(event.relatedTarget)) {
      focusPaused = false;
    }
  });

  slider.addEventListener("keydown", (event) => {
    const tag = event.target.tagName;
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(index + 1);
    }
  });

  // Touch / pen swiping.
  let startX = 0;
  let startY = 0;
  let tracking = false;
  let swiped = false;

  viewport?.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType === "mouse") return;
      tracking = true;
      startX = event.clientX;
      startY = event.clientY;
    },
    { passive: true }
  );

  viewport?.addEventListener(
    "pointerup",
    (event) => {
      if (!tracking) return;
      tracking = false;
      const deltaX = event.clientX - startX;
      const deltaY = event.clientY - startY;

      if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
        swiped = true;
        goTo(deltaX < 0 ? index + 1 : index - 1);
        window.setTimeout(() => {
          swiped = false;
        }, 0);
      }
    },
    { passive: true }
  );

  viewport?.addEventListener("pointercancel", () => {
    tracking = false;
  });

  viewport?.addEventListener(
    "click",
    (event) => {
      if (!swiped) return;
      event.preventDefault();
      event.stopPropagation();
      swiped = false;
    },
    true
  );

  document.addEventListener("visibilitychange", () => {
    lastFrame = performance.now();
  });

  function frame(now) {
    const delta = Math.min(now - lastFrame, 120);
    lastFrame = now;

    if (!paused()) {
      elapsed += delta;
      if (elapsed >= SLIDE_DURATION) {
        goTo(index + 1);
      }
    }

    window.requestAnimationFrame(frame);
  }

  if (!prefersReducedMotion()) {
    window.requestAnimationFrame((now) => {
      lastFrame = now;
      frame(now);
    });
  }

  motionQuery.addEventListener?.("change", (event) => {
    lastFrame = performance.now();
    elapsed = 0;
    if (!event.matches) {
      window.requestAnimationFrame(frame);
    }
  });
}
