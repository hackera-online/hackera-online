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
  heroSub: { bg: "Пусни линка на своя сайт — ще го прегледаме по скорост, SEO, сигурност и дизайн, и ще ти пратим пълния резултат.", en: "Submit your site's link — we'll review it for speed, SEO, security and design, and send you the full result." },
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
  emptyCart: { bg: 'Все още не сте добавили услуги. Разгледайте каталога и натиснете "добави" при това, което ви трябва.', en: 'You haven\'t added any services yet. Browse the catalog and press "add" on what you need.' },
  sendRequest: { bg: "Изпрати запитване", en: "Send request" },
  contactDetails: { bg: "Данни за връзка", en: "Contact details" },
  contactIntro: (n) => ({ bg: `Оставете данни за връзка, за да ви изпратим оферта за избраните ${n} услуги.`, en: `Leave your contact details so we can send you an offer for the ${n} selected services.` }),
  namePh: { bg: "Име", en: "Name" },
  phonePh: { bg: "Телефон", en: "Phone" },
  emailPh: { bg: "Имейл", en: "Email" },
  back: { bg: "Назад", en: "Back" },
  send: { bg: "Изпрати", en: "Send" },
  sending: { bg: "Изпращане...", en: "Sending..." },
  sent: { bg: "Изпратено", en: "Sent" },
  sentTitle: { bg: "Заявката е изпратена", en: "Your request has been sent" },
  sentText: { bg: "Ще се свържем с вас скоро на посочения телефон или имейл, с оферта за избраните услуги.", en: "We'll reach out soon at the phone or email you provided, with an offer for the selected services." },
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
  cookieText: { bg: "Използваме бисквитки, за да подобрим работата на сайта и да анализираме трафика. Можете да приемете всички или да откажете незадължителните.", en: "We use cookies to improve site performance and analyze traffic. You can accept all or decline the non-essential ones." },
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
          <button data-lang="bg" class="lang-btn px-3 py-1.5 rounded-full text-xs font-mono font-semibold" style="${state.lang === "bg" ? "background:var(--orange);color:#fff" : "color:rgba(255,255,255,0.6)"}">BG</button>
          <button data-lang="en" class="lang-btn px-3 py-1.5 rounded-full text-xs font-mono font-semibold" style="${state.lang === "en" ? "background:var(--orange);color:#fff" : "color:rgba(255,255,255,0.6)"}">EN</button>
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
let heroRevealed = false; // guards the entrance animation so it plays once, not on every renderApp() re-render
function renderHero() {
  const alreadyRevealed = heroRevealed;
  heroRevealed = true; // the stagger-in only plays once, on first paint — not on every renderApp() re-render (filters, drawer, etc.)
  const rc = (n) => alreadyRevealed ? "" : `hero-rise hero-rise-${n} `;
  return `
  <section class="relative overflow-hidden" style="background:var(--ink)">
    <div class="grid-overlay"></div>
    <div class="orb" style="width:340px;height:340px;top:-120px;left:8%;background:rgba(255,90,31,0.35)"></div>
    <div class="orb" style="width:260px;height:260px;top:20px;right:6%;background:rgba(255,90,31,0.2);animation-delay:-4s"></div>
    <div class="absolute inset-0 pointer-events-none" style="background:radial-gradient(ellipse 60% 50% at 50% 0%, rgba(255,90,31,0.16), transparent 70%)"></div>
    <div class="max-w-3xl mx-auto px-5 pt-16 pb-16 relative text-center">
      <span class="${rc(1)}inline-flex items-center gap-2 px-3 py-1 rounded-full mb-5" style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.14)">
        <span class="eyebrow-dot"></span>
        <span class="font-mono uppercase" style="font-size:11px;color:rgba(255,255,255,0.75);letter-spacing:0.06em">${state.lang === "bg" ? `${TOTAL_SERVICES}+ услуги · 20 категории` : `${TOTAL_SERVICES}+ services · 20 categories`}</span>
      </span>
      <h1 class="${rc(2)}font-display font-bold" style="font-size:clamp(30px,5vw,46px);color:#fff;letter-spacing:-0.02em;line-height:1.12">
        ${t("heroLine1")}<br/><span class="hero-shimmer-text">${t("heroLine2")}</span>
      </h1>
      <p class="${rc(3)}mt-3 mx-auto" style="font-size:15px;color:rgba(255,255,255,0.65);max-width:460px;line-height:1.6">${t("heroSub")}</p>
      <div class="${rc(4)}flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
        <button id="browseCtaBtn" class="btn-glow w-full sm:w-auto px-6 py-3 rounded-full font-semibold text-sm" style="background:var(--gradient);color:#fff">${t("browseCta")}</button>
        <button id="checkCtaBtn" class="btn-ghost-glow w-full sm:w-auto px-6 py-3 rounded-full font-semibold text-sm" style="border:1px solid rgba(255,255,255,0.4);color:#fff">${t("checkCta")}</button>
      </div>
      <div class="${rc(5)}mt-9" id="agentMount"></div>
    </div>
  </section>`;
}

/* ---------- Audit widget ---------- REMOVED.
   This used to be the "analyze my site" form. It's gone because it was
   fully broken: rerenderAudit() and AUDIT_STEPS were called throughout
   this section but never defined anywhere in the codebase, so the very
   first form submit threw a ReferenceError and silently died — nothing
   ever happened when someone clicked "Analyze for free". Replaced by the
   AI agent (js/agent.js), which mounts into the #agentMount div in the
   hero above and actually works. */

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
    <div class="absolute left-1/2 -translate-x-1/2 top-full mt-2 rounded-xl overflow-hidden z-30 w-[92vw] sm:w-[560px] dropdown-in" style="background:var(--paper);border:1px solid var(--line);box-shadow:0 16px 40px rgba(11,11,12,0.16)">
      <div class="p-2.5 border-b" style="border-color:var(--line-soft)">
        <div class="flex items-center gap-2 rounded-lg px-3 py-2" style="background:var(--pearl)">
          ${icon("search", "w-3.5 h-3.5 text-gray-400")}
          <input id="catSearchInput" autofocus value="${catSearchQ}" placeholder="${t("searchCat")}" class="flex-1 min-w-0 outline-none bg-transparent" style="font-size:12.5px;color:var(--ink)"/>
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
  if (el) { el.outerHTML = renderCatDropdown(); wireCatDropdown(); refreshIcons(); }
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
      <button data-toggle="${s.id}" class="svc-toggle flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-mono font-semibold" style="background:${selected ? "var(--ink)" : "var(--pearl)"};color:${selected ? "var(--orange)" : "var(--ink)"};border:1px solid ${selected ? "var(--ink)" : "var(--line)"}">
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
      <button id="drawerNextBtn" ${items.length === 0 ? "disabled" : ""} class="w-full flex items-center justify-center gap-2 rounded-full py-3.5 font-semibold text-sm" style="background:${items.length ? "var(--gradient)" : "var(--pearl)"};color:${items.length ? "#fff" : "var(--muted)"};border:${items.length ? "none" : "1px solid var(--line)"}">
        ${t("sendRequest")} ${icon("arrow-right", "w-4 h-4")}
      </button>
    </div>`;
  } else if (state.drawerStep === "contact") {
    body = `
    <form id="contactForm" class="flex-1 flex flex-col px-6 py-5">
      <p style="font-size:13px;color:var(--muted);margin-bottom:16px">${t("contactIntro", items.length)}</p>
      <div class="flex flex-col gap-3">
        <input id="cName" value="${esc(drawerForm.name)}" placeholder="${t("namePh")}" class="rounded-xl px-4 py-3 outline-none" style="font-size:13.5px;background:var(--pearl);border:1px solid var(--line);color:var(--ink)"/>
        <input id="cPhone" value="${esc(drawerForm.phone)}" placeholder="${t("phonePh")}" class="rounded-xl px-4 py-3 outline-none" style="font-size:13.5px;background:var(--pearl);border:1px solid var(--line);color:var(--ink)"/>
        <input id="cEmail" value="${esc(drawerForm.email)}" placeholder="${t("emailPh")}" class="rounded-xl px-4 py-3 outline-none" style="font-size:13.5px;background:var(--pearl);border:1px solid var(--line);color:var(--ink)"/>
        <label class="consent-check">
          <input type="checkbox" id="cConsent" ${drawerForm.consent ? "checked" : ""}/>
          <span class="consent-box">${icon("check", "w-3 h-3")}</span>
          <span class="consent-label">${t("consentPrefix")}<button type="button" id="cConsentLink" class="consent-link">${t("consentLink")}</button></span>
        </label>
        ${drawerForm.error ? `<span style="font-size:12.5px;color:var(--orange)">${drawerForm.error}</span>` : ""}
      </div>
      <div class="flex gap-2 mt-auto pt-5">
        <button type="button" id="drawerBackBtn" class="px-4 py-3 rounded-full text-sm font-semibold" style="border:1px solid var(--line);color:var(--ink)">${t("back")}</button>
        <button type="submit" ${drawerForm.sending ? "disabled" : ""} class="flex-1 flex items-center justify-center gap-2 rounded-full py-3 font-semibold text-sm" style="background:var(--gradient);color:#fff;opacity:${drawerForm.sending ? 0.7 : 1}">
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

/* ---------- Category detail content (for the "Learn more" modal) ----------
   Gives every service a fuller, category-specific explanation instead of
   repeating the one-line card description. Bullets rotate per item index
   so services within the same category don't all show the same list. */
