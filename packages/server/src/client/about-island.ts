/* About panel ("Toimitukselta") — open/close behavior.
   Server-rendered <aside class="about"> + <div class="about-scrim"> are
   already in the DOM (hidden by default). This island wires the trigger,
   close button, scrim, and Escape key to toggle the panel.

   The panel slides in/out via CSS transform + body padding push
   (controlled by `html.about-open` and `.about.is-open`). */

const PANEL = "about";
const SCRIM = "about-scrim";
const OPEN_TRIGGER = "[data-about-open]";

let initialized = false;

function open() {
  const panel = document.querySelector<HTMLElement>(`.${PANEL}`);
  const scrim = document.querySelector<HTMLElement>(`.${SCRIM}`);
  if (!panel || !scrim) return;

  scrim.hidden = false;
  panel.hidden = false;
  requestAnimationFrame(() => {
    document.documentElement.classList.add("about-open");
    scrim.classList.add("is-open");
    panel.classList.add("is-open");
  });
  panel.setAttribute("aria-hidden", "false");
}

function close() {
  const panel = document.querySelector<HTMLElement>(`.${PANEL}`);
  const scrim = document.querySelector<HTMLElement>(`.${SCRIM}`);
  if (!panel) return;

  document.documentElement.classList.remove("about-open");
  scrim?.classList.remove("is-open");
  panel.classList.remove("is-open");
  panel.setAttribute("aria-hidden", "true");

  const done = () => {
    if (scrim) scrim.hidden = true;
    panel.hidden = true;
    panel.removeEventListener("transitionend", done);
  };
  panel.addEventListener("transitionend", done);
  setTimeout(done, 360);
}

function toggle() {
  const panel = document.querySelector<HTMLElement>(`.${PANEL}`);
  if (!panel) return;
  if (panel.classList.contains("is-open")) close();
  else open();
}

function init() {
  if (initialized) return;
  initialized = true;

  /* trigger buttons */
  document.querySelectorAll(OPEN_TRIGGER).forEach((t) => {
    t.addEventListener("click", (e) => {
      e.preventDefault();
      toggle();
    });
  });

  /* close button inside the panel */
  const closeBtn = document.querySelector<HTMLElement>(`.${PANEL}__close`);
  closeBtn?.addEventListener("click", close);

  /* scrim click closes */
  const scrim = document.querySelector<HTMLElement>(`.${SCRIM}`);
  scrim?.addEventListener("click", close);

  /* Escape key */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const panel = document.querySelector<HTMLElement>(`.${PANEL}`);
      if (panel && !panel.hidden) close();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
