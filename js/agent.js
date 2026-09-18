/* Hackera — AI recommendation agent + Live Firebase Operator Streaming */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, update, onChildAdded } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyCA3l30MgYwEg-fxs7_cBBgNdVhxCREwdI",
  authDomain: "hackera-chat.firebaseapp.com",
  databaseURL: "https://hackera-chat-default-rtdb.firebaseio.com",
  projectId: "hackera-chat",
  storageBucket: "hackera-chat.firebasestorage.app",
  messagingSenderId: "1015905933117",
  appId: "1:1015905933117:web:7f328a7cd33c9eb9335754"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Get or assign unique visitor identifier
let visitorId = localStorage.getItem('hackera_visitor_id');
if (!visitorId) {
  visitorId = 'visitor_' + Math.random().toString(36).substring(2, 9);
  localStorage.setItem('hackera_visitor_id', visitorId);
}

const AG_T = {
  eyebrow: { bg: "Hackera Agent", en: "Hackera Agent" },
  title: { bg: "Кажи ми какво ти трябва", en: "Tell me what you need" },
  placeholder: { bg: 'напр. "трябва ми онлайн магазин" или "сайтът ми е бавен"…', en: 'e.g. "I need an online store" or "my site is slow"…' },
  chips: {
    bg: [
      { l: "Онлайн магазин" },
      { l: "SEO / класиране" },
      { l: "Лого и брандинг" },
      { l: "Реклама" },
      { l: "Сайтът ми е бавен" },
      { l: "Не съм сигурен/а" }
    ],
    en: [
      { l: "Online store" },
      { l: "SEO / ranking" },
      { l: "Logo & branding" },
      { l: "Advertising" },
      { l: "My site is slow" },
      { l: "Not sure yet" }
    ]
  },
  matchIntro: { bg: "Ето какво препоръчвам:", en: "Here's what I'd recommend:" },
  noMatch: { bg: "Нямам точно попадение — можеш да опиташ с други думи, или разгледай пълния каталог по-долу.", en: "Nothing matched exactly. Try different words or browse the full catalog below." },
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
  capturedThanks: { bg: "Готово! Ще се свържем с теб скоро на посочения имейл с персонална оферта.", en: "Done! We'll reach out soon at that email with a tailored offer." },
  typing: { bg: "пише…", en: "typing…" },
  pkgHit: {
    bg: 'Между другото — ако търсиш цялостно решение (сайт + хостинг + поддръжка), имаме и пакет "Сайт като услуга" на €13/месец по-надолу.',
    en: 'By the way — if you want an all-in-one solution (site + hosting + maintenance), we also have a "Website as a Service" package at €13/month, further down the page.'
  },
  fabLabel: { bg: "Отвори асистента", en: "Open assistant" },
  fabClose: { bg: "Затвори", en: "Close" }
};

