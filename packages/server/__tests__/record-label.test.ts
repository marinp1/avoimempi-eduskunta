/**
 * Contract for the shared record-label registry.
 *
 * Each row-traceable source defines the result columns that form a human label
 * and a `format(row)` that builds it. Used by both passive capture (over a
 * query's result rows) and the on-demand probe (which selects these columns).
 * A label must degrade to `undefined` when its columns are absent/empty so the
 * UI can show a graceful empty cell.
 */
import { describe, expect, test } from "bun:test";
import { RECORD_LABEL } from "../src/database/record-label";

describe("RECORD_LABEL", () => {
  test("MemberOfParliament combines first + last name, falls back to party", () => {
    const mp = RECORD_LABEL.MemberOfParliament!;
    expect(mp.format({ first_name: "Anna", last_name: "Virtanen" })).toBe(
      "Anna Virtanen",
    );
    expect(mp.format({ first_name: "", last_name: "", party: "kok" })).toBe(
      "kok",
    );
  });

  test("every source's format returns undefined for an empty row", () => {
    for (const [source, entry] of Object.entries(RECORD_LABEL)) {
      expect(entry.format({}), `${source} empty row`).toBeUndefined();
      expect(Array.isArray(entry.columns), `${source} columns`).toBeTrue();
      expect(entry.columns.length, `${source} columns`).toBeGreaterThan(0);
    }
  });
});
