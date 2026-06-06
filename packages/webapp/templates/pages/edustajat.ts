import type { RosterRow } from "../../../server/database/repositories/person-repository";
import { esc, html } from "../../html";
import { partyColor, partyShortName } from "../components/party";

export const EDUSTAJAT_TITLE = "Kansanedustajat";

// ── Filter / sort params ──────────────────────────────────────────────────────

export interface RosterParams {
  q?: string;
  party?: string;
  bloc?: string;
  sort?: string;
  dir?: string;
}

function districtShort(rawName: string | null): string {
  if (!rawName) return "—";
  return rawName
    .replace(/ vaalipiiri$/, "")
    .replace(/n läänin$/, "")
    .replace(/n$/, "");
}

function age(birthYear: number | null): string {
  if (!birthYear) return "—";
  return String(new Date().getFullYear() - birthYear);
}

function pctBar(rate: number): string {
  const w = Math.min(100, Math.max(0, rate));
  return html`<span class="track"><span class="fill" style="width:${w.toFixed(0)}%"></span></span><span class="pct">${rate.toFixed(0)} %</span>`;
}

// ── Filtering + sorting ───────────────────────────────────────────────────────

export function applyFilters(
  rows: RosterRow[],
  params: RosterParams,
): RosterRow[] {
  let result = rows;

  if (params.q) {
    const q = params.q.toLowerCase();
    result = result.filter(
      (r) =>
        `${r.first_name} ${r.last_name}`.toLowerCase().includes(q) ||
        `${r.last_name}, ${r.first_name}`.toLowerCase().includes(q) ||
        (r.district_name ?? "").toLowerCase().includes(q),
    );
  }

  if (params.party && params.party !== "all") {
    result = result.filter((r) => r.group_abbreviation === params.party);
  }

  if (params.bloc === "hallitus") {
    result = result.filter((r) => r.is_in_government === 1);
  } else if (params.bloc === "oppositio") {
    result = result.filter((r) => r.is_in_government === 0);
  }

  const dir = params.dir === "desc" ? -1 : 1;
  switch (params.sort) {
    case "party":
      result = [...result].sort(
        (a, b) =>
          dir *
          (a.group_abbreviation ?? "").localeCompare(
            b.group_abbreviation ?? "",
          ),
      );
      break;
    case "district":
      result = [...result].sort(
        (a, b) =>
          dir * (a.district_name ?? "").localeCompare(b.district_name ?? ""),
      );
      break;
    case "age":
      result = [...result].sort(
        (a, b) => dir * ((b.birth_year ?? 0) - (a.birth_year ?? 0)),
      );
      break;
    case "att":
      result = [...result].sort(
        (a, b) => dir * (a.participation_rate - b.participation_rate),
      );
      break;
    default:
      if (params.sort === "name" && dir === -1) {
        result = [...result].sort((a, b) =>
          b.sort_name.localeCompare(a.sort_name),
        );
      }
  }

  return result;
}

// ── Party chip list (from visible parties in current roster) ──────────────────

const CHIP_PARTIES = [
  { code: "kok", label: "Kokoomus" },
  { code: "ps", label: "Perussuomalaiset" },
  { code: "sd", label: "SDP" },
  { code: "kesk", label: "Keskusta" },
  { code: "vihr", label: "Vihreät" },
  { code: "vas", label: "Vasemmistoliitto" },
  { code: "r", label: "RKP" },
  { code: "kd", label: "KD" },
];

// ── Row render ────────────────────────────────────────────────────────────────

function renderRow(r: RosterRow): string {
  const color = partyColor(r.group_abbreviation ?? "");
  const shortParty = partyShortName(r.group_abbreviation ?? "");
  const bloc = r.is_in_government === 1 ? "Hallitus" : "Oppositio";
  const name = `${r.first_name} ${r.last_name}`;
  const district = districtShort(r.district_name);
  const grp = r.group_abbreviation ?? "unknown";

  return html`<a class="mp-row" href="/edustaja/${r.person_id}"
  data-name="${esc(name.toLowerCase())}"
  data-party="${esc(grp)}"
  data-bloc="${esc(bloc.toLowerCase())}"
  data-district="${esc(district.toLowerCase())}">
  <span class="c-dot"><span style="background:${color}"></span></span>
  <span class="mp-name">${esc(r.first_name)} ${esc(r.last_name)}</span>
  <span class="mp-party">${esc(shortParty)} <small>${esc(bloc)}</small></span>
  <span class="mp-district">${esc(district)}</span>
  <span class="mp-age">${esc(age(r.birth_year))}</span>
  <span class="mp-att">${pctBar(r.participation_rate)}</span>
</a>`;
}

