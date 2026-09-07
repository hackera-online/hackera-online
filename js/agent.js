/* Hackera — AI recommendation agent (embedded, full-width, hero)
   Replaces both the old floating chatbot.js AND the broken "analyze my
   site" audit widget in app.js (that widget called two functions —
   rerenderAudit() and AUDIT_STEPS — that were never defined anywhere in
   the codebase, so every submit silently crashed).

   Self-contained: reads CATS/SERVICES/catOf/TOTAL_SERVICES from data.js,
   and state/icon/esc/refreshIcons/sendNotification/toggleService/
   renderModals/renderApp from app.js. Loaded LAST (after app.js), so it
   wraps the already-defined global renderApp() to re-mount itself after
   every full re-render (language switch, cart changes, etc.) without
   losing its own conversation state — the same trick renderModals()
   effectively gets "for free" by living outside #root, applied here via
   a persistent DOM node that gets re-attached to a fresh mount point. */

const AG_T = {
  eyebrow: { bg: "AI асистент", en: "AI assistant" },
  title: { bg: "Кажи ми какво ти трябва", en: "Tell me what you need" },
  placeholder: { bg: "напр. „трябва ми онлайн магазин“ или „сайтът ми е бавен“…", en: "e.g. \"I need an online store\" or \"my site is slow\"…" },
  greet: {
    bg: "Здравей! 👋 Аз съм AI асистентът на Hackera — опиши с няколко думи какво ти трябва (нов сайт, SEO, реклама, лого…) и ще ти покажа точните услуги от каталога с 250+ опции.",
    en: "Hi there! 👋 I'm Hackera's AI assistant — describe in a few words what you need (a new site, SEO, ads, a logo…) and I'll pull the exact services out of the 250+ catalog for you.",
  },
  chips: {
    bg: [
      { e: "🛒", l: "Онлайн магазин" },
      { e: "🔍", l: "SEO / класиране" },
      { e: "🎨", l: "Лого и брандинг" },
      { e: "📣", l: "Реклама" },
      { e: "🐢", l: "Сайтът ми е бавен" },
      { e: "🤷", l: "Не съм сигурен/а" },
    ],
    en: [
      { e: "🛒", l: "Online store" },
      { e: "🔍", l: "SEO / ranking" },
      { e: "🎨", l: "Logo & branding" },
      { e: "📣", l: "Advertising" },
      { e: "🐢", l: "My site is slow" },
      { e: "🤷", l: "Not sure yet" },
    ],
  },
  matchIntro: { bg: "Ето какво препоръчвам:", en: "Here's what I'd recommend:" },
  noMatch: { bg: "Нямам точно попадение — можеш да опиташ с други думи, или разгледай пълния каталог по-долу.", en: "Nothing matched exactly — try different words, or browse the full catalog below." },
  addBtn: { bg: "добави", en: "add" },
  addedBtn: { bg: "добавено ✓", en: "added ✓" },
  detailsBtn: { bg: "детайли", en: "details" },
  seeCatalog: { bg: "Разгледай целия каталог →", en: "Browse the full catalog →" },
  askMoreOrCapture: { bg: "Искаш ли да ти изпратим персонална оферта? Остави име и имейл:", en: "Want a tailored offer sent your way? Leave your name and email:" },
  namePh: { bg: "Име", en: "Name" },
  emailPh: { bg: "Имейл", en: "Email" },
  captureSend: { bg: "Изпрати", en: "Send" },
  captureSkip: { bg: "не сега", en: "not now" },
  errEmail: { bg: "Въведи валиден имейл.", en: "Enter a valid email." },
  errName: { bg: "Въведи име.", en: "Enter your name." },
  capturedThanks: {
    bg: "Готово! 🎉 Ще се свържем с теб скоро на посочения имейл с персонална оферта.",
    en: "Done! 🎉 We'll reach out soon at that email with a tailored offer.",
  },
  typing: { bg: "пише…", en: "typing…" },
  pkgHit: {
    bg: "Между другото — ако търсиш цялостно решение (сайт + хостинг + поддръжка), имаме и пакет „Сайт като услуга“ за 13€/месец, виж по-долу в страницата.",
    en: "By the way — if you want an all-in-one solution (site + hosting + maintenance), we also have a \"Website as a Service\" package at €13/month, further down the page.",
  },
};

