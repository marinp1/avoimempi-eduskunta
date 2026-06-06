/** @jsxImportSource ./jsx */

// Period selector island — lives in the masthead shell (never swapped by htmx),
// so DOMContentLoaded is sufficient for initial setup.

/** Available electoral periods with their display metadata. */
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

/** Reads the user's period preference from localStorage. */
function currentPeriod(): string {
  try {
    const v = localStorage.getItem(PERIOD_KEY);
    return v && PERIODS[v] ? v : DEFAULT_PERIOD;
  } catch {
    return DEFAULT_PERIOD;
  }
}

/** Applies a period selection: updates all `[data-period-*]` placeholders
 * and persists the choice to localStorage. */
function applyPeriod(val: string): void {
  const p = PERIODS[val] ?? PERIODS[DEFAULT_PERIOD];
  try {
    localStorage.setItem(PERIOD_KEY, val);
  } catch {
    /* ignore */
  }

  document.querySelectorAll("[data-period-v]").forEach((el) => {
    el.textContent = p.label;
  });
  document.querySelectorAll("[data-period-badge]").forEach((el) => {
    el.textContent = p.badge;
    el.classList.toggle("is-now", val === DEFAULT_PERIOD);
  });
  document.querySelectorAll("[data-period-label]").forEach((el) => {
    el.textContent = `${p.label} · ${p.gov}`;
  });
  document.querySelectorAll("[data-period-detail]").forEach((el) => {
    el.textContent = p.detail;
  });
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

/** Initialises the period selector UI on page load. */
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
      const val = opt.dataset.val ?? DEFAULT_PERIOD;
      applyPeriod(val);
      closeMenu();
      // Persist as a server-readable cookie and reload so all data re-filters
      const exp = new Date(Date.now() + 365 * 864e5).toUTCString();
      document.cookie = `peili_period=${val}; Path=/; SameSite=Lax; expires=${exp}`;
      // Clear the date cursor — it may be out of range for the new term
      document.cookie = "peili_date=; Path=/; Max-Age=0";
      window.location.reload();
    });
  });
  document.addEventListener("click", (e) => {
    if (!root.contains(e.target as Node)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });
});

/** Expose period API for page-level interop from server-rendered scripts. */
(window as any).EPPeriod = {
  apply: applyPeriod,
  current: currentPeriod,
  PERIODS,
};