const CATEGORY_DETAIL = {
  web: {
    forWhom: { bg: "Подходящо за бизнеси, които искат професионално онлайн присъствие, представящо ясно услугите и генериращо запитвания.", en: "A fit for businesses that want a professional online presence that clearly presents their services and generates inquiries." },
    outcome: { bg: "Резултатът е сайт, който зарежда бързо, изглежда добре на всяко устройство и е лесен за управление след старта.", en: "The result is a site that loads fast, looks great on every device, and is easy to manage after launch." },
    bullets: [
      { bg: "Адаптивен дизайн за телефон, таблет и компютър", en: "Responsive design for phone, tablet and desktop" },
      { bg: "SEO-приятелска структура от старта", en: "SEO-friendly structure from day one" },
      { bg: "Интеграция с Google Analytics и Search Console", en: "Integration with Google Analytics and Search Console" },
      { bg: "Формуляр за контакт с имейл известия", en: "Contact form with email notifications" },
      { bg: "Кратко обучение как да редактирате съдържанието сами", en: "A short training on editing the content yourself" },
      { bg: "Препоръки за хостинг и домейн, ако нямате", en: "Hosting and domain guidance if you don't have one" },
    ],
  },
  seo: {
    forWhom: { bg: "Подходящо за сайтове, които вече съществуват, но не се появяват достатъчно високо в Google.", en: "A fit for sites that already exist but don't rank high enough in Google." },
    outcome: { bg: "Резултатът е по-добра видимост в търсачките и повече посетители, които реално търсят вашите услуги.", en: "The result is better search visibility and more visitors who are actually looking for your services." },
    bullets: [
      { bg: "Технически преглед на скорост и индексиране", en: "Technical review of speed and indexing" },
      { bg: "Проучване на ключови думи във вашата ниша", en: "Keyword research in your niche" },
      { bg: "Оптимизация на заглавия и мета описания", en: "Optimization of titles and meta descriptions" },
      { bg: "Препоръки за вътрешно линкване", en: "Internal linking recommendations" },
      { bg: "Месечен отчет за напредъка", en: "Monthly progress report" },
      { bg: "Анализ на конкуренцията в класирането", en: "Competitor ranking analysis" },
    ],
  },
  marketing: {
    forWhom: { bg: "Подходящо за бизнеси, които искат предвидим поток от нови клиенти чрез платена реклама.", en: "A fit for businesses that want a predictable flow of new customers through paid advertising." },
    outcome: { bg: "Резултатът е кампания с ясни цели, проследени резултати и оптимизация за по-нисък разход на клиент.", en: "The result is a campaign with clear goals, tracked results, and optimization for a lower cost per customer." },
    bullets: [
      { bg: "Настройка на проследяване на конверсии", en: "Conversion tracking setup" },
      { bg: "Тестване на няколко варианта на реклами", en: "Testing several ad variations" },
      { bg: "Прецизно таргетиране на аудиторията", en: "Precise audience targeting" },
      { bg: "Седмична оптимизация на бюджета", en: "Weekly budget optimization" },
      { bg: "Ясен отчет с постигнати резултати", en: "A clear report of the results achieved" },
      { bg: "Препоръки за landing страница, ако е нужна", en: "Landing page recommendations if needed" },
    ],
  },
  social: {
    forWhom: { bg: "Подходящо за бизнеси, които искат активно и разпознаваемо присъствие в социалните мрежи.", en: "A fit for businesses that want an active, recognizable presence on social media." },
    outcome: { bg: "Резултатът е последователен график от съдържание, което изгражда доверие и ангажира аудиторията ви.", en: "The result is a consistent content schedule that builds trust and engages your audience." },
    bullets: [
      { bg: "Месечен график със съдържание", en: "Monthly content calendar" },
      { bg: "Дизайн на публикации в стила на бранда", en: "Post design in your brand's style" },
      { bg: "Отговори на коментари и съобщения", en: "Responses to comments and messages" },
      { bg: "Кратък месечен анализ на резултатите", en: "A short monthly performance review" },
      { bg: "Съгласуване на тон и визия между каналите", en: "Consistent tone and visuals across channels" },
      { bg: "Идеи за формати, които реално ангажират", en: "Format ideas that genuinely engage" },
    ],
  },
  content: {
    forWhom: { bg: "Подходящо за сайтове и кампании, на които им липсват ясни, убедителни текстове.", en: "A fit for sites and campaigns that lack clear, persuasive copy." },
    outcome: { bg: "Резултатът са текстове, които обясняват стойността ви ясно и подтикват към действие.", en: "The result is copy that explains your value clearly and drives action." },
    bullets: [
      { bg: "Текст, съобразен с тона на бранда ви", en: "Copy matched to your brand's tone" },
      { bg: "Оптимизация за ключови думи, където е нужно", en: "Keyword optimization where relevant" },
      { bg: "Един кръг корекции по обратна връзка", en: "One round of revisions based on feedback" },
      { bg: "Ясна структура с подзаглавия", en: "Clear structure with subheadings" },
      { bg: "Призиви към действие на подходящите места", en: "Calls to action in the right places" },
      { bg: "Кратки срокове за изпълнение", en: "Fast turnaround times" },
    ],
  },
  design: {
    forWhom: { bg: "Подходящо за бизнеси, на които им трябва визия, която изглежда професионално навсякъде.", en: "A fit for businesses that need visuals that look professional everywhere." },
    outcome: { bg: "Резултатът е разпознаваема визия, готова за употреба онлайн и офлайн.", en: "The result is a recognizable visual identity, ready to use online and offline." },
    bullets: [
      { bg: "Няколко първоначални визии за избор", en: "A few initial concepts to choose from" },
      { bg: "Файлове във всички нужни формати", en: "Files in every format you'll need" },
      { bg: "Кръг корекции по вашите бележки", en: "A round of revisions based on your notes" },
      { bg: "Насоки за консистентна употреба", en: "Guidelines for consistent use" },
      { bg: "Съобразяване със съществуващия ви бранд", en: "Aligned with your existing brand, if any" },
      { bg: "Готовност за печат и за екран", en: "Print-ready and screen-ready output" },
    ],
  },
  video: {
    forWhom: { bg: "Подходящо за бизнеси, които искат да разкажат историята си по по-въздействащ начин.", en: "A fit for businesses that want to tell their story in a more impactful way." },
    outcome: { bg: "Резултатът е видео, готово за сайта ви и социалните мрежи, с ясно послание.", en: "The result is a video ready for your site and social media, with a clear message." },
    bullets: [
      { bg: "Кратък сценарий преди снимките", en: "A short script before filming" },
      { bg: "Професионален монтаж и цветова корекция", en: "Professional editing and color correction" },
      { bg: "Версии за различни платформи (формат/дължина)", en: "Versions for different platforms (format/length)" },
      { bg: "Музика и субтитри при нужда", en: "Music and subtitles where needed" },
      { bg: "Един кръг корекции по монтажа", en: "One round of edit revisions" },
      { bg: "Файлове в качество, готово за качване", en: "Upload-ready file quality" },
    ],
  },
  photo: {
    forWhom: { bg: "Подходящо за бизнеси, на които им трябват качествени, автентични снимки.", en: "A fit for businesses that need quality, authentic photos." },
    outcome: { bg: "Резултатът е готов набор от снимки за сайта, каталога или социалните мрежи.", en: "The result is a ready set of photos for your site, catalog, or social media." },
    bullets: [
      { bg: "Обработка и цветова корекция на всички кадри", en: "Editing and color correction on every shot" },
      { bg: "Избор от разширен набор кадри", en: "Selection from an extended set of shots" },
      { bg: "Файлове в резолюция за печат и за екран", en: "Files in print- and screen-ready resolution" },
      { bg: "Насрочване в удобно за вас време", en: "Scheduled at a time that works for you" },
      { bg: "Насоки за подготовка преди снимките", en: "Preparation guidance before the shoot" },
      { bg: "Бърза доставка на готовите файлове", en: "Fast delivery of the final files" },
    ],
  },
  mobile: {
    forWhom: { bg: "Подходящо за бизнеси, на които им трябва приложение за директна връзка с клиентите.", en: "A fit for businesses that need an app for a direct connection with customers." },
    outcome: { bg: "Резултатът е стабилно приложение, готово за App Store и Google Play.", en: "The result is a stable app, ready for the App Store and Google Play." },
    bullets: [
      { bg: "Дизайн на екраните преди разработка", en: "Screen design before development" },
      { bg: "Тестване на реални устройства", en: "Testing on real devices" },
      { bg: "Публикуване в App Store и Google Play", en: "Publishing to the App Store and Google Play" },
      { bg: "Основна аналитика на употребата", en: "Basic usage analytics" },
      { bg: "Насоки за бъдещи актуализации", en: "Guidance for future updates" },
      { bg: "Push известия при нужда", en: "Push notifications if needed" },
    ],
  },
  ecommerce: {
    forWhom: { bg: "Подходящо за бизнеси, които искат да продават онлайн без технически главоболия.", en: "A fit for businesses that want to sell online without technical headaches." },
    outcome: { bg: "Резултатът е магазин, готов да приема поръчки и плащания от старта.", en: "The result is a store ready to take orders and payments from day one." },
    bullets: [
      { bg: "Настройка на плащания и доставка", en: "Payment and shipping setup" },
      { bg: "Каталог с категории и филтри", en: "Catalog with categories and filters" },
      { bg: "Оптимизация за поръчки от телефон", en: "Optimized for mobile checkout" },
      { bg: "Основна SEO настройка за продукти", en: "Basic SEO setup for products" },
      { bg: "Кратко обучение за управление на магазина", en: "A short training on managing the store" },
      { bg: "Интеграция със счетоводен софтуер при нужда", en: "Accounting software integration if needed" },
    ],
  },
  cloud: {
    forWhom: { bg: "Подходящо за бизнеси, на които им трябва стабилна и сигурна инфраструктура.", en: "A fit for businesses that need stable, secure infrastructure." },
    outcome: { bg: "Резултатът е инфраструктура, която работи надеждно и расте с бизнеса ви.", en: "The result is infrastructure that runs reliably and grows with your business." },
    bullets: [
      { bg: "Настройка съобразена с натоварването ви", en: "Setup matched to your actual load" },
      { bg: "Автоматични резервни копия", en: "Automated backups" },
      { bg: "Мониторинг и известия при проблем", en: "Monitoring and alerts if something breaks" },
      { bg: "Документация за екипа ви", en: "Documentation for your team" },
      { bg: "Оптимизация на разходите за хостинг", en: "Hosting cost optimization" },
      { bg: "Планиране за бъдещ ръст", en: "Planning for future growth" },
    ],
  },
  security: {
    forWhom: { bg: "Подходящо за бизнеси, за които сигурността на данните е приоритет.", en: "A fit for businesses where data security is a priority." },
    outcome: { bg: "Резултатът е сайт или система с намален риск от пробив и загуба на данни.", en: "The result is a site or system with lower risk of breach and data loss." },
    bullets: [
      { bg: "Проверка за уязвимости", en: "Vulnerability assessment" },
      { bg: "Доклад с приоритизирани препоръки", en: "A report with prioritized recommendations" },
      { bg: "Настройка на SSL и защитни правила", en: "SSL setup and security rules" },
      { bg: "План за реакция при инцидент", en: "An incident response plan" },
      { bg: "Обучение на екипа по добри практики", en: "Team training on best practices" },
      { bg: "Периодични повторни проверки", en: "Periodic follow-up checks" },
    ],
  },
  data: {
    forWhom: { bg: "Подходящо за бизнеси, които вземат решения по усещане вместо по данни.", en: "A fit for businesses making decisions by feel instead of by data." },
    outcome: { bg: "Резултатът е ясна картина на това какво работи и какво не в бизнеса ви.", en: "The result is a clear picture of what is and isn't working in your business." },
    bullets: [
      { bg: "Настройка на табла с ключови показатели", en: "Setup of key-metrics dashboards" },
      { bg: "Обяснение на данните на разбираем език", en: "Data explained in plain language" },
      { bg: "Препоръки на база резултатите", en: "Recommendations based on the results" },
      { bg: "Автоматизирани седмични/месечни отчети", en: "Automated weekly/monthly reports" },
      { bg: "Свързване на данни от няколко източника", en: "Connecting data from multiple sources" },
      { bg: "Обучение как да четете таблата сами", en: "Training on reading the dashboards yourself" },
    ],
  },
  ai: {
    forWhom: { bg: "Подходящо за бизнеси, които искат да автоматизират повтарящи се задачи.", en: "A fit for businesses that want to automate repetitive tasks." },
    outcome: { bg: "Резултатът е решение, което спестява време на екипа ви всеки ден.", en: "The result is a solution that saves your team time every day." },
    bullets: [
      { bg: "Анализ кои процеси си струва да се автоматизират", en: "Analysis of which processes are worth automating" },
      { bg: "Тестване с реални данни от бизнеса ви", en: "Testing with your real business data" },
      { bg: "Интеграция със съществуващите ви инструменти", en: "Integration with your existing tools" },
      { bg: "Ясна документация как работи решението", en: "Clear documentation of how the solution works" },
      { bg: "Обучение на екипа за работа с него", en: "Team training on using it" },
      { bg: "План за надграждане при нужда", en: "An upgrade path if you need more later" },
    ],
  },
  crm: {
    forWhom: { bg: "Подходящо за бизнеси, които губят запитвания заради разхвърляна комуникация.", en: "A fit for businesses losing leads to scattered communication." },
    outcome: { bg: "Резултатът е подреден процес, в който нито едно запитване не се губи.", en: "The result is an organized process where no inquiry falls through the cracks." },
    bullets: [
      { bg: "Настройка съобразена с вашия процес на продажби", en: "Setup matched to your sales process" },
      { bg: "Автоматични напомняния за последващи действия", en: "Automated follow-up reminders" },
      { bg: "Импортиране на съществуващите ви контакти", en: "Import of your existing contacts" },
      { bg: "Обучение на екипа за ежедневна работа", en: "Team training for daily use" },
      { bg: "Основни отчети за продажбения процес", en: "Basic sales-pipeline reporting" },
      { bg: "Интеграция с имейл и сайта ви", en: "Integration with email and your website" },
    ],
  },
  pr: {
    forWhom: { bg: "Подходящо за бизнеси, които искат да изградят доверие извън собствените си канали.", en: "A fit for businesses that want to build trust beyond their own channels." },
    outcome: { bg: "Резултатът е повече видимост и доверие пред нова аудитория.", en: "The result is more visibility and trust with a new audience." },
    bullets: [
      { bg: "Изготвяне на ясно послание за медиите", en: "Crafting a clear message for the media" },
      { bg: "Свързване с подходящи медии/партньори", en: "Outreach to relevant media/partners" },
      { bg: "Проследяване на резултатите от публикациите", en: "Tracking the results of coverage" },
      { bg: "Подготовка при кризисна ситуация", en: "Preparation for crisis situations" },
      { bg: "Съгласуване на тона с бранда ви", en: "Tone aligned with your brand" },
      { bg: "Кратък отчет след кампанията", en: "A short report after the campaign" },
    ],
  },
  translation: {
    forWhom: { bg: "Подходящо за бизнеси, които се обръщат към чуждоезична аудитория.", en: "A fit for businesses reaching a foreign-language audience." },
    outcome: { bg: "Резултатът е текст, който звучи естествено, а не буквално преведен.", en: "The result is copy that reads naturally, not literally translated." },
    bullets: [
      { bg: "Превод, съобразен с контекста, не дума по дума", en: "Translation adapted to context, not word-for-word" },
      { bg: "Запазване на тона на оригинала", en: "Preserving the tone of the original" },
      { bg: "Проверка от втори преводач при нужда", en: "A second-translator review if needed" },
      { bg: "Съобразяване с локалните изрази", en: "Adapted to local expressions" },
      { bg: "Кратки срокове за изпълнение", en: "Fast turnaround times" },
      { bg: "Форматиране, готово за директна употреба", en: "Formatting ready for direct use" },
    ],
  },
  training: {
    forWhom: { bg: "Подходящо за екипи, които искат да поемат нещо сами, но им трябва старт.", en: "A fit for teams that want to take something on themselves but need a starting point." },
    outcome: { bg: "Резултатът е екип, който разбира какво прави и защо, не просто следва стъпки.", en: "The result is a team that understands what it's doing and why, not just following steps." },
    bullets: [
      { bg: "Материали на разбираем, практичен език", en: "Materials in clear, practical language" },
      { bg: "Практически примери от вашия бизнес", en: "Practical examples from your own business" },
      { bg: "Възможност за въпроси по темата", en: "A chance to ask questions on the topic" },
      { bg: "Кратки записки за после", en: "Short takeaway notes for later" },
      { bg: "Гъвкав график според вас", en: "A schedule flexible to your team" },
      { bg: "Проследяване на напредъка след обучението", en: "Follow-up to track progress afterward" },
    ],
  },
  maintenance: {
    forWhom: { bg: "Подходящо за собственици на сайтове, които искат спокойствие вместо изненади.", en: "A fit for site owners who want peace of mind instead of surprises." },
    outcome: { bg: "Резултатът е сайт, който работи гладко и се актуализира редовно.", en: "The result is a site that runs smoothly and gets updated regularly." },
    bullets: [
      { bg: "Редовни актуализации и проверки за сигурност", en: "Regular updates and security checks" },
      { bg: "Резервни копия при всяка промяна", en: "Backups with every change" },
      { bg: "Бърза реакция при проблем", en: "Fast response if something breaks" },
      { bg: "Дребни промени по съдържанието включени", en: "Small content changes included" },
      { bg: "Месечен отчет за състоянието на сайта", en: "A monthly site-health report" },
      { bg: "Един контакт за всички технически въпроси", en: "One contact for all technical questions" },
    ],
  },
  legal: {
    forWhom: { bg: "Подходящо за бизнеси, които искат да са в съответствие с GDPR без юридически познания.", en: "A fit for businesses that want GDPR compliance without legal expertise." },
    outcome: { bg: "Резултатът са ясни документи, съобразени с дейността ви, без излишен юридически език.", en: "The result is clear documents matched to your business, without unnecessary legal jargon." },
    bullets: [
      { bg: "Документи, съобразени с реалната ви дейност", en: "Documents matched to your actual business" },
      { bg: "Обяснение на съдържанието на разбираем език", en: "Content explained in plain language" },
      { bg: "Готови за директна публикация на сайта", en: "Ready to publish directly on your site" },
      { bg: "Препоръка за преглед от юрист при сложни случаи", en: "A lawyer-review recommendation for complex cases" },
      { bg: "Актуализация при промяна в дейността", en: "Updates when your business activity changes" },
      { bg: "Кратък списък с чеклист за съответствие", en: "A short compliance checklist" },
    ],
  },
};
function getCategoryDetail(catId) { return CATEGORY_DETAIL[catId] || CATEGORY_DETAIL.web; }