function agLang() {
  return (typeof state !== "undefined" && state.lang) || document.documentElement.lang || "en";
}
function agt(key) {
  const l = agLang();
  const entry = AG_T[key];
  if (!entry) return "";
  return entry[l] ?? entry.bg;
}

/* Poppins (loaded site-wide via Google Fonts) only ships Latin + Devanagari
   glyphs — it has no Cyrillic at all. So on the BG page every element using
   font-family:'Poppins' has always silently fallen back to the browser's
   default sans-serif; it was never actually rendering in Poppins to begin
   with. We make that explicit here instead of relying on silent fallback:
   EN gets real Poppins, BG gets the clean system stack that Cyrillic text
   on this site has effectively been using all along. */
function agFontStack() {
  return agLang() === "bg"
    ? "-apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
    : "'Poppins', system-ui, -apple-system, sans-serif";
}

/* ---------- matching engine ---------- */
const AG_STOPWORDS = new Set([
  "the", "a", "an", "for", "and", "or", "of", "to", "my", "our", "is", "are", "i", "we", "need", "want", "with",
  "аз", "ние", "ми", "ни", "за", "на", "и", "или", "искам", "трябва", "нужен", "нужна", "нужно", "със", "със", "си",
]);

const AG_SYNONYMS = [
  { hit: ["shop", "store", "ecommerce", "e-commerce", "sell online", "магазин", "продавам"], cat: "ecommerce" },
  { hit: ["logo", "brand", "branding", "лого", "бранд"], cat: "design" },
  { hit: ["seo", "ranking", "google rank", "класиране", "класирам"], cat: "seo" },
  { hit: ["ads", "advertising", "facebook", "instagram ads", "google ads", "реклама", "рекламa"], cat: "marketing" },
  { hit: ["slow", "speed", "бавен", "бавно", "скорост"], cat: "web" },
  { hit: ["app", "mobile app", "приложение"], cat: "mobile" },
  { hit: ["chatbot", "ai", "чатбот"], cat: "ai" },
  { hit: ["video", "видео"], cat: "video" },
  { hit: ["photo", "снимк", "фотограф"], cat: "photo" },
  { hit: ["hack", "security", "хакнат", "сигурност"], cat: "security" },
  { hit: ["gdpr", "privacy", "поверителност"], cat: "legal" },
];

function agTokenize(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !AG_STOPWORDS.has(w));
}

function agMatchServices(query, limit = 4) {
  const lang = agLang();
  const tokens = agTokenize(query);
  if (!tokens.length) return [];

  // synonym-based category boost
  const qLower = query.toLowerCase();
  const boostedCats = new Set();
  AG_SYNONYMS.forEach((s) => { if (s.hit.some((h) => qLower.includes(h))) boostedCats.add(s.cat); });

  const scored = SERVICES.map((svc) => {
    const cat = catOf(svc.cat);
    const name = (svc.name[lang] || "").toLowerCase();
    const desc = (svc.desc[lang] || "").toLowerCase();
    const catName = (cat?.name?.[lang] || "").toLowerCase();
    let score = 0;
    tokens.forEach((tok) => {
      if (name.includes(tok)) score += 3;
      if (catName.includes(tok)) score += 2;
      if (desc.includes(tok)) score += 1;
    });
    if (boostedCats.has(svc.cat)) score += 4;
    return { svc, cat, score };
  });

  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit);
}

