/* Hackera — AI assistant chat widget (floating bubble, Alibaba-style)
   Self-contained: reads CATS/SERVICES/state/t/icon/toggleService/openDrawer
   from app.js + data.js, which must be loaded before this file. */

const CHAT_T = {
  fabLabel: { bg: "Питай AI асистента", en: "Ask the AI assistant" },
  title: { bg: "Hackera Асистент", en: "Hackera Assistant" },
  subtitle: { bg: "Онлайн · препоръчва услуги за теб", en: "Online · recommends services for you" },
  greet1: { bg: "Здравей! 👋 Аз съм AI асистентът на Hackera.", en: "Hi there! 👋 I'm Hackera's AI assistant." },
  greet2: { bg: "За да ти препоръчам най-подходящите услуги, кажи ми — какъв е адресът на твоя сайт?", en: "To recommend the right services for you, tell me — what's your website URL?" },
  urlPh: { bg: "напр. mysite.bg", en: "e.g. mysite.com" },
  noSite: { bg: "Нямам сайт", en: "I don't have one" },
  askEmail: { bg: "Супер, благодаря! 📩 На кой имейл да пратя препоръките?", en: "Great, thanks! 📩 Which email should I send the recommendations to?" },
  emailPh: { bg: "твоят имейл", en: "your email" },
  errUrl: { bg: "Моля, въведи валиден адрес (напр. site.bg) или натисни „Нямам сайт“.", en: "Please enter a valid address (e.g. site.com) or tap “I don't have one”." },
  errEmail: { bg: "Моля, въведи валиден имейл адрес.", en: "Please enter a valid email address." },
  step1: { bg: "Отварям", en: "Opening" },
  step2: { bg: "Анализирам съдържанието и структурата", en: "Analyzing content and structure" },
  step3: { bg: "Проверявам за пропуснати възможности", en: "Checking for missed opportunities" },
  step4: { bg: "Подбирам най-подходящите услуги от каталога", en: "Picking the best-fit services from the catalog" },
  askType: { bg: "Готово! За да съм максимално точен — кое описва най-добре бизнеса ти?", en: "Done! One more thing — which best describes your business?" },
  typeEcom: { bg: "🛒 Онлайн магазин", en: "🛒 Online store" },
  typeBiz: { bg: "🏢 Фирмен сайт / услуги", en: "🏢 Business / services site" },
  typeNone: { bg: "🚀 Все още нямам сайт", en: "🚀 Don't have a site yet" },
  typeBlog: { bg: "✍️ Блог / съдържание", en: "✍️ Blog / content" },
  recoIntro: { bg: "Ето 3 услуги, които биха дали най-бърз резултат за теб:", en: "Here are 3 services that would give you the fastest results:" },
  addBtn: { bg: "добави", en: "add" },
  addedBtn: { bg: "добавено ✓", en: "added ✓" },
  addAll: { bg: "Добави и трите към заявката", en: "Add all three to my request" },
  seeCatalog: { bg: "Разгледай целия каталог →", en: "Browse the full catalog →" },
  sentNote: { bg: "Изпратих обобщение и на", en: "I've also sent a summary to" },
  allAdded: { bg: "Добавени са и трите! Натисни количката горе вдясно, за да завършиш заявката. 🎉", en: "All three are added! Tap the bag icon top-right to finish your request. 🎉" },
  send: { bg: "Изпрати", en: "Send" },
  restart: { bg: "↻ ново търсене", en: "↻ start over" },
};

function chatLang() {
  return (typeof state !== "undefined" && state.lang) || document.documentElement.lang || "bg";
}
function ct(key) {
  const l = chatLang();
  return (CHAT_T[key] && CHAT_T[key][l]) || (CHAT_T[key] && CHAT_T[key].bg) || "";
}

const RECO_MAP = {
  ecom: { cats: ["ecommerce", "seo", "marketing"], picks: [0, 0, 0] },
  biz: { cats: ["web", "seo", "content"], picks: [0, 0, 0] },
  none: { cats: ["web", "design", "marketing"], picks: [0, 0, 0] },
  blog: { cats: ["content", "seo", "social"], picks: [0, 0, 0] },
};

const chat = {
  open: false,
  started: false,
  stage: "askUrl", // askUrl | askEmail | thinking | askType | reco | done
  url: "",
  email: "",
  bizKey: "",
  messages: [], // { from: 'bot'|'user', html }
  addedIds: new Set(),
};

function chatPush(from, html) {
  chat.messages.push({ from, html });
  renderChat();
  const body = document.getElementById("hkChatBody");
  if (body) body.scrollTop = body.scrollHeight + 999;
}

function chatBubbleHtml(m) {
  const isBot = m.from === "bot";
  return `<div class="hk-msg ${isBot ? "hk-msg-bot" : "hk-msg-user"}">${m.html}</div>`;
}

function renderFab() {
  let fab = document.getElementById("hkChatFab");
  if (fab) return;
  fab = document.createElement("button");
  fab.id = "hkChatFab";
  fab.className = "hk-chat-fab";
  fab.setAttribute("aria-label", ct("fabLabel"));
  fab.innerHTML = `${icon("message-circle", "w-6 h-6")}<span class="hk-chat-fab-ping"></span>`;
  fab.addEventListener("click", toggleChat);
  document.body.appendChild(fab);
  refreshIcons();
}

