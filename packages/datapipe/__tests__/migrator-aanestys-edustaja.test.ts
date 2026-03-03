import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import createMigrator, {
  flushVotes,
} from "../migrator/fn/SaliDBAanestysEdustaja";
import { clearStatementCache } from "../migrator/utils";
import {
  createTestDb,
  seedRepresentative,
  seedVoting,
} from "./helpers/setup-db";

describe("SaliDBAanestysEdustaja migrator", () => {
  let db: Database;
  let migrate: (
    data: RawDataModels["SaliDBAanestysEdustaja"],
  ) => void | Promise<void>;

  beforeEach(() => {
    clearStatementCache();
    db = createTestDb(11); // Up to V001.011 (includes Vote table + column rename)
    // Seed prerequisites
    seedRepresentative(db, { person_id: 1000 });
    seedRepresentative(db, {
      person_id: 1001,
      first_name: "Maija",
      last_name: "Virtanen",
    });
    // Need a session+agenda first for voting FK
    db.run("INSERT INTO Agenda (key, title, state) VALUES (?, ?, ?)", [
      "PJ_2024_1",
      "Agenda",
      "Valmis",
    ]);
    db.run(
      "INSERT INTO Session (id, number, key, date, year, type, state, agenda_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        1,
        1,
        "2024/1",
        "2024-01-15",
        2024,
        "varsinainen",
        "Päättynyt",
        "PJ_2024_1",
      ],
    );
    seedVoting(db, { id: 100, session_key: "2024/1" });
    migrate = createMigrator(db);
  });

  afterEach(() => {
    flushVotes();
    db.close();
  });

  const makeFinnishVote = (
    overrides: Partial<RawDataModels["SaliDBAanestysEdustaja"]> = {},
  ): RawDataModels["SaliDBAanestysEdustaja"] => ({
    EdustajaId: "5000",
    AanestysId: "100",
    EdustajaAanestys: "Jaa" as any,
    EdustajaEtunimi: "Matti",
    EdustajaHenkiloNumero: "1000",
    EdustajaRyhmaLyhenne: "kesk",
    EdustajaSukunimi: "Meikäläinen",
    Imported: "2024-01-20",
    ...overrides,
  });

  test("inserts Finnish vote after flush", async () => {
    await migrate(makeFinnishVote());
    flushVotes();

    const rows = db.query("SELECT * FROM Vote").all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(5000);
    expect(rows[0].voting_id).toBe(100);
    expect(rows[0].person_id).toBe(1000);
    expect(rows[0].vote).toBe("Jaa");
    expect(rows[0].group_abbreviation).toBe("kesk");
  });

  test("skips Swedish vote 'Ja'", async () => {
    await migrate(makeFinnishVote({ EdustajaAanestys: "Ja" as any }));
    flushVotes();

    const rows = db.query("SELECT * FROM Vote").all();
    expect(rows).toHaveLength(0);
  });

  test("skips Swedish vote 'Nej'", async () => {
    await migrate(makeFinnishVote({ EdustajaAanestys: "Nej" as any }));
    flushVotes();

    const rows = db.query("SELECT * FROM Vote").all();
    expect(rows).toHaveLength(0);
  });

  test("skips Swedish vote 'Frånvarande'", async () => {
    await migrate(makeFinnishVote({ EdustajaAanestys: "Frånvarande" as any }));
    flushVotes();

    const rows = db.query("SELECT * FROM Vote").all();
    expect(rows).toHaveLength(0);
  });

  test("skips Swedish vote 'Blank'", async () => {
    await migrate(makeFinnishVote({ EdustajaAanestys: "Blank" as any }));
    flushVotes();

    const rows = db.query("SELECT * FROM Vote").all();
    expect(rows).toHaveLength(0);
  });

  test("handles 'Ei' vote correctly", async () => {
    await migrate(makeFinnishVote({ EdustajaAanestys: "Ei" as any }));
    flushVotes();

    const rows = db.query("SELECT * FROM Vote").all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].vote).toBe("Ei");
  });

  test("handles 'Poissa' vote correctly", async () => {
    await migrate(makeFinnishVote({ EdustajaAanestys: "Poissa" as any }));
    flushVotes();

    const rows = db.query("SELECT * FROM Vote").all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].vote).toBe("Poissa");
  });

  test("normalizes 'Tyhjä' to canonical 'Tyhjää'", async () => {
    await migrate(makeFinnishVote({ EdustajaAanestys: "Tyhjä" as any }));
    flushVotes();

    const rows = db.query("SELECT * FROM Vote").all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].vote).toBe("Tyhjää");
  });

  test("normalizes decomposed umlaut form to canonical 'Tyhjää'", async () => {
    await migrate(
      makeFinnishVote({ EdustajaAanestys: "Tyhja\u0308a\u0308" as any }),
    );
    flushVotes();

    const rows = db.query("SELECT * FROM Vote").all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].vote).toBe("Tyhjää");
  });

  test("skips unknown vote value", async () => {
    await migrate(makeFinnishVote({ EdustajaAanestys: "Muu" as any }));
    flushVotes();

    const rows = db.query("SELECT * FROM Vote").all() as any[];
    expect(rows).toHaveLength(0);
  });

  test("trims vote whitespace", async () => {
    await migrate(makeFinnishVote({ EdustajaAanestys: " Jaa " as any }));
    flushVotes();

    const rows = db.query("SELECT * FROM Vote").all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].vote).toBe("Jaa");
  });

  test("inserts multiple votes", async () => {
    await migrate(
      makeFinnishVote({ EdustajaId: "5000", EdustajaHenkiloNumero: "1000" }),
    );
    await migrate(
      makeFinnishVote({
        EdustajaId: "5001",
        EdustajaHenkiloNumero: "1001",
        EdustajaAanestys: "Ei" as any,
      }),
    );
    flushVotes();

    const rows = db.query("SELECT * FROM Vote ORDER BY id").all() as any[];
    expect(rows).toHaveLength(2);
    expect(rows[0].vote).toBe("Jaa");
    expect(rows[1].vote).toBe("Ei");
  });
});
