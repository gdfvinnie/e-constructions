export const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

export function prefersReducedMotion() {
  return motionQuery.matches;
}
