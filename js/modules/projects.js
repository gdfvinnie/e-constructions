export function initProjects() {
  const filterGroup = document.querySelector(".filters");
  const grid = document.querySelector("[data-project-grid]");
  const status = document.querySelector("[data-projects-status]");
  if (!filterGroup || !grid) return;

  const buttons = Array.from(filterGroup.querySelectorAll("[data-filter]"));
  const cards = Array.from(grid.querySelectorAll("[data-category]"));
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  function applyFilter(filter) {
    let visibleCount = 0;

    cards.forEach((card) => {
      const show = filter === "all" || card.dataset.category === filter;
      card.hidden = !show;
      card.classList.remove("is-filtered-in");

      if (show) {
        visibleCount += 1;
        if (!reduced.matches) {
          // Restart the entrance animation on each filter change.
          void card.offsetWidth;
          card.classList.add("is-filtered-in");
        }
      }
    });

    buttons.forEach((button) => {
      const active = button.dataset.filter === filter;
      button.setAttribute("aria-pressed", String(active));
      button.classList.toggle("is-active", active);
    });

    if (status) {
      const label =
        filter === "all"
          ? "projects"
          : `${filter} ${
              visibleCount === 1 ? "project" : "projects"
            }`;
      status.textContent = `Showing ${visibleCount} ${label}`;
    }
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      applyFilter(button.dataset.filter);
    });
  });
}
