import { island } from "./island";

function initMpSearch() {
  const input = document.querySelector<HTMLInputElement>("[data-mp-search]");
  if (!input) return;

  const list = document.getElementById("mp-list");
  if (!list) return;

  function filter() {
    const q = input!.value.toLowerCase().trim();
    for (const row of list!.querySelectorAll<HTMLElement>(".mvote")) {
      const search = row.getAttribute("data-search") ?? "";
      row.style.display = !q || search.includes(q) ? "" : "none";
    }
  }

  input.addEventListener("input", filter);
}

island(initMpSearch);
