/**
 * Preselects the quote form's project type.
 *
 * Service links on the services page point to
 * `quote.html?service=Residential%20Construction`; on arrival this module
 * matches the query value to an option. Same-page links with a
 * `data-service` attribute are also supported.
 */
export function initServiceLinks() {
  const projectType = document.getElementById("project-type");
  if (!projectType) return;

  function applyService(requested) {
    if (!requested) return;

    const option = Array.from(projectType.options).find(
      (item) => item.textContent.trim() === requested
    );

    if (option) {
      projectType.value = option.value;
      projectType.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }

  const requested = new URLSearchParams(window.location.search).get("service");
  applyService(requested);

  document.querySelectorAll("[data-service]").forEach((link) => {
    link.addEventListener("click", () => {
      applyService(link.getAttribute("data-service"));
    });
  });
}
