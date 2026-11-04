# Northform Construction — website

A responsive, multi-page construction company website built with plain HTML, CSS, and native
JavaScript ES modules. No framework, no build step, no third-party libraries, no remote assets.

## Run it locally

The site must be served over HTTP so ES modules load correctly.

```bash
node serve.mjs
# → http://127.0.0.1:4173/
```

`PORT` and `HOST` are respected, e.g. `PORT=8080 node serve.mjs`. Any static server works
(`python3 -m http.server`, `npx serve`, nginx) as long as the site root is the document root.
Opening files via `file://` will not work because the browser blocks module imports.

## Pages

| Page | File | Contents |
| --- | --- | --- |
| Home | `index.html` | Auto-rotating hero, company snapshot, services, featured projects, principles, process, testimonials |
| About Us | `about.html` | Story, mission, company facts, leadership, safety and quality |
| Services | `services.html` | Six detailed services with deliverables and quote links |
| Projects | `projects.html` | Six projects with category filters, location, year, scope, size |
| Our Process | `process.html` | Six-stage timeline plus a detailed explanation of each stage |
| Contact | `contact.html` | Phone, email, WhatsApp, office address, hours, service area, FAQs |
| Careers | `careers.html` | Working principles, benefits, four role listings with pay ranges, hiring process, applicant FAQ, equal-opportunity statement, CV upload application form |
| Request a Quote | `quote.html` | The full project brief form and contact details |

Every page repeats the same header and footer markup. When changing navigation or footer content,
update all eight files (they are plain static HTML; there is no include system).

Sections and lists carry no ordinal numbers. Keep that convention when adding sections: use clear
headings and labels instead of `01 /`, numbered cards, or numbered timelines.

## Content status

The site is fully populated with a coherent company profile: Northform Construction, a Portland
general contractor founded in 2009, with an address, phone, email, licensing details, staff
numbers, project case studies, and client feedback.

**These details are sample content for a demonstration brand.** The footer states this on every
page. Before publishing for a real company, replace or verify:

- company name, wordmark, `<title>`, meta descriptions, and `assets/favicon.svg`
- address, phone, email, WhatsApp number, office hours
- Oregon CCB number, insurance and bonding statements
- founding year, staff count, project count, repeat-work figure
- leadership names and biographies
- the six project case studies (names, locations, years, sizes, scope)
- testimonials and attributions
- FAQ answers on the contact page
- careers benefits, the four role listings and their pay ranges, the hiring stages, and the
  applicant FAQ answers on `careers.html`

Search for `Northform` and for `CCB #204512` to find the places that most often need changing.

## Hero photograph

The first hero slide uses `assets/hero-site-engineer.jpg` (816 × 1456 px): a site engineer checking
drawings on a working site. Its container is the slide background, so the photo fills the hero on
every screen size and is cropped with `object-fit: cover`.

On page load the active hero image begins a slow 30-second drift (a small zoom and pan, repeated
while the page is open) — no scroll or pointer input is needed. `prefers-reduced-motion: reduce`
stops it and shows a still frame.

To use a different photo, replace that file (or point the `src` at another local image) and set
`width`/`height` in `index.html` to the file's real pixel dimensions so the reserved space stays
stable. Reframe the crop with `.hero__media img { object-position: 64% 42%; }` and its mobile
override (`56% 38%`) in `css/styles.css` — first value horizontal, second vertical. A source image
around 2000 px wide will render more crisply on wide, high-DPR screens than the current portrait file.

The old line-art stand-in, `assets/hero-construction-placeholder.svg`, is no longer referenced and
can be deleted.

Slides 2 and 3 are Glacier Blue editorial panels labelled "Editorial design panel — not a project
photograph". Swap them for real site photos when available and remove those labels.

**Other images:** project artwork lives in `assets/projects/`. Replace a card's file, `src`,
`width`, `height`, and `alt`; cards crop to 3:2. The About page uses a decorative drawing
(`assets/about-drawing.svg`) with empty alt text — replace it with a real photo and meaningful alt
text if desired. Declare intrinsic dimensions on every image.

**Footer photograph:** `assets/footer-construction.jpg` is set as the page-wide footer background
(CSS in `css/styles.css`, `.site-footer`) under a Glacier-ink scrim. It is decorative and carries
no alt text. To use a different site photo, replace that file — or change the URL in the
`.site-footer` rule — and adjust `background-position` so the cranes and building stay in frame.
Keep the scrim opacity around 0.85 so the footer links stay readable.

## Hero slider

The homepage slider runs automatically on load and shows no pause button, arrows, pagination, or
slide numbers. It still pauses while the pointer is over the hero, while focus is inside it, and
when the browser tab is hidden. Touch swiping and left/right arrow keys work when the hero has
focus. Visitors with `prefers-reduced-motion: reduce` see a static first slide.

The timing is `SLIDE_DURATION` at the top of `js/modules/slider.js` (currently 8000 ms).

## Quote form

The quote form works out of the box. `js/config.js` sends it to `POST /api/quote`, which is handled
by the bundled server in `serve.mjs`:

- the request body is validated again on the server (name, email, project type, location, and a
description of at least 20 characters; phone and budget are optional)
- a valid request is appended to `data/quote-requests.jsonl`, one JSON object per line, and the
  response carries a reference such as `NF-MW288WWK-29D4` that the visitor sees on screen
- invalid input returns `422` with per-field messages, which the page shows under the matching
  fields; malformed JSON returns `400`, and more than 5 submissions from one connection in
  10 minutes returns `429`

```bash
node serve.mjs
cat data/quote-requests.jsonl        # every stored request, newest last
```

