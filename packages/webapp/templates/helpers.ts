import type { RosterRow } from "#shared-types";
import { clsx } from "clsx";
import i18next from "i18next";

export { i18next };

export type { RosterRow };
export { partyColor, partyShortName } from "./components/party";
export type { CiteProps, SourceNoteOptions } from "./components/provenance";
export { cite, sourceNote } from "./components/provenance";
export type { BlocBar, BlocSegment } from "./view-models";
export { buildBlocBar } from "./view-models";

export { formatFi, fetchedAt, isHtmx } from "#shared-helpers";

/**
 * Escapes HTML metacharacters (`&`, `<`, `>`, `"`).
 * Used by TS HTML-builders that assemble raw markup via `<%~ %>`.
 * Do NOT use inside `<%= %>` — Eta's autoEscape already escapes those.
 */
export function esc(s: string | number | null | undefined): string {
  return s == null
    ? ""
    : String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
}

/** Query-string parameters for the MP roster page. */
export interface RosterParams {
  q?: string;
  party?: string;
  bloc?: string;
  sort?: string;
  dir?: string;
}

/** Party filter chips shown in the roster toolbar. */
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

/**
 * Filters and sorts the roster rows according to the given query parameters.
 * Supports text search, party/bloc filtering, and column sorting.
 */
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

/**
 * Builds an `/edustajat` URL with the given query parameters.
 * Omits default values (`"all"`, `"name"`, `"asc"`) to keep URLs tidy.
 */
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

/**
 * Returns the href for toggling sort direction on a given column.
 * Toggles between `asc` and `desc` when the column is already active.
 */
export function sortHref(params: RosterParams, key: string): string {
  const active = params.sort === key || (!params.sort && key === "name");
  const nextDir = active && params.dir !== "desc" ? "desc" : "asc";
  return buildHref({ ...params, sort: key, dir: nextDir });
}

/**
 * Returns the CSS class string for a sortable column header link.
 * Includes `is-asc`/`is-desc` and `ta-r` modifiers as appropriate.
 */
export function sortClass(
  params: RosterParams,
  key: string,
  rightAlign = false,
): string {
  const active = params.sort === key || (!params.sort && key === "name");
  return clsx(
    "mp-sort",
    { "ta-r": rightAlign },
    active && (params.dir === "desc" ? "is-desc" : "is-asc"),
  );
}

/** A party's composition data for the home page overview. */
export interface PartyInfo {
  party_code: string;
  party_display_code: string;
  party_name: string;
  member_count: number;
  is_in_government: number;
}

/** A narrowly-decided vote, featured on the home page. */
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

/** Speech activity stats for a single MP, shown on the home page. */
export interface SpeakerActivity {
  person_id: number;
  first_name: string;
  last_name: string;
  party: string;
  speech_count: number;
  total_words: number;
}

/** Aggregated data payload for the home page view. */
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

/**
 * Formats an ISO date string to Finnish locale (dd.mm.yyyy).
 */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fi-FI", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
  });
}

/**
 * Formats a fraction as a percentage string with one decimal (e.g. `"25.0%"`).
 * Returns `"0%"` when total is zero.
 */
export function pct(part: number, total: number): string {
  if (total === 0) return "0%";
  return `${((part / total) * 100).toFixed(1)}%`;
}

/**
 * Returns the percentage value as a string with one decimal (no `%` suffix).
 * Returns `"0"` when total is zero.
 */
export function pctNum(part: number, total: number): string {
  if (total === 0) return "0";
  return ((part / total) * 100).toFixed(1);
}

/**
 * Computes the age from a birth year. Returns `"—"` when the year is null.
 */
export function age(birthYear: number | null): string {
  if (!birthYear) return "—";
  return String(new Date().getFullYear() - birthYear);
}

/**
 * Strips the `" vaalipiiri"` suffix and trailing genitive `"n"` from
 * a Finnish district name for compact display. Returns `"—"` when null.
 */
export function districtShort(rawName: string | null): string {
  if (!rawName) return "—";
  return rawName
    .replace(/ vaalipiiri$/, "")
    .replace(/n läänin$/, "")
    .replace(/n$/, "");
}