const AG_PRICE_WORDS = ["price", "cost", "how much", "quote", "консултация", "цена", "струва", "оферта", "обадете", "call me", "talk to"];
function agLooksLikePriceIntent(query) {
  const q = query.toLowerCase();
  return AG_PRICE_WORDS.some((w) => q.includes(w));
}

/* ---------- state ---------- */
const agent = {
  messages: [], // { id, from: 'bot'|'user', kind: 'text'|'cards'|'capture'|'typing', payload }
  interest: 0,
  captureShown: false,
  captured: false,
  addedIds: new Set(),
  seq: 0,
};

function agPush(from, kind, payload) {
  agent.seq++;
  agent.messages.push({ id: agent.seq, from, kind, payload });
  agRender();
  agScrollToEnd();
}

function agScrollToEnd() {
  const body = document.getElementById("agBody");
  if (body) body.scrollTop = body.scrollHeight + 999;
}

function agBoostInterest(n) {
  agent.interest += n;
  agMaybeOfferCapture();
}

function agMaybeOfferCapture() {
  if (agent.captured || agent.captureShown) return;
  if (agent.interest >= 4) {
    agent.captureShown = true;
    setTimeout(() => agPush("bot", "capture", {}), 350);
  }
}

/* ---------- rendering ---------- */
function agBubble(m) {
  if (m.kind === "typing") {
    return `<div class="ag-msg ag-msg-bot"><span class="ag-typing"><span></span><span></span><span></span></span></div>`;
  }
  if (m.kind === "text") {
    return `<div class="ag-msg ag-msg-${m.from}">${m.payload.html}</div>`;
  }
  if (m.kind === "cards") {
    const cards = m.payload.items;
    if (!cards.length) {
      return `<div class="ag-msg ag-msg-bot"><p>${agt("noMatch")}</p><a href="#catalog" class="ag-see-catalog">${agt("seeCatalog")}</a></div>`;
    }
    return `<div class="ag-msg ag-msg-bot">
      <p>${agt("matchIntro")}</p>
      <div class="ag-cards">
        ${cards.map(({ svc, cat }) => {
          const added = agent.addedIds.has(svc.id) || (typeof state !== "undefined" && state.selectedIds.has(svc.id));
          return `<div class="ag-card">
            <div class="ag-card-cat">${cat?.name?.[agLang()] || ""}</div>
            <div class="ag-card-name">${esc(svc.name[agLang()])}</div>
            <div class="ag-card-desc">${esc(svc.desc[agLang()])}</div>
            <div class="ag-card-row">
              <button class="ag-card-btn ag-card-add" data-add="${svc.id}" ${added ? "disabled" : ""}>${icon(added ? "check" : "plus", "w-3 h-3")} <span>${added ? agt("addedBtn") : agt("addBtn")}</span></button>
              <button class="ag-card-btn ag-card-details" data-details="${svc.id}">${agt("detailsBtn")}</button>
            </div>
          </div>`;
        }).join("")}
      </div>
      <a href="#catalog" class="ag-see-catalog">${agt("seeCatalog")}</a>
    </div>`;
  }
  if (m.kind === "capture") {
    return `<div class="ag-msg ag-msg-bot">
      <p>${agt("askMoreOrCapture")}</p>
      <form id="agCaptureForm" class="ag-capture-form">
        <input id="agName" placeholder="${agt("namePh")}" class="ag-input" autocomplete="name"/>
        <input id="agEmail" type="email" placeholder="${agt("emailPh")}" class="ag-input" autocomplete="email"/>
        <div class="ag-capture-row">
          <button type="submit" class="ag-capture-send">${agt("captureSend")}</button>
          <button type="button" id="agCaptureSkip" class="ag-capture-skip">${agt("captureSkip")}</button>
        </div>
        <span id="agCaptureErr" class="ag-capture-err"></span>
      </form>
    </div>`;
  }
  if (m.kind === "captured") {
    return `<div class="ag-msg ag-msg-bot"><p>${agt("capturedThanks")}</p></div>`;
  }
  return "";
}

