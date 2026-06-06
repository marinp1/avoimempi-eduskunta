/** @jsxImportSource ./jsx */

// Period selector island — fetches real government periods from the API,
// renders them as checkboxes with shift-click range selection, and persists
// the choice via a cookie for server-side data scoping.

interface GovernmentPeriod {
  id: number;
  name: string;
  label: string;
  startDate: string;
  endDate: string | null;
}

const API_URL = "/api/hallituskaudet";
const PERIOD_KEY = "peili.period";
const DEFAULT_COOKIE = "peili_period";

/** Formats an ISO date to Finnish `d.m.yyyy`. */
function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y}`;
}

/** Reads the currently selected government IDs from localStorage or cookie. */
function readStoredIds(): string {
  try {
    const v = localStorage.getItem(PERIOD_KEY);
    if (v) return v;
  } catch {
    /* ignore */
  }
  // Fallback: read from existing cookie
  const cookie = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${DEFAULT_COOKIE}=([^;]+)`),
  );
  return cookie ? decodeURIComponent(cookie[1]!) : "";
}

/** Serializes a set of government IDs to a comma-separated string. */
function joinIds(ids: Set<number>): string {
  return [...ids].sort((a, b) => a - b).join(",");
}

/** Parses a comma-separated government ID string. */
function parseIds(str: string): Set<number> {
  if (!str || str === "all") return new Set();
  return new Set(
    str
      .split(",")
      .map(Number)
      .filter((id) => !Number.isNaN(id)),
  );
}

/** Builds display texts describing the current selection. */
function describeSelection(
  governments: GovernmentPeriod[],
  selected: Set<number>,
  allSelected: boolean,
): {
  btnLabel: string;
  badge: string;
  badgeClass: string;
  footLabel: string;
  footDetail: string;
} {
  if (allSelected || selected.size === governments.length) {
    return {
      btnLabel: "Kaikki hallituskaudet",
      badge: "koko aineisto",
      badgeClass: "",
      footLabel: "Kaikki hallituskaudet · koko avoin data",
      footDetail: "1907 – tähän päivään · kaikki kaudet",
    };
  }

  const chosen = governments.filter((g) => selected.has(g.id));
  if (chosen.length === 0) {
    const c = governments[0]!;
    const endStr = c.endDate ? fmtDate(c.endDate) : "kesken";
    return {
      btnLabel: c.name,
      badge: c.endDate ? "päättynyt" : "nykyinen",
      badgeClass: c.endDate ? "" : "is-now",
      footLabel: `${c.name} · ${c.endDate ? "päättynyt hallituskausi" : "nykyinen hallituskausi"}`,
      footDetail: `${fmtDate(c.startDate)} – ${endStr}`,
    };
  }

  if (chosen.length === 1) {
    const c = chosen[0]!;
    const endStr = c.endDate ? fmtDate(c.endDate) : "kesken";
    return {
      btnLabel: c.name,
      badge: c.endDate ? "päättynyt" : "nykyinen",
      badgeClass: c.endDate ? "" : "is-now",
      footLabel: `${c.name} · ${c.endDate ? "päättynyt hallituskausi" : "nykyinen hallituskausi"}`,
      footDetail: `${fmtDate(c.startDate)} – ${endStr}`,
    };
  }

  // Multiple selected
  const sorted = [...chosen].sort((a, b) =>
    a.startDate.localeCompare(b.startDate),
  );
  const earliest = sorted[0]!;
  const latest = sorted[sorted.length - 1]!;
  const endStr = latest.endDate ? fmtDate(latest.endDate) : "kesken";
  const hasCurrent = chosen.some((g) => g.endDate === null);

  return {
    btnLabel: `${chosen.length} hallituskautta`,
    badge: hasCurrent ? "nykyinen + muita" : "valitut",
    badgeClass: hasCurrent ? "is-now" : "",
    footLabel: `${chosen.length} hallituskautta · ${sorted.map((g) => g.name).join(" + ")}`,
    footDetail: `${fmtDate(earliest.startDate)} – ${endStr}`,
  };
}

/** Applies a selection to all `[data-period-*]` DOM elements. */
function applyDom(
  governments: GovernmentPeriod[],
  selected: Set<number>,
  allSelected: boolean,
): void {
  const desc = describeSelection(governments, selected, allSelected);

  document.querySelectorAll("[data-period-v]").forEach((el) => {
    el.textContent = desc.btnLabel;
  });
  document.querySelectorAll("[data-period-badge]").forEach((el) => {
    el.textContent = desc.badge;
    el.className = `period__badge ${desc.badgeClass}`;
  });
  document.querySelectorAll("[data-period-label]").forEach((el) => {
    el.textContent = desc.footLabel;
  });
  document.querySelectorAll("[data-period-detail]").forEach((el) => {
    el.textContent = desc.footDetail;
  });
  document.querySelectorAll("[data-period-badge-foot]").forEach((el) => {
    el.textContent = desc.badge;
    el.className = `pbadge ${desc.badgeClass}`;
  });
  document.body.setAttribute("data-active-period", desc.btnLabel);
}