function pickBullets(pool, offset, count) {
  const n = pool.length;
  const out = [];
  for (let k = 0; k < count; k++) out.push(pool[(offset + k) % n]);
  return out;
}

function renderDetailModal() {
  if (!state.openServiceId) return "";
  const s = SERVICES.find((x) => x.id === state.openServiceId);
  const cat = catOf(s.cat);
  const selected = state.selectedIds.has(s.id);
  const detail = getCategoryDetail(s.cat);
  const idx = parseInt(s.id.split("-").pop(), 10) || 0;
  const bullets = pickBullets(detail.bullets, idx, 3);
  return `
  <div id="detailModalBackdrop" class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background:rgba(11,11,12,0.55)">
    <div class="w-full max-w-md rounded-3xl p-7 relative overflow-y-auto" style="background:var(--paper);border:1px solid var(--line);max-height:88vh;box-shadow:0 30px 70px rgba(11,11,12,0.35)" id="detailModalCard">
      <button id="detailCloseBtn" class="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center" style="background:var(--ink);color:#fff;box-shadow:0 4px 12px rgba(11,11,12,0.25)">${icon("x", "w-4 h-4")}</button>
      <div class="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style="background:var(--gradient);color:#fff">${icon(cat.icon, "w-4.5 h-4.5")}</div>
      <span class="font-mono uppercase" style="font-size:11px;color:var(--orange-deep);letter-spacing:0.04em">${cat.name[state.lang]}</span>
      <h3 class="font-display font-bold" style="font-size:21px;color:var(--ink);margin-top:6px;line-height:1.25">${s.name[state.lang]}</h3>
      <p class="mt-2.5" style="font-size:14px;color:var(--muted);line-height:1.6">${s.desc[state.lang]}</p>
      <p class="mt-3" style="font-size:13px;color:var(--ink);line-height:1.65">${detail.forWhom[state.lang]}</p>
      <div class="mt-4 pt-4" style="border-top:1px solid var(--line-soft)">
        <div class="font-mono uppercase" style="font-size:10.5px;color:var(--muted);letter-spacing:0.05em;margin-bottom:9px">${state.lang === "bg" ? "Какво включва" : "What's included"}</div>
        <div class="flex flex-col gap-2">
          ${bullets.map((b) => `<div class="flex items-start gap-2.5"><span style="color:var(--orange-deep)">${icon("check", "w-3.5 h-3.5 mt-0.5 shrink-0")}</span><span style="font-size:13px;color:var(--ink);line-height:1.5">${b[state.lang]}</span></div>`).join("")}
        </div>
      </div>
      <p class="mt-4" style="font-size:13px;color:var(--muted);line-height:1.65">${detail.outcome[state.lang]}</p>
      <button id="detailToggleBtn" data-id="${s.id}" class="w-full flex items-center justify-center gap-2 rounded-full py-3 mt-6 font-semibold text-sm" style="background:${selected ? "var(--ink)" : "var(--gradient)"};color:#fff">
        ${selected ? icon("check", "w-4 h-4") : icon("plus", "w-4 h-4")} ${selected ? t("addedToRequest") : t("addToRequest")}
      </button>
    </div>
  </div>`;
}

/* ---------- Split features + demos ---------- */
function browserChrome(innerHtml) {
  return `<div class="rounded-2xl overflow-hidden w-full" style="border:1px solid var(--line);background:var(--paper);box-shadow:0 20px 50px rgba(11,11,12,0.1)">
    <div class="flex items-center gap-1.5 px-4 py-3" style="border-bottom:1px solid var(--line-soft);background:var(--pearl)">
      <div class="w-2.5 h-2.5 rounded-full" style="background:#E4E1D8"></div>
      <div class="w-2.5 h-2.5 rounded-full" style="background:#E4E1D8"></div>
      <div class="w-2.5 h-2.5 rounded-full" style="background:#E4E1D8"></div>
      <div class="flex-1 mx-3 h-5 rounded-full" style="background:#fff;border:1px solid var(--line-soft)"></div>
    </div>
    <div class="p-5">${innerHtml}</div>
  </div>`;
}

const auditDemo = { revealed: 0, sent: false, timer: null };
const AUDIT_METRICS = [
  { label: { bg: "Скорост", en: "Speed" }, value: 82 },
  { label: { bg: "SEO", en: "SEO" }, value: 76 },
  { label: { bg: "Сигурност", en: "Security" }, value: 91 },
  { label: { bg: "Дизайн", en: "Design" }, value: 68 },
];
function renderAuditDemo() {
  if (!auditDemo.sent) {
    return browserChrome(`<div class="flex flex-col gap-4">${AUDIT_METRICS.map((m, i) => {
      const active = i < auditDemo.revealed;
      return `<div>
        <div class="flex items-center justify-between mb-1.5">
          <span style="font-size:12px;color:var(--ink);font-weight:500">${m.label[state.lang]}</span>
          <span class="font-mono" style="font-size:11px;color:var(--orange-deep);font-weight:600;opacity:${active ? 1 : 0}">${m.value}%</span>
        </div>
        <div class="h-2 rounded-full overflow-hidden" style="background:var(--pearl)">
          <div class="h-full rounded-full" style="width:${active ? m.value : 0}%;background:var(--gradient);transition:width 0.7s cubic-bezier(0.22,1,0.36,1)"></div>
        </div>
      </div>`;
    }).join("")}</div>`);
  }
  return browserChrome(`<div class="flex flex-col items-center justify-center text-center py-6 fade-in-up">
    <div class="w-11 h-11 rounded-full flex items-center justify-center mb-3" style="background:var(--gradient)">${icon("mail", "w-4.5 h-4.5 text-white")}</div>
    <span class="font-display font-bold" style="font-size:14px;color:var(--ink)">${state.lang === "bg" ? "Репортът е изпратен" : "Report sent"}</span>
    <span class="font-mono" style="font-size:10.5px;color:var(--muted);margin-top:4px">report@${state.lang === "bg" ? "клиент.bg" : "client.com"}</span>
  </div>`);
}
function runAuditDemoLoop() {
  clearTimeout(auditDemo.timer);
  const sleep = (ms) => new Promise((r) => auditDemo.timer = setTimeout(r, ms));
  (async function loop() {
    while (document.getElementById("auditDemoMount")) {
      auditDemo.revealed = 0; auditDemo.sent = false; rerenderAuditDemo();
      await sleep(500);
      for (let i = 0; i < AUDIT_METRICS.length; i++) {
        if (!document.getElementById("auditDemoMount")) return;
        auditDemo.revealed = i + 1; rerenderAuditDemo();
        await sleep(650);
      }
      if (!document.getElementById("auditDemoMount")) return;
      await sleep(500);
      auditDemo.sent = true; rerenderAuditDemo();
      await sleep(2200);
    }
  })();
}
function rerenderAuditDemo() {
  const el = document.getElementById("auditDemoMount");
  if (el) el.innerHTML = renderAuditDemo();
}

