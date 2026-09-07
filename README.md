# hackera.online

Marketing site for **Hackera** — 250+ digital services in one catalog
(web development, design, marketing, SEO and more), plus a "Website as a
Service" subscription package.

- **Live site:** https://hackera.online (EN) · https://hackera.online/bg/ (BG)
- **Stack:** plain HTML + vanilla JS + hand-authored CSS. No framework, no
  bundler, no `npm install` — the files in this repo are exactly what gets
  served. That's intentional: it keeps hosting cheap and deploys instant
  (see below).
  
## Structure

```
index.html          English page (/)
bg/index.html        Bulgarian page (/bg/)
css/style.css        All styles (one file, hand-rolled utility classes)
js/
  data.js             Service catalog data (bilingual)
  app.js              App logic — renders everything into #root
  chatbot.js          Floating "AI assistant" chat widget
  icons.js            Self-hosted icon set (no CDN)
api/                  Stripe backend scaffolding (PHP, currently unused — see api/README.md)
favicon.svg, og-image.png, robots.txt, sitemap.xml, llms.txt
```

`js/app.js` re-renders the whole `#root` on every state change (language
switch, cart open, etc.) — see the table of contents comment at the top of
that file to jump to any section (hero, pricing, FAQ, ...).

## Local preview

Because the pages reference assets by absolute path (`/css/style.css`,
`/js/app.js`), opening `index.html` directly with `file://` will not load
them correctly — serve the folder over HTTP instead:

```bash
# from the repo root, pick whichever you have installed
npx serve .
# or
python3 -m http.server 8080
```

Then open `http://localhost:8080/` (EN) or `http://localhost:8080/bg/` (BG).

## Deployment

- **GitHub + Cloudflare Pages (current plan):** see
  `DEPLOY-GITHUB-CLOUDFLARE.txt` — push to `main`, Cloudflare builds and
  deploys automatically, usually in under a minute.
- **Namecheap / cPanel (previous hosting):** see `DEPLOY-NAMECHEAP.txt`,
  kept for reference.

## License

Private/proprietary — © Hackera ("Имоти 98" EOOD). Not for reuse.
