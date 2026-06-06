import htmx from "htmx.org";

htmx.config.defaultSwap = "innerHTML";
htmx.config.transitions = true;
htmx.config.history = "reload";
htmx.config.defaultSettleDelay = 20;

// The nav lives outside #main-content so it is never re-rendered by htmx swaps.
// htmx v4 event names use colons: htmx:after:settle (not htmx:afterSettle)
document.addEventListener("htmx:after:settle", () => {
  const path = window.location.pathname;
  for (const link of document.querySelectorAll<HTMLAnchorElement>(".nav a")) {
    link.classList.toggle("is-active", link.getAttribute("href") === path);
  }
});
