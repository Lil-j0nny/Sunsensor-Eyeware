export function preferredScrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? "auto"
    : "smooth";
}

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: preferredScrollBehavior() });
}

export function scrollToVisit() {
  document
    .querySelector("#visit")
    ?.scrollIntoView({ behavior: preferredScrollBehavior() });
}