const addDemo = { hoverIndex: -1, added: [], timer: null };
function addDemoItems() {
  return state.lang === "bg"
    ? ["Лого дизайн", "SEO одит", "Хостинг и домейн", "GDPR политика"]
    : ["Logo Design", "SEO Audit", "Hosting & Domain", "GDPR Policy"];
}
function renderAddDemo() {
  const items = addDemoItems();
  const rows = items.map((name, i) => {
    const isHover = addDemo.hoverIndex === i && !addDemo.added.includes(i);
    const isAdded = addDemo.added.includes(i);
    return `<div class="flex items-center gap-3 rounded-xl px-3 py-2.5" style="background:${isAdded ? "var(--orange-soft)" : isHover ? "var(--pearl)" : "transparent"};border:1px solid ${isAdded ? "var(--orange)" : "var(--line-soft)"};transform:translateX(${isHover ? "3px" : "0"});transition:all 0.3s ease">
      <div class="w-6 h-6 rounded-md flex items-center justify-center shrink-0" style="background:${isAdded ? "var(--orange)" : "var(--orange-soft)"}">${isAdded ? icon("check", "w-3 h-3 text-white") : icon("plus", "w-3 h-3")}</div>
      <div class="h-2 rounded flex-1" style="background:var(--line-soft);max-width:${40 + (name.length % 3) * 15}%"></div>
      <span class="font-mono" style="font-size:9.5px;color:var(--muted);white-space:nowrap">${name}</span>
    </div>`;
  }).join("");
  return browserChrome(`<div class="flex flex-col gap-2.5">${rows}
    <div class="flex items-center justify-between mt-1 pt-3" style="border-top:1px solid var(--line-soft)">
      <span class="font-mono" style="font-size:10px;color:var(--muted)">${state.lang === "bg" ? "избрани" : "selected"}: ${addDemo.added.length}</span>
      <div class="px-3 py-1.5 rounded-full" style="background:${addDemo.added.length ? "var(--gradient)" : "var(--pearl)"}">
        <span class="font-mono" style="font-size:9.5px;color:${addDemo.added.length ? "#fff" : "var(--muted)"};font-weight:600">${t("sendRequest")}</span>
      </div>
    </div>`);
}
function runAddDemoLoop() {
  clearTimeout(addDemo.timer);
  const sleep = (ms) => new Promise((r) => addDemo.timer = setTimeout(r, ms));
  (async function loop() {
    while (document.getElementById("addDemoMount")) {
      addDemo.added = []; addDemo.hoverIndex = -1; rerenderAddDemo();
      await sleep(500);
      const items = addDemoItems();
      for (let i = 0; i < items.length; i++) {
        if (!document.getElementById("addDemoMount")) return;
        addDemo.hoverIndex = i; rerenderAddDemo();
        await sleep(550);
        if (!document.getElementById("addDemoMount")) return;
        addDemo.added.push(i); rerenderAddDemo();
        await sleep(450);
      }
      await sleep(1300);
    }
  })();
}
function rerenderAddDemo() {
  const el = document.getElementById("addDemoMount");
  if (el) el.innerHTML = renderAddDemo();
}

function renderSplitFeature({ reverse, eyebrow, title, text, bullets, mountId }) {
  const textBlock = `
    <div>
      <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full" style="background:var(--orange-soft);border:1px solid rgba(255,90,31,0.25)"><span class="eyebrow-dot"></span><span class="font-mono uppercase" style="font-size:11px;color:var(--orange-deep);letter-spacing:0.06em">${eyebrow}</span></span>
      <h2 class="font-display font-bold" style="font-size:clamp(22px,2.8vw,30px);color:var(--ink);margin-top:10px;line-height:1.2;letter-spacing:-0.01em">${title} <span style="color:var(--orange)">→</span></h2>
      <p class="mt-3" style="font-size:14px;color:var(--muted);line-height:1.65">${text}</p>
      <div class="flex flex-col gap-2.5 mt-6">
        ${bullets.map((b) => `<div class="flex items-center gap-2.5">
          <div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style="background:var(--orange-soft)">${icon("check", "w-2.5 h-2.5")}</div>
          <span style="font-size:13.5px;color:var(--ink)">${b}</span>
        </div>`).join("")}
      </div>
    </div>`;
  const mockBlock = `<div id="${mountId}"></div>`;
  return `<section class="max-w-6xl mx-auto px-5 py-16">
    <div class="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
      ${reverse ? mockBlock + textBlock : textBlock + mockBlock}
    </div>
  </section>`;
}

/* ---------- Trust bar ---------- */
const TRUST_ITEMS = [
  { icon: "shield-check", label: { bg: "GDPR съвместимост", en: "GDPR compliant" } },
  { icon: "receipt", label: { bg: "Прозрачни цени", en: "Transparent pricing" } },
  { icon: "zap", label: { bg: "Бърз отговор", en: "Fast response" } },
  { icon: "phone-call", label: { bg: "Един контакт за всичко", en: "One contact for everything" } },
];
/* ---------- Category marquee ---------- */
function renderCategoryMarquee() {
  const row = CATS.map((c) => `<button class="marquee-chip marquee-pick" data-cat="${c.id}" type="button"><span class="marquee-chip-icon">${icon(c.icon, "w-3 h-3")}</span><span>${c.name[state.lang]}</span></button>`).join("");
  return `
  <div class="marquee-wrap" style="background:var(--paper);border-bottom:1px solid var(--line-soft)">
    <div class="marquee-edge marquee-edge-l" aria-hidden="true"></div>
    <div class="marquee-edge marquee-edge-r" aria-hidden="true"></div>
    <div class="marquee-track">
      <div class="marquee-row">${row}</div>
      <div class="marquee-row" aria-hidden="true">${row}</div>
    </div>
  </div>`;
}
function wireCategoryMarquee() {
  document.querySelectorAll(".marquee-pick").forEach((btn) => btn.addEventListener("click", () => {
    state.catFilter = btn.dataset.cat;
    renderApp();
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  }));
}

function renderTrustBar() {
  return `<div style="background:var(--pearl);border-bottom:1px solid var(--line-soft)">
    <div class="max-w-6xl mx-auto px-5 py-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
      ${TRUST_ITEMS.map((it) => `
      <div class="trust-badge lift flex items-center gap-3 rounded-2xl px-4 py-3.5" style="background:var(--paper);border:1px solid var(--line-soft)">
        <div class="trust-badge-icon w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style="background:var(--orange-soft);color:var(--orange-deep)">${icon(it.icon, "w-4 h-4")}</div>
        <span class="font-medium" style="font-size:12.5px;color:var(--ink);line-height:1.3">${it.label[state.lang]}</span>
      </div>`).join("")}
    </div>
  </div>`;
}

/* ---------- Big stats (count-up) ---------- */
const BIG_STATS = [
  { n: 250, suffix: "+", icon: "layers", label: { bg: "услуги в каталога", en: "services in the catalog" } },
  { n: 20, suffix: "", icon: "shapes", label: { bg: "категории", en: "categories" } },
  { n: 13, suffix: "€", icon: "tag", label: { bg: "старт от / месец", en: "starting from / month" } },
  { n: 12, suffix: "", icon: "calendar-check", label: { bg: "месеца грижа", en: "months of care" } },
];
function renderBigStats() {
  return `<div style="background:var(--paper)">
    <div class="max-w-6xl mx-auto px-5 py-16 grid grid-cols-2 sm:grid-cols-4 gap-4">
      ${BIG_STATS.map((s, i) => `
      <div class="stat-card reveal lift rounded-2xl p-6 relative overflow-hidden" style="background:var(--pearl);border:1px solid var(--line-soft);transition-delay:${i * 0.08}s">
        <div class="stat-card-blob" aria-hidden="true"></div>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4 relative" style="background:var(--gradient);color:#fff;z-index:1">${icon(s.icon, "w-5 h-5")}</div>
        <div class="font-display font-bold count-up relative" data-target="${s.n}" data-suffix="${s.suffix}" style="font-size:clamp(30px,4vw,42px);color:var(--ink);letter-spacing:-0.02em;z-index:1">0${s.suffix}</div>
        <div class="mt-1.5 relative" style="font-size:12.5px;color:var(--muted);z-index:1">${s.label[state.lang]}</div>
      </div>`).join("")}
    </div>
  </div>`;
}

/* ---------- How it works (process timeline) ---------- */
const PROCESS_STEPS = [
  { icon: "search", title: { bg: "Проучване", en: "Discovery" }, text: { bg: "Опознаваме бизнеса и целите ти, преди да предложим решение.", en: "We learn about your business and goals before proposing a solution." } },
  { icon: "pen-tool", title: { bg: "Планиране", en: "Planning" }, text: { bg: "Изготвяме план и оферта — ясни срокове, без изненади.", en: "We prepare a plan and offer — clear timelines, no surprises." } },
  { icon: "palette", title: { bg: "Дизайн", en: "Design" }, text: { bg: "Оформяме визията, съобразена с твоя бранд и аудитория.", en: "We shape the visual direction to fit your brand and audience." } },
  { icon: "cpu", title: { bg: "Разработка", en: "Development" }, text: { bg: "Изграждаме решението стъпка по стъпка, с редовна обратна връзка.", en: "We build the solution step by step, with regular feedback." } },
  { icon: "arrow-right", title: { bg: "Пускане", en: "Launch" }, text: { bg: "Пускаме резултата на живо, след финална проверка.", en: "We launch the result live, after a final check." } },
  { icon: "wrench", title: { bg: "Поддръжка", en: "Support" }, text: { bg: "Оставаме на разположение за грижа и надграждане след старта.", en: "We stay available for care and upgrades after launch." } },
];
function renderHowItWorks() {
  return `<section class="max-w-6xl mx-auto px-5 py-20">
    <div class="text-center mb-14">
      <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full" style="background:var(--orange-soft);border:1px solid rgba(255,90,31,0.25)"><span class="eyebrow-dot"></span><span class="font-mono uppercase" style="font-size:11px;color:var(--orange-deep);letter-spacing:0.06em">${state.lang === "bg" ? "Процес" : "Process"}</span></span>
      <h2 class="font-display font-bold" style="font-size:clamp(24px,3.2vw,34px);color:var(--ink);margin-top:10px;letter-spacing:-0.01em">${state.lang === "bg" ? "От идея до готов резултат" : "From idea to finished result"}</h2>
    </div>
    <div class="relative">
      <div class="hidden lg:block absolute top-[38px] left-[8%] right-[8%] h-px" style="background:var(--line-soft)"></div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5 relative">
        ${PROCESS_STEPS.map((s, i) => `
        <div class="reveal card-elevate spotlight rounded-2xl p-5 h-full relative" style="background:var(--paper);border:1px solid var(--line);box-shadow:0 1px 3px rgba(11,11,12,0.05)">
          <div class="flex items-center justify-between mb-3">
            <div class="rounded-full flex items-center justify-center shrink-0" style="width:38px;height:38px;background:var(--orange-soft);border:1px solid var(--line)">${icon(s.icon, "w-4 h-4")}</div>
            <span class="font-mono font-bold" style="font-size:11px;color:var(--orange-deep)">0${i + 1}</span>
          </div>
          <h3 class="font-display font-bold" style="font-size:14.5px;color:var(--ink)">${s.title[state.lang]}</h3>
          <p class="mt-1.5" style="font-size:12px;color:var(--muted);line-height:1.55">${s.text[state.lang]}</p>
        </div>`).join("")}
      </div>
    </div>
  </section>`;
}