/** Builds the checkbox menu inside `.period__menu-list`. */
function buildMenu(
  listEl: HTMLElement,
  governments: GovernmentPeriod[],
  selected: Set<number>,
): void {
  listEl.innerHTML = "";

  const allChecked = selected.size === governments.length;
  let lastClickedIndex = -1;

  // "All" toggle
  const allRow = document.createElement("label");
  allRow.className = "period__opt";
  allRow.innerHTML = `
    <input type="checkbox" class="period__cb" data-period-all
      ${allChecked ? "checked" : ""} />
    <div class="period__opt-text">
      <span class="period__opt-main">Kaikki hallituskaudet</span>
      <span class="period__opt-sub">koko avoin data</span>
    </div>
  `;
  const allCb = allRow.querySelector<HTMLInputElement>("input")!;
  allCb.addEventListener("change", () => {
    if (allCb.checked) {
      governments.forEach((g) => selected.add(g.id));
    } else {
      selected.clear();
    }
    rebuildMenu(listEl, governments, selected);
  });
  listEl.appendChild(allRow);

  // Individual government rows
  governments.forEach((gov, index) => {
    const row = document.createElement("label");
    row.className = "period__opt";
    if (selected.has(gov.id)) row.classList.add("is-selected");
    const endStr = gov.endDate ? fmtDate(gov.endDate) : "kesken";

    row.innerHTML = `
      <input type="checkbox" class="period__cb" value="${gov.id}"
        ${selected.has(gov.id) ? "checked" : ""} />
      <div class="period__opt-text">
        <span class="period__opt-main">${gov.name}</span>
        <span class="period__opt-sub">${fmtDate(gov.startDate)} – ${endStr}</span>
      </div>
    `;

    const cb = row.querySelector<HTMLInputElement>("input")!;

    cb.addEventListener("change", () => {
      // Shift-click range selection
      if (
        selected.size > 0 &&
        (window as any).__periodShiftHeld &&
        lastClickedIndex >= 0 &&
        lastClickedIndex !== index
      ) {
        const rangeStart = Math.min(lastClickedIndex, index);
        const rangeEnd = Math.max(lastClickedIndex, index);
        for (let i = rangeStart; i <= rangeEnd; i++) {
          selected.add(governments[i]!.id);
        }
      } else {
        if (cb.checked) {
          selected.add(gov.id);
        } else {
          selected.delete(gov.id);
        }
      }
      lastClickedIndex = index;
      rebuildMenu(listEl, governments, selected);
    });

    listEl.appendChild(row);
  });

  // Shift key tracking (once, at document level)
  if (!(window as any).__periodShiftBound) {
    (window as any).__periodShiftBound = true;
    document.addEventListener("keydown", (e) => {
      if (e.key === "Shift") (window as any).__periodShiftHeld = true;
    });
    document.addEventListener("keyup", (e) => {
      if (e.key === "Shift") (window as any).__periodShiftHeld = false;
    });
  }
}

function rebuildMenu(
  listEl: HTMLElement,
  governments: GovernmentPeriod[],
  selected: Set<number>,
): void {
  const allCb = listEl.querySelector<HTMLInputElement>("[data-period-all]");
  if (allCb) {
    allCb.checked = selected.size === governments.length;
  }

  const rows = listEl.querySelectorAll<HTMLLabelElement>(".period__opt");
  rows.forEach((row) => {
    const cb = row.querySelector<HTMLInputElement>("input");
    if (!cb || cb.dataset.periodAll !== undefined) return;
    const id = Number(cb.value);
    cb.checked = selected.has(id);
    row.classList.toggle("is-selected", selected.has(id));
  });

  applyDom(governments, selected, selected.size === governments.length);
}

/** Persist selection and trigger page reload so the server re-scopes. */
function commit(governments: GovernmentPeriod[], selected: Set<number>): void {
  const val = selected.size === governments.length ? "all" : joinIds(selected);
  try {
    localStorage.setItem(PERIOD_KEY, val);
  } catch {
    /* ignore */
  }

  const exp = new Date(Date.now() + 365 * 864e5).toUTCString();
  document.cookie = `${DEFAULT_COOKIE}=${val}; Path=/; SameSite=Lax; expires=${exp}`;
  // Clear the date cursor — it may be out of range for the new term
  document.cookie = "peili_date=; Path=/; Max-Age=0";
  window.location.reload();
}

/** Initialises the period selector island on page load. */
document.addEventListener("DOMContentLoaded", async () => {
  const root = document.querySelector<HTMLElement>("[data-period]");
  if (!root) return;
  const btn = root.querySelector<HTMLElement>(".period__btn");
  const menu = root.querySelector<HTMLElement>(".period__menu");
  const listEl = root.querySelector<HTMLElement>("[data-period-menu-list]");
  if (!btn || !menu || !listEl) return;

  const openMenu = () => {
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
  };
  const closeMenu = () => {
    menu.hidden = true;
    btn.setAttribute("aria-expanded", "false");
  };

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (menu.hidden) {
      openMenu();
    } else {
      closeMenu();
    }
  });
  document.addEventListener("click", (e) => {
    if (!root.contains(e.target as Node)) closeMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  // Fetch real government periods
  let governments: GovernmentPeriod[] = [];
  try {
    const res = await fetch(API_URL);
    if (res.ok) {
      const json: GovernmentPeriod[] = await res.json();
      governments = json
        .filter((g) => g.id != null)
        .sort((a, b) => b.startDate.localeCompare(a.startDate));
    }
  } catch {
    /* API unavailable — menu stays empty */
  }

  if (governments.length === 0) return;

  const stored = readStoredIds();
  const selected = parseIds(stored);

  // Default to current government if nothing is selected or stored value invalid
  if (selected.size === 0) {
    const current =
      governments.find((g) => g.endDate === null) ?? governments[0]!;
    selected.add(current.id);
  }

  buildMenu(listEl, governments, selected);
  applyDom(governments, selected, selected.size === governments.length);

  // Save / apply button
  const applyBtn = document.createElement("button");
  applyBtn.className = "period__apply";
  applyBtn.textContent = "Käytä valintaa →";
  applyBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    commit(governments, selected);
  });
  listEl.parentElement!.insertBefore(applyBtn, listEl.nextSibling);
});

/** Expose for interop if needed. */
(window as any).EPPeriod = {};
