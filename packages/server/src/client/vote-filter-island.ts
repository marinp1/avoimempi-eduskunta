import { island } from "./island";

function initVoteFilter() {
  const rows = Array.from(document.querySelectorAll<HTMLElement>(".vrow"));
  if (rows.length === 0) return;

  const chips = Array.from(
    document.querySelectorAll<HTMLElement>(".fchips .fchip"),
  );
  if (chips.length === 0) return;

  const countEl = document.getElementById("aanestys-count");
  let filter = "all";

  function apply() {
    let shown = 0;
    rows.forEach((r) => {
      const show =
        filter === "all" ||
        (r.getAttribute("data-type") ?? "").indexOf(filter) !== -1;
      r.style.display = show ? "" : "none";
      if (show) shown++;
    });
    if (countEl) countEl.textContent = String(shown);
  }

  chips.forEach((c) => {
    c.addEventListener("click", () => {
      chips.forEach((x) => x.classList.remove("is-active"));
      c.classList.add("is-active");
      filter = c.getAttribute("data-filter") ?? "all";
      apply();
    });
  });
}

island(initVoteFilter);