function renderGeoMark() {
  return `<div class="flex justify-center py-10">
    <svg width="28" height="28" viewBox="0 0 24 24"><polygon points="12,1 15,9 23,12 15,15 12,23 9,15 1,12 9,9" fill="var(--orange)" opacity="0.9"/></svg>
  </div>`;
}

/* ---------- Path picker ---------- */
function renderPathPicker() {
  const PATHS = [
    { tags: { bg: ["Малък бизнес", "Занаятчии"], en: ["Small business", "Craftspeople"] }, title: { bg: "Сайт като услуга", en: "Website as a service" }, text: { bg: "Готов пакет за бизнеси, които искат онлайн присъствие без първоначална инвестиция.", en: "A ready-made package for businesses that want an online presence without an upfront investment." }, cta: { bg: "Виж пакета →", en: "See the package →" }, href: "#pricing" },
    { tags: { bg: ["Агенции", "Разрастващ се бизнес"], en: ["Agencies", "Growing businesses"] }, title: { bg: "Избери от каталога", en: "Pick from the catalog" }, text: { bg: "За по-специфични нужди — прегледай 250-те услуги и получи индивидуална оферта.", en: "For more specific needs — browse the 250 services and get a tailored offer." }, cta: { bg: "Разгледай каталога →", en: "Browse the catalog →" }, href: "#catalog" },
  ];
  return `<section class="max-w-5xl mx-auto px-5 py-20">
    <div class="text-center mb-12">
      <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full" style="background:var(--orange-soft);border:1px solid rgba(255,90,31,0.25)"><span class="eyebrow-dot"></span><span class="font-mono uppercase" style="font-size:11px;color:var(--orange-deep);letter-spacing:0.06em">${state.lang === "bg" ? "Кое е за теб" : "Which one fits you"}</span></span>
      <h2 class="font-display font-bold" style="font-size:clamp(24px,3.2vw,34px);color:var(--ink);margin-top:10px;letter-spacing:-0.01em">${state.lang === "bg" ? "Изберете своя път" : "Choose your path"}</h2>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
      ${PATHS.map((p) => `
      <div class="reveal card-elevate spotlight rounded-2xl p-7 h-full" style="background:var(--paper);border:1px solid var(--line)">
        <div class="flex gap-2 mb-4 flex-wrap">${p.tags[state.lang].map((tg) => `<span class="px-2.5 py-1 rounded-full text-xs font-mono font-semibold" style="background:var(--orange-soft);color:var(--orange-deep)">${tg}</span>`).join("")}</div>
        <h3 class="font-display font-bold" style="font-size:20px;color:var(--ink)">${p.title[state.lang]}</h3>
        <p class="mt-2" style="font-size:13.5px;color:var(--muted);line-height:1.6">${p.text[state.lang]}</p>
        <a href="${p.href}" class="inline-block mt-5 text-sm font-semibold" style="color:var(--orange-deep)">${p.cta[state.lang]}</a>
      </div>`).join("")}
    </div>
  </section>`;
}

/* ---------- Why Hackera ---------- */
const WHY_FEATURES = [
  { icon: "clock", title: { bg: "Бърза доставка", en: "Fast delivery" }, text: { bg: "Първите резултати виждаш дни след запитването, не месеци.", en: "You see first results within days of your request, not months." } },
  { icon: "message-square", title: { bg: "Прозрачна комуникация", en: "Transparent communication" }, text: { bg: "Един контакт, ясни срокове и редовна обратна връзка по всяка задача.", en: "One contact, clear timelines and regular updates on every task." } },
  { icon: "trending-up", title: { bg: "Фокус върху бизнеса", en: "Business focus" }, text: { bg: "Решенията тръгват от твоите бизнес цели, не от технологията.", en: "Our solutions start from your business goals, not the technology." } },
  { icon: "bar-chart-3", title: { bg: "Мащабируеми решения", en: "Scalable solutions" }, text: { bg: "Растеш ти — растат и услугите, без да сменяш доставчика.", en: "As you grow, your services grow with you — no need to switch providers." } },
  { icon: "shield-check", title: { bg: "Сигурност на първо място", en: "Security first" }, text: { bg: "GDPR съвместимост и добри практики за сигурност във всичко, което правим.", en: "GDPR compliance and good security practices in everything we do." } },
  { icon: "users", title: { bg: "Дългосрочно партньорство", en: "Long-term partnership" }, text: { bg: "Не спираме след пускането — оставаме на разположение за поддръжка и растеж.", en: "We don't stop at launch — we stay available for support and growth." } },
];
function renderWhyHackera() {
  return `<section class="relative overflow-hidden py-20" style="background:var(--ink)">
    <div class="grid-overlay"></div>
    <div class="orb" style="width:300px;height:300px;bottom:-100px;right:10%;background:rgba(255,90,31,0.22)"></div>
    <div class="max-w-6xl mx-auto px-5 relative">
      <div class="text-center mb-14">
        <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full" style="background:rgba(255,90,31,0.12);border:1px solid rgba(255,90,31,0.32)"><span class="eyebrow-dot"></span><span class="font-mono uppercase" style="font-size:11px;color:var(--orange);letter-spacing:0.06em">${state.lang === "bg" ? "Защо Hackera" : "Why Hackera"}</span></span>
        <h2 class="font-display font-bold" style="font-size:clamp(24px,3.2vw,34px);color:#fff;margin-top:10px;letter-spacing:-0.01em">${state.lang === "bg" ? "Всичко дигитално, на едно място" : "Everything digital, in one place"}</h2>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" style="grid-auto-flow:dense">
        ${WHY_FEATURES.map((f, i) => {
          if (i === 0) {
            return `
            <div class="reveal card-elevate-dark spotlight-dark lg:col-span-2 lg:row-span-2 rounded-2xl p-7 h-full relative flex flex-col justify-between" style="background:linear-gradient(160deg, rgba(255,90,31,0.16), rgba(255,255,255,0.03));border:1px solid rgba(255,90,31,0.3)">
              <div>
                <div class="rounded-xl flex items-center justify-center" style="width:44px;height:44px;background:rgba(255,90,31,0.18)">${icon(f.icon, "w-5 h-5")}</div>
                <h3 class="font-display font-bold" style="font-size:19px;color:#fff;margin-top:18px">${f.title[state.lang]} <span style="color:var(--orange)">→</span></h3>
                <p class="mt-2" style="font-size:13.5px;color:rgba(255,255,255,0.62);line-height:1.6;max-width:340px">${f.text[state.lang]}</p>
              </div>
              <div class="flex items-end gap-2 mt-8">
                <span class="font-display font-bold" style="font-size:44px;color:var(--orange);letter-spacing:-0.02em">72</span>
                <span class="font-mono" style="font-size:12px;color:rgba(255,255,255,0.5);margin-bottom:8px">${state.lang === "bg" ? "часа до първи резултат" : "hours to first result"}</span>
              </div>
            </div>`;
          }
          return `
          <div class="reveal card-elevate-dark spotlight-dark rounded-2xl p-6 h-full" style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.14)">
            <div class="rounded-xl flex items-center justify-center" style="width:40px;height:40px;background:rgba(255,90,31,0.14)">${icon(f.icon, "w-4.5 h-4.5")}</div>
            <h3 class="font-display font-bold" style="font-size:15.5px;color:#fff;margin-top:16px">${f.title[state.lang]} <span style="color:var(--orange)">→</span></h3>
            <p class="mt-1.5" style="font-size:12.5px;color:rgba(255,255,255,0.6);line-height:1.55">${f.text[state.lang]}</p>
          </div>`;
        }).join("")}
      </div>
    </div>
  </section>`;
}

/* ---------- Projects (example placeholders) ---------- */
function renderProjects() {
  const T2 = {
    bg: { eyebrow: "Примери", title: "Как би изглеждал проект", sub: "Примерни проекти, докато съберем първите истински казуси.", badge: "Примерен проект" },
    en: { eyebrow: "Examples", title: "What a project could look like", sub: "Example projects while we gather real case studies.", badge: "Example project" },
  };
  const tt = T2[state.lang];
  const PROJECTS = [
    { icon: "globe", tag: { bg: "Уеб разработка", en: "Web Development" }, title: { bg: "Фирмен сайт за локален бизнес", en: "Business site for a local shop" }, text: { bg: "Петстраничен сайт с онлайн резервации за занаятчийски бизнес.", en: "A five-page site with online booking for a small craft business." } },
    { icon: "shopping-cart", tag: { bg: "E-commerce", en: "E-commerce" }, title: { bg: "Онлайн магазин за малка марка", en: "Online store for a small brand" }, text: { bg: "Магазин с каталог, количка и интеграция с платежен доставчик.", en: "A store with catalog, cart and a payment provider integration." } },
    { icon: "palette", tag: { bg: "Брандинг", en: "Branding" }, title: { bg: "Визуална идентичност за стартъп", en: "Visual identity for a startup" }, text: { bg: "Лого, цветова палитра и шаблони за социални мрежи.", en: "Logo, color palette and social media templates." } },
    { icon: "trending-up", tag: { bg: "SEO & Маркетинг", en: "SEO & Marketing" }, title: { bg: "SEO преработка на съществуващ сайт", en: "SEO overhaul of an existing site" }, text: { bg: "Технически одит и преструктуриране на съдържанието.", en: "Technical audit and content restructuring." } },
  ];
  return `<section class="max-w-6xl mx-auto px-5 py-20">
    <div class="text-center mb-14">
      <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full" style="background:var(--orange-soft);border:1px solid rgba(255,90,31,0.25)"><span class="eyebrow-dot"></span><span class="font-mono uppercase" style="font-size:11px;color:var(--orange-deep);letter-spacing:0.06em">${tt.eyebrow}</span></span>
      <h2 class="font-display font-bold" style="font-size:clamp(24px,3.2vw,34px);color:var(--ink);margin-top:10px;letter-spacing:-0.01em">${tt.title}</h2>
      <p class="mt-2 mx-auto" style="font-size:13.5px;color:var(--muted);max-width:480px">${tt.sub}</p>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
      ${PROJECTS.map((p) => `
      <div class="reveal card-elevate spotlight rounded-2xl overflow-hidden h-full" style="border:1px dashed var(--line-soft);background:var(--paper)">
        <div class="h-36 flex items-center justify-center relative" style="background:linear-gradient(135deg, var(--ink), #2A2A28)">
          ${icon(p.icon, "w-10 h-10")}
          <span class="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-mono font-semibold" style="background:rgba(255,90,31,0.16);color:var(--orange)">${tt.badge}</span>
        </div>
        <div class="p-6">
          <span class="font-mono uppercase" style="font-size:10.5px;color:var(--orange-deep);letter-spacing:0.03em">${p.tag[state.lang]}</span>
          <h3 class="font-display font-bold" style="font-size:16px;color:var(--ink);margin-top:6px">${p.title[state.lang]}</h3>
          <p class="mt-1.5" style="font-size:13px;color:var(--muted);line-height:1.55">${p.text[state.lang]}</p>
        </div>
      </div>`).join("")}
    </div>
  </section>`;
}

