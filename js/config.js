/**
 * Site configuration
 * ------------------
 * QUOTE FORM ENDPOINT
 * The bundled server (serve.mjs) answers POST /api/quote, validates the
 * request, and appends it to data/quote-requests.jsonl. That is the default
 * below, so the form works out of the box when you run `node serve.mjs`.
 *
 * On a static host there is no server to answer /api/quote, so point this at
 * a real endpoint instead (Formspree, Basin, a serverless function, or your
 * own API route). It must accept a JSON POST and return a 2xx response.
 *
 * Leave it empty ("") to disable submission and show the setup notice.
 *
 * Never place private API keys in this file — it is served to the browser.
 * Use a server-side endpoint or a form service instead.
 */
export const siteConfig = {
  quoteEndpoint: "/api/quote",
  requestTimeoutMs: 20000,
};