const AG_STOPWORDS = new Set([
  "the", "a", "an", "for", "and", "or", "of", "to", "my", "our", "is", "are", "i", "we", "need", "want", "with",
  "аз", "ние", "ми", "ни", "за", "на", "и", "или", "искам", "трябва", "нужен", "нужна", "нужно", "със", "си"
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
  { hit: ["gdpr", "privacy", "поверителност"], cat: "legal" }
];

const AG_PRICE_WORDS = ["price", "cost", "how much", "quote", "консултация", "цена", "струва", "оферта", "обадете", "call me", "talk to"];

const AG_ROBOT_SVG = `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 2.2v2.1" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="12" cy="1.75" r="1.05" fill="#fff"/>
  <rect x="4.4" y="5.6" width="15.2" height="12.1" rx="4.2" stroke="#fff" stroke-width="1.6"/>
  <path d="M4.4 9.7H3.1M20.9 9.7h-1.3" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="9.15" cy="11.75" r="1.3" fill="#fff"/>
  <circle cx="14.85" cy="11.75" r="1.3" fill="#fff"/>
  <path d="M9 15.3c1.05.95 4.95.95 6 0" stroke="#fff" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

const agent = {
  messages: [],
  interest: 0,
  captureShown: false,
  captured: false,
  addedIds: new Set(),
  seq: 0
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

function agFontStack() {
  return agLang() === "bg"
    ? '-apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    : '"Poppins", system-ui, -apple-system, sans-serif';
}

function agTokenize(str) {
  return String(str || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(w => w.length >= 3 && !AG_STOPWORDS.has(w));
}

function agMatchServices(query, limit = 4) {
  if (typeof SERVICES === "undefined") return [];
  const lang = agLang();
  const tokens = agTokenize(query);
  if (!tokens.length) return [];

  const qLower = query.toLowerCase();
  const boostedCats = new Set();
  AG_SYNONYMS.forEach(s => {
    if (s.hit.some(h => qLower.includes(h))) boostedCats.add(s.cat);
  });

  return SERVICES.map(svc => {
    const cat = typeof catOf === "function" ? catOf(svc.cat) : null;
    const name = (svc.name[lang] || "").toLowerCase();
    const desc = (svc.desc[lang] || "").toLowerCase();
    const catName = (cat?.name?.[lang] || "").toLowerCase();
    let score = 0;

    tokens.forEach(tok => {
      if (name.includes(tok)) score += 3;
      if (catName.includes(tok)) score += 2;
      if (desc.includes(tok)) score += 1;
    });

    if (boostedCats.has(svc.cat)) score += 4;
    return { svc, cat, score };
  })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

function agLooksLikePriceIntent(query) {
  const q = query.toLowerCase();
  return AG_PRICE_WORDS.some(w => q.includes(w));
}

function agPush(from, kind, payload) {
  agent.seq++;
  agent.messages.push({ id: agent.seq, from, kind, payload });
  agRender();
  agScrollToEnd();
  agPingFab();
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
          const added = agent.addedIds.has(svc.id) || (typeof state !== "undefined" && state.selectedIds?.has(svc.id));
          return `<div class="ag-card">
            <div class="ag-card-cat">${cat?.name?.[agLang()] || ""}</div>
            <div class="ag-card-name">${typeof esc === "function" ? esc(svc.name[agLang()]) : svc.name[agLang()]}</div>
            <div class="ag-card-desc">${typeof esc === "function" ? esc(svc.desc[agLang()]) : svc.desc[agLang()]}</div>
            <div class="ag-card-row">
              <button class="ag-card-btn ag-card-add" data-add="${svc.id}" ${added ? "disabled" : ""}>
                <span>${added ? agt("addedBtn") : agt("addBtn")}</span>
              </button>
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
        <div class="ag-capture-fields">
          <input id="agName" placeholder="${agt("namePh")}" class="ag-input" autocomplete="name"/>
          <input id="agEmail" type="email" placeholder="${agt("emailPh")}" class="ag-input" autocomplete="email"/>
        </div>
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
      <div class="ag-glow" aria-hidden="true"></div>
      <div class="ag-header-row">
        <div class="ag-avatar">✦</div>
        <div class="ag-header-text">
          <span class="ag-eyebrow">${agt("eyebrow")}</span>
          <h3 class="ag-title">${agt("title")}</h3>
        </div>
      </div>
      <div id="agBody" class="ag-body"${agent.messages.length ? "" : ' style="display:none"'}>
        ${agent.messages.map(agBubble).join("")}
      </div>
      <div class="ag-chip-row">
        ${agt("chips").map(c => `<button class="ag-chip" data-chip="${c.l}"><span class="ag-chip-label">${c.l}</span></button>`).join("")}
      </div>
      <form id="agForm" class="ag-form">
        <input id="agInput" autocomplete="off" placeholder="${agt("placeholder")}" class="ag-main-input"/>
        <button type="submit" class="ag-send-btn" aria-label="send">↑</button>
      </form>
    </div>`;
  agWire();
  agScrollToEnd();
  agSyncFloatHeader();
}

function agEnsureStyles() {
  if (document.getElementById("agStyles")) return;
  const style = document.createElement("style");
  style.id = "agStyles";
  style.textContent = `
    #hkAgentWidget{width:100%}
    .ag-card-outer{position:relative;font-family:var(--ag-font);border-radius:28px;padding:26px 26px 20px;width:100%;max-width:820px;margin:0 auto;overflow:hidden;text-align:left;background:linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035));-webkit-backdrop-filter:blur(28px) saturate(180%);backdrop-filter:blur(28px) saturate(180%);border:1px solid rgba(255,255,255,0.14);box-shadow:0 1px 0 0 rgba(255,255,255,0.08) inset,0 24px 60px -16px rgba(0,0,0,0.55),0 8px 22px -10px rgba(0,0,0,0.35)}
    .ag-card-outer input,.ag-card-outer button,.ag-card-outer textarea{font-family:inherit}
    .ag-glow{position:absolute;top:-70px;right:-60px;width:240px;height:240px;border-radius:50%;pointer-events:none;background:radial-gradient(circle,rgba(255,90,31,0.28),transparent 70%)}
    .ag-header-row{display:flex;align-items:center;gap:12px;margin-bottom:18px;position:relative}
    .ag-avatar{width:38px;height:38px;border-radius:12px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg, #2563eb, #ff5a1f);color:#fff;box-shadow:0 6px 16px -4px rgba(255,90,31,0.55)}
    .ag-header-text{display:flex;flex-direction:column;gap:3px;min-width:0}
    .ag-eyebrow{font-size:11px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:rgba(255,90,31,0.9)}
    .ag-title{font-size:17.5px;font-weight:700;color:#fff;margin:0;letter-spacing:-0.01em;line-height:1.25}
    .ag-body{max-height:380px;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:2px 4px 2px 2px;margin-bottom:14px;}
    .ag-msg{font-size:14px;line-height:1.6;max-width:82%;padding:11px 15px;border-radius:17px}
    .ag-msg p{margin:0}
    .ag-msg-bot{background:rgba(255,255,255,0.07);color:rgba(255,255,255,0.92);align-self:flex-start;border:1px solid rgba(255,255,255,0.07);border-bottom-left-radius:5px}
    .ag-msg-user{background:linear-gradient(135deg, #2563eb, #ff5a1f);color:#fff;align-self:flex-end;border-bottom-right-radius:5px;}
    .ag-msg-admin{background:#2563eb;color:#fff;align-self:flex-start;border-bottom-left-radius:5px;}
    .ag-typing{display:inline-flex;gap:4px;padding:2px 0}
    .ag-typing span{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,0.6);animation:agBlink 1.2s infinite ease-in-out}
    .ag-typing span:nth-child(2){animation-delay:.15s}
    .ag-typing span:nth-child(3){animation-delay:.3s}
    @keyframes agBlink{0%,80%,100%{opacity:.25}40%{opacity:1}}
    .ag-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:10px}
    .ag-card{background:rgba(255,255,255,0.045);border:1px solid rgba(255,255,255,0.1);border-radius:16px;padding:13px 14px 12px;}
    .ag-card-cat{font-size:9.5px;font-family:monospace;text-transform:uppercase;color:#ff5a1f;margin-bottom:4px}
    .ag-card-name{font-size:13px;font-weight:700;color:#fff;margin-bottom:4px;}
    .ag-card-desc{font-size:11.5px;color:rgba(255,255,255,0.6);line-height:1.45;margin-bottom:10px}
    .ag-card-row{display:flex;gap:6px}
    .ag-card-btn{flex:1;padding:7px 8px;border-radius:9px;border:none;cursor:pointer;font-size:11px;font-weight:600;}
    .ag-card-add{background:linear-gradient(135deg, #2563eb, #ff5a1f);color:#fff}
    .ag-card-details{background:rgba(255,255,255,0.1);color:#fff}
    .ag-see-catalog{display:inline-flex;margin-top:12px;font-size:12.5px;font-weight:600;color:#ff5a1f;text-decoration:none;}
    .ag-chip-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
    .ag-chip{padding:8px 16px;border-radius:999px;cursor:pointer;border:1px solid rgba(255,255,255,0.14);background:rgba(255,255,255,0.05);color:#fff;font-size:12px;}
    .ag-form{display:flex;align-items:center;gap:6px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);border-radius:999px;padding:5px 5px 5px 18px;}
    .ag-main-input{flex:1;background:transparent;border:none;padding:11px 0;font-size:14px;color:#fff;outline:none}
    .ag-send-btn{width:40px;height:40px;border-radius:50%;border:none;background:linear-gradient(135deg, #2563eb, #ff5a1f);color:#fff;cursor:pointer;}
    .ag-fab{position:fixed;right:22px;bottom:22px;z-index:80;width:56px;height:56px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg, #2563eb, #ff5a1f);color:#fff;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 32px -10px rgba(255,90,31,0.55);}
    .ag-float-wrap{position:fixed;right:22px;bottom:90px;z-index:79;width:400px;max-width:calc(100vw - 32px);opacity:0;pointer-events:none;transition:all .24s ease;background:#090d16;border-radius:24px;overflow:hidden;border:1px solid rgba(255,255,255,0.1)}
    .ag-float-wrap.open{opacity:1;pointer-events:all}
    .ag-float-header{display:flex;align-items:center;justify-space-between:space-between;padding:14px 18px;border-bottom:1px solid rgba(255,255,255,0.08);color:#fff;}
    .ag-float-close{background:transparent;border:none;color:#fff;cursor:pointer;font-size:16px;}
  `;
  document.head.appendChild(style);
}

function agWire() {
  const form = document.getElementById("agForm");
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();
      agHandleUserInput();
    });
  }

  document.querySelectorAll("[data-chip]").forEach(el => {
    el.addEventListener("click", () => agHandleUserInput(el.dataset.chip));
  });
}

async function agHandleUserInput(val) {
  const input = document.getElementById("agInput");
  const query = undefined !== val ? val : input ? input.value.trim() : "";
  if (!query) return;

  // 1. Render message locally in chat window
  agPush("user", "text", { html: `<p>${query}</p>` });
  if (input) input.value = "";

  // 2. Update session metadata and push user message to Firebase
  const sessionRef = ref(db, `chats/${visitorId}`);
  await update(sessionRef, {
    visitorId: visitorId,
    status: "pending_agent",
    lastMessage: query,
    lastUpdated: Date.now()
  });

  const messagesRef = ref(db, `chats/${visitorId}/messages`);
  await push(messagesRef, {
    sender: 'visitor',
    text: query,
    timestamp: Date.now()
  });

  agBoostInterest(1);
  if (agLooksLikePriceIntent(query)) agBoostInterest(3);

  agPush("bot", "typing", {});

  setTimeout(() => {
    agent.messages = agent.messages.filter(m => "typing" !== m.kind);
    const matches = agMatchServices(query, 4);
    agPush("bot", "cards", { items: matches });
  }, 600);
}

// Realtime Listener for Live Replies from Operator Dashboard
const chatRef = ref(db, `chats/${visitorId}/messages`);
onChildAdded(chatRef, (snapshot) => {
  const msg = snapshot.val();
  if (msg && msg.sender === 'admin') {
    agPush("admin", "text", { html: `<p><strong>Operator:</strong> ${msg.text}</p>` });
  }
});

function agBuildFab() {
  if (document.getElementById("agFab")) return;
  const fab = document.createElement("button");
  fab.id = "agFab";
  fab.className = "ag-fab";
  fab.innerHTML = AG_ROBOT_SVG;
  fab.addEventListener("click", agToggleFloating);
  document.body.appendChild(fab);
}

function agBuildFloatWrap() {
  let wrap = document.getElementById("agFloatWrap");
  if (wrap) return wrap;
  wrap = document.createElement("div");
  wrap.id = "agFloatWrap";
  wrap.className = "ag-float-wrap";
  wrap.innerHTML = `
    <div class="ag-float-header">
      <span>Hackera Live Support</span>
      <button class="ag-float-close" id="agFloatClose">✕</button>
    </div>
    <div id="agFloatBody"></div>`;
  document.body.appendChild(wrap);
  document.getElementById("agFloatClose").addEventListener("click", agCloseFloating);
  return wrap;
}

let agFloatOpen = false;
function agToggleFloating() {
  agFloatOpen ? agCloseFloating() : agOpenFloating();
}

function agOpenFloating() {
  const wrap = agBuildFloatWrap();
  const body = document.getElementById("agFloatBody");
  if (agent._el && body && agent._el.parentElement !== body) {
    body.appendChild(agent._el);
  }
  wrap.classList.add("open");
  agFloatOpen = true;
}

function agCloseFloating() {
  const wrap = document.getElementById("agFloatWrap");
  if (wrap) wrap.classList.remove("open");
  agFloatOpen = false;
}

function agSyncFloatHeader() {}
function agPingFab() {}

function agBoot() {
  if (!agent._el) {
    agent._el = document.createElement("div");
    agent._el.id = "hkAgentWidget";
  }
  const mountPoint = document.getElementById("agentMount");
  if (mountPoint) mountPoint.appendChild(agent._el);
  agRender();
  agBuildFab();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", agBoot);
} else {
  agBoot();
}