function toggleChat() {
  chat.open = !chat.open;
  renderChat();
  if (chat.open && !chat.started) {
    chat.started = true;
    setTimeout(() => {
      chatPush("bot", `<p>${ct("greet1")}</p><p style="margin-top:6px">${ct("greet2")}</p>`);
    }, 300);
  }
}

function footerHtml() {
  if (chat.stage === "askUrl") {
    return `
      <form id="hkChatForm" class="hk-chat-form">
        <input id="hkChatInput" autocomplete="off" placeholder="${ct("urlPh")}" class="hk-chat-input"/>
        <button type="submit" class="hk-chat-send" aria-label="${ct("send")}">${icon("arrow-up", "w-4 h-4")}</button>
      </form>
      <button id="hkNoSiteBtn" class="hk-quick-btn hk-quick-btn-full">${ct("noSite")}</button>`;
  }
  if (chat.stage === "askEmail") {
    return `
      <form id="hkChatForm" class="hk-chat-form">
        <input id="hkChatInput" type="email" autocomplete="off" placeholder="${ct("emailPh")}" class="hk-chat-input"/>
        <button type="submit" class="hk-chat-send" aria-label="${ct("send")}">${icon("arrow-up", "w-4 h-4")}</button>
      </form>`;
  }
  if (chat.stage === "askType") {
    return `<div class="hk-quick-row">
      <button class="hk-quick-btn" data-biz="ecom">${ct("typeEcom")}</button>
      <button class="hk-quick-btn" data-biz="biz">${ct("typeBiz")}</button>
      <button class="hk-quick-btn" data-biz="none">${ct("typeNone")}</button>
      <button class="hk-quick-btn" data-biz="blog">${ct("typeBlog")}</button>
    </div>`;
  }
  if (chat.stage === "done" || chat.stage === "reco") {
    return `<button id="hkRestartBtn" class="hk-quick-btn hk-quick-btn-full">${ct("restart")}</button>`;
  }
  return `<div class="hk-typing"><span></span><span></span><span></span></div>`;
}

function renderChat() {
  let panel = document.getElementById("hkChatPanel");
  if (!panel) {
    panel = document.createElement("div");
    panel.id = "hkChatPanel";
    document.body.appendChild(panel);
  }
  panel.className = `hk-chat-panel ${chat.open ? "hk-open" : ""}`;
  panel.innerHTML = `
    <div class="hk-chat-header">
      <div class="hk-chat-avatar">${icon("sparkles", "w-4 h-4")}</div>
      <div class="hk-chat-header-text">
        <div class="hk-chat-title">${ct("title")}</div>
        <div class="hk-chat-sub"><span class="hk-online-dot"></span>${ct("subtitle")}</div>
      </div>
      <button id="hkChatClose" class="hk-chat-close" aria-label="close">${icon("x", "w-4 h-4")}</button>
    </div>
    <div id="hkChatBody" class="hk-chat-body">
      ${chat.messages.map(chatBubbleHtml).join("")}
    </div>
    <div class="hk-chat-footer">${footerHtml()}</div>
  `;
  refreshIcons();
  wireChat();
  const body = document.getElementById("hkChatBody");
  if (body) body.scrollTop = body.scrollHeight + 999;
}

function wireChat() {
  const closeBtn = document.getElementById("hkChatClose");
  if (closeBtn) closeBtn.addEventListener("click", () => { chat.open = false; renderChat(); });

  const form = document.getElementById("hkChatForm");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = document.getElementById("hkChatInput");
      const val = input.value.trim();
      if (chat.stage === "askUrl") handleUrl(val);
      else if (chat.stage === "askEmail") handleEmail(val);
    });
  }

  const noSiteBtn = document.getElementById("hkNoSiteBtn");
  if (noSiteBtn) noSiteBtn.addEventListener("click", () => handleUrl("__none__"));

  document.querySelectorAll("[data-biz]").forEach((b) => {
    b.addEventListener("click", () => handleBizType(b.dataset.biz));
  });

  const restartBtn = document.getElementById("hkRestartBtn");
  if (restartBtn) restartBtn.addEventListener("click", resetChat);

  document.querySelectorAll(".hk-reco-add").forEach((b) => {
    b.addEventListener("click", () => handleAddOne(b.dataset.id, b));
  });
  const addAllBtn = document.getElementById("hkAddAllBtn");
  if (addAllBtn) addAllBtn.addEventListener("click", handleAddAll);
}

function handleUrl(val) {
  const noSite = val === "__none__";
  if (!noSite && (!val || !val.includes("."))) {
    chatPush("bot", `<p>${ct("errUrl")}</p>`);
    return;
  }
  chat.url = noSite ? "" : val;
  if (!noSite) chatPush("user", `<p>${esc(val)}</p>`);
  else chatPush("user", `<p>${ct("noSite")}</p>`);
  chat.stage = "askEmail";
  setTimeout(() => chatPush("bot", `<p>${ct("askEmail")}</p>`), 350);
}

