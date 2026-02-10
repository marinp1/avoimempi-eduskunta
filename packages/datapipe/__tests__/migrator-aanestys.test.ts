import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createTestDb } from "./helpers/setup-db";
import { clearStatementCache } from "../migrator/utils";
import createMigrator from "../migrator/SaliDBAanestys/migrator";

describe("SaliDBAanestys migrator", () => {
  let db: Database;
  let migrate: (data: RawDataModels["SaliDBAanestys"]) => Promise<void>;

  beforeEach(() => {
    clearStatementCache();
    db = createTestDb(); // Use latest schema
    migrate = createMigrator(db);
  });

  afterEach(() => {
    db.close();
  });

  const makeFinnishVoting = (
    overrides: Partial<RawDataModels["SaliDBAanestys"]> = {},
  ): RawDataModels["SaliDBAanestys"] => ({
    AanestysId: "1001",
    AanestysAlkuaika: "2024-01-15T10:30:00.000",
    AanestysLisaOtsikko: "",
    AanestysLoppuaika: "2024-01-15T10:35:00.000",
    AanestysMitatoitu: "0",
    AanestysNumero: "5",
    AanestysOtsikko: "Äänestys hallituksen esityksestä",
    AanestysPoytakirja: "PTK 1/2024",
    AanestysPoytakirjaUrl: "https://example.com/ptk",
    AanestysTulosEi: "50",
    AanestysTulosJaa: "100",
    AanestysTulosPoissa: "45",
    AanestysTulosTyhjia: "5",
    AanestysTulosYhteensa: "200",
    AanestysValtiopaivaasia: "",
    AanestysValtiopaivaasiaUrl: "",
    AliKohtaTunniste: "",
    Imported: "2024-01-20",
    IstuntoAlkuaika: "2024-01-15T09:00:00.000",
    IstuntoIlmoitettuAlkuaika: "2024-01-15T09:00:00.000",
    IstuntoNumero: "1",
    IstuntoPvm: "2024-01-15",
    IstuntoVPVuosi: "2024",
    KieliId: "1" as const,
    KohtaHuomautus: "",
    KohtaJarjestys: "3",
    KohtaKasittelyOtsikko: "Ainoa käsittely",
    KohtaKasittelyVaihe: "EK",
    KohtaOtsikko: "Hallituksen esitys",
    KohtaTunniste: "42",
    PJOtsikko: "",
    PaaKohtaHuomautus: "",
    PaaKohtaOtsikko: "",
    PaaKohtaTunniste: "40",
    Url: "https://example.com/result",
    ...overrides,
  });

  test("inserts Finnish voting record", async () => {
    await migrate(makeFinnishVoting());

    const rows = db.query("SELECT * FROM Voting").all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(1001);
    expect(rows[0].number).toBe(5);
    expect(rows[0].n_yes).toBe(100);
    expect(rows[0].n_no).toBe(50);
    expect(rows[0].n_abstain).toBe(5);
    expect(rows[0].n_absent).toBe(45);
    expect(rows[0].n_total).toBe(200);
  });

  test("skips Swedish voting records", async () => {
    await migrate(
      makeFinnishVoting({ KieliId: "2" as RawDataModels["SaliDBAanestys"]["KieliId"] }),
    );

    const rows = db.query("SELECT * FROM Voting").all();
    expect(rows).toHaveLength(0);
  });

  test("maps session_key from year/number", async () => {
    await migrate(
      makeFinnishVoting({ IstuntoVPVuosi: "2023", IstuntoNumero: "42" }),
    );

    const rows = db.query("SELECT session_key FROM Voting").all() as any[];
    expect(rows[0].session_key).toBe("2023/42");
  });

  test("parses datetime correctly", async () => {
    await migrate(
      makeFinnishVoting({ AanestysAlkuaika: "2024-03-20T14:15:30.000" }),
    );

    const rows = db.query("SELECT start_time FROM Voting").all() as any[];
    expect(rows[0].start_time).toBe("2024-03-20T14:15:30.000");
  });

  test("maps annulled flag", async () => {
    await migrate(makeFinnishVoting({ AanestysMitatoitu: "1" }));

    const rows = db.query("SELECT annulled FROM Voting").all() as any[];
    expect(rows[0].annulled).toBe(1);
  });

  test("inserts multiple voting records", async () => {
    await migrate(makeFinnishVoting({ AanestysId: "1001" }));
    await migrate(makeFinnishVoting({ AanestysId: "1002" }));
    await migrate(makeFinnishVoting({ AanestysId: "1003" }));

    const rows = db.query("SELECT * FROM Voting").all();
    expect(rows).toHaveLength(3);
  });
});
