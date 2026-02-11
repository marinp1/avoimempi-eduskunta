import type { Database } from "bun:sqlite";
import { KNOWN_EXCEPTION_QUERIES } from "../database/sanity-queries";

export interface AffectedRow {
  id: number;
  label: string;
  sourceUrl: string;
}

export interface KnownDataException {
  id: string;
  checkName: string;
  description: string;
  reason: string;
  affectedRows: AffectedRow[];
}

/**
 * Builds known data exceptions by querying the database once.
 * The result should be cached — call this at startup, not per-request.
 *
 * Currently known upstream issues in the Eduskunta API:
 * - Niinistö (person_id 940) missing from 47 votings in sessions 2009/61 and 2009/63
 * - Vanhanen (person_id 825) missing from 3 votings in session 2022/45
 *
 * These are votings where n_total reports one more vote than actually exists
 * in SaliDBAanestysEdustaja (the individual vote records table).
 */
export function buildKnownDataExceptions(db: Database): KnownDataException[] {
  const exceptions: KnownDataException[] = [];

  try {
    const mismatchedVotings = db
      .query(KNOWN_EXCEPTION_QUERIES.mismatchedVotings)
      .all() as { id: number; number: number; session_key: string; result_url: string | null }[];

    if (mismatchedVotings.length > 0) {
      const affectedRows: AffectedRow[] = mismatchedVotings.map((v) => ({
        id: v.id,
        label: `Äänestys ${v.number}, istunto ${v.session_key}`,
        sourceUrl: v.result_url || `https://avoindata.eduskunta.fi`,
      }));

      exceptions.push({
        id: "VOTE-MISSING-001",
        checkName: "Individual vote count matches",
        description: `${affectedRows.length} äänestystä, joista puuttuu 1 ääni (Niinistö/Vanhanen puuttuu API-datasta)`,
        reason:
          "Eduskunnan API:sta puuttuu yksittäisiä ääniä (SaliDBAanestysEdustaja). Niinistö puuttuu 47 äänestyksestä (istunnot 2009/61 ja 2009/63), Vanhanen 3 äänestyksestä (istunto 2022/45).",
        affectedRows,
      });

      exceptions.push({
        id: "VOTE-AGGREGATION-001",
        checkName: "Vote aggregation per type",
        description: `${affectedRows.length} äänestystä, joissa äänimäärät eivät täsmää (1 ääni puuttuu per äänestys)`,
        reason:
          "Sama ongelma kuin VOTE-MISSING-001: puuttuvat äänet aiheuttavat eron n_absent-arvon ja todellisen Poissa-äänien välillä.",
        affectedRows,
      });
    }
  } catch {
    // If query fails (e.g. tables don't exist yet), return empty
  }

  return exceptions;
}

export function getExceptionsForCheck(
  exceptions: KnownDataException[],
  checkName: string,
): KnownDataException[] {
  return exceptions.filter((e) => e.checkName === checkName);
}
