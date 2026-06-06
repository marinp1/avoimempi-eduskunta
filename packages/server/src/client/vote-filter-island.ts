import { island } from "./island";

function initVoteFilter() {
  const rows = Array.from(document.querySelectorAll<HTMLElement>(".vrow"));
  if (rows.length === 0) return;

  const chipsEl = document.querySelector<HTMLElement>(".fchips");
  const chips = Array.from(
    document.querySelectorAll<HTMLElement>(".fchips .fchip"),
  );
  if (chips.length === 0) return;

  const countEl = document.getElementById("aanestys-count");

  // Restore active filter from DOM so re-runs after click-to-load preserve state.
  let filter = chipsEl?.getAttribute("data-active-filter") ?? "all";

  function applyFilter(targets: HTMLElement[]) {
    let shown = 0;
    for (const r of targets) {
      const visible =
        filter === "all" ||
        (r.getAttribute("data-type") ?? "").indexOf(filter) !== -1;
      r.style.display = visible ? "" : "none";
      if (visible) shown++;
    }
    if (countEl) countEl.textContent = String(shown);
  }

  // Sync chip visual state to the persisted filter.
  for (const c of chips) {
    c.classList.toggle(
      "is-active",
      (c.getAttribute("data-filter") ?? "all") === filter,
    );
  }

  // Apply filter to all current rows, including any newly loaded ones.
  applyFilter(rows);

  // Attach the click handler only once (guard with data attribute).
  if (chipsEl && !chipsEl.hasAttribute("data-filter-bound")) {
    chipsEl.setAttribute("data-filter-bound", "1");
    chipsEl.addEventListener("click", (e) => {
      const chip = (e.target as Element).closest<HTMLElement>(".fchip");
      if (!chip) return;
      filter = chip.getAttribute("data-filter") ?? "all";
      chipsEl.setAttribute("data-active-filter", filter);
      for (const c of document.querySelectorAll<HTMLElement>(
        ".fchips .fchip",
      )) {
        c.classList.toggle(
          "is-active",
          (c.getAttribute("data-filter") ?? "all") === filter,
        );
      }
      applyFilter(Array.from(document.querySelectorAll<HTMLElement>(".vrow")));
    });
  }
}

island(initVoteFilter);
