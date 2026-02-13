import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";

const DB_PATH = join(import.meta.dirname, "../../../avoimempi-eduskunta.db");
const DB_EXISTS = existsSync(DB_PATH);

let db: Database;

beforeAll(() => {
  if (!DB_EXISTS) return;
  db = new Database(DB_PATH, { readonly: true });
  db.exec("PRAGMA journal_mode = WAL;");
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

  test("explains all metadata/content mismatches with has_spoken=0 exactly", () => {
    const row = db
      .query(
        "SELECT (SELECT COUNT(*) FROM Speech sp WHERE NOT EXISTS (SELECT 1 FROM SpeechContent sc WHERE sc.speech_id = sp.id) AND COALESCE(sp.has_spoken, 1) != 0) AS unexpected_missing_content, (SELECT COUNT(*) FROM Speech sp WHERE COALESCE(sp.has_spoken, 1) = 0 AND EXISTS (SELECT 1 FROM SpeechContent sc WHERE sc.speech_id = sp.id)) AS has_spoken_zero_with_content",
      )
      .get() as {
        unexpected_missing_content: number;
        has_spoken_zero_with_content: number;
      };

    console.log(
      `[speech-content-coverage] unexpected_missing_content=${row.unexpected_missing_content}, has_spoken_zero_with_content=${row.has_spoken_zero_with_content}`,
    );

    expect(row.unexpected_missing_content).toBe(0);
    expect(row.has_spoken_zero_with_content).toBe(0);
  });
});
