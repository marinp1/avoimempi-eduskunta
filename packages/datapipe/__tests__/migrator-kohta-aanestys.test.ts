import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import createMigrator from "../migrator/SaliDBKohtaAanestys/migrator";
import { createTestDb } from "./helpers/setup-db";

const makeKohtaAanestysRow = (
  overrides: Partial<RawDataModels["SaliDBKohtaAanestys"]> = {},
): RawDataModels["SaliDBKohtaAanestys"] => ({
  Id: "1",
  Aanestysnumero: "1",
  Created: "2024-01-15T09:00:00.000",
  Imported: "2024-01-15T09:00:00.000",
  IstuntoTekninenAvain: "2024/1",
  KohtaTekninenAvain: "2024/1/3",
  Modified: "2024-01-15T12:00:00.000",
  ...overrides,
});

describe("SaliDBKohtaAanestys migrator", () => {
  let db: Database;
  let migrate: (data: RawDataModels["SaliDBKohtaAanestys"]) => Promise<void>;

  beforeEach(() => {
    db = createTestDb(20);
    migrate = createMigrator(db);
  });

  afterEach(() => {
    db.close();
  });

  test("updates the exact voting by session + voting number", async () => {
    db.run(
      `INSERT INTO Voting (id, number, start_time, session_key, section_key)
       VALUES (?, ?, ?, ?, ?)`,
      [100, 1, "2024-01-15T10:00:00.000", "2024/1", null],
    );
    db.run(
      `INSERT INTO Voting (id, number, start_time, session_key, section_key)
       VALUES (?, ?, ?, ?, ?)`,
      [101, 2, "2024-01-15T11:00:00.000", "2024/1", null],
    );

    await migrate(makeKohtaAanestysRow({ Aanestysnumero: "1" }));

    const voting100 = db
      .query("SELECT section_key FROM Voting WHERE id = 100")
      .get() as { section_key: string | null };
    const voting101 = db
      .query("SELECT section_key FROM Voting WHERE id = 101")
      .get() as { section_key: string | null };

    expect(voting100.section_key).toBe("2024/1/3");
    expect(voting101.section_key).toBeNull();
  });

  test("does not update unrelated votings when exact voting is missing", async () => {
    db.run(
      `INSERT INTO Voting (id, number, start_time, session_key, section_key)
       VALUES (?, ?, ?, ?, ?)`,
      [100, 1, "2024-01-15T10:00:00.000", "2024/1", null],
    );
    db.run(
      `INSERT INTO Voting (id, number, start_time, session_key, section_key)
       VALUES (?, ?, ?, ?, ?)`,
      [101, 2, "2024-01-15T11:00:00.000", "2024/1", null],
    );

    await migrate(makeKohtaAanestysRow({ Aanestysnumero: "99" }));

    const rows = db
      .query("SELECT id, section_key FROM Voting ORDER BY id")
      .all() as Array<{ id: number; section_key: string | null }>;
    expect(rows).toEqual([
      { id: 100, section_key: null },
      { id: 101, section_key: null },
    ]);
  });
});
