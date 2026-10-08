#!/usr/bin/env node
/* Hackera static page generator. Run from the repo root: node build.js
   Reads js/data.js and js/app.js (+ optional content/services.json), writes static pages,
   sitemap.xml and llms.txt, and fills the <!--CATEGORIES--> marker in index.html and bg/index.html.

   Thin-content protection: a service page is indexable ONLY if content/services.json has
   hand-written text for it in BOTH languages. Every other service page is generated with
   <meta name="robots" content="noindex, follow"> and is left out of sitemap.xml and llms.txt,
   until you write real content for it. */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = process.cwd();
const SITE = "https://hackera.online";
const TODAY = new Date().toISOString().slice(0, 10);
const EMAIL = "ivan@hackera.online";

/* ---------- load data ---------- */
function runIn(src, tail) {
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(src + "\n;this.__out=" + tail + ";", ctx);
  return ctx.__out;
}
const dataSrc = fs.readFileSync(path.join(ROOT, "js/data.js"), "utf8");
const { CATS } = runIn(dataSrc, "{CATS}");
const appSrc = fs.readFileSync(path.join(ROOT, "js/app.js"), "utf8");
const a = appSrc.indexOf("const CATEGORY_DETAIL = {"), b = appSrc.indexOf("function getCategoryDetail");
if (a < 0 || b < 0) throw new Error("CATEGORY_DETAIL not found in js/app.js");
const DETAIL = runIn(appSrc.slice(a, b), "CATEGORY_DETAIL");

/* Hand-written per-service content. Key = "<category-slug>/<service-slug>".
   { "seo/seo-audit": { "bg": { who, included:[..], outcome, faq:[{q,a}], meta }, "en": { ... } } } */
let OVERRIDES = {};
const ovFile = path.join(ROOT, "content/services.json");
if (fs.existsSync(ovFile)) OVERRIDES = JSON.parse(fs.readFileSync(ovFile, "utf8"));