/* ---------- Pricing ---------- */
function renderPricing() {
  const PACKAGE_ITEMS = {
    bg: ["Фирмен сайт (5 страници)", "Скорост и техническа оптимизация", "Професионално лого", "Текстове за сайта", "Основно SEO", "Google Business Profile", "GDPR политика и бисквитки", "Общи условия", "Хостинг и домейн", "SSL сертификат", "Месечни актуализации", "Backup и мониторинг"],
    en: ["Business website (5 pages)", "Speed & technical optimization", "Professional logo", "Website copy", "Basic SEO", "Google Business Profile", "GDPR policy & cookies", "Terms of service", "Hosting & domain", "SSL certificate", "Monthly updates", "Backup & monitoring"],
  };
  return `<section class="max-w-4xl mx-auto px-5 py-20" id="pricing">
    <div class="text-center mb-12">
      <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full" style="background:var(--orange-soft);border:1px solid rgba(255,90,31,0.25)"><span class="eyebrow-dot"></span><span class="font-mono uppercase" style="font-size:11px;color:var(--orange-deep);letter-spacing:0.06em">${state.lang === "bg" ? "Пакет" : "Package"}</span></span>
      <h2 class="font-display font-bold" style="font-size:clamp(24px,3.2vw,34px);color:var(--ink);margin-top:10px;letter-spacing:-0.01em">${state.lang === "bg" ? "Сайт като услуга" : "Website as a service"}</h2>
      <p class="mt-2 mx-auto" style="font-size:14px;color:var(--muted);max-width:440px">${state.lang === "bg" ? "Без първоначална инвестиция от хиляди левове — плащаш месечно." : "No upfront investment of thousands — pay monthly."}</p>
    </div>
    <div class="reveal rounded-3xl overflow-hidden" style="border:1px solid var(--line)">
      <div class="p-8 text-center" style="background:var(--ink)">
        <div class="font-display font-bold" style="font-size:44px;color:#fff">13€ <span class="font-normal" style="font-size:15px;color:rgba(255,255,255,0.6)">${state.lang === "bg" ? "/ месец" : "/ month"}</span></div>
        <span class="font-mono" style="font-size:11.5px;color:rgba(255,255,255,0.55)">${state.lang === "bg" ? "минимален срок 12 месеца" : "minimum term 12 months"}</span>
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 p-8" style="background:var(--paper)">
        ${PACKAGE_ITEMS[state.lang].map((item) => `<div class="flex items-center gap-2.5">
          <div class="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style="background:var(--orange-soft)">${icon("check", "w-2.5 h-2.5")}</div>
          <span style="font-size:13.5px;color:var(--ink)">${item}</span>
        </div>`).join("")}
      </div>
      <div class="px-8 pb-8 pt-2 text-center" style="background:var(--paper)">
                <button id="consultCtaBtn" class="w-full sm:w-auto px-8 py-3.5 rounded-full font-semibold text-sm" style="background:var(--gradient);color:#fff">${state.lang === "bg" ? "Заяви безплатна консултация" : "Request a free consultation"}</button>
      </div>
    </div>
  </section>`;
}


/* ---------- Client results (honest placeholder) ---------- */
function renderClientResults() {
  const METRICS = {
    bg: [
      { icon: "trending-up", example: "+45%", fill: 78, label: "ръст в трафика" },
      { icon: "message-square", example: "+30%", fill: 62, label: "увеличение на запитванията" },
      { icon: "clock", example: "8 ч/седмица", fill: 55, label: "спестено ръчно време" },
      { icon: "gauge", example: "5 дни", fill: 40, label: "средно време на работа" },
    ],
    en: [
      { icon: "trending-up", example: "+45%", fill: 78, label: "traffic growth" },
      { icon: "message-square", example: "+30%", fill: 62, label: "increase in inquiries" },
      { icon: "clock", example: "8 h/week", fill: 55, label: "manual time saved" },
      { icon: "gauge", example: "5 days", fill: 40, label: "average turnaround time" },
    ],
  };
  const badge = state.lang === "bg" ? "Пример" : "Example";
  return `<section class="max-w-6xl mx-auto px-5 py-20">
    <div class="text-center mb-12">
      <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full" style="background:var(--orange-soft);border:1px solid rgba(255,90,31,0.25)"><span class="eyebrow-dot"></span><span class="font-mono uppercase" style="font-size:11px;color:var(--orange-deep);letter-spacing:0.06em">${state.lang === "bg" ? "Резултати" : "Results"}</span></span>
      <h2 class="font-display font-bold" style="font-size:clamp(24px,3.2vw,34px);color:var(--ink);margin-top:10px;letter-spacing:-0.01em">${state.lang === "bg" ? "Измерими резултати за клиентите" : "Measurable results for clients"}</h2>
      <p class="mt-2" style="font-size:13.5px;color:var(--muted)">${state.lang === "bg" ? "Илюстративни стойности — ще ги заменим с реални цифри, щом приключите първите проекти." : "Illustrative values — will be replaced with real numbers once your first projects are complete."}</p>
    </div>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      ${METRICS[state.lang].map((m) => `
      <div class="reveal card-elevate spotlight rounded-2xl p-6 relative overflow-hidden" style="background:var(--paper);border:1px dashed var(--line-soft)">
        <span class="absolute top-3 right-3 px-2 py-0.5 rounded-full font-mono font-semibold" style="font-size:9px;background:var(--orange-soft);color:var(--orange-deep)">${badge}</span>
        <div class="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style="background:var(--orange-soft)">${icon(m.icon, "w-4.5 h-4.5")}</div>
        <div class="font-display font-bold" style="font-size:25px;color:var(--ink);letter-spacing:-0.01em">${m.example}</div>
        <div class="mt-1.5 mb-3" style="font-size:11.5px;color:var(--muted);line-height:1.4">${m.label}</div>
        <div class="rounded-full overflow-hidden" style="height:5px;background:var(--pearl)">
          <div class="rounded-full" style="height:100%;width:${m.fill}%;background:var(--gradient)"></div>
        </div>
      </div>`).join("")}
    </div>
  </section>`;
}

/* ---------- Testimonials (labeled examples) ---------- */
function renderTestimonials() {
  const T3 = {
    bg: { eyebrow: "Отзиви", title: "Място за първите ви клиенти", sub: "Примерни отзиви за илюстрация — ще ги заменим с реални, щом получите първите поръчки.", badge: "Примерен отзив",
      items: [
        { quote: "Заявих сайт през каталога в петък вечер, а в понеделник вече имах оферта с точна цена. Никакви скрити такси, точно както пишеше.", name: "Иван Петров", role: "Собственик, \"Дърводелски услуги Петров\"" },
        { quote: "Смених три агенции, преди да намеря екип, който да ми обясни нещата без жаргон. Сега разбирам какво плащам и защо.", name: "Мария Георгиева", role: "Управител, козметично студио" },
        { quote: "Най-много ме успокои фиксираната месечна цена — знам предварително разхода за целия хостинг и поддръжка, без изненади в края на месеца.", name: "Стефан Николов", role: "Съосновател, стартъп в сферата на логистиката" },
        { quote: "Поисках промяна в текстовете на сайта в неделя следобед и още същата вечер получих обновена версия за преглед.", name: "Десислава Тодорова", role: "Маркетинг, семеен ресторант" },
      ] },
    en: { eyebrow: "Testimonials", title: "A place for your first clients", sub: "Example quotes for illustration — will be replaced with real ones once you land your first orders.", badge: "Example testimonial",
      items: [
        { quote: "I requested a site through the catalog on a Friday evening and had a priced quote by Monday morning. No hidden fees, exactly as advertised.", name: "John Peters", role: "Owner, Peters Carpentry" },
        { quote: "I went through three agencies before finding a team that explained things without jargon. Now I actually understand what I'm paying for.", name: "Maria George", role: "Manager, beauty studio" },
        { quote: "What put me at ease was the fixed monthly price — I know the full hosting and maintenance cost upfront, no surprises at month end.", name: "Steven Nichols", role: "Co-founder, logistics startup" },
        { quote: "I asked for a copy change on a Sunday afternoon and had an updated version to review that same evening.", name: "Diana Todd", role: "Marketing, family restaurant" },
      ] },
  };
  const tt = T3[state.lang];
  return `<section class="max-w-6xl mx-auto px-5 py-20">
    <div class="text-center mb-14">
      <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full" style="background:var(--orange-soft);border:1px solid rgba(255,90,31,0.25)"><span class="eyebrow-dot"></span><span class="font-mono uppercase" style="font-size:11px;color:var(--orange-deep);letter-spacing:0.06em">${tt.eyebrow}</span></span>
      <h2 class="font-display font-bold" style="font-size:clamp(24px,3.2vw,34px);color:var(--ink);margin-top:10px;letter-spacing:-0.01em">${tt.title}</h2>
      <p class="mt-2" style="font-size:13.5px;color:var(--muted)">${tt.sub}</p>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      ${tt.items.map((it, i) => {
        const hue = ["#FF5A1F", "#D6440E", "#0B0B0C", "#6B6A67"][i % 4];
        return `
      <div class="reveal card-elevate spotlight rounded-2xl p-6 h-full relative flex flex-col" style="background:var(--paper);border:1px dashed var(--line-soft)">
        <span class="absolute top-4 right-4 px-2 py-0.5 rounded-full font-mono font-semibold" style="font-size:10px;background:var(--orange-soft);color:var(--orange-deep)">${tt.badge}</span>
        <svg width="20" height="16" viewBox="0 0 20 16" fill="none" style="opacity:0.14;margin-bottom:6px"><path d="M0 16V9.2C0 3.6 3.4 0.4 8.4 0L9 2.6C6.2 3.2 4.6 5 4.4 7.4H8.4V16H0ZM11.6 16V9.2C11.6 3.6 15 0.4 20 0L20.6 2.6C17.8 3.2 16.2 5 16 7.4H20V16H11.6Z" fill="var(--ink)"/></svg>
        <div class="flex gap-1 mb-3">${[0,1,2,3,4].map(() => icon("star", "w-3.5 h-3.5 fill-current")).join("")}</div>
        <p style="font-size:13px;color:var(--ink);line-height:1.6">${it.quote}</p>
        <div class="flex items-center gap-3 mt-5 pt-4" style="border-top:1px solid var(--line-soft)">
          <div class="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style="background:${hue}1A;border:1px solid var(--line)">
            <span class="font-display font-bold" style="font-size:13px;color:${hue}">${it.name.charAt(0)}</span>
          </div>
          <div>
            <div class="font-semibold" style="font-size:12.5px;color:var(--ink)">${it.name}</div>
            <div class="font-mono" style="font-size:10px;color:var(--muted)">${it.role}</div>
          </div>
        </div>
      </div>`;
      }).join("")}
    </div>
  </section>`;
}

