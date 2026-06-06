/** @jsxImportSource ./jsx */

import htmx from "htmx.org";

// Data provenance trace popover island.
// Uses htmx.onLoad() instead of DOMContentLoaded so .cite elements added by
// htmx swaps are initialised correctly on every navigation.

const pop = document.createElement("div");
pop.className = "trace-pop";
pop.hidden = true;
pop.setAttribute("role", "dialog");
pop.setAttribute("aria-label", "Tietolähde");

document.addEventListener("DOMContentLoaded", () => {
  document.body.appendChild(pop);
});

let traceCurrent: HTMLElement | null = null;

function traceBuild(el: HTMLElement): void {
  const d = el.dataset;
  const chain = (d.chain ?? "")
    .split(">")
    .map((s) => s.trim())
    .filter(Boolean);

  const fields: [string, string | undefined, boolean][] = [
    ["Aineisto", d.set, false],
    ["Taulu", d.table, true],
    ["Rajapintakutsu", d.endpoint, true],
    ["Tietue", d.record, false],
    ["Jakso", d.jakso, false],
    ["Haettu", d.fetched, false],
  ];

  pop.innerHTML = (
    <>
      <div class="trace-pop__bar">
        <span class="lbl">Tietolähde · jäljite</span>
        <button class="trace-pop__close" aria-label="Sulje">
          ×
        </button>
      </div>
      <div class="trace-pop__body">
        {d.value && <div class="trace-pop__value">{d.value}</div>}
        {d.caption && <div class="trace-pop__caption">{d.caption}</div>}
        <div class="trace-fields">
          {fields
            .filter((r) => r[1])
            .map(([label, val, isCode]) => (
              <div class="trace-field">
                <div class="trace-field__k">{label}</div>
                <div class={`trace-field__v${isCode ? " is-code" : ""}`}>
                  {val}
                </div>
              </div>
            ))}
        </div>
        {chain.length > 0 && (
          <div class="trace-pop__chain">
            {chain.map((n, i) => (
              <>
                {i > 0 && <span class="arr">→</span>}
                <span class="node">{n}</span>
              </>
            ))}
          </div>
        )}
        <div class="trace-pop__foot">
          {d.url ? (
            <a
              class="trace-pop__orig"
              href={d.url}
              target="_blank"
              rel="noopener"
            >
              {d.orig ?? "Avaa alkuperäinen"} ↗
            </a>
          ) : (
            <span />
          )}
          {d.fetched && <span class="trace-pop__fresh">tuore</span>}
        </div>
      </div>
    </>
  );

  pop.querySelector(".trace-pop__close")?.addEventListener("click", traceClose);
}

function tracePlace(el: HTMLElement): void {
  pop.hidden = false;
  pop.style.left = "0px";
  pop.style.top = "0px";
  const r = el.getBoundingClientRect();
  const pw = pop.offsetWidth;
  const ph = pop.offsetHeight;
  const sx = window.scrollX;
  const sy = window.scrollY;
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const left = Math.max(sx + 12, Math.min(r.left + sx, sx + vw - pw - 12));
  const below = r.bottom + sy + 8;
  const above = r.top + sy - ph - 8;
  const roomBelow = vh - r.bottom;
  let top = roomBelow >= ph + 16 || r.top < ph + 16 ? below : above;
  top = Math.max(sy + 12, Math.min(top, sy + vh - ph - 12));
  pop.style.left = `${left}px`;
  pop.style.top = `${top}px`;
}

function traceOpen(el: HTMLElement): void {
  if (traceCurrent) traceCurrent.setAttribute("aria-expanded", "false");
  traceCurrent = el;
  el.setAttribute("aria-expanded", "true");
  traceBuild(el);
  tracePlace(el);
}

function traceClose(): void {
  pop.hidden = true;
  if (traceCurrent) {
    traceCurrent.setAttribute("aria-expanded", "false");
    traceCurrent = null;
  }
}

document.addEventListener("click", (e) => {
  const c = (e.target as Element).closest<HTMLElement>(".cite");
  if (c) {
    e.preventDefault();
    traceCurrent === c ? traceClose() : traceOpen(c);
    return;
  }
  if (!(e.target as Element).closest(".trace-pop")) traceClose();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") traceClose();
  const c = (e.target as Element).closest?.<HTMLElement>(".cite");
  if (c && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    traceCurrent === c ? traceClose() : traceOpen(c);
  }
});

window.addEventListener("resize", traceClose);
window.addEventListener(
  "scroll",
  () => {
    if (traceCurrent) tracePlace(traceCurrent);
  },
  true,
);

htmx.onLoad((root) => {
  root.querySelectorAll<HTMLElement>(".cite").forEach((el) => {
    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
    el.setAttribute("role", "button");
    el.setAttribute("aria-expanded", "false");
    if (!el.querySelector(".cite__mark") && el.dataset.mark !== "off") {
      const m = document.createElement("sup");
      m.className = "cite__mark";
      m.textContent = el.dataset.markText ?? "∗";
      el.appendChild(m);
    }
  });

  root
    .querySelectorAll<HTMLButtonElement>(".ai-sources-toggle")
    .forEach((btn) => {
      btn.setAttribute("aria-expanded", "false");
      // htmx.onLoad fires on every swap; guard against binding the click
      // handler more than once if this node is processed again.
      if (btn.dataset.bound === "1") return;
      btn.dataset.bound = "1";
      btn.addEventListener("click", () => {
        const scope = btn.closest<HTMLElement>(".ai, .summary");
        const tgt = btn.dataset.target
          ? document.getElementById(btn.dataset.target)
          : (scope?.querySelector<HTMLElement>(".ai-sources") ?? null);
        if (!tgt) return;
        const openNow = tgt.classList.toggle("is-open");
        btn.setAttribute("aria-expanded", openNow ? "true" : "false");
        const lbl = btn.querySelector(".lbl");
        if (lbl)
          lbl.textContent = openNow
            ? "Piilota lähteet"
            : (btn.dataset.label ?? "Näytä lähteet");
      });
    });
});
