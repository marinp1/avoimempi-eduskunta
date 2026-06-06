/* Hamburger-menu toggle island — mobile nav overlay behavior.
   Wires the toggle button, closes on nav-link click or Escape.
   Only active below 720px (matched by the mobile CSS breakpoint). */

const TOGGLE = "[data-nav-toggle]";
const MENU = "[data-nav-menu]";

function mobile(): boolean {
  return window.matchMedia("(max-width: 720px)").matches;
}

function navClose() {
  const menu = document.querySelector<HTMLElement>(MENU);
  const toggle = document.querySelector<HTMLElement>(TOGGLE);
  if (menu) {
    menu.classList.remove("is-open");
  }
  if (toggle) {
    toggle.setAttribute("aria-expanded", "false");
  }
}

function navOpen() {
  const menu = document.querySelector<HTMLElement>(MENU);
  const toggle = document.querySelector<HTMLElement>(TOGGLE);
  if (!menu || !mobile()) return;
  requestAnimationFrame(() => {
    menu?.classList.add("is-open");
  });
  if (toggle) {
    toggle.setAttribute("aria-expanded", "true");
  }
}

function navToggle() {
  const menu = document.querySelector<HTMLElement>(MENU);
  if (menu?.classList.contains("is-open")) {
    navClose();
  } else {
    navOpen();
  }
}

function initNav() {
  /* toggle button */
  const toggleBtn = document.querySelector<HTMLElement>(TOGGLE);
  toggleBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    navToggle();
  });

  /* close when a nav link is clicked (hx-get navigation) */
  const menu = document.querySelector<HTMLElement>(MENU);
  menu?.addEventListener("click", (e) => {
    const link = (e.target as HTMLElement).closest("a");
    if (link) navClose();
  });

  /* close on Escape */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      const m = document.querySelector<HTMLElement>(MENU);
      if (m?.classList.contains("is-open")) navClose();
    }
  });
}

document.addEventListener("DOMContentLoaded", initNav);
