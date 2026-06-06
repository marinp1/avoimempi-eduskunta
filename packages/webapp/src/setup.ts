import htmx from "htmx.org";

htmx.config.defaultSwap = "innerHTML";
htmx.config.transitions = true;
htmx.config.history = "reload";
htmx.config.defaultSettleDelay = 20;

// Keep aria-current="page" in sync with the URL after htmx navigation.
// The nav lives outside #main-content so it is never re-rendered by htmx swaps.
document.addEventListener("htmx:afterSettle", () => {
  const path = window.location.pathname;
  for (const link of document.querySelectorAll<HTMLAnchorElement>(".site-nav a")) {
    if (link.getAttribute("href") === path) {
      link.setAttribute("aria-current", "page");
    } else {
      link.removeAttribute("aria-current");
    }
  }
});
