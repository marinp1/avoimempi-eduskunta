// Period selector island — attaches interaction handlers to the
// server-rendered period menu and persists the choice via URL params
// for server-side data scoping.

const PERIOD_KEY = "peili.period";

function collectSelected(menuList: HTMLElement): Set<number> {
  const ids = new Set<number>();
  menuList
    .querySelectorAll<HTMLInputElement>(".period__cb:not([data-period-all])")
    .forEach((cb) => {
      if (cb.checked) ids.add(Number(cb.value));
    });
  return ids;
}

function commit(selected: Set<number>, govCount: number) {
  const val =
    selected.size === govCount
      ? "all"
      : [...selected].sort((a, b) => a - b).join(",");
  try {
    localStorage.setItem(PERIOD_KEY, val);
  } catch {
    /* ignore */
  }
  const url = new URL(window.location.href);
  url.searchParams.set("period", val);
  url.searchParams.delete("date");
  window.location.href = url.toString();
}

document.addEventListener("DOMContentLoaded", () => {
  const root = document.querySelector<HTMLElement>("[data-period]");
  if (!root) return;
  const btn = root.querySelector<HTMLElement>(".period__btn");
  const menu = root.querySelector<HTMLElement>(".period__menu");
  const listEl = root.querySelector<HTMLElement>("[data-period-menu-list]");
  if (!btn || !menu || !listEl) return;

  const allCbs = Array.from(
    listEl.querySelectorAll<HTMLInputElement>(".period__cb"),
  );
  if (allCbs.length === 0) return;

  const allCb = listEl.querySelector<HTMLInputElement>("[data-period-all]")!;
  const govCbs = allCbs.filter((cb) => !cb.dataset.periodAll);
  const govCount = govCbs.length;
  let lastClickedIndex = -1;

  // Menu toggle
  const open = () => {
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
  };
  const close = () => {
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  };
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menu.hidden) open();
    else close();
  });
  document.addEventListener("click", (e) => {
    if (!root.contains(e.target as Node)) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });

  function syncAllCb() {
    const checked = govCbs.filter((c) => c.checked).length;
    allCb.checked = checked === govCount;
  }

  allCb.addEventListener("change", () => {
    const state = allCb.checked;
    govCbs.forEach((cb) => {
      cb.checked = state;
      cb.closest(".period__opt")?.classList.toggle("is-selected", state);
    });
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
      document.dispatchEvent(new CustomEvent("peili:period"));
    });
  });

  // Shift key tracking
  if (!(window as any).__periodShiftBound) {
    (window as any).__periodShiftBound = true;
    document.addEventListener("keydown", (e) => {
      if (e.key === "Shift") (window as any).__periodShiftHeld = true;
    });
    document.addEventListener("keyup", (e) => {
      if (e.key === "Shift") (window as any).__periodShiftHeld = false;
    });
  }

  // Apply button
  const applyBtn = document.createElement("button");
  applyBtn.className = "period__apply";
  applyBtn.textContent = "Käytä valintaa →";
  applyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    commit(collectSelected(listEl), govCount);
  });
  listEl.parentElement!.insertBefore(applyBtn, listEl.nextSibling);
});
