import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { sanityChecks } from "../sanity/checks";
import { createTestDb, seedFullDataset } from "./helpers/setup-db";

const migratedCheckIds = [
  "vote-group-abbreviation-trimmed",
  "speech-party-abbreviation-null-not-empty",
  "speech-ministry-null-not-empty",
  "section-note-null-not-empty",
  "section-processing-title-null-not-empty",
  "section-resolution-null-not-empty",
  "voting-title-null-not-empty",
  "vote-group-abbreviation-lowercase",
  "speech-party-abbreviation-lowercase",
  "roll-call-entry-party-lowercase",
  "vaski-document-type-normalized",
  "roll-call-entry-names-present",
  "roll-call-entry-names-trimmed",
  "vote-values-normalized",
  "roll-call-report-status-known-values",
  "vaski-document-source-path-present",
  "speech-content-source-path-present",
  "vote-group-abbreviation-column-name-correct",
  "legacy-document-tables-absent",
] as const;

function findCheck(id: (typeof migratedCheckIds)[number]) {
  const check = sanityChecks.find((candidate) => candidate.id === id);
  expect(check).toBeDefined();
  return check!;
}

describe("sanity checks", () => {
  test("includes all migrated real-db data quality checks", () => {
    const ids = new Set(sanityChecks.map((check) => check.id));
    for (const id of migratedCheckIds) {
      expect(ids.has(id)).toBe(true);
    }
  });

  test("migrated check ids are unique", () => {
    const seen = new Set<string>();
    for (const id of migratedCheckIds) {
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
  });

  test("trim and empty-string checks execute against the in-memory test db", () => {
    const db = createTestDb();
    seedFullDataset(db);

    db.run(`UPDATE Vote SET group_abbreviation = ? WHERE id = ?`, [
      "sd   ",
      5000,
    ]);
    db.run(`UPDATE Speech SET party_abbreviation = '' WHERE id = ?`, [200]);

    const trimmedRows = findCheck("vote-group-abbreviation-trimmed").query(db);
    const emptyStringRows = findCheck(
      "speech-party-abbreviation-null-not-empty",
    ).query(db);

    expect(trimmedRows).toHaveLength(1);
    expect(trimmedRows[0]?.id).toBe(5000);
    expect(emptyStringRows).toHaveLength(1);
    expect(emptyStringRows[0]?.id).toBe(200);

    db.close();
  });

  test("schema integrity checks pass for the migrated schema", () => {
    const db = createTestDb();

    expect(
      findCheck("vote-group-abbreviation-column-name-correct").query(db),
    ).toEqual([]);
    expect(findCheck("legacy-document-tables-absent").query(db)).toEqual([]);

    db.close();
  });

  test("schema integrity checks report violations on broken schemas", () => {
    const typoDb = new Database(":memory:");
    typoDb.exec(
      `CREATE TABLE Vote (id INTEGER PRIMARY KEY, group_abbrviation TEXT);`,
    );

    const typoRows = findCheck(
      "vote-group-abbreviation-column-name-correct",
    ).query(typoDb);
    expect(typoRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ issue: "missing_group_abbreviation" }),
        expect.objectContaining({ issue: "unexpected_group_abbrviation" }),
      ]),
    );
    typoDb.close();

    const legacyDb = new Database(":memory:");
    legacyDb.exec(`CREATE TABLE SessionMinutesItem (id INTEGER PRIMARY KEY);`);

    const legacyRows = findCheck("legacy-document-tables-absent").query(
      legacyDb,
    );
    expect(legacyRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "SessionMinutesItem" }),
      ]),
    );
    legacyDb.close();
  });

  test("document and roll-call normalization checks return concrete violating rows", () => {
    const db = createTestDb();
    seedFullDataset(db);

    db.run(
      `INSERT INTO VaskiDocument (id, document_type, edk_identifier, source_path)
       VALUES (?, ?, ?, ?)`,
      [1, "Poytakirja", "PTK 1/2024 vp", ""],
    );
    db.run(
      `INSERT INTO RollCallReport (id, parliament_identifier, session_date, status, edk_identifier, source_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [1, "1/2024", "2024-01-15", "9", "NHR 1/2024 vp", "/rollcall/1"],
    );
    db.run(
      `INSERT INTO RollCallEntry (roll_call_id, entry_order, person_id, first_name, last_name, party, entry_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [1, 1, 1000, " Matti ", "Meikäläinen", "SD", "absent"],
    );

    expect(findCheck("vaski-document-type-normalized").query(db)).toHaveLength(
      1,
    );
    expect(
      findCheck("vaski-document-source-path-present").query(db),
    ).toHaveLength(1);
    expect(
      findCheck("roll-call-report-status-known-values").query(db),
    ).toHaveLength(1);
    expect(findCheck("roll-call-entry-party-lowercase").query(db)).toHaveLength(
      1,
    );
    expect(findCheck("roll-call-entry-names-trimmed").query(db)).toHaveLength(
      1,
    );

    db.close();
  });
});
