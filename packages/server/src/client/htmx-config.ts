import htmx from "htmx.org";

htmx.config.defaultSwap = "innerHTML";
htmx.config.defaultSettleDelay = 20;
// Smoothly crossfade page swaps via the View Transitions API. Only the
// #main-content region carries a view-transition-name (see _components.css),
// so the page chrome stays put while the content morphs. No-op where the API
// is unsupported (Firefox) — htmx falls back to an instant swap.
htmx.config.transitions = true;

// Preserve scroll position in #main-content when navigating back.
document.body.setAttribute("hx-history-elt", "");
const mainEl = document.getElementById("main-content");
if (mainEl) mainEl.setAttribute("hx-history-elt", "");

// After every htmx swap, sync nav active link and update the document title.
document.addEventListener("htmx:after:settle", () => {
  const path = window.location.pathname;
  for (const link of document.querySelectorAll<HTMLAnchorElement>(".nav a")) {
    link.classList.toggle("is-active", link.getAttribute("href") === path);
  }

  // Extract any <title> that was swapped into #main-content and promote it
  // to the real document title (non-boosted htmx swaps don't do this automatically).
  const mainEl = document.getElementById("main-content");
  const inlineTitle = mainEl?.querySelector("title");
  if (inlineTitle?.textContent) {
    document.title = inlineTitle.textContent;
    inlineTitle.remove();
  }
});

// Loading state: add/remove a class on <body> so CSS can show an indicator
// only while an htmx request is in flight.
document.addEventListener("htmx:before:request", () => {
  document.body.classList.add("is-loading");
});

function removeLoading() {
  document.body.classList.remove("is-loading");
}

document.addEventListener("htmx:after:request", removeLoading);
// Safety net: htmx:finally:request fires after every request (including errors).
document.addEventListener("htmx:finally:request", removeLoading);

// Global error handler: show a brief toast when a navigation or data fetch fails.
document.addEventListener("htmx:response:error", () => {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent =
    "Tietoja ei saatu ladattua. Yritä hetken kuluttua uudelleen.";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
});
