# hackera.online

Marketing site for Hackera — 250+ digital services in one catalog
(web development, design, marketing, SEO, AI automation, legal compliance,
photography, PR, and more), with a static, service-driven structure for
both the English and Bulgarian versions.

- Live site: https://hackera.online (EN) · https://hackera.online/bg/ (BG)
- Stack: plain HTML + vanilla JS + hand-authored CSS. No framework, no
  bundler, no `npm install` — the code in this repo is what gets served.
  That keeps hosting cheap and deployments fast.

## Site structure

The site is now organized around service categories and individual service
landing pages instead of a single monolithic page structure.

```text
.
├── index.html                     # English homepage (/)
├── bg/
│   └── index.html                 # Bulgarian homepage (/bg/)
├── services/                      # English service category pages and service detail pages
│   ├── web-development/
│   ├── digital-marketing/
│   ├── ai-and-automation/
│   ├── seo-services/
│   ├── social-media/
│   ├── e-commerce/
│   ├── design-and-graphics/
│   ├── mobile-apps/
│   ├── photography/
│   ├── video-and-audio-production/
│   ├── crm-and-sales/
│   ├── it-and-cloud-services/
│   ├── cybersecurity/
│   ├── gdpr-and-legal/
│   ├── translation-and-localization/
│   ├── content-and-copywriting/
│   ├── pr-and-communications/
│   ├── training-and-consulting/
│   ├── subscription-and-maintenance/
│   └── data-and-analytics/
├── bg/uslugi/                    # Bulgarian service category pages and detail pages
│   └── ...
├── content/
│   └── services.json              # service catalog data used by the app
├── css/
│   ├── style.css                 # main site styling
│   └── tokens.css                # design tokens / variables
├── js/
│   ├── app.js                    # main app logic and rendering
│   ├── data.js                   # catalog and content data
│   ├── agent.js                  # assistant/chat-related logic
│   ├── checker.js                # validation/check logic
│   ├── icons.js                  # self-hosted icon set
│   └── ...
├── admin.html                    # admin dashboard / management interface
├── login.html                    # login page
├── CNAME                         # custom domain mapping
├── _headers                      # Cloudflare headers config
├── build.js                      # build / generation helper
├── favicon.svg
├── og-image.png
├── robots.txt
├── sitemap.xml
├── llms.txt
├── README.md
├── DEPLOY-GITHUB-CLOUDFLARE.txt
├── DEPLOY-NAMECHEAP.txt
└── LICENSE (if present in your hosting setup)
```

Important: the website now uses a catalog-driven structure where categories and
individual service pages live under `/services/` and `/bg/uslugi/`, while the
frontend data is sourced from `content/services.json` and `js/data.js`.

## How the site works

- `index.html` is the English homepage.
- `bg/index.html` is the Bulgarian homepage.
- The service catalog is generated and rendered from structured data.
- `js/app.js` handles rendering and UI state changes.
- `js/data.js` defines the service content used by the app.
- `content/services.json` acts as a central catalog source for service data.
- The site is fully static; no Node.js app or build pipeline is required for
  deployment.

## Local preview

Because the pages reference assets with absolute paths such as `/css/style.css`
and `/js/app.js`, opening the HTML files directly via `file://` will not load
correctly. Serve the repo over HTTP instead:

```bash
# from the repo root, pick whichever you have installed
npx serve .
# or
python3 -m http.server 8080
```

Then open:

- http://localhost:8080/ for English
- http://localhost:8080/bg/ for Bulgarian

## Deployment

- GitHub + Cloudflare Pages (current setup): see `DEPLOY-GITHUB-CLOUDFLARE.txt`
- Namecheap / cPanel (legacy hosting): see `DEPLOY-NAMECHEAP.txt`

## License

Private/proprietary — © Hackera. ("Имоти 98" EOOD). Not for reuse.

## Notes

This repo is intentionally lightweight and static on purpose: it is designed to
be cheap to host, quick to deploy, and easy to serve with a CDN or simple web
server.
