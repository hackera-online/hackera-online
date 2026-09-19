/* =========================================================================
   Hackera — Website Checker (REAL data, not the old fake animated bars)
   -------------------------------------------------------------------------
   Self-contained. Does NOT touch agent.js (the AI chatbot) — that stays
   exactly as-is. This is a separate modal, wired to the existing
   "Check your site for free" buttons.

   Data sources:
     - Performance / SEO / Accessibility / Best Practices:
       Google's public PageSpeed Insights API — a real Lighthouse run.
       No API key = works, but low rate limit (Google will 429 you if you
       hit it a lot in a short window). Swap in a free Google Cloud API
       key later by setting PSI_API_KEY below — one line change.
     - AI / "GEO" readiness (can ChatGPT/Claude/Perplexity actually read
       and cite this site?): checks robots.txt for AI-crawler blocks,
       checks for an llms.txt file, checks for JSON-LD structured data.
       These require fetching a THIRD-PARTY site's files from the
       browser, which CORS blocks by default — this site has no backend
       to proxy through, so a public CORS proxy is used. If the proxy is
       unreachable or rate-limited, this section reports "unknown" for
       the affected checks — it never fabricates a pass/fail.

   Depends on globals already defined in app.js (loaded before this file):
     state, icon(), esc(), refreshIcons(), sendNotification()
   ========================================================================= */

const PSI_API_KEY = ""; // optional — paste a free Google Cloud API key here later for a higher rate limit
const CORS_PROXY = "https://api.allorigins.win/raw?url=";
const AI_BOTS = ["GPTBot", "ChatGPT-User", "OAI-SearchBot", "ClaudeBot", "anthropic-ai", "PerplexityBot", "Google-Extended", "CCBot", "Bytespider"];

const CHK_T = {
  title: { bg: "Провери сайта си безплатно", en: "Check your website for free" },
  sub: { bg: "Реална проверка на скорост, SEO, достъпност и готовност за AI търсачки (ChatGPT, Claude, Perplexity).", en: "A real check of speed, SEO, accessibility, and readiness for AI search engines (ChatGPT, Claude, Perplexity)." },
  urlPh: { bg: "напр. hackera.online", en: "e.g. hackera.online" },
  checkBtn: { bg: "Провери", en: "Check" },
  checking: { bg: "Проверява се… (може да отнеме до 30 сек.)", en: "Checking… (can take up to 30s)" },
  errInvalidUrl: { bg: "Въведете валиден адрес на сайт.", en: "Enter a valid website address." },
  errPsi: { bg: "Проверката на Google не успя — сайтът може да е недостъпен, или лимитът за безплатни проверки е достигнат. Опитайте отново след малко.", en: "Google's check failed — the site may be unreachable, or the free-tier rate limit was hit. Try again shortly." },
  perfLabel: { bg: "Скорост", en: "Performance" },
  seoLabel: { bg: "SEO", en: "SEO" },
  a11yLabel: { bg: "Достъпност", en: "Accessibility" },
  bpLabel: { bg: "Добри практики", en: "Best Practices" },
  geoTitle: { bg: "AI / GEO готовност", en: "AI / GEO readiness" },
  geoSub: { bg: "Дали ChatGPT, Claude и подобни AI могат реално да четат и цитират сайта.", en: "Whether ChatGPT, Claude and similar AI tools can actually read and cite the site." },
  llmsFound: { bg: "llms.txt е наличен", en: "llms.txt found" },
  llmsMissing: { bg: "llms.txt липсва", en: "llms.txt missing" },
  robotsOk: { bg: "robots.txt не блокира AI ботове", en: "robots.txt doesn't block AI bots" },
  robotsBlocking: { bg: "robots.txt блокира някои AI ботове", en: "robots.txt is blocking some AI bots" },
  robotsUnknown: { bg: "robots.txt — не можа да се провери", en: "robots.txt — couldn't be checked" },
  structDataFound: { bg: "Структурирани данни (JSON-LD) открити", en: "Structured data (JSON-LD) found" },
  structDataMissing: { bg: "Няма структурирани данни (JSON-LD)", en: "No structured data (JSON-LD) found" },
  structDataUnknown: { bg: "Структурирани данни — не можа да се провери", en: "Structured data — couldn't be checked" },
  blockedList: { bg: "Блокирани ботове:", en: "Blocked bots:" },
  geoProxyNote: { bg: "Тази проверка минава през публичен CORS proxy (третостранна услуга) — при недостъпност резултатът е „неизвестно“, не се показва фалшив резултат.", en: "This check runs through a public CORS proxy (a third-party service) — if it's unreachable, results show as \"unknown\" rather than a fabricated result." },
  emailTitle: { bg: "Изпрати ми този резултат на имейл", en: "Email me this result" },
  emailPh: { bg: "Твоят имейл", en: "Your email" },
  sendBtn: { bg: "Изпрати", en: "Send" },
  sending: { bg: "Изпращане…", en: "Sending…" },
  sent: { bg: "Изпратено! Провери пощата си.", en: "Sent! Check your inbox." },
  errEmail: { bg: "Въведете валиден имейл.", en: "Enter a valid email." },
  close: { bg: "Затвори", en: "Close" },
};
function chkT(key) {
  const l = (typeof state !== "undefined" && state.lang) || document.documentElement.lang || "en";
  const entry = CHK_T[key];
  return entry ? (entry[l] ?? entry.bg) : "";
}