function handleEmail(val) {
  if (!/^\S+@\S+\.\S+$/.test(val)) {
    chatPush("bot", `<p>${ct("errEmail")}</p>`);
    return;
  }
  chat.email = val;
  chatPush("user", `<p>${esc(val)}</p>`);
  chat.stage = "thinking";
  renderChat();
  runThinking();
}

function runThinking() {
  const steps = chat.url
    ? [`${ct("step1")} ${chat.url}…`, ct("step2"), ct("step3"), ct("step4")]
    : [ct("step2"), ct("step3"), ct("step4")];
  let html = `<div class="hk-think-list">${steps.map((s, i) => `<div class="hk-think-item" id="hkThink${i}">${icon("loader-2", "w-3.5 h-3.5 hk-think-spin")}<span>${s}</span></div>`).join("")}</div>`;
  chatPush("bot", html);
  refreshIcons();
  let i = 0;
  const tick = () => {
    const el = document.getElementById(`hkThink${i}`);
    if (el) el.innerHTML = `${icon("check", "w-3.5 h-3.5 hk-think-check")}<span>${steps[i]}</span>`;
    refreshIcons();
    i++;
    if (i < steps.length) {
      setTimeout(tick, 550);
    } else {
      setTimeout(() => {
        chat.stage = "askType";
        chatPush("bot", `<p>${ct("askType")}</p>`);
        sendNotification(
          { Сайт: chat.url || "(няма още)", Имейл: chat.email },
          `Нов лид от AI чатбота — ${chat.url || chat.email}`
        );
      }, 400);
    }
  };
  setTimeout(tick, 500);
}

function handleBizType(key) {
  const labelKey = { ecom: "typeEcom", biz: "typeBiz", none: "typeNone", blog: "typeBlog" }[key];
  chatPush("user", `<p>${ct(labelKey)}</p>`);
  chat.bizKey = key;
  chat.stage = "reco";
  setTimeout(() => showRecommendations(key), 350);
}

function showRecommendations(key) {
  const map = RECO_MAP[key] || RECO_MAP.biz;
  const picks = map.cats.map((catId, i) => {
    const cat = catOf(catId);
    const item = cat.items[map.picks[i]];
    const id = `${catId}-${map.picks[i]}`;
    return { id, cat, name: item[chatLang() === "en" ? 2 : 0], desc: item[chatLang() === "en" ? 3 : 1] };
  });
  const cardsHtml = picks.map((p) => `
    <div class="hk-reco-card">
      <div class="hk-reco-cat">${p.cat.name[chatLang()]}</div>
      <div class="hk-reco-name">${p.name}</div>
      <div class="hk-reco-desc">${p.desc}</div>
      <button class="hk-reco-add" data-id="${p.id}">${icon("plus", "w-3 h-3")} <span>${ct("addBtn")}</span></button>
    </div>`).join("");
  const html = `
    <p>${ct("recoIntro")}</p>
    <div class="hk-reco-list">${cardsHtml}</div>
    <button id="hkAddAllBtn" class="hk-add-all-btn">${icon("shopping-bag", "w-3.5 h-3.5")} ${ct("addAll")}</button>
    <a href="#catalog" class="hk-see-catalog">${ct("seeCatalog")}</a>
    <p class="hk-sent-note">${ct("sentNote")} <strong>${chat.email}</strong>.</p>
  `;
  chat.currentPicks = picks;
  chatPush("bot", html);
}

function handleAddOne(id, btn) {
  toggleService(id);
  chat.addedIds.add(id);
  btn.innerHTML = `${icon("check", "w-3 h-3")} <span>${ct("addedBtn")}</span>`;
  btn.disabled = true;
  refreshIcons();
}

function handleAddAll() {
  (chat.currentPicks || []).forEach((p) => {
    if (!chat.addedIds.has(p.id)) { toggleService(p.id); chat.addedIds.add(p.id); }
  });
  document.querySelectorAll(".hk-reco-add").forEach((b) => {
    b.innerHTML = `${icon("check", "w-3 h-3")} <span>${ct("addedBtn")}</span>`;
    b.disabled = true;
  });
  refreshIcons();
  chat.stage = "done";
  chatPush("bot", `<p>${ct("allAdded")}</p>`);
}

function resetChat() {
  chat.stage = "askUrl";
  chat.url = ""; chat.email = ""; chat.bizKey = ""; chat.addedIds = new Set();
  chatPush("bot", `<p>${ct("greet2")}</p>`);
}

const CHAT_AUTO_OPEN_DELAY_MS = 12000; // auto-opens 12s after page load (10-15s window)

function bootChat() {
  renderFab();
  renderChat();

  // Auto-open the chat once per browser session, shortly after arrival.
  if (!sessionStorage.getItem("hkChatAutoOpened")) {
    setTimeout(() => {
      if (!chat.open) {
        sessionStorage.setItem("hkChatAutoOpened", "1");
        toggleChat();
      }
    }, CHAT_AUTO_OPEN_DELAY_MS);
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootChat);
} else {
  bootChat();
}