/* ---------- helpers ---------- */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slugify = (s) => s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const cut = (s, n) => (s.length <= n ? s : s.slice(0, n - 1).replace(/\s+\S*$/, "") + "…");
const ld = (o) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, "\\u003c")}</script>`;

/* ---------- model ---------- */
const cats = CATS.map((c) => {
  const cslug = slugify(c.name.en);
  const seen = new Set();
  const items = c.items.map((it, i) => {
    let slug = slugify(it[2].replace(/\s*\(.*?\)\s*/g, " ").trim()) || slugify(it[2]);
    if (seen.has(slug)) slug = slugify(it[2]);
    if (seen.has(slug)) throw new Error("Duplicate slug " + slug + " in " + c.id);
    seen.add(slug);
    return { idx: i, slug, name: { bg: it[0], en: it[2] }, desc: { bg: it[1], en: it[3] } };
  });
  return { id: c.id, slug: cslug, name: c.name, items, detail: DETAIL[c.id] || DETAIL.web };
});
const TOTAL = cats.reduce((n, c) => n + c.items.length, 0);
const isReady = (c, s) => { const o = OVERRIDES[c.slug + "/" + s.slug]; return !!(o && o.bg && o.en); };
const READY = cats.reduce((n, c) => n + c.items.filter((s) => isReady(c, s)).length, 0);

/* ---------- language config ---------- */
const L = { en: { base: "/services/", home: "/", loc: "en_US" }, bg: { base: "/bg/uslugi/", home: "/bg/", loc: "bg_BG" } };
const T = {
  bg: { home: "Начало", all: "Всички услуги", who: "За кого е подходяща", included: "Какво включва", outcome: "Резултат", faq: "Често задавани въпроси", cta: "Поискай оферта",
    ctaText: "Добави услугата към запитване в каталога и получи индивидуална оферта.", more: "Още в тази категория", others: "Други категории",
    count: (n) => `${n} ${n === 1 ? "услуга" : "услуги"}`, sw: "English", tagline: "Дигиталните услуги на бизнеса ти на едно място.", contact: "Контакт",
    hubH1: "Каталог с дигитални услуги", hubTitle: "Каталог с дигитални услуги | Hackera",
    hubDesc: `${TOTAL} дигитални услуги в ${cats.length} категории: уеб разработка, SEO, маркетинг, дизайн, киберсигурност, AI и още.`, rights: "Всички права запазени." },
  en: { home: "Home", all: "All services", who: "Who it's for", included: "What's included", outcome: "The result", faq: "FAQ", cta: "Request a quote",
    ctaText: "Add this service to a request in the catalog and get a tailored offer.", more: "More in this category", others: "Other categories",
    count: (n) => `${n} ${n === 1 ? "service" : "services"}`, sw: "Български", tagline: "Your business's digital services in one place.", contact: "Contact",
    hubH1: "Digital services catalog", hubTitle: "Digital services catalog | Hackera",
    hubDesc: `${TOTAL} digital services in ${cats.length} categories: web development, SEO, marketing, design, cybersecurity, AI and more.`, rights: "All rights reserved." },
};
const P = (lang, rel) => L[lang].base + rel;
const OTHER = { en: "bg", bg: "en" };

/* ---------- page shell ---------- */
const CSS = `:root{--ink:var(--text,#0B0B0C);--orange:var(--color-accent,#FF5A1F);--orange-deep:var(--color-accent-label,#D6440E);--pearl:var(--bg,#F7F6F2);--paper:var(--surface,#fff);--line:var(--border-soft,#E4E1D8);--muted:var(--text-muted,#6B6A67)}
@media (prefers-color-scheme:dark){:root{--ink:#F4F3EF;--pearl:#151516;--paper:#0B0B0C;--line:#2A2A28;--muted:#A5A39D}}
*{box-sizing:border-box}body{margin:0;font:16px/1.65 system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:var(--ink);background:var(--paper)}
a{color:var(--orange-deep)}header{background:#0B0B0C}header .in,main,footer .in{max-width:1000px;margin:0 auto;padding:0 20px}
header .in{height:64px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.brand{color:#fff;font-weight:700;font-size:20px;text-decoration:none}.brand span{color:var(--orange)}
header nav a{color:#fff;text-decoration:none;font-size:14px;margin-left:18px}header nav a.sw{border:1px solid rgba(255,255,255,.4);padding:4px 12px;border-radius:99px}
main{padding-top:28px;padding-bottom:56px}.crumbs{font-size:13px;color:var(--muted);margin-bottom:18px}.crumbs a{color:var(--muted)}
h1{font-size:clamp(26px,4vw,38px);line-height:1.2;margin:0 0 10px;letter-spacing:-.02em}h2{font-size:20px;margin:32px 0 10px}
.lead{font-size:18px;color:var(--muted);margin:0 0 8px}ul.ck{padding-left:20px}ul.ck li{margin:6px 0}
.cta{background:var(--pearl);border:1px solid var(--line);border-radius:16px;padding:22px;margin:32px 0}.cta p{margin:0 0 14px}
.btn{display:inline-block;background:var(--orange);color:#fff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:99px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;padding:0;list-style:none}
.grid li{border:1px solid var(--line);border-radius:14px;padding:16px}.grid a{font-weight:600;text-decoration:none}.grid p{margin:6px 0 0;font-size:14px;color:var(--muted)}
.chips{display:flex;flex-wrap:wrap;gap:8px;padding:0;list-style:none}.chips a{display:inline-block;border:1px solid var(--line);border-radius:99px;padding:5px 14px;font-size:13px;text-decoration:none}
footer{background:var(--pearl);border-top:1px solid var(--line);font-size:14px;color:var(--muted)}footer .in{padding-top:28px;padding-bottom:28px}`;

function shell({ lang, rel, title, desc, body, schema, robots }) {
  const t = T[lang], path_ = P(lang, rel), url = SITE + path_;
  const enUrl = SITE + P("en", rel), bgUrl = SITE + P("bg", rel);
  const catLinks = cats.map((c) => `<li><a href="${P(lang, c.slug + "/")}">${esc(c.name[lang])}</a></li>`).join("");
  return `<!doctype html>
<html lang="${lang}"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${robots ? `<meta name="robots" content="${robots}">\n` : ""}<link rel="canonical" href="${url}">
<link rel="alternate" hreflang="en" href="${enUrl}">
<link rel="alternate" hreflang="bg" href="${bgUrl}">
<link rel="alternate" hreflang="x-default" href="${enUrl}">
<meta property="og:type" content="website"><meta property="og:site_name" content="Hackera">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}/og-image.png"><meta property="og:locale" content="${L[lang].loc}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${SITE}/og-image.png">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<style>${CSS}</style>
${schema.map(ld).join("\n")}
</head><body>
<header><div class="in"><a class="brand" href="${L[lang].home}">hackera<span>.</span></a>
<nav><a href="${P(lang, "")}">${t.all}</a><a class="sw" href="${P(OTHER[lang], rel)}" hreflang="${OTHER[lang]}" lang="${OTHER[lang]}">${t.sw}</a></nav></div></header>
<main>${body}</main>
<footer><div class="in"><p><strong>Hackera</strong>. ${t.tagline}</p><ul class="chips">${catLinks}</ul>
<p>${t.contact}: <a href="mailto:${EMAIL}">${EMAIL}</a></p><p>© ${new Date().getFullYear()} Hackera. ${t.rights}</p></div></footer>
</body></html>
`;
}
const crumbsHtml = (items) => `<nav class="crumbs" aria-label="breadcrumb">${items.map((i, k) => (i.url && k < items.length - 1 ? `<a href="${i.url}">${esc(i.name)}</a>` : esc(i.name))).join(" › ")}</nav>`;
const crumbsLd = (items) => ({ "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map((i, k) => ({ "@type": "ListItem", position: k + 1, name: i.name, item: SITE + i.url })) });
const provider = { "@type": "Organization", name: "Hackera", legalName: "Имоти 98 ЕООД", url: SITE + "/", email: EMAIL };

/* ---------- generate ---------- */
["services", "bg/uslugi"].forEach((d) => fs.rmSync(path.join(ROOT, d), { recursive: true, force: true }));
function write(lang, rel, page) {
  const f = path.join(ROOT, P(lang, rel), "index.html");
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, shell({ lang, rel, ...page }));
}

for (const lang of ["en", "bg"]) {
  const t = T[lang];
  const home = { name: t.home, url: L[lang].home }, hub = { name: t.all, url: P(lang, "") };

  // hub
  write(lang, "", {
    title: t.hubTitle, desc: t.hubDesc,
    body: `${crumbsHtml([home, { name: t.all }])}<h1>${t.hubH1}</h1><p class="lead">${esc(t.hubDesc)}</p>
<ul class="grid">${cats.map((c) => `<li><a href="${P(lang, c.slug + "/")}">${esc(c.name[lang])}</a><p>${t.count(c.items.length)}</p></li>`).join("")}</ul>`,
    schema: [crumbsLd([home, { name: t.all, url: P(lang, "") }])],
  });

  for (const c of cats) {
    const cUrl = P(lang, c.slug + "/"), d = c.detail;
    write(lang, c.slug + "/", {
      title: `${c.name[lang]}: ${t.count(c.items.length)} | Hackera`, desc: cut(d.forWhom[lang], 158),
      body: `${crumbsHtml([home, hub, { name: c.name[lang] }])}<h1>${esc(c.name[lang])}</h1>
<p class="lead">${esc(d.forWhom[lang])}</p><p>${esc(d.outcome[lang])}</p>
<ul class="grid">${c.items.map((s) => `<li><a href="${P(lang, c.slug + "/" + s.slug + "/")}">${esc(s.name[lang])}</a><p>${esc(s.desc[lang])}</p></li>`).join("")}</ul>
<h2>${t.others}</h2><ul class="chips">${cats.filter((x) => x !== c).map((x) => `<li><a href="${P(lang, x.slug + "/")}">${esc(x.name[lang])}</a></li>`).join("")}</ul>`,
      schema: [crumbsLd([home, { name: t.all, url: P(lang, "") }, { name: c.name[lang], url: cUrl }]),
        { "@context": "https://schema.org", "@type": "CollectionPage", name: c.name[lang], url: SITE + cUrl, inLanguage: lang,
          mainEntity: { "@type": "ItemList", itemListElement: c.items.map((s, k) => ({ "@type": "ListItem", position: k + 1, url: SITE + P(lang, c.slug + "/" + s.slug + "/"), name: s.name[lang] })) } }],
    });

    for (const s of c.items) {
      const rel = c.slug + "/" + s.slug + "/", sUrl = P(lang, rel);
      const ready = isReady(c, s), ov = ready ? OVERRIDES[c.slug + "/" + s.slug][lang] : null;
      const n = d.bullets.length;
      const bullets = ov && ov.included ? ov.included : [0, 1, 2].map((k) => d.bullets[(s.idx + k) % n][lang]);
      const who = (ov && ov.who) || d.forWhom[lang];
      const outcome = (ov && ov.outcome) || d.outcome[lang];
      const faq = (ov && ov.faq) || [];
      write(lang, rel, {
        title: `${s.name[lang]} | ${c.name[lang]} | Hackera`,
        desc: cut((ov && ov.meta) || `${s.desc[lang]} ${d.forWhom[lang]}`, 158),
        robots: ready ? "" : "noindex, follow",
        body: `${crumbsHtml([home, hub, { name: c.name[lang], url: cUrl }, { name: s.name[lang] }])}<h1>${esc(s.name[lang])}</h1>
<p class="lead">${esc(s.desc[lang])}</p>
<h2>${t.who}</h2><p>${esc(who)}</p>
<h2>${t.included}</h2><ul class="ck">${bullets.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
<h2>${t.outcome}</h2><p>${esc(outcome)}</p>
${faq.length ? `<h2>${t.faq}</h2>${faq.map((f) => `<h3>${esc(f.q)}</h3><p>${esc(f.a)}</p>`).join("")}` : ""}
<div class="cta"><p>${t.ctaText}</p><a class="btn" href="${L[lang].home}#catalog">${t.cta}</a></div>
<h2>${t.more}</h2><ul class="chips">${c.items.filter((x) => x !== s).map((x) => `<li><a href="${P(lang, c.slug + "/" + x.slug + "/")}">${esc(x.name[lang])}</a></li>`).join("")}</ul>`,
        schema: [crumbsLd([home, { name: t.all, url: P(lang, "") }, { name: c.name[lang], url: cUrl }, { name: s.name[lang], url: sUrl }]),
          { "@context": "https://schema.org", "@type": "Service", name: s.name[lang], description: s.desc[lang], serviceType: c.name[lang], url: SITE + sUrl, inLanguage: lang, provider }],
      });
    }
  }
}

/* ---------- sitemap.xml (only indexable pages) ---------- */
const rels = [""];
cats.forEach((c) => { rels.push(c.slug + "/"); c.items.filter((s) => isReady(c, s)).forEach((s) => rels.push(c.slug + "/" + s.slug + "/")); });
const entry = (loc, enP, bgP, prio) => `  <url>
    <loc>${SITE}${loc}</loc>
    <lastmod>${TODAY}</lastmod>
    <priority>${prio}</priority>
    <xhtml:link rel="alternate" hreflang="en" href="${SITE}${enP}" />
    <xhtml:link rel="alternate" hreflang="bg" href="${SITE}${bgP}" />
    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${enP}" />
  </url>`;
const urls = [entry("/", "/", "/bg/", "1.0"), entry("/bg/", "/", "/bg/", "0.9")];
for (const rel of rels) {
  const prio = rel === "" ? "0.8" : rel.split("/").length === 2 ? "0.7" : "0.6";
  for (const lang of ["en", "bg"]) urls.push(entry(P(lang, rel), P("en", rel), P("bg", rel), prio));
}
fs.writeFileSync(path.join(ROOT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`);

/* ---------- llms.txt (categories + services that have real content) ---------- */
fs.writeFileSync(path.join(ROOT, "llms.txt"), `# Hackera

> Hackera is a Bulgarian catalog of ${TOTAL} digital services in ${cats.length} categories (web development, SEO, marketing, design, cybersecurity, AI and more), plus a "Website as a Service" subscription. Operated by Имоти 98 ЕООД. Contact: ${EMAIL}

Languages: English (${SITE}/services/) and Bulgarian (${SITE}/bg/uslugi/).

${cats.map((c) => `## ${c.name.en}\n- [${c.name.en}: all ${c.items.length} services](${SITE}${P("en", c.slug + "/")})\n${c.items.filter((s) => isReady(c, s)).map((s) => `- [${s.name.en}](${SITE}${P("en", c.slug + "/" + s.slug + "/")}): ${s.desc.en}`).join("\n")}`.trimEnd()).join("\n\n")}
`);

/* ---------- fill <!--CATEGORIES--> in the homepage snapshots ---------- */
for (const [file, lang] of [["index.html", "en"], ["bg/index.html", "bg"]]) {
  const f = path.join(ROOT, file);
  if (!fs.existsSync(f)) { console.warn("WARN: " + file + " not found"); continue; }
  const html = fs.readFileSync(f, "utf8");
  const re = /<!--CATEGORIES-->(?:[\s\S]*?<!--\/CATEGORIES-->)?/;
  if (!re.test(html)) { console.warn("WARN: no <!--CATEGORIES--> marker in " + file); continue; }
  const t = T[lang];
  const block = `<!--CATEGORIES-->
<p><a href="${P(lang, "")}">${t.all}</a></p>
<ul style="columns:2;padding-left:18px;font-size:14px;line-height:1.9">${cats.map((c) => `<li><a href="${P(lang, c.slug + "/")}">${esc(c.name[lang])}</a> (${t.count(c.items.length)})</li>`).join("")}</ul>
<!--/CATEGORIES-->`;
  fs.writeFileSync(f, html.replace(re, () => block));
}

console.log(`OK: ${TOTAL} services, ${cats.length} categories, ${READY} with unique content (indexable), ${TOTAL - READY} set to noindex, ${urls.length} sitemap URLs.`);