function agRender() {
  agEnsureStyles();
  if (!agent._el) {
    agent._el = document.createElement("div");
    agent._el.id = "hkAgentWidget";
  }
  agent._el.innerHTML = `
    <div class="ag-card-outer" style="--ag-font:${agFontStack()}">
      <span class="ag-eyebrow">${icon("sparkles", "w-3.5 h-3.5")} ${agt("eyebrow")}</span>
      <h3 class="ag-title">${agt("title")}</h3>
      <div id="agBody" class="ag-body">
        ${agent.messages.map(agBubble).join("")}
      </div>
      <div class="ag-chip-row">
        ${agt("chips").map((c) => `<button class="ag-chip" data-chip="${esc(c.e + " " + c.l)}">
          <span class="ag-chip-emoji">${c.e}</span><span class="ag-chip-label">${esc(c.l)}</span>
        </button>`).join("")}
      </div>
      <form id="agForm" class="ag-form">
        <input id="agInput" autocomplete="off" placeholder="${agt("placeholder")}" class="ag-main-input"/>
        <button type="submit" class="ag-send-btn" aria-label="send">${icon("arrow-up", "w-4 h-4")}</button>
      </form>
    </div>`;
  refreshIcons();
  agWire();
  agScrollToEnd();
}

function agEnsureStyles() {
  if (document.getElementById("agStyles")) return;
  const style = document.createElement("style");
  style.id = "agStyles";
  style.textContent = `
    #hkAgentWidget{width:100%}
    .ag-card-outer{position:relative;font-family:var(--ag-font);border-radius:24px;padding:22px 20px 18px;width:100%;max-width:640px;margin:0 auto;
      background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14);text-align:left}
    .ag-card-outer input,.ag-card-outer button,.ag-card-outer textarea{font-family:inherit}
    .ag-eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;letter-spacing:.04em;
      text-transform:uppercase;color:var(--orange);margin-bottom:8px}
    .ag-title{font-size:16px;font-weight:700;color:#fff;margin:0 0 12px}
    .ag-body{max-height:340px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding-right:2px;margin-bottom:12px}
    .ag-body::-webkit-scrollbar{width:5px}
    .ag-body::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.18);border-radius:3px}
    .ag-msg{font-size:13.5px;line-height:1.55;max-width:88%;padding:10px 13px;border-radius:14px}
    .ag-msg p{margin:0}
    .ag-msg-bot{background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.9);align-self:flex-start;border-bottom-left-radius:4px}
    .ag-msg-user{background:var(--gradient);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
    .ag-typing{display:inline-flex;gap:4px;padding:2px 0}
    .ag-typing span{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.6);animation:agBlink 1.2s infinite ease-in-out}
    .ag-typing span:nth-child(2){animation-delay:.15s}.ag-typing span:nth-child(3){animation-delay:.3s}
    @keyframes agBlink{0%,80%,100%{opacity:.25}40%{opacity:1}}
    .ag-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
    @media (max-width:520px){.ag-cards{grid-template-columns:1fr}}
    .ag-card{background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);border-radius:12px;padding:10px 11px}
    .ag-card-cat{font-size:9.5px;font-family:monospace;text-transform:uppercase;letter-spacing:.04em;color:var(--orange);margin-bottom:3px}
    .ag-card-name{font-size:12.5px;font-weight:700;color:#fff;margin-bottom:3px;line-height:1.3}
    .ag-card-desc{font-size:11px;color:rgba(255,255,255,0.6);line-height:1.4;margin-bottom:8px}
    .ag-card-row{display:flex;gap:6px}
    .ag-card-btn{flex:1;display:inline-flex;align-items:center;justify-content:center;gap:4px;font-size:10.5px;font-weight:600;
      padding:6px 8px;border-radius:8px;border:none;cursor:pointer}
    .ag-card-add{background:var(--gradient);color:#fff}
    .ag-card-add:disabled{opacity:.6;cursor:default}
    .ag-card-details{background:rgba(255,255,255,0.1);color:#fff}
    .ag-see-catalog{display:inline-block;margin-top:10px;font-size:12px;font-weight:600;color:var(--orange);text-decoration:none}
    .ag-chip-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
    .ag-chip{position:relative;display:inline-flex;align-items:center;gap:8px;padding:7px 14px 7px 7px;
      border-radius:999px;cursor:pointer;border:1px solid rgba(255,255,255,0.14);
      background:linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03));
      box-shadow:0 1px 2px rgba(0,0,0,0.12);
      transition:transform .22s cubic-bezier(.22,1,.36,1),box-shadow .22s ease,border-color .22s ease,background .22s ease}
    .ag-chip-emoji{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;
      border-radius:50%;background:rgba(255,255,255,0.08);font-size:12.5px;flex-shrink:0;
      transition:background .22s ease,transform .22s cubic-bezier(.22,1,.36,1)}
    .ag-chip-label{font-size:12px;font-weight:500;letter-spacing:.01em;color:rgba(255,255,255,0.88);white-space:nowrap}
    .ag-chip:hover{transform:translateY(-2px);border-color:rgba(255,90,31,0.5);
      background:linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05));
      box-shadow:0 10px 22px rgba(255,90,31,0.16),0 2px 6px rgba(0,0,0,0.18)}
    .ag-chip:hover .ag-chip-emoji{background:rgba(255,90,31,0.16);transform:scale(1.08)}
    .ag-chip:active{transform:translateY(0) scale(.97)}
    .ag-form{display:flex;gap:8px}
    .ag-main-input{flex:1;min-width:0;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.16);
      border-radius:14px;padding:12px 14px;font-size:13.5px;color:#fff;outline:none}
    .ag-main-input::placeholder{color:rgba(255,255,255,0.4)}
    .ag-send-btn{width:44px;border-radius:14px;border:none;background:var(--gradient);color:#fff;display:flex;
      align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
    .ag-capture-form{display:flex;flex-direction:column;gap:8px;margin-top:8px}
    .ag-input{background:rgba(255,255,255,0.09);border:1px solid rgba(255,255,255,0.16);border-radius:10px;
      padding:9px 11px;font-size:12.5px;color:#fff;outline:none}
    .ag-input::placeholder{color:rgba(255,255,255,0.4)}
    .ag-capture-row{display:flex;gap:8px;align-items:center}
    .ag-capture-send{flex:1;background:var(--gradient);color:#fff;border:none;border-radius:10px;padding:9px;font-size:12.5px;font-weight:600;cursor:pointer}
    .ag-capture-skip{background:transparent;border:none;color:rgba(255,255,255,0.5);font-size:11.5px;cursor:pointer}
    .ag-capture-err{font-size:11px;color:var(--orange)}
  `;
  document.head.appendChild(style);
}