/* ---------- FAQ ---------- */
function faqData() {
  const FAQS = {
    bg: [
      { q: "Какво включва пакетът за 13€/месец?", a: "Фирмен сайт с до 5 страници, лого, текстове, хостинг, домейн, SSL, GDPR документи и месечна техническа поддръжка." },
      { q: "Мога ли да поръчам само една услуга от каталога?", a: "Да — разгледай категориите, добави каквото ти трябва в запитването и ще получиш индивидуална оферта." },
      { q: "Какъв е минималният срок на договора?", a: '12 месеца за пакета "Сайт като услуга". Отделните услуги от каталога се договарят индивидуално.' },
      { q: "Как работи анализът на сайта?", a: "Пускаш линка на сайта си и имейл — преглеждаме го по скорост, SEO, сигурност и дизайн, и ти изпращаме пълния резултат." },
    ],
    en: [
      { q: "What's included in the 13€/month package?", a: "A business website with up to 5 pages, logo, copy, hosting, domain, SSL, GDPR documents and monthly technical maintenance." },
      { q: "Can I order just one service from the catalog?", a: "Yes — browse the categories, add what you need to your request, and you'll get a tailored offer." },
      { q: "What's the minimum contract term?", a: '12 months for the "Website as a Service" package. Individual catalog services are agreed on a case-by-case basis.' },
      { q: "How does the site analysis work?", a: "You submit your site's link and your email — we review it for speed, SEO, security and design, then send you the full result." },
    ],
  };
  return FAQS[state.lang];
}
function renderFAQ() {
  const items = faqData();
  return `<section class="max-w-3xl mx-auto px-5 py-20">
    <div class="text-center mb-12">
      <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full" style="background:var(--orange-soft);border:1px solid rgba(255,90,31,0.25)"><span class="eyebrow-dot"></span><span class="font-mono uppercase" style="font-size:11px;color:var(--orange-deep);letter-spacing:0.06em">${state.lang === "bg" ? "Въпроси" : "Questions"}</span></span>
      <h2 class="font-display font-bold" style="font-size:clamp(24px,3.2vw,34px);color:var(--ink);margin-top:10px;letter-spacing:-0.01em">${state.lang === "bg" ? "Често задавани въпроси" : "Frequently asked questions"}</h2>
    </div>
    <div class="flex flex-col gap-3" id="faqList">
      ${items.map((f, i) => `
      <div class="reveal rounded-xl overflow-hidden" style="border:1px solid var(--line);background:var(--paper)">
        <button class="faq-toggle w-full flex items-center justify-between px-5 py-4 text-left" data-i="${i}">
          <span class="font-semibold" style="font-size:14px;color:var(--ink)">${f.q}</span>
          ${icon("chevron-down", `w-4 h-4 shrink-0 ml-3 transition-transform ${state.faqOpen === i ? "rotate-180" : ""}`)}
        </button>
        <div class="faq-body ${state.faqOpen === i ? "open" : ""}">
          <div class="px-5 pb-4" style="font-size:13.5px;color:var(--muted);line-height:1.6">${f.a}</div>
        </div>
      </div>`).join("")}
    </div>
  </section>`;
}
function wireFAQ() {
  document.querySelectorAll(".faq-toggle").forEach((btn) => btn.addEventListener("click", () => {
    const i = parseInt(btn.dataset.i, 10);
    state.faqOpen = state.faqOpen === i ? -1 : i;
    renderApp();
  }));
}

/* ---------- Final CTA ---------- */
function renderFinalCTA() {
  return `<section class="relative overflow-hidden py-20" style="background:var(--ink)">
    <div class="grid-overlay"></div>
    <div class="orb" style="width:320px;height:320px;top:-80px;left:50%;transform:translateX(-50%);background:rgba(255,90,31,0.28)"></div>
    <div class="max-w-2xl mx-auto px-5 text-center relative">
      <h2 class="font-display font-bold" style="font-size:clamp(26px,3.6vw,38px);color:#fff;letter-spacing:-0.02em;line-height:1.15">${state.lang === "bg" ? "Готови да изведете бизнеса си онлайн?" : "Ready to take your business online?"}</h2>
      <p class="mt-3" style="font-size:14.5px;color:rgba(255,255,255,0.65)">${state.lang === "bg" ? "Пусни линка на сайта си за безплатна проверка, или разгледай каталога с услуги." : "Submit your site's link for a free check, or browse the service catalog."}</p>
      <form id="miniAuditForm" class="flex flex-col sm:flex-row gap-2 mt-8 max-w-md mx-auto">
        <input id="miniUrl" placeholder="${state.lang === "bg" ? "Адрес на твоя сайт" : "Your website address"}" class="flex-1 min-w-0 rounded-full px-5 py-3 outline-none" style="font-size:13.5px;background:rgba(255,255,255,0.08);color:#fff;border:1px solid rgba(255,255,255,0.2)"/>
        <button type="submit" class="btn-glow px-6 py-3 rounded-full font-semibold text-sm shrink-0" style="background:var(--gradient);color:#fff">${state.lang === "bg" ? "Провери сега" : "Check now"}</button>
      </form>
    </div>
  </section>`;
}
function wireFinalCTA() {
 document.getElementById("miniAuditForm")?.addEventListener("submit", (e) => {
  e.preventDefault();
  window.hkCheckerOpen?.(document.getElementById("miniUrl")?.value);
});
}

/* ---------- Footer ---------- */
function renderFooter() {
  return `<footer style="background:var(--paper);border-top:1px solid var(--line)">
    <div class="max-w-6xl mx-auto px-5 py-14 grid grid-cols-1 sm:grid-cols-3 gap-10">
      <div class="sm:col-span-2">
        <div class="flex items-center gap-2.5">
          ${logoMark("w-9 h-9")}
          ${wordmark("var(--ink)")}
        </div>
        <p class="mt-3" style="font-size:13px;color:var(--muted);max-width:300px;line-height:1.6">${state.lang === "bg" ? "Дигиталните услуги на бизнеса ти — на едно място, с ясни цени и един контакт за всичко." : "Your business's digital services — in one place, with clear pricing and a single point of contact."}</p>
        <span class="font-mono uppercase" style="font-size:11px;color:var(--muted);letter-spacing:0.06em">${state.lang === "bg" ? "Контакт" : "Contact"}</span>
        <div class="flex flex-col gap-2.5 mt-4">
          <span style="font-size:13px;color:var(--ink)">ivan@hackera.online</span>
          <span style="font-size:13px;color:var(--ink)">0879 018 593</span>
        </div>
      </div>
    </div>
    <div class="border-t px-5 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 max-w-6xl mx-auto" style="border-color:var(--line-soft)">
      <span class="font-mono" style="font-size:11px;color:var(--muted)">© ${new Date().getFullYear()} Hackera. ${state.lang === "bg" ? "Всички права запазени." : "All rights reserved."}</span>
      <div class="flex gap-5">
        <button id="footerPrivacyBtn" class="underline" style="font-size:12px;color:var(--muted)">${state.lang === "bg" ? "Поверителност" : "Privacy"}</button>
        <button id="footerTermsBtn" class="underline" style="font-size:12px;color:var(--muted)">${state.lang === "bg" ? "Общи условия" : "Terms"}</button>
      </div>
    </div>
  </footer>`;
}
function wireFooter() {
  document.getElementById("footerPrivacyBtn")?.addEventListener("click", () => { state.legalDoc = "privacy"; renderModals(); });
  document.getElementById("footerTermsBtn")?.addEventListener("click", () => { state.legalDoc = "terms"; renderModals(); });
}

/* ---------- Cookie banner ---------- */
function renderCookieBanner() {
  if (state.cookieChoice) return "";
  return `<div class="fixed bottom-0 left-0 right-0 z-[60] p-4 sm:p-6 fade-in-up" id="cookieBanner">
    <div class="max-w-3xl mx-auto rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4" style="background:var(--ink);box-shadow:0 20px 50px rgba(0,0,0,0.35)">
      <p style="font-size:12.5px;color:rgba(255,255,255,0.75);line-height:1.55;flex:1">
        ${t("cookieText")} <button id="cookiePrivacyLink" style="color:var(--orange);text-decoration:underline">${t("cookieLink")}</button>
      </p>
      <div class="flex gap-2 shrink-0 w-full sm:w-auto">
        <button id="cookieDeclineBtn" class="flex-1 sm:flex-none px-4 py-2.5 rounded-full text-xs font-semibold" style="border:1px solid rgba(255,255,255,0.3);color:#fff">${t("cookieDecline")}</button>
        <button id="cookieAcceptBtn" class="flex-1 sm:flex-none px-4 py-2.5 rounded-full text-xs font-semibold" style="background:var(--gradient);color:#fff">${t("cookieAccept")}</button>
      </div>
    </div>
  </div>`;
}
function wireCookieBanner() {
  document.getElementById("cookieAcceptBtn")?.addEventListener("click", () => { state.cookieChoice = "accepted"; renderModals(); });
  document.getElementById("cookieDeclineBtn")?.addEventListener("click", () => { state.cookieChoice = "declined"; renderModals(); });
  document.getElementById("cookiePrivacyLink")?.addEventListener("click", () => { state.legalDoc = "privacy"; renderModals(); });
}

/* ---------- Legal modal (Terms / Privacy) ---------- */
function mdToHtml(md) {
  const lines = md.split("\n");
  let html = "", listOpen = false;
  lines.forEach((raw) => {
    const line = raw.trim();
    if (!line) { if (listOpen) { html += "</ul>"; listOpen = false; } return; }
    if (line.startsWith("# ")) { if (listOpen) { html += "</ul>"; listOpen = false; } html += `<h1 class="font-display font-bold" style="font-size:24px;color:var(--ink);margin:4px 0 8px">${line.slice(2)}</h1>`; return; }
    if (line.startsWith("## ")) { if (listOpen) { html += "</ul>"; listOpen = false; } html += `<h2 class="font-display font-bold" style="font-size:17px;color:var(--ink);margin:22px 0 6px">${line.slice(3)}</h2>`; return; }
    if (line.startsWith("- ")) { if (!listOpen) { html += `<ul style="padding-left:18px;margin:8px 0;list-style:disc">`; listOpen = true; } html += `<li style="font-size:13.5px;color:var(--muted);line-height:1.7">${line.slice(2)}</li>`; return; }
    if (line === "---") { if (listOpen) { html += "</ul>"; listOpen = false; } html += `<hr style="border:none;border-top:1px solid var(--line-soft);margin:20px 0"/>`; return; }
    if (listOpen) { html += "</ul>"; listOpen = false; }
    const clean = line.replace(/\*\*(.*?)\*\*/g, "$1").replace(/^\*(.*)\*$/, "$1");
    const isItalicNote = line.startsWith("*") && line.endsWith("*") && !line.startsWith("**");
    html += `<p style="font-size:${isItalicNote ? "12px" : "13.5px"};color:var(--muted);line-height:1.7;margin-top:4px;${isItalicNote ? "font-style:italic" : ""}">${clean}</p>`;
  });
  if (listOpen) html += "</ul>";
  return html;
}

