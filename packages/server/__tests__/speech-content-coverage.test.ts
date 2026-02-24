import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  buildKnownDataExceptions,
  getExceptionIdSetForCheck,
  type KnownDataException,
} from "../services/known-data-exceptions";

const DB_PATH = join(import.meta.dirname, "../../../avoimempi-eduskunta.db");
const DB_EXISTS = existsSync(DB_PATH);

let db: Database;
let knownExceptions: KnownDataException[] = [];

beforeAll(() => {
  if (!DB_EXISTS) return;
  db = new Database(DB_PATH, { readonly: true });
  db.exec("PRAGMA journal_mode = WAL;");
  knownExceptions = buildKnownDataExceptions(db);
});

afterAll(() => {
  if (db) db.close();
});

describe.skipIf(!DB_EXISTS)("Speech content coverage (real DB)", () => {
  test("has zero orphaned SpeechContent rows", () => {
    const row = db
      .query(
        "SELECT COUNT(*) AS c FROM SpeechContent sc LEFT JOIN Speech sp ON sp.id = sc.speech_id WHERE sp.id IS NULL",
      )
      .get() as { c: number };

    expect(row.c).toBe(0);
  });

  test("reports Speech ↔ SpeechContent coverage counts", () => {
    const row = db
      .query(
        "SELECT (SELECT COUNT(*) FROM Speech) AS speech_rows, (SELECT COUNT(*) FROM SpeechContent) AS content_rows, (SELECT COUNT(*) FROM Speech sp WHERE NOT EXISTS (SELECT 1 FROM SpeechContent sc WHERE sc.speech_id = sp.id)) AS metadata_without_content",
      )
      .get() as {
      speech_rows: number;
      content_rows: number;
      metadata_without_content: number;
    };

    const mappedPercentage =
      row.speech_rows === 0 ? 0 : (row.content_rows / row.speech_rows) * 100;

    console.log(
      `[speech-content-coverage] speech_rows=${row.speech_rows}, content_rows=${row.content_rows}, metadata_without_content=${row.metadata_without_content}, mapped_pct=${mappedPercentage.toFixed(2)}%`,
    );

    expect(row.speech_rows).toBeGreaterThanOrEqual(0);
    expect(row.content_rows).toBeGreaterThanOrEqual(0);
    expect(row.metadata_without_content).toBeGreaterThanOrEqual(0);
  });

  test("known exceptions cover all metadata/content mismatch entry ids", () => {
    const unexpectedMissingRows = db
      .query(
        "SELECT sp.id FROM Speech sp WHERE NOT EXISTS (SELECT 1 FROM SpeechContent sc WHERE sc.speech_id = sp.id) AND COALESCE(sp.has_spoken, 1) != 0 ORDER BY sp.id",
      )
      .all() as Array<{ id: number }>;

    const hasSpokenZeroWithContentRows = db
      .query(
        "SELECT sp.id FROM Speech sp WHERE COALESCE(sp.has_spoken, 1) = 0 AND EXISTS (SELECT 1 FROM SpeechContent sc WHERE sc.speech_id = sp.id) ORDER BY sp.id",
      )
      .all() as Array<{ id: number }>;

    const actualIds = [
      ...unexpectedMissingRows.map((row) => `missing:${row.id}`),
      ...hasSpokenZeroWithContentRows.map((row) => `has_spoken_zero:${row.id}`),
    ];

    const expectedIds = getExceptionIdSetForCheck(
      knownExceptions,
      "Speech metadata/content mismatches are exactly has_spoken=0",
    );
    const actualIdSet = new Set(actualIds);
    const unexpectedIds = [...actualIdSet].filter((id) => !expectedIds.has(id));
    const missingKnownIds = [...expectedIds].filter(
      (id) => !actualIdSet.has(id),
    );

    console.log(
      `[speech-content-coverage] unexpected_missing_content=${unexpectedMissingRows.length}, has_spoken_zero_with_content=${hasSpokenZeroWithContentRows.length}`,
    );

    if (unexpectedIds.length > 0 || missingKnownIds.length > 0) {
      console.log(
        `[speech-content-coverage] unexpected_ids_sample=${unexpectedIds
          .slice(0, 20)
          .join(",")}, missing_known_ids_sample=${missingKnownIds
          .slice(0, 20)
          .join(",")}`,
      );
    }

    expect(unexpectedIds.length).toBe(0);
    expect(missingKnownIds.length).toBe(0);
  });
});