/* ---------- wiring ---------- */
function agWire() {
  const form = document.getElementById("agForm");
  if (form) form.addEventListener("submit", (e) => { e.preventDefault(); agHandleUserInput(); });

  document.querySelectorAll("[data-chip]").forEach((b) => {
    b.addEventListener("click", () => agHandleUserInput(b.dataset.chip));
  });

  document.querySelectorAll("[data-add]").forEach((b) => {
    b.addEventListener("click", () => {
      const id = b.dataset.add;
      toggleService(id); // global from app.js — also triggers wrapped renderApp -> remount
      agent.addedIds.add(id);
      agBoostInterest(2);
    });
  });
  document.querySelectorAll("[data-details]").forEach((b) => {
    b.addEventListener("click", () => {
      state.openServiceId = b.dataset.details; // global from app.js
      renderModals();
      agBoostInterest(1);
    });
  });

  const capForm = document.getElementById("agCaptureForm");
  if (capForm) {
    capForm.addEventListener("submit", (e) => {
      e.preventDefault();
      agHandleCapture();
    });
  }
  const skipBtn = document.getElementById("agCaptureSkip");
  if (skipBtn) skipBtn.addEventListener("click", () => { agent.captureShown = true; agRender(); });
}

function agHandleUserInput(forcedText) {
  const input = document.getElementById("agInput");
  const raw = forcedText !== undefined ? forcedText : (input ? input.value.trim() : "");
  if (!raw) return;
  agPush("user", "text", { html: `<p>${esc(raw)}</p>` });
  if (input) input.value = "";
  agBoostInterest(1);
  if (agLooksLikePriceIntent(raw)) agBoostInterest(3);

  agPush("bot", "typing", {});
  setTimeout(() => {
    // remove the typing bubble
    agent.messages = agent.messages.filter((m) => m.kind !== "typing");
    const matches = agMatchServices(raw, 4);
    agPush("bot", "cards", { items: matches });
    if (matches.length && Math.random() < 0.35) {
      setTimeout(() => agPush("bot", "text", { html: `<p>${agt("pkgHit")}</p>` }), 500);
    }
  }, 550 + Math.random() * 300);
}