const TERMS_MD = `# ОБЩИ УСЛОВИЯ

*Последна актуализация: 8.8.2026 г.*

## 1. Общи разпоредби

Настоящите Общи условия уреждат отношенията между "Имоти 98" ЕООД, ЕИК 207210213, със седалище и адрес на управление: България, гр. София, ул. 340 №3, представлявано от Иван А. Иванов (наричано по-долу "Дружеството"), и потребителите на уебсайта Hackera.

Достъпът до и използването на Сайта означава, че приемате настоящите Общи условия.

Данни за контакт: ivan@hackera.online, 0879 018 593

## 2. Предмет на дейност

Дружеството предоставя посредничество и предлагане на дигитални услуги, изброени в каталога на Сайта, чрез директна поръчка или изготвяне на индивидуална оферта.

## 3. Заявки и запитвания

- Потребителят може да изпрати запитване чрез формата за контакт на Сайта.
- Изпращането на запитване не представлява автоматично сключване на договор.
- Дружеството си запазва правото да откаже изпълнението на запитване.

## 4. Цени и заплащане

Цените на пакетните услуги са посочени на Сайта в евро. Цените на индивидуалните услуги се договарят според обхвата на всеки проект.

## 5. Права и задължения на страните

Дружеството се задължава да предостави поръчаните услуги в договорените срокове. Потребителят се задължава да предостави необходимата информация и съдържание навреме.

## 6. Отговорност

Дружеството не носи отговорност за вреди от неправилно използване на услугите, нито за съдържание, предоставено от потребителя.

## 7. Интелектуална собственост

Материалите на Сайта са собственост на Дружеството. След пълно заплащане, правата върху финалния резултат преминават към потребителя, освен ако не е уговорено друго.

## 8. Защита на личните данни

Обработката на лични данни се извършва съгласно нашата Политика за поверителност.

## 9. Рекламации

Рекламации се приемат до 14 дни от предоставянето на услугата и се разглеждат до 14 работни дни.

## 10. Промени в Общите условия

Дружеството си запазва правото да променя настоящите условия по всяко време.

## 11. Приложимо право

Настоящите Общи условия се уреждат от българското законодателство.

---

*Този документ е изготвен като общ образец и не представлява правен съвет. Препоръчваме преглед от квалифициран юрист преди публикуване.*`;

const PRIVACY_MD = `# ПОЛИТИКА ЗА ПОВЕРИТЕЛНОСТ

*Последна актуализация: 8.8.2026 г.*

## 1. Администратор на лични данни

"Имоти 98" ЕООД, ЕИК 207210213, седалище: България, гр. София, ул. 340 №3. Имейл: ivan@hackera.online, телефон: 0879 018 593.

## 2. Какви лични данни събираме

Име, телефон, имейл, избрани услуги, адрес на вашия сайт (при анализ). Автоматично — IP адрес, тип браузър, посетени страници.

## 3. Цели на обработката

Изготвяне на оферта, комуникация, изпращане на репорт, статистика, счетоводни задължения.

## 4. Срок на съхранение

Само за необходимия период, освен ако законът не изисква друго.

## 5. Предаване на трети лица

Не продаваме данни. Споделяме само с доставчици на хостинг/имейл и подизпълнители, при договори по чл. 28 GDPR.

## 6. Бисквитки

Необходими (задължителни) и аналитични (само след съгласие) — виж банера при първо посещение.

## 7. Вашите права

Достъп, коригиране, изтриване, ограничаване, преносимост, възражение, оттегляне на съгласие. Жалба до КЗЛД, гр. София, бул. "Проф. Цветан Лазаров" № 2, www.cpdp.bg.

## 8. Сигурност

SSL криптиране и ограничен достъп само за упълномощени лица.

## 9. Контакт

ivan@hackera.online, 0879 018 593.

---

*Този документ е изготвен като общ образец, съобразен с GDPR, и не представлява правен съвет. Препоръчваме преглед от юрист преди публикуване.*`;

function renderLegalModal() {
  if (!state.legalDoc) return "";
  const md = state.legalDoc === "privacy" ? PRIVACY_MD : TERMS_MD;
  return `<div id="legalBackdrop" class="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style="background:rgba(11,11,12,0.6)">
    <div class="w-full sm:max-w-2xl h-[85vh] sm:h-[80vh] rounded-t-3xl sm:rounded-2xl relative flex flex-col" style="background:var(--paper)" id="legalCard">
      <button id="legalCloseBtn" class="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center z-10" style="background:var(--pearl);border:1px solid var(--line)">${icon("x", "w-3.5 h-3.5")}</button>
      <div class="flex-1 overflow-y-auto px-6 sm:px-8 py-8">${mdToHtml(md)}</div>
    </div>
  </div>`;
}
function wireLegalModal() {
  document.getElementById("legalCloseBtn")?.addEventListener("click", () => { state.legalDoc = null; renderModals(); });
  document.getElementById("legalBackdrop")?.addEventListener("click", (e) => { if (e.target.id === "legalBackdrop") { state.legalDoc = null; renderModals(); } });
}

/* ---------- Count-up (IntersectionObserver) ---------- */
function setupCountUps() {
  const els = document.querySelectorAll(".count-up:not(.counted)");
  if (!("IntersectionObserver" in window)) return;
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add("counted");
      obs.unobserve(el);
      const target = parseFloat(el.dataset.target);
      const suffix = el.dataset.suffix || "";
      const duration = 900, start = performance.now();
      function step(now) {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, { threshold: 0.3 });
  els.forEach((el) => obs.observe(el));
}
function setupReveals() {
  if (!("IntersectionObserver" in window)) { document.querySelectorAll(".reveal").forEach((el) => el.classList.add("visible")); return; }
  const obs = new IntersectionObserver((entries) => {
    entries.forEach((entry) => { if (entry.isIntersecting) { entry.target.classList.add("visible"); obs.unobserve(entry.target); } });
  }, { threshold: 0.15 });
  document.querySelectorAll(".reveal:not(.visible)").forEach((el) => obs.observe(el));
}

/* ---------- Main app assembly ---------- */
function renderApp() {
  document.title = state.lang === "bg" ? "Hackera — дигитални услуги на едно място" : "Hackera — digital services in one place";
  document.documentElement.lang = state.lang;

  const root = document.getElementById("root");
  root.innerHTML = `
    ${renderHeader()}
    ${renderHero()}
    ${renderCategoryMarquee()}
    ${renderTrustBar()}
    ${renderBigStats()}
    <div id="catalog" style="background:var(--pearl);border-bottom:1px solid var(--line-soft)">
      <div class="max-w-6xl mx-auto px-5 py-4">${renderCatDropdown()}</div>
    </div>
    ${renderGrid()}
    ${renderSplitFeature({
      eyebrow: state.lang === "bg" ? "Анализ на сайта" : "Site analysis",
      title: state.lang === "bg" ? "Знай точно къде стои твоят сайт" : "Know exactly where your site stands",
      text: state.lang === "bg" ? "Пускаш линк и имейл — преглеждаме скорост, SEO, сигурност и визия." : "Submit your link and email — we review speed, SEO, security and visual quality.",
      bullets: state.lang === "bg" ? ["Проверка на скорост и техническо здраве", "SEO преглед на структурата", "GDPR и сигурност"] : ["Speed and technical health check", "SEO review of the structure", "GDPR and security"],
      mountId: "auditDemoMount",
    })}
    ${renderSplitFeature({
      reverse: true,
      eyebrow: state.lang === "bg" ? "Запитване" : "Request",
      title: state.lang === "bg" ? "Избираш услуги, ние вдигаме офертата" : "You pick services, we build the offer",
      text: state.lang === "bg" ? "Разгледай каталога с 250 услуги, добави каквото ти трябва и изпрати всичко наведнъж." : "Browse the catalog of 250 services, add what you need, and send it all at once.",
      bullets: state.lang === "bg" ? ["Един контакт вместо няколко фрийлансъра", "Ясно какво е включено и какво е добавка", "Оферта по мярка на бизнеса ти"] : ["One contact instead of several freelancers", "Clear what's included and what's an add-on", "An offer tailored to your business"],
      mountId: "addDemoMount",
    })}
    ${renderHowItWorks()}
    ${renderGeoMark()}
    ${renderPathPicker()}
    ${renderWhyHackera()}
    ${renderProjects()}
    ${renderGeoMark()}
    ${renderPricing()}
    ${renderClientResults()}
    ${renderTestimonials()}
    ${renderFAQ()}
    ${renderFinalCTA()}
    ${renderFooter()}
    ${state.selectedIds.size > 0 && !state.drawerOpen ? `
    <button id="floatingCartBtn" class="sm:hidden fixed bottom-5 right-5 z-20 flex items-center gap-2 px-5 py-3.5 rounded-full font-semibold text-sm shadow-lg" style="background:var(--gradient);color:#fff">
      ${icon("shopping-bag", "w-4 h-4")} ${state.selectedIds.size} ${t("floatingSelected")}
    </button>` : ""}
  `;

  document.querySelectorAll(".lang-btn").forEach((b) => b.addEventListener("click", () => {
    const target = b.dataset.lang;
    if (target === state.lang) return;
    location.href = target === "bg" ? "/bg/" : "/";
  }));
  document.getElementById("cartBtn")?.addEventListener("click", openDrawer);
  document.getElementById("browseCtaBtn")?.addEventListener("click", () => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  document.getElementById("checkCtaBtn")?.addEventListener("click", () => {
  window.hkCheckerOpen?.();
});
  document.getElementById("consultCtaBtn")?.addEventListener("click", () => {
    const el = document.getElementById("agentMount");
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => {
      window.hkAgentBoost?.(3); // explicit "I want a consultation" click = high intent, fast-track to contact capture
      window.hkAgentFocus?.();
    }, 450);
  });
  document.getElementById("floatingCartBtn")?.addEventListener("click", openDrawer);
  wireCatDropdown();
  wireGrid();
  wireCategoryMarquee();
  wireFAQ();
  wireFinalCTA();
  wireFooter();
  refreshIcons();
  setupCountUps();
  setupReveals();
  rerenderAuditDemo();
  rerenderAddDemo();
  runAuditDemoLoop();
  runAddDemoLoop();
  renderModals();
}

function renderModals() {
  let host = document.getElementById("modalsRoot");
  if (!host) { host = document.createElement("div"); host.id = "modalsRoot"; document.body.appendChild(host); }
  host.innerHTML = `${renderDetailModal()}${renderDrawer()}${renderLegalModal()}${renderCookieBanner()}`;

  document.getElementById("detailCloseBtn")?.addEventListener("click", () => { state.openServiceId = null; renderModals(); });
  document.getElementById("detailModalBackdrop")?.addEventListener("click", (e) => { if (e.target.id === "detailModalBackdrop") { state.openServiceId = null; renderModals(); } });
  document.getElementById("detailToggleBtn")?.addEventListener("click", (e) => { toggleService(e.currentTarget.dataset.id); state.openServiceId = null; renderModals(); });

  wireDrawer();
  wireLegalModal();
  wireCookieBanner();
  refreshIcons();

  document.body.style.overflow = state.openServiceId || state.drawerOpen || state.legalDoc ? "hidden" : "auto";
}

/* Render immediately once this script runs (it's placed right after the
   crawler-facing snapshot in the HTML, so #root already exists) instead of
   waiting for DOMContentLoaded — that event only fires once the *entire*
   document (including the large JSON-LD blocks further down the page) has
   been parsed, which would delay the swap from the static snapshot to the
   interactive app for no reason. */
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderApp);
} else {
  renderApp();
}





