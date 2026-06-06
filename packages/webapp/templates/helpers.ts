import type { RosterRow } from "../../server/database/repositories/person-repository";

export type { RosterRow };
export { partyColor, partyShortName } from "./components/party";
export type { CiteData, SourceNoteOptions } from "./components/provenance";
export { cite, sourceNote } from "./components/provenance";
export type { BlocBar, BlocSegment } from "./view-models";
export { buildBlocBar } from "./view-models";

// ── HTML escaping ─────────────────────────────────────────────────────────────
// Used by the TS HTML-builders (e.g. components/provenance.ts) that assemble raw
// markup included via <%~ %>. Do NOT use inside <%= %> — Eta's autoEscape already
// escapes those, so wrapping in esc() would double-escape.

export function esc(s: string | number | null | undefined): string {
  return s == null
    ? ""
    : String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

// ── Roster types & logic ──────────────────────────────────────────────────────

export interface RosterParams {
  q?: string;
  party?: string;
  bloc?: string;
  sort?: string;
  dir?: string;
}

export const CHIP_PARTIES = [
  { code: "kok", label: "Kokoomus" },
  { code: "ps", label: "Perussuomalaiset" },
  { code: "sd", label: "SDP" },
  { code: "kesk", label: "Keskusta" },
  { code: "vihr", label: "Vihreät" },
  { code: "vas", label: "Vasemmistoliitto" },
  { code: "r", label: "RKP" },
  { code: "kd", label: "KD" },
] as const;

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

// Builds /edustajat URL with the given query params.
export function buildHref(p: RosterParams): string {
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

// Returns the href for toggling sort direction on a given column.
export function sortHref(params: RosterParams, key: string): string {
  const active = params.sort === key || (!params.sort && key === "name");
  const nextDir = active && params.dir !== "desc" ? "desc" : "asc";
  return buildHref({ ...params, sort: key, dir: nextDir });
}

// Returns the CSS class string for a sort header link.
export function sortClass(
  params: RosterParams,
  key: string,
  rightAlign = false,
): string {
  const active = params.sort === key || (!params.sort && key === "name");
  const dirClass = active
    ? params.dir === "desc"
      ? " is-desc"
      : " is-asc"
    : "";
  return `mp-sort${rightAlign ? " ta-r" : ""}${dirClass}`;
}

// ── Home page types ───────────────────────────────────────────────────────────

export interface PartyInfo {
  party_code: string;
  party_display_code: string;
  party_name: string;
  member_count: number;
  is_in_government: number;
}

export interface CloseVote {
  id: number;
  title: string;
  section_title: string;
  n_yes: number;
  n_no: number;
  margin: number;
  start_time: string;
  session_key: string;
}

export interface SpeakerActivity {
  person_id: number;
  first_name: string;
  last_name: string;
  party: string;
  speech_count: number;
  total_words: number;
}

export interface HomeData {
  latestDay: {
    date: string | null;
    sessions: Array<{
      key: string;
      voting_count: number;
      section_count: number;
    }>;
  };
  composition: {
    totalMembers: number;
    governmentMembers: number;
    oppositionMembers: number;
    partyCount: number;
    parties: PartyInfo[];
  };
  signals: {
    closeVotes: CloseVote[];
    speechActivity: SpeakerActivity[];
  };
}

// ── Date & number formatters ──────────────────────────────────────────────────

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

export function pct(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

export function pctNum(part: number, total: number): string {
  if (total === 0) return "0";
  return ((part / total) * 100).toFixed(1);
}

// ── MP display helpers ────────────────────────────────────────────────────────

export function age(birthYear: number | null): string {
  if (!birthYear) return "—";
  return String(new Date().getFullYear() - birthYear);
}

export function districtShort(rawName: string | null): string {
  if (!rawName) return "—";
  return rawName
    .replace(/ vaalipiiri$/, "")
    .replace(/n läänin$/, "")
    .replace(/n$/, "");
}
