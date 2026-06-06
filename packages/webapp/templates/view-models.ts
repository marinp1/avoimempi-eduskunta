import type { RosterRow } from "../../server/database/repositories/person-repository";
import { partyColor } from "./components/party";

/** A single segment within the bloc bar — one party's share of government or opposition. */
export interface BlocSegment {
  code: string;
  /** CSS color string, e.g. "var(--party-kok)". */
  color: string;
  /** CSS width string, e.g. "12.3%". */
  width: string;
  side: "hall" | "opp";
  count: number;
  label: string;
}

/** The full bloc bar model: totals plus ordered segments (government first, then opposition). */
export interface BlocBar {
  total: number;
  govTotal: number;
  oppTotal: number;
  segments: BlocSegment[];
}

interface PartyTally {
  code: string;
  count: number;
  gov: number;
}

/** Groups rows by party, counting total members and government members per party. */
function tallyByParty(rows: RosterRow[]): PartyTally[] {
  const byParty = new Map<string, PartyTally>();
  for (const r of rows) {
    const code = r.group_abbreviation || "unknown";
    const entry = byParty.get(code) ?? { code, count: 0, gov: 0 };
    entry.count++;
    if (r.is_in_government === 1) entry.gov++;
    byParty.set(code, entry);
  }
  return [...byParty.values()]
    .filter((p) => p.code !== "unknown")
    .sort((a, b) => b.count - a.count);
}

/**
 * Builds the bloc bar view-model from the roster rows.
 * Pre-computes party colors, widths, and government/opposition grouping
 * so the template only iterates — no data construction in markup.
 */
export function buildBlocBar(
  rows: RosterRow[],
  partyShortName: (code: string) => string,
): BlocBar {
  const total = rows.length;
  const govTotal = rows.filter((r) => r.is_in_government === 1).length;
  const oppTotal = total - govTotal;
  const tallies = tallyByParty(rows);
  const widthPct = (n: number): string =>
    `${total === 0 ? 0 : ((n / total) * 100).toFixed(1)}%`;

  const segments: BlocSegment[] = [];
  for (const p of tallies) {
    if (p.gov > 0) {
      segments.push({
        code: p.code,
        color: partyColor(p.code),
        width: widthPct(p.gov),
        side: "hall",
        count: p.gov,
        label: partyShortName(p.code),
      });
    }
  }
  for (const p of tallies) {
    const opp = p.count - p.gov;
    if (opp > 0) {
      segments.push({
        code: p.code,
        color: partyColor(p.code),
        width: widthPct(opp),
        side: "opp",
        count: opp,
        label: partyShortName(p.code),
      });
    }
  }

  return { total, govTotal, oppTotal, segments };
}
