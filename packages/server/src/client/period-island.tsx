// Period selector island — UI interaction only.
//
// Applying a selection is an htmx swap, not a full-page reload: the
// server-rendered Apply button GETs the current page and includes the
// `#period-value` hidden input (via hx-include). This island keeps that hidden
// input in sync with the checkbox state — htmx submits it declaratively, with
// no js: eval. The server re-renders `#main-content` and sends the selector
// back as an out-of-band swap, so the badge/label come from server state.
//
// This island only handles presentation: opening/closing the menu, toggling
// checkbox visuals, the "all" checkbox sync, shift-click range selection, and
// mirroring the resulting `period` value into the hidden input + localStorage.

import { island } from "./island";

const PERIOD_KEY = "peili.period";

function currentRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[data-period]");
}

function closeMenu(root: HTMLElement) {
  const btn = root.querySelector<HTMLElement>(".period__btn");
  const menu = root.querySelector<HTMLElement>(".period__menu");
  if (menu) menu.hidden = true;
  btn?.setAttribute("aria-expanded", "false");
}

/**
 * Mirrors the current checkbox state into the `#period-value` hidden input
 * (and localStorage): "all" when every government is checked, otherwise the
 * sorted, comma-joined ids — the format the server's parsePeriod() expects.
 */
function syncPeriodValue(root: HTMLElement) {
  const govCbs = Array.from(
    root.querySelectorAll<HTMLInputElement>(
      ".period__cb:not([data-period-all])",
    ),
  );
  const selected = govCbs
    .filter((cb) => cb.checked)
    .map((cb) => Number(cb.value));
  const val =
    selected.length === govCbs.length
      ? "all"
      : selected.sort((a, b) => a - b).join(",");
  const hidden = root.querySelector<HTMLInputElement>("#period-value");
  if (hidden) hidden.value = val;
  try {
    localStorage.setItem(PERIOD_KEY, val);
  } catch {
    /* ignore */
  }
}

// Element-scoped handlers — re-bound after every htmx swap of the selector
// (the OOB swap replaces the selector DOM, so the old handlers are discarded).
function initPeriod() {
  const root = currentRoot();
  if (!root) return;
  const btn = root.querySelector<HTMLElement>(".period__btn");
  const menu = root.querySelector<HTMLElement>(".period__menu");
  const listEl = root.querySelector<HTMLElement>("[data-period-menu-list]");
  if (!btn || !menu || !listEl) return;

  // Government checkboxes excluding the "all" toggle. Use the attribute
  // selector — a bare `data-period-all` reads back as "" in dataset, which is
  // falsy, so a `!cb.dataset.periodAll` filter would wrongly keep the toggle.
  const govCbs = Array.from(
    listEl.querySelectorAll<HTMLInputElement>(
      ".period__cb:not([data-period-all])",
    ),
  );
  if (govCbs.length === 0) return;

  const allCb = listEl.querySelector<HTMLInputElement>("[data-period-all]")!;
  const govCount = govCbs.length;
  let lastClickedIndex = -1;

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    menu.hidden = !menu.hidden;
    btn.setAttribute("aria-expanded", String(!menu.hidden));
  });

  function syncAllCb() {
    allCb.checked = govCbs.filter((c) => c.checked).length === govCount;
  }

  allCb.addEventListener("change", () => {
    const state = allCb.checked;
    govCbs.forEach((cb) => {
      cb.checked = state;
      cb.closest(".period__opt")?.classList.toggle("is-selected", state);
    });
    syncPeriodValue(root);
    document.dispatchEvent(new CustomEvent("peili:period"));
  });

  govCbs.forEach((cb, index) => {
    cb.addEventListener("change", () => {
      if (
        (window as any).__periodShiftHeld &&
        lastClickedIndex >= 0 &&
        lastClickedIndex !== index
      ) {
        const lo = Math.min(lastClickedIndex, index);
        const hi = Math.max(lastClickedIndex, index);
        const targetState = cb.checked;
        for (let i = lo; i <= hi; i++) {
          govCbs[i]!.checked = targetState;
          govCbs[i]!.closest(".period__opt")?.classList.toggle(
            "is-selected",
            targetState,
          );
        }
      } else {
        cb.closest(".period__opt")?.classList.toggle("is-selected", cb.checked);
      }
      lastClickedIndex = index;
      syncAllCb();
      syncPeriodValue(root);
      document.dispatchEvent(new CustomEvent("peili:period"));
    });
  });
}

island(initPeriod);

// Document-level handlers — bound once at module load. They re-query the
// current selector root so they survive OOB swaps without double-binding.
document.addEventListener("click", (e) => {
  const root = currentRoot();
  if (root && !root.contains(e.target as Node)) closeMenu(root);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const root = currentRoot();
    if (root) closeMenu(root);
  }
  if (e.key === "Shift") (window as any).__periodShiftHeld = true;
});
document.addEventListener("keyup", (e) => {
  if (e.key === "Shift") (window as any).__periodShiftHeld = false;
});