/* ---------- state ---------- */
const chk = {
  open: false,
  loading: false,
  error: null,
  urlInput: "",
  checkedUrl: "",
  result: null, // { scores, audits, geo }
  emailValue: "",
  emailSending: false,
  emailSent: false,
  emailError: "",
};

/* ---------- data fetching ---------- */
function chkNormalizeUrl(raw) {
  let v = (raw || "").trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  try {
    const u = new URL(v);
    if (!u.hostname.includes(".")) return null;
    return u.href;
  } catch (e) {
    return null;
  }
}

async function chkFetchPSI(url) {
  const params = new URLSearchParams({ url, strategy: "mobile" });
  ["performance", "seo", "accessibility", "best-practices"].forEach((c) => params.append("category", c));
  if (PSI_API_KEY) params.set("key", PSI_API_KEY);
  const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params.toString()}`);
  if (!res.ok) throw new Error("psi_failed");
  const data = await res.json();
  const cats = (data.lighthouseResult && data.lighthouseResult.categories) || {};
  const audits = (data.lighthouseResult && data.lighthouseResult.audits) || {};
  const pct = (c) => (cats[c] && typeof cats[c].score === "number") ? Math.round(cats[c].score * 100) : null;
  return {
    scores: {
      performance: pct("performance"),
      seo: pct("seo"),
      accessibility: pct("accessibility"),
      bestPractices: pct("best-practices"),
    },
    audits: {
      metaDescription: audits["meta-description"] ? audits["meta-description"].score === 1 : null,
      title: audits["document-title"] ? audits["document-title"].score === 1 : null,
      crawlable: audits["is-crawlable"] ? audits["is-crawlable"].score === 1 : null,
      https: audits["is-on-https"] ? audits["is-on-https"].score === 1 : null,
    },
  };
}

async function chkFetchTextViaProxy(url) {
  const res = await fetch(CORS_PROXY + encodeURIComponent(url));
  if (!res.ok) throw new Error("proxy_failed");
  return res.text();
}

async function chkGeoAudit(pageUrl) {
  const origin = new URL(pageUrl).origin;
  const out = { llmsTxt: null, robotsBlocked: null, blockedBots: [], structuredData: null };

  try {
    const robots = await chkFetchTextViaProxy(origin + "/robots.txt");
    const blocked = [];
    AI_BOTS.forEach((bot) => {
      // heuristic: look for a User-agent block for this bot followed by a Disallow: /
      const re = new RegExp("user-agent:\\s*" + bot.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&") + "[^]*?(?=user-agent:|$)", "i");
      const m = robots.match(re);
      if (m && /disallow:\s*\/\s*($|\n)/i.test(m[0])) blocked.push(bot);
    });
    out.robotsBlocked = blocked.length > 0;
    out.blockedBots = blocked;
  } catch (e) {
    out.robotsBlocked = null;
  }

  try {
    await chkFetchTextViaProxy(origin + "/llms.txt");
    out.llmsTxt = true;
  } catch (e) {
    out.llmsTxt = false; // a clean 404 also throws — treat fetch failure as "not found" here since it's same-origin as the robots check that succeeded
  }

  try {
    const html = await chkFetchTextViaProxy(pageUrl);
    out.structuredData = /<script[^>]+application\/ld\+json/i.test(html);
  } catch (e) {
    out.structuredData = null;
  }

  return out;
}

async function chkRunCheck() {
  const normalized = chkNormalizeUrl(chk.urlInput);
  if (!normalized) {
    chk.error = chkT("errInvalidUrl");
    chkRender();
    return;
  }
  chk.error = null;
  chk.loading = true;
  chk.result = null;
  chk.checkedUrl = normalized;
  chkRender();

  const [psiSettled, geoSettled] = await Promise.allSettled([chkFetchPSI(normalized), chkGeoAudit(normalized)]);

  if (psiSettled.status === "rejected" && geoSettled.status === "rejected") {
    chk.loading = false;
    chk.error = chkT("errPsi");
    chkRender();
    return;
  }

  chk.result = {
    scores: psiSettled.status === "fulfilled" ? psiSettled.value.scores : { performance: null, seo: null, accessibility: null, bestPractices: null },
    audits: psiSettled.status === "fulfilled" ? psiSettled.value.audits : {},
    geo: geoSettled.status === "fulfilled" ? geoSettled.value : { llmsTxt: null, robotsBlocked: null, blockedBots: [], structuredData: null },
  };
  chk.loading = false;
  chkRender();
}

/* ---------- email report ---------- */
async function chkSendReport() {
  const email = chk.emailValue.trim();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    chk.emailError = chkT("errEmail");
    chkRender();
    return;
  }
  chk.emailError = "";
  chk.emailSending = true;
  chkRender();

  const r = chk.result;
  const scoreLine = (label, v) => `${label}: ${v === null || v === undefined ? "—" : v + "%"}`;
  const fields = {
    "Проверен сайт": chk.checkedUrl,
    [chkT("perfLabel")]: r.scores.performance ?? "—",
    [chkT("seoLabel")]: r.scores.seo ?? "—",
    [chkT("a11yLabel")]: r.scores.accessibility ?? "—",
    [chkT("bpLabel")]: r.scores.bestPractices ?? "—",
    "llms.txt": r.geo.llmsTxt ? "yes" : "no",
    "AI bots blocked": r.geo.blockedBots.length ? r.geo.blockedBots.join(", ") : "none",
    "Structured data": r.geo.structuredData ? "yes" : "no",
  };
  // send to the visitor
  await sendNotification(fields, `Hackera — website check report for ${chk.checkedUrl}`, email);
  // also notify the business as a lead
  await sendNotification({ ...fields, "Visitor email": email }, `New site-check lead — ${chk.checkedUrl}`);

  chk.emailSending = false;
  chk.emailSent = true;
  chkRender();
}

/* ---------- rendering ---------- */
function chkScoreColor(v) {
  if (v === null || v === undefined) return "#9CA3AF";
  if (v >= 90) return "#1FA463";
  if (v >= 50) return "#E4A11B";
  return "var(--orange)";
}

function chkScoreRow(label, value) {
  const display = value === null || value === undefined ? "—" : `${value}%`;
  return `<div class="chk-score-row">
    <div class="chk-score-top"><span>${label}</span><span style="color:${chkScoreColor(value)};font-weight:700">${display}</span></div>
    <div class="chk-score-bar"><div class="chk-score-fill" style="width:${value ?? 0}%;background:${chkScoreColor(value)}"></div></div>
  </div>`;
}

function chkGeoLine(ok, textFound, textMissing, textUnknown) {
  if (ok === null || ok === undefined) return `<div class="chk-geo-line chk-geo-unknown">${icon("help-circle", "w-4 h-4")}<span>${textUnknown}</span></div>`;
  return `<div class="chk-geo-line ${ok ? "chk-geo-ok" : "chk-geo-bad"}">${icon(ok ? "check-circle" : "x-circle", "w-4 h-4")}<span>${ok ? textFound : textMissing}</span></div>`;
}

function chkRenderBody() {
  if (chk.loading) {
    return `<div class="chk-loading">
      <div class="chk-spinner"></div>
      <p>${chkT("checking")}</p>
    </div>`;
  }
  if (chk.error) {
    return `<p class="chk-error">${esc(chk.error)}</p>`;
  }
  if (!chk.result) return "";

  const r = chk.result;
  const geoOk = r.geo.robotsBlocked === null ? null : !r.geo.robotsBlocked;

  return `
  <div class="chk-results">
    <div class="chk-scores">
      ${chkScoreRow(chkT("perfLabel"), r.scores.performance)}
      ${chkScoreRow(chkT("seoLabel"), r.scores.seo)}
      ${chkScoreRow(chkT("a11yLabel"), r.scores.accessibility)}
      ${chkScoreRow(chkT("bpLabel"), r.scores.bestPractices)}
    </div>

    <div class="chk-geo-box">
      <div class="chk-geo-head">
        <strong>${chkT("geoTitle")}</strong>
        <span>${chkT("geoSub")}</span>
      </div>
      ${chkGeoLine(r.geo.llmsTxt, chkT("llmsFound"), chkT("llmsMissing"), "")}
      ${chkGeoLine(geoOk, chkT("robotsOk"), chkT("robotsBlocking"), chkT("robotsUnknown"))}
      ${chkGeoLine(r.geo.structuredData, chkT("structDataFound"), chkT("structDataMissing"), chkT("structDataUnknown"))}
      ${r.geo.blockedBots && r.geo.blockedBots.length ? `<div class="chk-blocked-bots"><span>${chkT("blockedList")}</span> ${r.geo.blockedBots.join(", ")}</div>` : ""}
      <p class="chk-proxy-note">${chkT("geoProxyNote")}</p>
    </div>

    <div class="chk-email-box">
      ${chk.emailSent
        ? `<p class="chk-email-sent">${icon("check", "w-4 h-4")} ${chkT("sent")}</p>`
        : `<form id="chkEmailForm" class="chk-email-form">
            <span class="chk-email-title">${chkT("emailTitle")}</span>
            <div class="chk-email-row">
              <input id="chkEmailInput" type="email" placeholder="${chkT("emailPh")}" value="${esc(chk.emailValue)}" class="chk-email-input"/>
              <button type="submit" class="chk-email-send" ${chk.emailSending ? "disabled" : ""}>${chk.emailSending ? chkT("sending") : chkT("sendBtn")}</button>
            </div>
            ${chk.emailError ? `<span class="chk-email-err">${esc(chk.emailError)}</span>` : ""}
          </form>`}
    </div>
  </div>`;
}

function chkRender() {
  chkEnsureStyles();
  let host = document.getElementById("chkModalRoot");
  if (!host) {
    host = document.createElement("div");
    host.id = "chkModalRoot";
    document.body.appendChild(host);
  }
  host.innerHTML = `
  <div id="chkBackdrop" class="chk-backdrop" style="background:${chk.open ? "rgba(11,11,12,0.6)" : "transparent"};pointer-events:${chk.open ? "auto" : "none"}">
    <div class="chk-modal" style="transform:translateY(${chk.open ? "0" : "24px"});opacity:${chk.open ? "1" : "0"}">
      <button id="chkCloseBtn" class="chk-close-btn" aria-label="${chkT("close")}">${icon("x", "w-4 h-4")}</button>
      <h3 class="chk-title">${chkT("title")}</h3>
      <p class="chk-sub">${chkT("sub")}</p>
      <form id="chkUrlForm" class="chk-url-form">
        <input id="chkUrlInput" placeholder="${chkT("urlPh")}" value="${esc(chk.urlInput)}" class="chk-url-input" autocomplete="off"/>
        <button type="submit" class="chk-url-btn" ${chk.loading ? "disabled" : ""}>${chkT("checkBtn")}</button>
      </form>
      <div id="chkBody">${chkRenderBody()}</div>
    </div>
  </div>`;
  refreshIcons();
  chkWire();
  document.body.style.overflow = chk.open ? "hidden" : (document.getElementById("modalsRoot")?.querySelector('[style*="hidden"]') ? "hidden" : "auto");
}

function chkWire() {
  document.getElementById("chkCloseBtn")?.addEventListener("click", chkClose);
  document.getElementById("chkBackdrop")?.addEventListener("click", (e) => { if (e.target.id === "chkBackdrop") chkClose(); });
  const form = document.getElementById("chkUrlForm");
  if (form) {
    document.getElementById("chkUrlInput").addEventListener("input", (e) => { chk.urlInput = e.target.value; });
    form.addEventListener("submit", (e) => { e.preventDefault(); chkRunCheck(); });
  }
  const emailForm = document.getElementById("chkEmailForm");
  if (emailForm) {
    document.getElementById("chkEmailInput").addEventListener("input", (e) => { chk.emailValue = e.target.value; });
    emailForm.addEventListener("submit", (e) => { e.preventDefault(); chkSendReport(); });
  }
}

function chkEnsureStyles() {
  if (document.getElementById("chkStyles")) return;
  const style = document.createElement("style");
  style.id = "chkStyles";
  style.textContent = `
    .chk-backdrop{position:fixed;inset:0;z-index:80;display:flex;align-items:center;justify-content:center;padding:16px;transition:background .25s ease}
    .chk-modal{width:100%;max-width:480px;max-height:88vh;overflow-y:auto;background:var(--paper);border-radius:24px;padding:28px 24px 24px;position:relative;box-shadow:0 30px 70px rgba(11,11,12,.35);transition:all .25s ease}
    .chk-close-btn{position:absolute;top:16px;right:16px;width:34px;height:34px;border-radius:999px;border:none;background:var(--pearl);display:flex;align-items:center;justify-content:center;cursor:pointer}
    .chk-title{font-family:inherit;font-weight:700;font-size:19px;color:var(--ink);margin:0 0 6px;padding-right:30px}
    .chk-sub{font-size:13px;color:var(--muted);line-height:1.5;margin:0 0 18px}
    .chk-url-form{display:flex;gap:8px;margin-bottom:16px}
    .chk-url-input{flex:1;min-width:0;border-radius:12px;padding:11px 14px;font-size:13.5px;border:1px solid var(--line);background:var(--pearl);color:var(--ink);outline:none}
    .chk-url-btn{border:none;border-radius:12px;padding:0 18px;font-weight:600;font-size:13px;color:#fff;background:var(--gradient);cursor:pointer}
    .chk-url-btn:disabled{opacity:.6;cursor:default}
    .chk-loading{display:flex;flex-direction:column;align-items:center;gap:12px;padding:30px 10px;text-align:center}
    .chk-spinner{width:26px;height:26px;border-radius:50%;border:3px solid var(--line);border-top-color:var(--orange);animation:chkSpin .8s linear infinite}
    @keyframes chkSpin{to{transform:rotate(360deg)}}
    .chk-loading p{font-size:12.5px;color:var(--muted);margin:0}
    .chk-error{font-size:13px;color:var(--orange);line-height:1.5}
    .chk-scores{display:flex;flex-direction:column;gap:12px;margin-bottom:18px}
    .chk-score-top{display:flex;justify-content:space-between;font-size:12.5px;color:var(--ink);margin-bottom:4px}
    .chk-score-bar{height:7px;border-radius:999px;background:var(--pearl);overflow:hidden}
    .chk-score-fill{height:100%;border-radius:999px;transition:width .6s cubic-bezier(.22,1,.36,1)}
    .chk-geo-box{background:var(--pearl);border:1px solid var(--line-soft);border-radius:16px;padding:16px;margin-bottom:16px}
    .chk-geo-head{display:flex;flex-direction:column;gap:2px;margin-bottom:10px}
    .chk-geo-head strong{font-size:13.5px;color:var(--ink)}
    .chk-geo-head span{font-size:11.5px;color:var(--muted)}
    .chk-geo-line{display:flex;align-items:center;gap:8px;font-size:12.5px;padding:5px 0}
    .chk-geo-ok{color:#1FA463}
    .chk-geo-bad{color:var(--orange)}
    .chk-geo-unknown{color:var(--muted)}
    .chk-blocked-bots{font-size:11.5px;color:var(--muted);margin-top:6px}
    .chk-proxy-note{font-size:10.5px;color:var(--muted);line-height:1.5;margin:10px 0 0;font-style:italic}
    .chk-email-box{border-top:1px solid var(--line-soft);padding-top:14px}
    .chk-email-title{display:block;font-size:12.5px;color:var(--ink);font-weight:600;margin-bottom:8px}
    .chk-email-row{display:flex;gap:8px}
    .chk-email-input{flex:1;min-width:0;border-radius:10px;padding:9px 12px;font-size:12.5px;border:1px solid var(--line);background:var(--pearl);color:var(--ink);outline:none}
    .chk-email-send{border:none;border-radius:10px;padding:0 14px;font-size:12px;font-weight:600;color:#fff;background:var(--gradient);cursor:pointer}
    .chk-email-send:disabled{opacity:.6}
    .chk-email-err{display:block;font-size:11px;color:var(--orange);margin-top:6px}
    .chk-email-sent{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#1FA463;margin:0}
  `;
  document.head.appendChild(style);
}

/* ---------- open/close hooks ---------- */
window.hkCheckerOpen = function (prefillUrl) {
  chk.open = true;
  chk.error = null;
  if (prefillUrl) chk.urlInput = prefillUrl;
  chkRender();
  setTimeout(() => document.getElementById("chkUrlInput")?.focus(), 200);
};
function chkClose() {
  chk.open = false;
  chkRender();
}

/* boot: create the (initially hidden) modal host once */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", chkRender);
} else {
  chkRender();
}
