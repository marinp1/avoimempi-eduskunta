/**
 * Contract for the on-demand provenance probe service.
 *
 * `resolveSourceRecords` recovers a source table's individual records by replaying
 * the page's real queries as PK-only probes against the live DB (union'd with any
 * passively-captured records). Aggregate / non-row-traceable sources return the
 * page's filter params + an `aggregatedOnly` flag instead. A failing probe must be
 * swallowed — the overlay must never break.
 */
import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { resolveSourceRecords } from "../src/features/trace/trace-records.service";
import type { RecordedTrace } from "../src/database/trace-collector";

function seed(): Database {
  const db = new Database(":memory:");
  db.run("CREATE TABLE Voting (id INTEGER PRIMARY KEY, start_date TEXT)");
  db.run(
    "CREATE TABLE Vote (id INTEGER PRIMARY KEY, voting_id INTEGER, person_id INTEGER, group_abbreviation TEXT, vote TEXT)",
  );
  db.run(
    "CREATE TABLE Representative (person_id INTEGER PRIMARY KEY, first_name TEXT, last_name TEXT, party TEXT)",
  );
  db.run("INSERT INTO Voting (id, start_date) VALUES (1, '2020-01-01')");
  db.run(
    "INSERT INTO Vote (id, voting_id, person_id, group_abbreviation, vote) VALUES (10, 1, 100, 'sd', 'Jaa'), (11, 1, 101, 'kok', 'Ei')",
  );
  db.run(
    "INSERT INTO Representative (person_id, first_name, last_name, party) VALUES (100, 'Anna', 'Virtanen', 'sd'), (101, 'Bo', 'Berg', 'kok')",
  );
  return db;
}

const recorded = (over: Partial<RecordedTrace> = {}): RecordedTrace => ({
  queryFiles: ["voting-member-votes.sql"],
  viewLabel: "Äänestys",
  recordPks: [],
  queryParams: { "voting-member-votes.sql": { $id: 1 } },
  ...over,
});

describe("resolveSourceRecords", () => {
  let db: Database;
  beforeAll(() => {
    db = seed();
  });
  afterAll(() => db.close());

  test("probes the individual votes even though the query never selects Vote.id", () => {
    const out = resolveSourceRecords(db, recorded(), "SaliDBAanestysEdustaja");
    expect(out.aggregatedOnly).toBeFalse();
    expect(out.records.map((r) => r.value).sort()).toEqual(["10", "11"]);
  });

  test("probes representatives with human labels from the label registry", () => {
    const out = resolveSourceRecords(db, recorded(), "MemberOfParliament");
    expect(out.records.map((r) => r.value).sort()).toEqual(["100", "101"]);
    const anna = out.records.find((r) => r.value === "100");
    expect(anna?.label).toBe("Anna Virtanen");
  });

  test("unions probe results with passively-captured records (deduped)", () => {
    const out = resolveSourceRecords(
      db,
      recorded({
        recordPks: [
          {
            sourceTable: "SaliDBAanestysEdustaja",
            records: [{ value: "10" }, { value: "99", label: "passive" }],
          },
        ],
      }),
      "SaliDBAanestysEdustaja",
    );
    expect(out.records.map((r) => r.value).sort()).toEqual(["10", "11", "99"]);
  });

  test("aggregate-only source returns the filter params and no records", () => {
    const out = resolveSourceRecords(
      db,
      recorded({
        queryFiles: ["voting-party-breakdown.sql"],
        queryParams: { "voting-party-breakdown.sql": { $id: 1 } },
      }),
      "SaliDBAanestysEdustaja",
    );
    expect(out.aggregatedOnly).toBeTrue();
    expect(out.records).toEqual([]);
    expect(out.params).toEqual({ $id: 1 });
  });

  test("a failing probe is swallowed — never throws", () => {
    const broken = new Database(":memory:");
    broken.run("CREATE TABLE Representative (person_id INTEGER)");
    // No Vote/Voting tables → the probe SQL references missing tables.
    let out: ReturnType<typeof resolveSourceRecords> | undefined;
    expect(() => {
      out = resolveSourceRecords(broken, recorded(), "SaliDBAanestysEdustaja");
    }).not.toThrow();
    expect(out!.records).toEqual([]);
    expect(out!.aggregatedOnly).toBeTrue();
    broken.close();
  });
});
