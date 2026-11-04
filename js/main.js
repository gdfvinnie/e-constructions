import { initNav } from "./modules/nav.js";
import { initSlider } from "./modules/slider.js";
import { initReveal, initParallax } from "./modules/reveal.js";
import { initProjects } from "./modules/projects.js";
import { initServiceLinks } from "./modules/service-links.js";
import { initQuoteForm } from "./modules/quote-form.js";
import { initCareersForm } from "./modules/careers-form.js";

initNav();
initSlider();
initReveal();
initParallax();
initProjects();
initServiceLinks();
initQuoteForm();
initCareersForm();

const year = document.querySelector("[data-year]");
if (year) year.textContent = String(new Date().getFullYear());
