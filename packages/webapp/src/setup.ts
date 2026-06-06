import htmx from "htmx.org";

// ── htmx config ──────────────────────────────────────────────────────────────

htmx.config.defaultSwap = "innerHTML";
htmx.config.transitions = true;
htmx.config.history = "reload";
htmx.config.defaultSettleDelay = 20;

// ── Nav active state ──────────────────────────────────────────────────────────
// htmx v4 event names use colons: htmx:after:settle (not htmx:afterSettle)
// The nav lives outside #main-content so it is never re-rendered by htmx swaps.

document.addEventListener("htmx:after:settle", () => {
  const path = window.location.pathname;
  for (const link of document.querySelectorAll<HTMLAnchorElement>(".nav a")) {
    link.classList.toggle("is-active", link.getAttribute("href") === path);
  }
});

// ── Period selector island ────────────────────────────────────────────────────
// Adapted from design/Eduskuntapeili/period.js
// The period selector lives in the masthead shell (never swapped by htmx),
// so DOMContentLoaded is correct here.

const PERIODS: Record<
  string,
  { label: string; gov: string; badge: string; detail: string }
> = {
  "2023": {
    label: "Vaalikausi 2023–2027",
    gov: "Orpon hallitus",
    badge: "nykyinen",
    detail: "20.6.2023 – kesken · 200 paikkaa · hallitus 108 / oppositio 92",
  },
  "2019": {
    label: "Vaalikausi 2019–2023",
    gov: "Marinin / Rinteen hallitus",
    badge: "päättynyt",
    detail: "6.6.2019 – 20.6.2023 · 200 paikkaa",
  },
  all: {
    label: "Kaikki vaalikaudet",
    gov: "koko avoin data",
    badge: "koko aineisto",
    detail: "1907 – 2026 · kaikki kaudet ja jäsenyydet",
  },
};

const PERIOD_KEY = "peili.period";
const DEFAULT_PERIOD = "2023";

function currentPeriod(): string {
  try {
    const v = localStorage.getItem(PERIOD_KEY);
    return v && PERIODS[v] ? v : DEFAULT_PERIOD;
  } catch {
    return DEFAULT_PERIOD;
  }
}

