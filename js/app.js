/* =========================================================================
   Hackera — static site logic (vanilla JS, no build step)
   -------------------------------------------------------------------------
   No bundler on purpose: index.html and bg/index.html each preload this
   file directly, it renders the whole app into #root, and re-renders it
   in full on every state change. That keeps deployment to "copy the
   files" — no npm install, no build server — which matters for cheap
   shared hosting and, just as much, for a GitHub → Cloudflare Pages
   auto-deploy (push to main, the exact files in this repo go live,
   nothing to compile).

   TABLE OF CONTENTS (search for the heading text to jump to a section)
     Escape helper                     — esc()
     Spotlight hover glow
     Notifications (FormSubmit)        — sendNotification()
     Static UI text                    — t()
     Header / Brand mark
     Hero
     Audit widget                      — the "analyze my site" form
     Category dropdown
     Service grid
     Drawer                            — cart / contact / done steps
     Category detail content           — "Learn more" modal copy
     Split features + demos
     Trust bar
     Category marquee
     Big stats (count-up)
     How it works
     Path picker
     Why Hackera
     Projects (example placeholders)
     Pricing                           — renderPricing(), the €13/month card
     Client results (honest placeholder)
     Testimonials (labeled examples)
     FAQ
     Final CTA
     Footer
     Cookie banner
     Legal modal                       — Terms / Privacy
     Count-up (IntersectionObserver)
     Main app assembly                 — renderApp(), renderModals()
   ========================================================================= */

/* Auto language: Bulgarian browsers landing on "/" go to "/bg/" once.
   A manual EN/BG click is remembered and never redirected again. */
(function () {
  try {
    var path = location.pathname.replace(/index\.html$/, "");
    var saved = localStorage.getItem("hkLang");
    if (!saved && path === "/" && /^bg/i.test(navigator.language || "")) {
      location.replace("/bg/");
    }
  } catch (e) {}
})();

const STRIPE_CHECKOUT_ENABLED = false;

const state = {
  lang: location.pathname.replace(/\/index\.html$/, "").replace(/\/$/, "").split("/").pop() === "bg" ? "bg" : "en",
  catFilter: "all",
  selectedIds: new Set(),
  openServiceId: null,
  drawerOpen: false,
  drawerStep: "cart", // cart | contact | done
  cookieChoice: null, // null | accepted | declined
  legalDoc: null, // null | 'terms' | 'privacy'
  faqOpen: 0,
};