function agHandleCapture() {
  const name = document.getElementById("agName").value.trim();
  const email = document.getElementById("agEmail").value.trim();
  const errEl = document.getElementById("agCaptureErr");
  if (!name) { errEl.textContent = agt("errName"); return; }
  if (!/^\S+@\S+\.\S+$/.test(email)) { errEl.textContent = agt("errEmail"); return; }

  const askedServices = agent.messages
    .filter((m) => m.kind === "cards")
    .flatMap((m) => m.payload.items.map((it) => it.svc.name[agLang()]));
  const lastUserMsgs = agent.messages.filter((m) => m.from === "user" && m.kind === "text")
    .map((m) => m.payload.html.replace(/<[^>]+>/g, "")).slice(-3).join(" | ");

  sendNotification(
    {
      Име: name,
      Имейл: email,
      Интерес: lastUserMsgs || "—",
      Препоръчани_услуги: askedServices.length ? [...new Set(askedServices)].join(", ") : "—",
    },
    `Нов лид от AI асистента — ${name}`
  );

  agent.captured = true;
  agent.messages = agent.messages.filter((m) => m.kind !== "capture");
  agPush("bot", "captured", {});
}

/* ---------- external hooks (used by app.js button wiring) ---------- */
window.hkAgentFocus = function () {
  document.getElementById("agInput")?.focus();
};
window.hkAgentBoost = function (n) {
  agBoostInterest(n || 1);
};
window.hkAgentSeed = function (text) {
  window.hkAgentFocus();
  const input = document.getElementById("agInput");
  if (input && !input.value) input.value = text;
};

/* ---------- mount / persistence across renderApp() re-renders ---------- */
function agMount() {
  const host = document.getElementById("agentMount");
  if (host && agent._el && host.firstChild !== agent._el) {
    host.appendChild(agent._el);
  }
}

function agBoot() {
  agRender();
  agMount();
  if (!agent.messages.length) {
    setTimeout(() => agPush("bot", "text", { html: `<p>${agt("greet")}</p>` }), 300);
  }

  // Wrap the global renderApp (defined in app.js, loaded before this file)
  // so the agent widget survives every full #root re-render (language
  // switch, cart add/remove, drawer open, etc.) without losing its own
  // conversation state — the DOM node is reused, only re-parented.
  if (typeof window.renderApp === "function" && !window.renderApp.__agentWrapped) {
    const original = window.renderApp;
    const wrapped = function () {
      original.apply(this, arguments);
      agMount();
    };
    wrapped.__agentWrapped = true;
    window.renderApp = wrapped;
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", agBoot);
} else {
  agBoot();
}