function applyPeriod(val: string): void {
  const p = PERIODS[val] ?? PERIODS[DEFAULT_PERIOD];
  try {
    localStorage.setItem(PERIOD_KEY, val);
  } catch {
    /* ignore */
  }

  document
    .querySelectorAll("[data-period-v]")
    .forEach((el) => (el.textContent = p.label));
  document.querySelectorAll("[data-period-badge]").forEach((el) => {
    el.textContent = p.badge;
    el.classList.toggle("is-now", val === DEFAULT_PERIOD);
  });
  document
    .querySelectorAll("[data-period-label]")
    .forEach((el) => (el.textContent = `${p.label} · ${p.gov}`));
  document
    .querySelectorAll("[data-period-detail]")
    .forEach((el) => (el.textContent = p.detail));
  document.querySelectorAll("[data-period-badge-foot]").forEach((el) => {
    el.textContent = p.badge;
    el.classList.toggle("is-now", val === DEFAULT_PERIOD);
  });
  document.body.setAttribute("data-active-period", p.label);
  document.querySelectorAll(".period__opt").forEach((opt) => {
    const optVal = (opt as HTMLElement).dataset.val ?? "";
    opt.classList.toggle("is-selected", optVal === val);
    opt.setAttribute("aria-checked", optVal === val ? "true" : "false");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applyPeriod(currentPeriod());

  const root = document.querySelector<HTMLElement>("[data-period]");
  if (!root) return;
  const btn = root.querySelector<HTMLElement>(".period__btn");
  const menu = root.querySelector<HTMLElement>(".period__menu");
  if (!btn || !menu) return;

  const openMenu = () => {
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
  };
  const closeMenu = () => {
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.hidden ? openMenu() : closeMenu();
  });
  root.querySelectorAll<HTMLElement>(".period__opt").forEach((opt) => {
    opt.addEventListener("click", () => {
      applyPeriod(opt.dataset.val ?? DEFAULT_PERIOD);
      closeMenu();
    });
  });
  document.addEventListener("click", (e) => {
    if (!root.contains(e.target as Node)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
});

// expose for page-level interop
(window as any).EPPeriod = {
  apply: applyPeriod,
  current: currentPeriod,
  PERIODS,
};

// ── Data provenance trace popover island ─────────────────────────────────────
// Adapted from design/Eduskuntapeili/trace.js
// Uses htmx.onLoad() instead of DOMContentLoaded so .cite elements added by
// htmx swaps are initialised correctly on every navigation.

const pop = document.createElement("div");
pop.className = "trace-pop";
pop.hidden = true;
pop.setAttribute("role", "dialog");
pop.setAttribute("aria-label", "Tietolähde");

document.addEventListener("DOMContentLoaded", () => {
  document.body.appendChild(pop);
});

let traceCurrent: HTMLElement | null = null;

function traceEsc(s: string | null | undefined): string {
  return (s == null ? "" : String(s)).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] ?? c,
  );
}

function traceBuild(el: HTMLElement): void {
  const d = el.dataset;
  const chain = (d.chain ?? "")
    .split(">")
    .map((s) => s.trim())
    .filter(Boolean);

  const fields: [string, string | undefined, boolean][] = [
    ["Aineisto", d.set, false],
    ["Taulu", d.table, true],
    ["Rajapintakutsu", d.endpoint, true],
    ["Tietue", d.record, false],
    ["Jakso", d.jakso, false],
    ["Haettu", d.fetched, false],
  ];

  pop.innerHTML =
    `<div class="trace-pop__bar"><span class="lbl">Tietolähde · jäljite</span>` +
    `<button class="trace-pop__close" aria-label="Sulje">×</button></div>` +
    `<div class="trace-pop__body">` +
    (d.value
      ? `<div class="trace-pop__value">${traceEsc(d.value)}</div>`
      : "") +
    (d.caption
      ? `<div class="trace-pop__caption">${traceEsc(d.caption)}</div>`
      : "") +
    `<div class="trace-fields">` +
    fields
      .filter((r) => r[1])
      .map(
        (r) =>
          `<div class="trace-field">` +
          `<div class="trace-field__k">${traceEsc(r[0])}</div>` +
          `<div class="trace-field__v${r[2] ? " is-code" : ""}">${traceEsc(r[1])}</div>` +
          `</div>`,
      )
      .join("") +
    `</div>` +
    (chain.length
      ? `<div class="trace-pop__chain">` +
        chain
          .map(
            (n, i) =>
              (i ? `<span class="arr">→</span>` : "") +
              `<span class="node">${traceEsc(n)}</span>`,
          )
          .join("") +
        `</div>`
      : "") +
    `<div class="trace-pop__foot">` +
    (d.url
      ? `<a class="trace-pop__orig" href="${traceEsc(d.url)}" target="_blank" rel="noopener">${traceEsc(d.orig ?? "Avaa alkuperäinen")} ↗</a>`
      : `<span></span>`) +
    (d.fetched ? `<span class="trace-pop__fresh">tuore</span>` : "") +
    `</div></div>`;

  pop.querySelector(".trace-pop__close")?.addEventListener("click", traceClose);
}

function tracePlace(el: HTMLElement): void {
  pop.hidden = false;
  pop.style.left = "0px";
  pop.style.top = "0px";
  const r = el.getBoundingClientRect();
  const pw = pop.offsetWidth;
  const ph = pop.offsetHeight;
  const sx = window.scrollX;
  const sy = window.scrollY;
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const left = Math.max(sx + 12, Math.min(r.left + sx, sx + vw - pw - 12));
  const below = r.bottom + sy + 8;
  const above = r.top + sy - ph - 8;
  const roomBelow = vh - r.bottom;
  let top = roomBelow >= ph + 16 || r.top < ph + 16 ? below : above;
  top = Math.max(sy + 12, Math.min(top, sy + vh - ph - 12));
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}

function traceOpen(el: HTMLElement): void {
  if (traceCurrent) traceCurrent.setAttribute("aria-expanded", "false");
  traceCurrent = el;
  el.setAttribute("aria-expanded", "true");
  traceBuild(el);
  tracePlace(el);
}

function traceClose(): void {
  pop.hidden = true;
  if (traceCurrent) {
    traceCurrent.setAttribute("aria-expanded", "false");
    traceCurrent = null;
  }
}

document.addEventListener("click", (e) => {
  const c = (e.target as Element).closest<HTMLElement>(".cite");
  if (c) {
    e.preventDefault();
    traceCurrent === c ? traceClose() : traceOpen(c);
    return;
  }
  if (!(e.target as Element).closest(".trace-pop")) traceClose();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") traceClose();
  const c = (e.target as Element).closest?.<HTMLElement>(".cite");
  if (c && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    traceCurrent === c ? traceClose() : traceOpen(c);
  }
});

window.addEventListener("resize", traceClose);
window.addEventListener(
  "scroll",
  () => {
    if (traceCurrent) tracePlace(traceCurrent);
  },
  true,
);

// Use htmx.onLoad instead of DOMContentLoaded so .cite and .ai-sources-toggle
// elements added by htmx swaps are initialised on every navigation.
htmx.onLoad((root) => {
  root.querySelectorAll<HTMLElement>(".cite").forEach((el) => {
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.setAttribute("aria-expanded", "false");
    if (!el.querySelector(".cite__mark") && el.dataset.mark !== "off") {
      const m = document.createElement("sup");
      m.className = "cite__mark";
      m.textContent = el.dataset.markText ?? "∗";
      el.appendChild(m);
    }
  });

  root
    .querySelectorAll<HTMLButtonElement>(".ai-sources-toggle")
    .forEach((btn) => {
      btn.setAttribute("aria-expanded", "false");
      btn.addEventListener("click", () => {
        const scope = btn.closest<HTMLElement>(".ai, .summary");
        const tgt = btn.dataset.target
          ? document.getElementById(btn.dataset.target)
          : (scope?.querySelector<HTMLElement>(".ai-sources") ?? null);
        if (!tgt) return;
        const openNow = tgt.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", openNow ? "true" : "false");
        const lbl = btn.querySelector(".lbl");
        if (lbl)
          lbl.textContent = openNow
            ? "Piilota lähteet"
            : (btn.dataset.label ?? "Näytä lähteet");
      });
    });
});
