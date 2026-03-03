import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import createMigrator from "../migrator/fn/SaliDBIstunto";
import { clearStatementCache } from "../migrator/utils";
import { createTestDb } from "./helpers/setup-db";

describe("SaliDBIstunto migrator", () => {
  let db: Database;
  let migrate: (data: RawDataModels["SaliDBIstunto"]) => void | Promise<void>;

  beforeEach(() => {
    clearStatementCache();
    db = createTestDb(); // Use latest schema
    migrate = createMigrator(db);
  });

  afterEach(() => {
    db.close();
  });

  const makeSession = (
    overrides: Partial<RawDataModels["SaliDBIstunto"]> = {},
  ): RawDataModels["SaliDBIstunto"] => ({
    Id: "1",
    AttachmentGroupId: "",
    Created: "2024-01-15T00:00:00",
    Imported: "2024-01-20T00:00:00",
    IstuntoAlkuaika: "2024-01-15T09:00:00.000",
    IstuntoIlmoitettuAlkuaika: "2024-01-15T09:00:00.000",
    IstuntoLoppuaika: "2024-01-15T18:00:00.000",
    IstuntoNimenhuutoaika: null,
    IstuntoNumero: "1",
    IstuntoPvm: "2024-01-15T00:00:00",
    IstuntoTila: "Päättynyt",
    IstuntoTilaSeliteFI: "Istunto päättynyt",
    IstuntoTilaSeliteSV: "Sessionen avslutad",
    IstuntoTyyppi: "varsinainen",
    IstuntoVPVuosi: "2024",
    KasiteltavaKohtaTekninenAvain: "key_1",
    ManuaalinenEsto: "0",
    Modified: "2024-01-16T10:00:00.000",
    PJOtsikkoFI: "Täysistunnon päiväjärjestys",
    PJOtsikkoSV: "Plenarsammanträdets dagordning",
    PJTekninenAvain: "PJ_2024_1",
    PJTila: "Valmis",
    PuhujaHenkilonumero: "1000",
    TekninenAvain: "2024/1",
    XmlData: null,
    ...overrides,
  });

  test("inserts session and agenda", async () => {
    await migrate(makeSession());

    const sessions = db.query("SELECT * FROM Session").all() as any[];
    const agendas = db.query("SELECT * FROM Agenda").all() as any[];

    expect(sessions).toHaveLength(1);
    expect(agendas).toHaveLength(1);
  });

  test("maps session fields correctly", async () => {
    await migrate(makeSession());

    const session = db.query("SELECT * FROM Session").get() as any;
    expect(session.id).toBe(1);
    expect(session.number).toBe(1);
    expect(session.key).toBe("2024/1");
    expect(session.year).toBe(2024);
    expect(session.type).toBe("varsinainen");
    expect(session.state).toBe("Päättynyt");
    expect(session.agenda_key).toBe("PJ_2024_1");
  });

  test("maps agenda fields correctly", async () => {
    await migrate(makeSession());

    const agenda = db.query("SELECT * FROM Agenda").get() as any;
    expect(agenda.key).toBe("PJ_2024_1");
    expect(agenda.title).toBe("Täysistunnon päiväjärjestys");
    expect(agenda.state).toBe("Valmis");
  });

  test("parses date from reported start time when available", async () => {
    await migrate(
      makeSession({
        IstuntoPvm: "2024-03-20T00:00:00",
        IstuntoIlmoitettuAlkuaika: "2024-03-21T14:00:00.000",
      }),
    );

    const session = db.query("SELECT date FROM Session").get() as any;
    expect(session.date).toBe("2024-03-21");
  });

  test("parses year correctly", async () => {
    await migrate(makeSession({ IstuntoVPVuosi: "2023" }));

    const session = db.query("SELECT year FROM Session").get() as any;
    expect(session.year).toBe(2023);
  });

  test("trims description whitespace", async () => {
    await migrate(
      makeSession({ IstuntoTilaSeliteFI: "  Istunto päättynyt  " }),
    );

    const session = db.query("SELECT description FROM Session").get() as any;
    expect(session.description).toBe("Istunto päättynyt");
  });

  test("deduplicates agendas (INSERT OR IGNORE)", async () => {
    await migrate(makeSession({ Id: "1", TekninenAvain: "2024/1" }));
    await migrate(makeSession({ Id: "2", TekninenAvain: "2024/2" }));
    // Same PJTekninenAvain, so agenda should be deduplicated

    const agendas = db.query("SELECT * FROM Agenda").all();
    expect(agendas).toHaveLength(1);
  });
});