// ── Bloc bar (reusing party list) ─────────────────────────────────────────────

function renderBlocStrip(rows: RosterRow[]): string {
  const total = rows.length;
  const govTotal = rows.filter((r) => r.is_in_government === 1).length;
  const oppTotal = total - govTotal;
  // party segments sorted by size desc
  const byParty = new Map<string, { count: number; gov: number }>();
  for (const r of rows) {
    const code = r.group_abbreviation ?? "unknown";
    const entry = byParty.get(code) ?? { count: 0, gov: 0 };
    entry.count++;
    if (r.is_in_government === 1) entry.gov++;
    byParty.set(code, entry);
  }
  const sorted = [...byParty.entries()]
    .filter(([c]) => c !== "unknown")
    .sort((a, b) => b[1].count - a[1].count);

  const govSegs = sorted
    .filter(([, v]) => v.gov > 0)
    .map(
      ([code, v]) =>
        html`<span class="seg-hall" style="width:${((v.gov / total) * 100).toFixed(1)}%;background:${partyColor(code)}" title="${esc(partyShortName(code))} ${v.gov}"></span>`,
    )
    .join("");
  const oppSegs = sorted
    .filter(([, v]) => v.count - v.gov > 0)
    .map(([code, v]) => {
      const opp = v.count - v.gov;
      return html`<span class="seg-opp" style="width:${((opp / total) * 100).toFixed(1)}%;background:${partyColor(code)}" title="${esc(partyShortName(code))} ${opp}"></span>`;
    })
    .join("");

  return html`<div class="bloc-bar">${govSegs}${oppSegs}</div>
<div class="bloc-legend">
  <span class="item"><span class="swatch" style="background:var(--hall)"></span>Hallitus <b>${govTotal}</b></span>
  <span class="item"><span class="swatch" style="background:var(--opp)"></span>Oppositio <b>${oppTotal}</b></span>
  <span class="note">${total} edustajaa</span>
</div>`;
}

// ── Sort header ───────────────────────────────────────────────────────────────

function sortHeader(
  label: string,
  key: string,
  params: RosterParams,
  rightAlign = false,
): string {
  const active = params.sort === key;
  const nextDir = active && params.dir !== "desc" ? "desc" : "asc";
  const cls = `mp-sort${rightAlign ? " ta-r" : ""}${active ? (params.dir === "desc" ? " is-desc" : " is-asc") : ""}`;
  const href = buildHref({ ...params, sort: key, dir: nextDir });
  return html`<a class="${cls}" href="${esc(href)}"
  hx-get="${esc(href)}" hx-target="#roster-content" hx-push-url="true">${esc(label)} <span class="ar"></span></a>`;
}

function buildHref(p: RosterParams): string {
  const parts: string[] = [];
  if (p.q) parts.push(`q=${encodeURIComponent(p.q)}`);
  if (p.party && p.party !== "all")
    parts.push(`party=${encodeURIComponent(p.party)}`);
  if (p.bloc) parts.push(`bloc=${encodeURIComponent(p.bloc)}`);
  if (p.sort && p.sort !== "name")
    parts.push(`sort=${encodeURIComponent(p.sort)}`);
  if (p.dir && p.dir !== "asc") parts.push(`dir=${encodeURIComponent(p.dir)}`);
  return parts.length ? `/edustajat?${parts.join("&")}` : "/edustajat";
}

// ── Roster content fragment (chips + table-head + list) ───────────────────────
// Returned for both full-page renders and htmx partial swaps targeting #roster-content.
// oobCount=true injects an hx-swap-oob span to update the toolbar count on partial swaps.