`data/` is created on the first submission and is listed in `.gitignore` so visitor details are
never committed. Each record holds the submitted fields plus `reference`, `receivedAt`,
`sourcePage`, `submittedAt`, and `userAgent`.

**No email is sent.** The contact still has to open the JSONL file. For hands-off delivery, either
forward the record from `handleQuoteRequest()` in `serve.mjs` to an email provider, or replace
`quoteEndpoint` in `js/config.js` with a form service. A static host cannot run `serve.mjs`, so this
endpoint only exists while the site is served by Node; point `quoteEndpoint` at a real service when
you deploy to static hosting.

```js
export const siteConfig = {
  quoteEndpoint: "/api/quote",   // or "https://formspree.io/f/your-form-id"
  requestTimeoutMs: 20000,
};
```

The endpoint must accept a JSON `POST` and return a 2xx response. Payload:

```json
{
  "fullName": "…", "email": "…", "phone": "…", "projectType": "…",
  "projectLocation": "…", "budget": "…", "description": "…",
  "submittedAt": "ISO timestamp", "page": "page URL"
}
```

Compatible options: Formspree, Basin, Getform, a serverless function, or your own API route.
For a custom backend, validate server-side and return 2xx only after storing or delivering the
request. If you return `{"ok": false, "errors": {"email": "…"}}` with a 4xx status, the page
shows those messages on the matching fields.

Behaviour:

- Empty `quoteEndpoint` → submit disabled, setup notice visible, button described by that notice.
- Invalid fields → inline messages linked with `aria-describedby`, a `role="alert"` summary, and
  focus moved to the first invalid field.
- Sending → button disabled, label "Sending request…", `aria-busy="true"`, repeat submits ignored.
- Success only after a 2xx response. Failures and timeouts keep the entered values.

Service links use `quote.html?service=Residential%20Construction`; the quote page preselects the
matching project type from the query string.

Never put API keys in `js/config.js` — it is served to the browser.

## Careers form and CV upload

The application form on `careers.html` is also disabled until configured. Set `careersEndpoint`
in `js/config.js`. Unlike the quote form, it sends `multipart/form-data` so the selected CV travels
with the other fields:

- field name for the file: `cv`
- accepted files: PDF, DOC, DOCX; client-side limit 5 MB (also enforce a limit on the server)
- other fields: `fullName`, `email`, `phone`, `position`, `location`, `portfolio`, `coverNote`,
  `consent` (`yes` when checked), plus `submittedAt` and `page`

The endpoint must accept a multipart POST and return 2xx only after storing or delivering the
application. Most form services accept file uploads on paid plans; confirm file support and size
limits before choosing one. A serverless function that writes to object storage and emails the
hiring team is another option.

Behaviour mirrors the quote form: inline errors, a `role="alert"` summary, focus moved to the first
invalid field, a disabled button with a setup notice when unconfigured, `aria-busy` while sending,
duplicate submits ignored, and success shown only after a 2xx response. Invalid file type or size is
reported next to the file field. "Apply for this role" links preselect the role, and
`careers.html?role=Estimator` does the same on load.

Replace `careers@northformbuild.com` and the job listings with verified details before publishing.

## File map

```
index.html about.html services.html projects.html process.html careers.html contact.html quote.html
css/styles.css                 design tokens, components, responsive rules
js/config.js                   quote and careers form endpoints
js/main.js                     module entry point
js/modules/nav.js              mobile menu, sticky header
js/modules/slider.js           automatic hero slider, swipe and keyboard support
js/modules/reveal.js           scroll reveals and hero parallax
js/modules/motion.js           reduced-motion helpers
js/modules/projects.js         project category filters
js/modules/service-links.js    service → quote form prefill
js/modules/quote-form.js       validation, submission, loading/success/error states
js/modules/careers-form.js     application validation, CV upload, role prefill
assets/                        fonts, favicon, hero placeholder, panels, drawings
assets/projects/               project card artwork
serve.mjs                      zero-dependency server: static files + POST /api/quote
data/                          stored quote requests (created at runtime, git-ignored)
```

## Design system

- **Palette:** Glacier Blue surfaces, Ultraviolet (`.btn--primary`, active links) for interaction,
  Mineral Grey for secondary text and rules, White for selected surfaces. Tokens are at the top of
  `css/styles.css`.
- **Radius:** every component uses `border-radius: 0`. Keep it that way when adding UI.
- **Type:** Archivo variable font, self-hosted (`assets/fonts/`, SIL Open Font License in
  `OFL.txt`). Display headings use 700, card headings 640–660, interface labels 6xx, and body copy
  430 at 1–1.1rem with 1.66 line height. Small mono labels never drop below 0.6rem. Tabular
  numerals via `.num`. If you change the scale, keep those floors so text stays readable.
- **Layout:** `.shell` gutters, hairline rules, `.section` rhythm, and editorial section heads.
  Page heroes on subpages use `.page-hero`.
- **Motion:** CSS transitions and IntersectionObserver reveals. Parallax applies only to the home
  hero. Reduced motion disables nonessential movement.
- **Accessibility:** skip link, semantic landmarks, one `h1` per page, labelled controls, 44 px
  targets, visible focus rings, state conveyed by text and color, and a `<details>` FAQ.

## Before publishing checklist

- Replace the hero placeholder with the supplied photograph.
- Verify every company detail, license number, and contact link.
- Replace sample projects and testimonials with approved material.
- Send one test quote request end-to-end and confirm the record lands in `data/quote-requests.jsonl`.
- Configure `careersEndpoint` before publishing the careers form; send one test application with a
  CV upload.
- Update titles, descriptions, and favicon for the real brand.
- Review every page at 320, 390, 768, 1440, and wide desktop.
