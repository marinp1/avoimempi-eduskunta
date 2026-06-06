import htmx from "htmx.org";

/** Configure htmx globals: transition animations, history mode, and swap behavior. */
htmx.config.defaultSwap = "innerHTML";
htmx.config.transitions = true;
htmx.config.history = "reload";
htmx.config.defaultSettleDelay = 20;

// The nav lives outside #main-content so it is never re-rendered by htmx swaps.
// htmx v4 event names use colons: htmx:after:settle (not htmx:afterSettle)
/** After every htmx swap, sync the active nav link to the current pathname. */
document.addEventListener("htmx:after:settle", () => {
  const path = window.location.pathname;
  for (const link of document.querySelectorAll<HTMLAnchorElement>(".nav a")) {
    link.classList.toggle("is-active", link.getAttribute("href") === path);
  }
});