export function renderRosterContent(
  rows: RosterRow[],
  filtered: RosterRow[],
  params: RosterParams,
  oobCount = false,
): string {
  const activeParty = params.party ?? "all";
  const activeBloc = params.bloc ?? "";

  const chips = html`<div class="fchips">
  <a class="fchip${!activeParty || activeParty === "all" ? " is-active" : ""}"
    href="/edustajat"
    hx-get="/edustajat" hx-target="#roster-content" hx-push-url="true">Kaikki</a>
  <a class="fchip${activeBloc === "hallitus" ? " is-active" : ""}"
    href="${esc(buildHref({ ...params, bloc: "hallitus", party: undefined }))}"
    hx-get="${esc(buildHref({ ...params, bloc: "hallitus", party: undefined }))}" hx-target="#roster-content" hx-push-url="true">
    <span class="pdot" style="background:var(--hall)"></span>Hallitus</a>
  <a class="fchip${activeBloc === "oppositio" ? " is-active" : ""}"
    href="${esc(buildHref({ ...params, bloc: "oppositio", party: undefined }))}"
    hx-get="${esc(buildHref({ ...params, bloc: "oppositio", party: undefined }))}" hx-target="#roster-content" hx-push-url="true">
    <span class="pdot" style="background:var(--opp)"></span>Oppositio</a>
  ${CHIP_PARTIES.map(
    ({ code, label }) =>
      html`<a class="fchip${activeParty === code ? " is-active" : ""}"
    href="${esc(buildHref({ ...params, party: code, bloc: undefined }))}"
    hx-get="${esc(buildHref({ ...params, party: code, bloc: undefined }))}" hx-target="#roster-content" hx-push-url="true">
    <span class="pdot" style="background:${partyColor(code)}"></span>${esc(label)}</a>`,
  ).join("")}
</div>`;

  const tableHead = html`<div class="mp-table-head">
  <span></span>
  ${sortHeader("Edustaja", "name", params)}
  ${sortHeader("Ryhmä", "party", params)}
  ${sortHeader("Vaalipiiri", "district", params)}
  ${sortHeader("Ikä", "age", params, true)}
  ${sortHeader("Läsnäolo", "att", params, true)}
</div>`;

  const listRows = filtered.map(renderRow).join("");
  const count = filtered.length;
  const total = rows.length;

  const oob = oobCount
    ? html`<span id="mp-count" hx-swap-oob="true"><b>${count}</b> / ${total} edustajaa</span>`
    : "";

  return html`${oob}${chips}
${tableHead}
<div id="mp-list">${listRows}</div>`;
}

// ── Full page ─────────────────────────────────────────────────────────────────

export function renderEdustajat(
  allRows: RosterRow[],
  params: RosterParams,
): string {
  const filtered = applyFilters(allRows, params);
  const count = filtered.length;
  const total = allRows.length;
  const q = params.q ?? "";

  return html`<title>Kansanedustajat — Eduskuntapeili</title>

<div class="wrap"><section class="page-head">
  <p class="kicker">Kansanedustajat</p>
  <h1>${total} kansanedustajaa</h1>
  <p class="sub">Nykyisen vaalikauden edustajat. Suodata ryhmän tai blokin mukaan tai hae nimellä ja vaalipiirillä.</p>
</section></div>

<div class="wrap" style="padding-bottom:8px">
  ${renderBlocStrip(allRows)}
</div>

<div class="wrap">
  <div class="toolbar">
    <label class="search">
      <span class="ic">⌕</span>
      <input id="mp-search" name="q" type="text"
        value="${esc(q)}"
        placeholder="Hae nimellä tai vaalipiirillä…"
        hx-get="/edustajat"
        hx-trigger="input changed delay:300ms"
        hx-target="#roster-content"
        hx-include="#sort-field,#dir-field"
        hx-push-url="true" />
    </label>
    <span class="count" id="mp-count"><b>${count}</b> / ${total} edustajaa</span>
  </div>
  <input type="hidden" id="sort-field" name="sort" value="${esc(params.sort ?? "name")}" />
  <input type="hidden" id="dir-field" name="dir" value="${esc(params.dir ?? "asc")}" />
</div>

<div id="roster-content" class="wrap">
  ${renderRosterContent(allRows, filtered, params)}
</div>`;
}
