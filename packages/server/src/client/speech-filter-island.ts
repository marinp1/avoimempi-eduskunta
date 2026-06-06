import { island } from "./island";

/**
 * Speech filter island — pure client-side filtering for the debate page.
 * Filters `.speech` elements by bloc (hallitus/oppositio) and text search.
 */
function initSpeechFilter() {
  const rows = Array.from(document.querySelectorAll<HTMLElement>(".speech"));
  if (rows.length === 0) return;

  const chips = Array.from(document.querySelectorAll<HTMLElement>(".fchip"));
  const search = document.getElementById(
    "sp-search",
  ) as HTMLInputElement | null;
  const countEl = document.getElementById("sp-count");
  const emptyEl = document.getElementById("sp-empty");
  let filter = "all";

  function apply() {
    const q = (search?.value ?? "").trim().toLowerCase();
    let shown = 0;
    rows.forEach((r) => {
      const okB = filter === "all" || r.getAttribute("data-bloc") === filter;
      const okT = !q || (r.getAttribute("data-text") ?? "").includes(q);
      const show = okB && okT;
      r.style.display = show ? "" : "none";
      if (show) shown++;
    });
    if (countEl) countEl.textContent = String(shown);
    if (emptyEl) emptyEl.hidden = shown !== 0;
  }

  chips.forEach((c) => {
    c.addEventListener("click", () => {
      chips.forEach((x) => x.classList.remove("is-active"));
      c.classList.add("is-active");
      filter = c.getAttribute("data-filter") ?? "all";
      apply();
    });
  });

  if (search) search.addEventListener("input", apply);
}

island(initSpeechFilter);
