import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { createTestDb } from "./helpers/setup-db";
import { clearStatementCache } from "../migrator/utils";
import createMigrator from "../migrator/SaliDBKohta/migrator";

describe("SaliDBKohta migrator", () => {
  let db: Database;
  let migrate: (data: RawDataModels["SaliDBKohta"]) => Promise<void>;

  beforeEach(() => {
    clearStatementCache();
    db = createTestDb(3); // Up to V001.003 (includes Section table)
    migrate = createMigrator(db);
  });

  afterEach(() => {
    db.close();
  });

  const makeSection = (
    overrides: Partial<RawDataModels["SaliDBKohta"]> = {},
  ): RawDataModels["SaliDBKohta"] => ({
    Id: "10",
    Created: "2024-01-15T00:00:00",
    HuomautuSV: "",
    HuomautusFI: "Tämä on huomautus",
    Imported: "2024-01-20T00:00:00",
    IstuntoTekninenAvain: "2024/1",
    Jarjestysnumero: "3",
    KasittelyotsikkoFI: "Ainoa käsittely",
    KasittelyotsikkoSV: "Enda behandlingen",
    Modified: "2024-01-16T10:00:00.000",
    OtsikkoFI: "Hallituksen esitys eduskunnalle",
    OtsikkoSV: "Regeringens proposition till riksdagen",
    PJKohtaTunnus: "PJ_2024_1_3",
    PaatosFI: "Hyväksytty",
    PaatosSV: "Godkänd",
    PuheenvuoroTyyppiOletus: "",
    TekninenAvain: "2024/1/3",
    Tunniste: "3",
    VaskiID: "999",
    VoikoPyytaaPV: "1",
    XmlData: "<xml></xml>",
    ...overrides,
  });

  test("inserts section with correct field mapping", async () => {
    await migrate(makeSection());

    const rows = db.query("SELECT * FROM Section").all() as any[];
    expect(rows).toHaveLength(1);

    const section = rows[0];
    expect(section.id).toBe(10);
    expect(section.key).toBe("2024/1/3");
    expect(section.identifier).toBe("3");
    expect(section.title).toBe("Hallituksen esitys eduskunnalle");
    expect(section.ordinal).toBe(3);
    expect(section.note).toBe("Tämä on huomautus");
    expect(section.processing_title).toBe("Ainoa käsittely");
    expect(section.resolution).toBe("Hyväksytty");
    expect(section.session_key).toBe("2024/1");
    expect(section.agenda_key).toBe("PJ_2024_1_3");
    expect(section.vaski_id).toBe(999);
  });

  test("parses modified datetime", async () => {
    await migrate(makeSection({ Modified: "2024-03-20T14:15:30.000" }));

    const section = db.query("SELECT modified_datetime FROM Section").get() as any;
    expect(section.modified_datetime).toBe("2024-03-20T14:15:30.000");
  });

  test("uses Finnish fields (not Swedish)", async () => {
    await migrate(
      makeSection({
        OtsikkoFI: "Suomeksi",
        OtsikkoSV: "På svenska",
        KasittelyotsikkoFI: "Käsittely",
        KasittelyotsikkoSV: "Behandling",
        HuomautusFI: "Huomautus",
        HuomautuSV: "Anmärkning",
        PaatosFI: "Päätös",
        PaatosSV: "Beslut",
      }),
    );

    const section = db.query("SELECT title, processing_title, note, resolution FROM Section").get() as any;
    expect(section.title).toBe("Suomeksi");
    expect(section.processing_title).toBe("Käsittely");
    expect(section.note).toBe("Huomautus");
    expect(section.resolution).toBe("Päätös");
  });

  test("inserts multiple sections", async () => {
    await migrate(makeSection({ Id: "10", TekninenAvain: "2024/1/3" }));
    await migrate(makeSection({ Id: "11", TekninenAvain: "2024/1/4" }));
    await migrate(makeSection({ Id: "12", TekninenAvain: "2024/1/5" }));

    const rows = db.query("SELECT * FROM Section").all();
    expect(rows).toHaveLength(3);
  });
});