/* ---------- Escape user-typed text before it goes back into innerHTML ---------- */
function esc(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

/* ---------- Spotlight hover glow (delegated so it survives re-renders) ---------- */
document.addEventListener("mousemove", (e) => {
  const el = e.target.closest(".spotlight, .spotlight-dark");
  if (!el) return;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
  el.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
});


/* ---------- Notifications (ivan@hackera.online) ----------
   Sends form data via FormSubmit (https://formsubmit.co) — a free service
   that emails form submissions to the address below with no signup and no
   server needed. The FIRST submission after the site goes live will make
   FormSubmit send a one-time "Activate your form" email to
   ivan@hackera.online — click the link in it once, and every
   submission after that will arrive as a normal email automatically. */
const NOTIFY_EMAIL = "ivan@hackera.online";

async function sendNotification(fields, subject, toEmail) {
  try {
    await fetch(`https://formsubmit.co/ajax/${toEmail || NOTIFY_EMAIL}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ ...fields, _subject: subject, _template: "table" }),
    });
    return true;
  } catch (err) {
    return false;
  }
}

function icon(name, cls) {
  return `<i data-lucide="${name}" class="${cls || ""}"></i>`;
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

/* ---------- Static UI text ---------- */
const UI = {
  heroLine1: { bg: "Провери сайта си.", en: "Check your website." },
  heroLine2: { bg: "Получи репорт на имейл.", en: "Get a report by email." },
  heroSub: { bg: "Пусни линка на своя сайт — ще го прегледаме по скорост, SEO, сигурност и дизайн, и ще ти пратим пълен репорт.", en: "Submit your site's link — we'll review it for speed, SEO, security and design, and send you the full report." },
  browseCta: { bg: "Разгледай услугите", en: "Browse services" },
  checkCta: { bg: "Провери сайта безплатно", en: "Check your site for free" },
  emptyGrid: { bg: "Нищо не съвпада — опитайте друга дума или категория.", en: "Nothing matches — try a different word or category." },
  clearFilters: { bg: "изчисти филтрите ✕", en: "clear filters ✕" },
  allCats: { bg: "Всички категории", en: "All categories" },
  searchCat: { bg: "Търси категория...", en: "Search categories..." },
  noMatch: { bg: "Няма съвпадение.", en: "No matches." },
  learnMore: { bg: "Научи повече", en: "Learn more" },
  add: { bg: "добави", en: "add" },
  added: { bg: "добавено", en: "added" },
  addToRequest: { bg: "Добави към запитването", en: "Add to request" },
  addedToRequest: { bg: "Добавено към запитването", en: "Added to request" },
  yourRequest: { bg: "Вашето запитване", en: "Your request" },
  emptyCart: { bg: 'Все още не сте добавили услуги. Разгледайте каталога и натиснете "добави" при това, което ви трябва.', en: "You haven't added any services yet. Browse the catalog and click "add" on what you need." },
  sendRequest: { bg: "Изпрати запитване", en: "Send request" },
  contactDetails: { bg: "Данни за връзка", en: "Contact details" },
  contactIntro: (n) => ({ bg: `Оставете данни за връзка, за да ви изпратим оферта за избраните ${n} услуги.`, en: `Leave your contact details so we can send you a quote for the ${n} service(s) you've selected.` }),
  namePh: { bg: "Име", en: "Name" },
  phonePh: { bg: "Телефон", en: "Phone" },
  emailPh: { bg: "Имейл", en: "Email" },
  back: { bg: "Назад", en: "Back" },
  send: { bg: "Изпрати", en: "Send" },
  sending: { bg: "Изпращане...", en: "Sending..." },
  sent: { bg: "Изпратено", en: "Sent" },
  sentTitle: { bg: "Заявката е изпратена", en: "Your request has been sent" },
  sentText: { bg: "Ще се свържем с вас скоро на посочения телефон или имейл, с оферта за избраните услуги.", en: "We'll reach out to you soon on the phone or email you provided with a quote for the services you selected." },
  errName: { bg: "Въведете име.", en: "Enter your name." },
  errContact: { bg: "Въведете телефон или имейл за връзка.", en: "Enter a phone or email to reach you." },
  errEmail: { bg: "Въведете валиден имейл.", en: "Enter a valid email." },
  errUrl: { bg: "Въведете валиден адрес на сайт.", en: "Enter a valid website address." },
  errConsent: { bg: "Потвърдете, че сте съгласни с политиката за поверителност.", en: "Please confirm you agree with the privacy policy." },
  consentPrefix: { bg: "Съгласен съм с ", en: "I agree with the " },
  consentLink: { bg: "политиката за поверителност", en: "privacy policy" },
  done: { bg: "Готово!", en: "Done!" },
  servicesCount: (n) => ({ bg: `${n} ${n === 1 ? "услуга" : "услуги"}`, en: `${n} ${n === 1 ? "service" : "services"}` }),
  floatingSelected: { bg: "избрани", en: "selected" },
  cookieText: { bg: "Използваме бисквитки, за да подобрим работата на сайта и да анализираме трафика. Можете да приемете или отхвърлите по всяко време.", en: "We use cookies to improve our site and analyze traffic. You can accept or decline at any time." },
  cookieAccept: { bg: "Приемам всички", en: "Accept all" },
  cookieDecline: { bg: "Отказвам", en: "Decline" },
  cookieLink: { bg: "Политика за поверителност", en: "Privacy Policy" },
};
function t(key, ...args) {
  const entry = UI[key];
  const resolved = typeof entry === "function" ? entry(...args) : entry;
  return resolved[state.lang];
}

/* ---------- Header ---------- */
/* ---------- Brand mark ---------- */
function logoMark(sizeClass = "w-9 h-9") {
  return `<div class="logo-mark ${sizeClass} rounded-2xl flex items-center justify-center shrink-0 relative overflow-hidden" style="background:var(--gradient)">
    <div class="absolute inset-0" style="background:radial-gradient(circle at 30% 20%, rgba(255,255,255,0.35), transparent 55%)"></div>
    <svg viewBox="0 0 24 24" class="relative" width="55%" height="55%" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="9 6 3 12 9 18"></polyline>
      <polyline points="15 6 21 12 15 18"></polyline>
    </svg>
  </div>`;
}
function wordmark(color) {
  return `<span class="font-display font-bold text-xl" style="color:${color};letter-spacing:-0.01em">hackera<span style="color:var(--orange)">.</span></span>`;
}

function renderHeader() {
  return `
  <header class="sticky top-0 z-30" style="background:var(--ink)">
    <div class="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
      <div class="flex items-center gap-2.5 logo-group">
        ${logoMark("w-9 h-9")}
        ${wordmark("#fff")}
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <div class="flex items-center rounded-full p-1" style="background:rgba(255,255,255,0.08)">
          <button data-lang="bg" class="lang-btn px-3 py-1.5 rounded-full text-xs font-mono font-semibold" style="${state.lang === "bg" ? "background:var(--orange);color:#fff" : "color:rgba(255,255,255,0.7)"}">БГ</button>
          <button data-lang="en" class="lang-btn px-3 py-1.5 rounded-full text-xs font-mono font-semibold" style="${state.lang === "en" ? "background:var(--orange);color:#fff" : "color:rgba(255,255,255,0.7)"}">EN</button>
        </div>
        <button id="cartBtn" class="cart-bag-btn${state.selectedIds.size > 0 ? " has-items" : ""}" aria-label="${t("yourRequest")}">
          ${icon("shopping-bag", "w-4 h-4 text-white")}
          ${state.selectedIds.size > 0 ? `<span class="cart-bag-badge pop">${state.selectedIds.size}</span>` : ""}
        </button>
      </div>
    </div>
  </header>`;
}

/* ---------- Hero ---------- */
let heroRevealed = false;
function renderHero() {
  const alreadyRevealed = heroRevealed;
  heroRevealed = true;
  const rc = (n) => alreadyRevealed ? "" : `hero-rise hero-rise-${n} `;
  return `
  <section class="relative overflow-hidden" style="background:var(--ink)">
    <div class="grid-overlay"></div>
    <div class="orb" style="width:340px;height:340px;top:-120px;left:8%;background:rgba(255,90,31,0.35)"></div>
    <div class="orb" style="width:260px;height:260px;top:20px;right:6%;background:rgba(255,90,31,0.2);animation-delay:-4s"></div>
    <div class="absolute inset-0 pointer-events-none" style="background:radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,90,31,0.16), transparent 70%)"></div>
    <div class="max-w-3xl mx-auto px-5 pt-16 pb-16 relative text-center">
      <h1 class="${rc(2)}font-display font-bold" style="font-size:clamp(30px,5vw,46px);color:#fff;letter-spacing:-0.02em;line-height:1.12">
        ${t("heroLine1")}<br/><span class="hero-shimmer-text">${t("heroLine2")}</span>
      </h1>
      <div class="${rc(4)}flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
        <button id="browseCtaBtn" class="btn-glow w-full sm:w-auto px-6 py-3 rounded-full font-semibold text-sm" style="background:var(--gradient);color:#fff">${t("browseCta")}</button>
        <button id="checkCtaBtn" class="btn-ghost-glow w-full sm:w-auto px-6 py-3 rounded-full font-semibold text-sm" style="border:1px solid rgba(255,255,255,0.4);color:#fff">${t("checkCta")}</button>
      </div>
      <div class="${rc(5)}mt-9" id="agentMount"></div>
    </div>
  </section>`;
}

/* ---------- Category dropdown ---------- */
let catDropdownOpen = false;
let catSearchQ = "";

function renderCatDropdown() {
  const current = state.catFilter === "all" ? null : catOf(state.catFilter);
  const visibleCats = CATS.filter((c) => c.name[state.lang].toLowerCase().includes(catSearchQ.toLowerCase()));
  return `
  <div class="relative flex justify-center" id="catDropdownWrap">
    <button id="catDropdownBtn" class="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold" style="color:var(--ink);border:1px solid var(--line);background:var(--paper)">
      ${current ? icon(current.icon, "w-3.5 h-3.5") : ""} ${current ? current.name[state.lang] : t("allCats")}
      <span class="font-mono" style="font-size:11px;color:var(--muted)">· ${current ? current.items.length : TOTAL_SERVICES}</span>
      ${icon("chevron-down", `w-3.5 h-3.5 transition-transform ${catDropdownOpen ? "rotate-180" : ""}`)}
    </button>
    ${catDropdownOpen ? `
    <div class="absolute left-1/2 -translate-x-1/2 top-full mt-2 rounded-xl overflow-hidden z-30 w-[92vw] sm:w-[560px] dropdown-in" style="background:var(--paper);border:1px solid var(--line);box-shadow:0 20px 50px rgba(11,11,12,0.15)">
      <div class="p-2.5 border-b" style="border-color:var(--line-soft)">
        <div class="flex items-center gap-2 rounded-lg px-3 py-2" style="background:var(--pearl)">
          ${icon("search", "w-3.5 h-3.5 text-gray-400")}
          <input id="catSearchInput" autofocus value="${esc(catSearchQ)}" placeholder="${t("searchCat")}" class="flex-1 min-w-0 outline-none bg-transparent" style="font-size:12.5px;color:var(--ink)"/>
        </div>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 max-h-[55vh] overflow-y-auto">
        <button data-cat="all" class="cat-pick col-span-1 sm:col-span-2 flex items-center justify-between px-4 py-3 text-left border-b" style="border-color:var(--line-soft);background:${state.catFilter === "all" ? "var(--orange-soft)" : "transparent"}">
          <span class="font-semibold" style="font-size:13.5px;color:var(--ink)">${t("allCats")}</span>
          <span class="flex items-center gap-2"><span class="font-mono" style="font-size:11px;color:var(--muted)">${TOTAL_SERVICES}</span>${state.catFilter === "all" ? icon("check", "w-3.5 h-3.5") : ""}</span>
        </button>
        ${visibleCats.map((c) => {
          const active = state.catFilter === c.id;
          return `<button data-cat="${c.id}" class="cat-pick flex items-center gap-2.5 px-4 py-3 text-left border-b" style="border-color:var(--line-soft);background:${active ? "var(--orange-soft)" : "transparent"}">
            ${icon(c.icon, "w-3.5 h-3.5")}
            <span style="font-size:13px;color:var(--ink)">${c.name[state.lang]}</span>
            <span class="flex items-center gap-2 ml-auto shrink-0"><span class="font-mono" style="font-size:10.5px;color:var(--muted)">${c.items.length}</span>${active ? icon("check", "w-3.5 h-3.5") : ""}</span>
          </button>`;
        }).join("")}
        ${visibleCats.length === 0 ? `<div class="col-span-1 sm:col-span-2 px-4 py-6 text-center" style="font-size:13px;color:var(--muted)">${t("noMatch")}</div>` : ""}
      </div>
    </div>` : ""}
  </div>`;
}

function wireCatDropdown() {
  document.getElementById("catDropdownBtn")?.addEventListener("click", (e) => {
    e.stopPropagation(); catDropdownOpen = !catDropdownOpen; catSearchQ = ""; rerenderCatDropdown();
  });
  document.querySelectorAll(".cat-pick").forEach((btn) => btn.addEventListener("click", () => {
    state.catFilter = btn.dataset.cat; catDropdownOpen = false; renderApp();
  }));
  const search = document.getElementById("catSearchInput");
  if (search) search.addEventListener("input", (e) => { catSearchQ = e.target.value; rerenderCatDropdown(); });
}
function rerenderCatDropdown() {
  const el = document.getElementById("catDropdownWrap");
  if (!el) return;
  el.outerHTML = renderCatDropdown();
  wireCatDropdown();
  refreshIcons();
  const input = document.getElementById("catSearchInput");
  if (input && catDropdownOpen) {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
}
document.addEventListener("click", (e) => {
  if (catDropdownOpen && !e.target.closest("#catDropdownWrap")) { catDropdownOpen = false; rerenderCatDropdown(); }
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape" && catDropdownOpen) { catDropdownOpen = false; rerenderCatDropdown(); } });

/* ---------- Service grid ---------- */
function getFiltered() {
  return SERVICES.filter((s) => state.catFilter === "all" || s.cat === state.catFilter);
}

function renderServiceCard(s) {
  const cat = catOf(s.cat);
  const selected = state.selectedIds.has(s.id);
  return `
  <div class="service-card card-elevate spotlight rounded-2xl p-6 flex flex-col gap-3.5 relative overflow-hidden ${selected ? "selected" : ""}" style="background:var(--paper);border:1px solid ${selected ? "var(--orange)" : "var(--line)"}">
    <div class="absolute top-0 left-0 right-0 h-0.5" style="background:${selected ? "var(--gradient)" : "transparent"}"></div>
    <div class="flex items-start gap-3">
      <div class="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style="background:var(--gradient);color:#fff">${icon(cat.icon, "w-5 h-5")}</div>
      <div class="min-w-0">
        <div class="font-semibold" style="font-size:14px;color:var(--ink);line-height:1.35">${s.name[state.lang]}</div>
        <div class="font-mono" style="font-size:10.5px;color:var(--orange-deep);margin-top:3px;text-transform:uppercase;letter-spacing:0.03em">${cat.name[state.lang]}</div>
      </div>
    </div>
    <p class="svc-desc" style="font-size:12.5px;color:var(--muted);line-height:1.55">${s.desc[state.lang]}</p>
    <div class="flex items-center gap-2 mt-auto">
      <button data-open="${s.id}" class="svc-open flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-semibold" style="border:1px solid var(--line);color:var(--ink)">${t("learnMore")}</button>
      <button data-toggle="${s.id}" class="svc-toggle flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-mono font-semibold" style="background:${selected ? "var(--ink)" : "var(--orange-soft)"};color:${selected ? "#fff" : "var(--orange)"}">
        ${selected ? icon("check", "w-3.5 h-3.5") : icon("plus", "w-3.5 h-3.5")} ${selected ? t("added") : t("add")}
      </button>
    </div>
  </div>`;
}

function renderGrid() {
  const filtered = getFiltered();
  const cat = state.catFilter !== "all" ? catOf(state.catFilter) : null;
  return `
  <section class="max-w-6xl mx-auto px-5 pb-24 pt-4">
    <div class="flex items-center justify-between mb-4">
      <span class="font-mono" style="font-size:12px;color:var(--muted)">${t("servicesCount", filtered.length)}${cat ? ` · ${cat.name[state.lang]}` : ""}</span>
      ${state.catFilter !== "all" ? `<button id="clearFiltersBtn" class="text-xs font-mono font-semibold" style="color:var(--orange-deep)">${t("clearFilters")}</button>` : ""}
    </div>
    ${filtered.length === 0
      ? `<div class="text-center py-20" style="color:var(--muted)">${t("emptyGrid")}</div>`
      : `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3" id="gridCards">${filtered.map(renderServiceCard).join("")}</div>`}
  </section>`;
}

function wireGrid() {
  document.getElementById("clearFiltersBtn")?.addEventListener("click", () => { state.catFilter = "all"; renderApp(); });
  document.querySelectorAll(".svc-open").forEach((b) => b.addEventListener("click", () => { state.openServiceId = b.dataset.open; renderModals(); }));
  document.querySelectorAll(".svc-toggle").forEach((b) => b.addEventListener("click", () => { toggleService(b.dataset.toggle); }));
}

function toggleService(id) {
  if (state.selectedIds.has(id)) state.selectedIds.delete(id); else state.selectedIds.add(id);
  renderApp();
}

/* ---------- Drawer ---------- */
const drawerForm = { name: "", phone: "", email: "", consent: false, error: "", sending: false };

function renderDrawer() {
  const items = [...state.selectedIds].map((id) => SERVICES.find((s) => s.id === id)).filter(Boolean);
  let title = t("yourRequest") + ` (${items.length})`;
  if (state.drawerStep === "contact") title = t("contactDetails");
  if (state.drawerStep === "done") title = t("sent");

  let body = "";
  if (state.drawerStep === "cart") {
    body = `
    <div class="flex-1 overflow-y-auto px-6 py-4">
      ${items.length === 0
        ? `<p style="font-size:13.5px;color:var(--muted);margin-top:20px">${t("emptyCart")}</p>`
        : `<div class="flex flex-col gap-2">${items.map((s) => `
          <div class="flex items-center justify-between rounded-lg p-3" style="background:var(--pearl);border:1px solid var(--line-soft)">
            <div>
              <div class="font-semibold" style="font-size:13px;color:var(--ink)">${s.name[state.lang]}</div>
              <div class="font-mono" style="font-size:10px;color:var(--muted);margin-top:2px">${catOf(s.cat).name[state.lang]}</div>
            </div>
            <button class="drawer-remove" data-id="${s.id}">${icon("x", "w-3.5 h-3.5 text-gray-400")}</button>
          </div>`).join("")}</div>`}
    </div>
    <div class="px-6 py-5 border-t shrink-0" style="border-color:var(--line)">
      <button id="drawerNextBtn" ${items.length === 0 ? "disabled" : ""} class="w-full flex items-center justify-center gap-2 rounded-full py-3.5 font-semibold text-sm" style="background:${items.length === 0 ? "var(--muted)" : "var(--gradient)"};color:#fff">
        ${t("sendRequest")} ${icon("arrow-right", "w-4 h-4")}
      </button>
    </div>`;
  } else if (state.drawerStep === "contact") {
    body = `
    <form id="contactForm" class="flex-1 flex flex-col px-6 py-5">
      <p style="font-size:13px;color:var(--muted);margin-bottom:16px">${t("contactIntro", items.length)}</p>
      <div class="flex flex-col gap-3">
        <input id="cName" value="${esc(drawerForm.name)}" placeholder="${t("namePh")}" class="rounded-xl px-4 py-3 outline-none" style="font-size:13.5px;background:var(--pearl);border:1px solid var(--line)"/>
        <input id="cPhone" value="${esc(drawerForm.phone)}" placeholder="${t("phonePh")}" class="rounded-xl px-4 py-3 outline-none" style="font-size:13.5px;background:var(--pearl);border:1px solid var(--line)"/>
        <input id="cEmail" value="${esc(drawerForm.email)}" placeholder="${t("emailPh")}" class="rounded-xl px-4 py-3 outline-none" style="font-size:13.5px;background:var(--pearl);border:1px solid var(--line)"/>
        <label class="consent-check">
          <input type="checkbox" id="cConsent" ${drawerForm.consent ? "checked" : ""}/>
          <span class="consent-box">${icon("check", "w-3 h-3")}</span>
          <span class="consent-label">${t("consentPrefix")}<button type="button" id="cConsentLink" class="consent-link">${t("consentLink")}</button></span>
        </label>
        ${drawerForm.error ? `<span style="font-size:12.5px;color:var(--orange)">${drawerForm.error}</span>` : ""}
      </div>
      <div class="flex gap-2 mt-auto pt-5">
        <button type="button" id="drawerBackBtn" class="px-4 py-3 rounded-full text-sm font-semibold" style="border:1px solid var(--line);color:var(--ink)">${t("back")}</button>
        <button type="submit" ${drawerForm.sending ? "disabled" : ""} class="flex-1 flex items-center justify-center gap-2 rounded-full py-3 font-semibold text-sm" style="background:var(--gradient);color:#fff">
          ${drawerForm.sending ? t("sending") : t("send")} ${icon("arrow-right", "w-4 h-4")}
        </button>
      </div>
    </form>`;
  } else if (state.drawerStep === "done") {
    body = `
    <div class="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <div class="w-12 h-12 rounded-full flex items-center justify-center mb-4" style="background:var(--gradient)">${icon("check", "w-5 h-5 text-white")}</div>
      <h3 class="font-display font-bold" style="font-size:17px;color:var(--ink)">${t("sentTitle")}</h3>
      <p class="mt-2" style="font-size:13.5px;color:var(--muted);line-height:1.6">${t("sentText")}</p>
    </div>`;
  }

  return `
  <div id="drawerBackdrop" class="fixed inset-0 z-50 flex justify-end" style="background:${state.drawerOpen ? "rgba(11,11,12,0.5)" : "transparent"};pointer-events:${state.drawerOpen ? "auto" : "none"}">
    <div class="drawer-panel h-full w-full sm:w-96 flex flex-col" style="background:var(--paper);border-left:1px solid var(--line);transform:translateX(${state.drawerOpen ? "0" : "100%"})">
      <div class="flex items-center justify-between px-6 h-16 border-b shrink-0" style="border-color:var(--line)">
        <span class="font-display font-bold" style="font-size:16px;color:var(--ink)">${title}</span>
        <button id="drawerCloseBtn">${icon("x", "w-5 h-5")}</button>
      </div>
      ${body}
    </div>
  </div>`;
}

function wireDrawer() {
  document.getElementById("drawerCloseBtn")?.addEventListener("click", closeDrawer);
  document.getElementById("drawerBackdrop")?.addEventListener("click", (e) => { if (e.target.id === "drawerBackdrop") closeDrawer(); });
  document.querySelectorAll(".drawer-remove").forEach((b) => b.addEventListener("click", () => toggleService(b.dataset.id)));
  document.getElementById("drawerNextBtn")?.addEventListener("click", () => {
    const items = [...state.selectedIds].map((id) => SERVICES.find((s) => s.id === id)).filter(Boolean);
    sendNotification(
      { Услуги: items.map((s) => s.name.bg).join(", "), "Брой услуги": items.length },
      `Ново запитване от кошницата — ${items.length} избрани услуги`
    );
    state.drawerStep = "contact"; renderModals();
  });
  document.getElementById("drawerBackBtn")?.addEventListener("click", () => { state.drawerStep = "cart"; renderModals(); });
  const form = document.getElementById("contactForm");
  if (form) {
    document.getElementById("cName").addEventListener("input", (e) => drawerForm.name = e.target.value);
    document.getElementById("cPhone").addEventListener("input", (e) => drawerForm.phone = e.target.value);
    document.getElementById("cEmail").addEventListener("input", (e) => drawerForm.email = e.target.value);
    document.getElementById("cConsent")?.addEventListener("change", (e) => { drawerForm.consent = e.target.checked; renderModals(); });
    document.getElementById("cConsentLink")?.addEventListener("click", () => { state.legalDoc = "privacy"; renderModals(); });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (!drawerForm.name.trim()) { drawerForm.error = t("errName"); renderModals(); return; }
      if (!drawerForm.phone.trim() && !drawerForm.email.trim()) { drawerForm.error = t("errContact"); renderModals(); return; }
      if (drawerForm.email.trim() && !/^\S+@\S+\.\S+$/.test(drawerForm.email)) { drawerForm.error = t("errEmail"); renderModals(); return; }
      if (!drawerForm.consent) { drawerForm.error = t("errConsent"); renderModals(); return; }
      drawerForm.error = ""; drawerForm.sending = true; renderModals();
      const items = [...state.selectedIds].map((id) => SERVICES.find((s) => s.id === id)).filter(Boolean);
      await sendNotification(
        {
          Име: drawerForm.name,
          Телефон: drawerForm.phone || "—",
          Имейл: drawerForm.email || "—",
          Услуги: items.map((s) => s.name.bg).join(", "),
        },
        `Нова заявка за услуги от ${drawerForm.name}`
      );
      drawerForm.sending = false;
      state.drawerStep = "done";
      renderModals();
    });
  }
}
function closeDrawer() { state.drawerOpen = false; state.drawerStep = "cart"; drawerForm.error = ""; renderApp(); }
function openDrawer() { state.drawerOpen = true; renderModals(); }

/* Minimal category detail placeholder — can be extended */
const CATEGORY_DETAIL = {
  web: { forWhom: { bg: "За бизнеси", en: "For businesses" }, outcome: { bg: "Резултат", en: "Result" }, bullets: [{ bg: "Дизайн", en: "Design" }] },
  default: { forWhom: { bg: "За всички", en: "For everyone" }, outcome: { bg: "Резултат", en: "Result" }, bullets: [{ bg: "Услуга", en: "Service" }] },
};
function getCategoryDetail(catId) { return CATEGORY_DETAIL[catId] || CATEGORY_DETAIL.default; }

function renderDetailModal() {
  if (!state.openServiceId) return "";
  const s = SERVICES.find((x) => x.id === state.openServiceId);
  const cat = catOf(s.cat);
  const selected = state.selectedIds.has(s.id);
  const detail = getCategoryDetail(s.cat);
  return `
  <div id="detailModalBackdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(11,11,12,0.55)">
    <div class="w-full max-w-md rounded-3xl p-7 relative overflow-y-auto" style="background:var(--paper);border:1px solid var(--line);max-height:88vh;box-shadow:0 30px 70px rgba(11,11,12,0.35)">
      <button id="detailCloseBtn" class="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center" style="background:var(--ink);color:#fff;box-shadow:0 4px 12px rgba(11,11,12,0.2)">${icon("x", "w-5 h-5")}</button>
      <div class="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style="background:var(--gradient);color:#fff">${icon(cat.icon, "w-4.5 h-4.5")}</div>
      <span class="font-mono uppercase" style="font-size:11px;color:var(--orange-deep);letter-spacing:0.04em">${cat.name[state.lang]}</span>
      <h3 class="font-display font-bold" style="font-size:21px;color:var(--ink);margin-top:6px;line-height:1.25">${s.name[state.lang]}</h3>
      <p class="mt-2.5" style="font-size:14px;color:var(--muted);line-height:1.6">${s.desc[state.lang]}</p>
      <p class="mt-4" style="font-size:13px;color:var(--muted);line-height:1.65">${detail.forWhom[state.lang]}</p>
      <button id="detailToggleBtn" data-id="${s.id}" class="w-full flex items-center justify-center gap-2 rounded-full py-3 mt-6 font-semibold text-sm" style="background:${selected ? "var(--ink)" : "var(--gradient)"};color:#fff">
        ${selected ? icon("check", "w-4 h-4") : icon("plus", "w-4 h-4")} ${selected ? t("addedToRequest") : t("addToRequest")}
      </button>
    </div>
  </div>`;
}

/* Minimal sections — expanded versions in full site */
function renderTrustBar() {
  return `<div style="background:var(--pearl);border-bottom:1px solid var(--line-soft)">
    <div class="max-w-6xl mx-auto px-5 py-8 text-center">
      <p style="font-size:13px;color:var(--muted)">Trusted by businesses across Bulgaria</p>
    </div>
  </div>`;
}

function renderCategoryMarquee() {
  return ``;
}

function renderSplitFeature() {
  return ``;
}

function renderBigStats() {
  return ``;
}

function renderHowItWorks() {
  return ``;
}

function renderPathPicker() {
  return ``;
}

function renderWhyHackera() {
  return ``;
}

function renderProjects() {
  return ``;
}

function renderPricing() {
  return ``;
}

function renderClientResults() {
  return ``;
}

function renderTestimonials() {
  return ``;
}

function renderFAQ() {
  return ``;
}

function renderFinalCTA() {
  return ``;
}

function renderFooter() {
  return `<footer style="background:var(--paper);border-top:1px solid var(--line)">
    <div class="max-w-6xl mx-auto px-5 py-8 text-center" style="color:var(--muted);font-size:12px">
      <p>© ${new Date().getFullYear()} Hackera. All rights reserved.</p>
    </div>
  </footer>`;
}

function wireFooter() {}

/* Cookie + Legal */
function renderCookieBanner() {
  if (state.cookieChoice) return "";
  return `<div class="fixed bottom-0 left-0 right-0 z-[60] p-4 fade-in-up" id="cookieBanner">
    <div class="max-w-3xl mx-auto rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3" style="background:var(--ink);box-shadow:0 20px 50px rgba(0,0,0,0.35)">
      <p style="font-size:12px;color:rgba(255,255,255,0.75);flex:1">${t("cookieText")}</p>
      <div class="flex gap-2 shrink-0 w-full sm:w-auto">
        <button id="cookieDeclineBtn" class="px-4 py-2 rounded-full text-xs font-semibold" style="border:1px solid rgba(255,255,255,0.3);color:#fff">${t("cookieDecline")}</button>
        <button id="cookieAcceptBtn" class="px-4 py-2 rounded-full text-xs font-semibold" style="background:var(--gradient);color:#fff">${t("cookieAccept")}</button>
      </div>
    </div>
  </div>`;
}

function wireCookieBanner() {
  document.getElementById("cookieAcceptBtn")?.addEventListener("click", () => { state.cookieChoice = "accepted"; renderModals(); });
  document.getElementById("cookieDeclineBtn")?.addEventListener("click", () => { state.cookieChoice = "declined"; renderModals(); });
}

function renderLegalModal() {
  return "";
}

function wireLegalModal() {}

function setupCountUps() {}

function setupReveals() {}

/* Main app */
function renderApp() {
  document.title = state.lang === "bg" ? "Hackera — дигитални услуги" : "Hackera — digital services";
  document.documentElement.lang = state.lang;

  const root = document.getElementById("root");
  root.innerHTML = `
    ${renderHeader()}
    ${renderHero()}
    ${renderTrustBar()}
    <div id="catalog" style="background:var(--pearl);border-bottom:1px solid var(--line-soft)">
      <div class="max-w-6xl mx-auto px-5 py-4">${renderCatDropdown()}</div>
    </div>
    ${renderGrid()}
    ${renderFooter()}
    ${state.selectedIds.size > 0 && !state.drawerOpen ? `
    <button id="floatingCartBtn" class="sm:hidden fixed bottom-5 right-5 z-20 flex items-center gap-2 px-5 py-3.5 rounded-full font-semibold text-sm shadow-lg" style="background:var(--gradient);color:#fff">
      ${icon("shopping-bag", "w-4 h-4")} ${state.selectedIds.size} ${t("floatingSelected")}
    </button>` : ""}
  `;

  document.querySelectorAll(".lang-btn").forEach((b) => b.addEventListener("click", () => {
    const target = b.dataset.lang;
    if (target === state.lang) return;
    try { localStorage.setItem("hkLang", target); } catch (e) {}
    location.href = target === "bg" ? "/bg/" : "/";
  }));
  document.getElementById("cartBtn")?.addEventListener("click", openDrawer);
  document.getElementById("browseCtaBtn")?.addEventListener("click", () => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  document.getElementById("floatingCartBtn")?.addEventListener("click", openDrawer);
  wireCatDropdown();
  wireGrid();
  wireFAQ();
  wireFooter();
  refreshIcons();
  setupCountUps();
  setupReveals();
  renderModals();
}

function wireFAQ() {}

function renderModals() {
  let host = document.getElementById("modalsRoot");
  if (!host) { host = document.createElement("div"); host.id = "modalsRoot"; document.body.appendChild(host); }
  host.innerHTML = `${renderDetailModal()}${renderDrawer()}${renderCookieBanner()}`;

  document.getElementById("detailCloseBtn")?.addEventListener("click", () => { state.openServiceId = null; renderModals(); });
  document.getElementById("detailModalBackdrop")?.addEventListener("click", (e) => { if (e.target.id === "detailModalBackdrop") { state.openServiceId = null; renderModals(); } });
  document.getElementById("detailToggleBtn")?.addEventListener("click", (e) => { toggleService(e.currentTarget.dataset.id); state.openServiceId = null; renderModals(); });

  wireDrawer();
  wireCookieBanner();
  refreshIcons();

  document.body.style.overflow = state.openServiceId || state.drawerOpen ? "hidden" : "auto";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderApp);
} else {
  renderApp();
}
