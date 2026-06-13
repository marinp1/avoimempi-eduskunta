/**
 * Timeline scrubber island — UI interaction only.
 * Reads sitting data from the server-rendered #tl-data JSON element,
 * builds the track (ticks, gridlines, handle), and handles drag/keyboard.
 *
 * On cursor commit it dispatches `tl:commit` on the document.
 * Pages that want to react wrap their time-dependent section in a div with
 * `hx-trigger="tl:commit from:document"` — htmx then fetches the updated
 * fragment from the server, which sets the URL params and re-renders.
 */

interface SittingTick {
  d: string;
  id: string;
  type: "vote" | "talk" | "quiet" | "comp";
}

interface TlData {
  term: string;
  today: string;
  cursor: string;
  sittings: SittingTick[];
}

const MONTHS = [
  "tammi",
  "helmi",
  "maalis",
  "huhti",
  "touko",
  "kesä",
  "heinä",
  "elo",
  "syys",
  "loka",
  "marras",
  "joulu",
];

function fmt(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y}`;
}

function ms(iso: string): number {
  return Date.parse(iso + "T00:00:00");
}

function nearestIdx(sittings: SittingTick[], frac: number): number {
  const t0 = ms(sittings[0]!.d);
  const t1 = ms(sittings[sittings.length - 1]!.d);
  const target = t0 + frac * (t1 - t0);
  let best = 0;
  let bestDiff = Infinity;
  for (let i = 0; i < sittings.length; i++) {
    const diff = Math.abs(ms(sittings[i]!.d) - target);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  return best;
}

function rangeFrac(sittings: SittingTick[], iso: string): number {
  const t0 = ms(sittings[0]!.d);
  const t1 = ms(sittings[sittings.length - 1]!.d);
  if (t1 === t0) return 1;
  return (ms(iso) - t0) / (t1 - t0);
}

function initTimeline(force = false) {
  const root = document.querySelector<HTMLElement>("[data-timeline]");
  if (!root) return;
  if (!force && root.hasAttribute("data-tl-init")) return;

  const raw = document.getElementById("tl-data");
  if (!raw?.textContent) return;

  let { today, cursor, sittings }: TlData = JSON.parse(raw.textContent);
  if (!sittings || sittings.length === 0) return;

  let idx = sittings.findIndex((s) => s.d === cursor);
  if (idx < 0) idx = sittings.length - 1;

  const ticksEl = root.querySelector<HTMLElement>("[data-tl-ticks]")!;
  const gridEl = root.querySelector<HTMLElement>("[data-tl-grid]")!;
  const handle = root.querySelector<HTMLElement>("[data-tl-handle]")!;
  const flag = root.querySelector<HTMLElement>("[data-tl-flag]")!;
  const todayEl = root.querySelector<HTMLElement>("[data-tl-today]")!;
  const dateEl = root.querySelector<HTMLElement>("[data-tl-date]")!;
  const relEl = root.querySelector<HTMLElement>("[data-tl-rel]")!;
  const prevBtn = root.querySelector<HTMLButtonElement>("[data-tl-prev]")!;
  const nextBtn = root.querySelector<HTMLButtonElement>("[data-tl-next]")!;
  const nowBtn = root.querySelector<HTMLButtonElement>("[data-tl-now]")!;
  const dateInput = document.getElementById(
    "tl-date-input",
  ) as HTMLInputElement | null;
  const track = root.querySelector<HTMLElement>("[data-tl-track]")!;

  const tip = document.createElement("span");
  tip.className = "tl__tip";
  tip.hidden = true;
  track.appendChild(tip);

  function buildTrack() {
    const t0 = ms(sittings[0]!.d);
    const t1 = ms(sittings[sittings.length - 1]!.d);

    ticksEl.innerHTML = "";
    sittings.forEach((e, i) => {
      const t = document.createElement("span");
      t.className = `tl__tick t-${e.type}`;
      t.style.left = rangeFrac(sittings, e.d) * 100 + "%";
      (t as any).dataset.i = i;
      t.addEventListener("mouseenter", () => {
        tip.textContent = `${fmt(e.d)} · ${e.id}`;
        const tickRect = t.getBoundingClientRect();
        const trackRect = track.getBoundingClientRect();
        const left = tickRect.left - trackRect.left + tickRect.width / 2;
        tip.style.left = `${left}px`;
        tip.hidden = false;
      });
      t.addEventListener("mouseleave", () => {
        tip.hidden = true;
      });
      ticksEl.appendChild(t);
    });

    gridEl.innerHTML = "";
    const d = new Date(t0);
    const end = new Date(t1);
    d.setDate(1);
    while (d <= end) {
      const isoM =
        d.getFullYear() +
        "-" +
        String(d.getMonth() + 1).padStart(2, "0") +
        "-01";
      const f = rangeFrac(sittings, isoM);
      if (f > 0.015 && f < 0.985) {
        const isYear = d.getMonth() === 0;
        const quarter = d.getMonth() % 3 === 0;
        if (quarter || isYear) {
          const tier = isYear ? " is-year" : " is-qtr";
          const line = document.createElement("span");
          line.className = "tl__gline" + tier;
          line.style.left = f * 100 + "%";
          gridEl.appendChild(line);
          const lab = document.createElement("span");
          lab.className = "tl__glabel" + tier;
          lab.style.left = f * 100 + "%";
          lab.textContent = isYear
            ? String(d.getFullYear())
            : MONTHS[d.getMonth()]!;
          gridEl.appendChild(lab);
        }
      }
      d.setMonth(d.getMonth() + 1);
    }

    const hasToday = sittings.some((e) => e.d === today);
    todayEl.hidden = !hasToday;
    if (hasToday) {
      todayEl.style.left = rangeFrac(sittings, today) * 100 + "%";
    }
  }

  function render() {
    const e = sittings[idx]!;
    const isLatest = idx === sittings.length - 1;
    const isNow = e.d >= today;

    const f = rangeFrac(sittings, e.d);
    handle.style.left = f * 100 + "%";
    flag.textContent = `${fmt(e.d)} · ${e.id}`;

    const trackW = track.getBoundingClientRect().width || 1;
    const flagHalf = flag.offsetWidth / 2 + 4;
    const px = f * trackW;
    let shift = 0;
    if (px < flagHalf) shift = flagHalf - px;
    else if (px > trackW - flagHalf) shift = trackW - flagHalf - px;
    flag.style.transform = `translateX(calc(-50% + ${Math.round(shift)}px))`;

    Array.prototype.forEach.call(ticksEl.children, (t: HTMLElement) => {
      t.classList.toggle("is-active", Number((t as any).dataset.i) === idx);
    });

    dateEl.textContent = fmt(e.d);
    if (isNow) {
      relEl.textContent = "nykyhetki";
      relEl.classList.add("is-now");
    } else {
      relEl.textContent = isLatest
        ? "kauden viimeinen istunto"
        : "arkistonäkymä";
      relEl.classList.remove("is-now");
    }
    prevBtn.disabled = idx === 0;
    nextBtn.disabled = isLatest;
    nowBtn.classList.toggle("is-hidden", isLatest);

    document.body.classList.toggle("is-archive", !isNow);
  }

  function commit() {
    const e = sittings[idx]!;
    if (dateInput) dateInput.value = e.d;
    // Keep #tl-data in sync so any re-init picks up the correct cursor
    if (raw) {
      const data = JSON.parse(raw.textContent);
      data.cursor = e.d;
      raw.textContent = JSON.stringify(data);
    }
    document.dispatchEvent(
      new CustomEvent("tl:commit", { detail: { iso: e.d } }),
    );
  }

  buildTrack();
  render();
  root.setAttribute("data-tl-init", "");
  document.dispatchEvent(new CustomEvent("tl:ready"));

  prevBtn.addEventListener("click", () => {
    if (idx > 0) {
      idx--;
      render();
      commit();
    }
  });
  nextBtn.addEventListener("click", () => {
    if (idx < sittings.length - 1) {
      idx++;
      render();
      commit();
    }
  });
  nowBtn.addEventListener("click", () => {
    idx = sittings.length - 1;
    render();
    commit();
  });

  handle.addEventListener("keydown", (e) => {
    let changed = false;
    if (e.key === "ArrowLeft" && idx > 0) {
      idx--;
      changed = true;
    } else if (e.key === "ArrowRight" && idx < sittings.length - 1) {
      idx++;
      changed = true;
    } else if (e.key === "Home") {
      idx = 0;
      changed = true;
    } else if (e.key === "End") {
      idx = sittings.length - 1;
      changed = true;
    }
    if (changed) {
      e.preventDefault();
      render();
      commit();
    }
  });

  let dragging = false;

  function pointerFrac(clientX: number): number {
    const rect = track.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  track.addEventListener("pointerdown", (e) => {
    if ((e.target as HTMLElement).closest("[data-tl-handle]")) {
      dragging = true;
      track.setPointerCapture(e.pointerId);
    } else {
      idx = nearestIdx(sittings, pointerFrac(e.clientX));
      render();
    }
  });

  track.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    idx = nearestIdx(sittings, pointerFrac(e.clientX));
    render();
  });

  track.addEventListener("pointerup", () => {
    if (dragging) {
      dragging = false;
      commit();
    }
  });

  track.addEventListener("click", (e) => {
    if ((e.target as HTMLElement).closest("[data-tl-handle]")) return;
    idx = nearestIdx(sittings, pointerFrac(e.clientX));
    render();
    commit();
  });

  // Rebuild when period changes
  document.addEventListener("peili:period", () => {
    const freshRaw = document.getElementById("tl-data");
    if (!freshRaw?.textContent) return;
    const fresh: TlData = JSON.parse(freshRaw.textContent);
    today = fresh.today;
    cursor = fresh.cursor;
    sittings = fresh.sittings;
    idx = sittings.findIndex((s) => s.d === cursor);
    if (idx < 0) idx = sittings.length - 1;
    buildTrack();
    render();
    document.dispatchEvent(new CustomEvent("tl:ready"));
  });
}

document.addEventListener("DOMContentLoaded", () => initTimeline());
document.addEventListener("htmx:after:settle", () => {
  initTimeline(true);
});
