import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { createTestDb } from "./helpers/setup-db";
import { clearStatementCache } from "../migrator/utils";
import createMigrator from "../migrator/SaliDBKohta/migrator";

describe("SaliDBKohta migrator", () => {
  let db: Database;
  let migrate: (data: RawDataModels["SaliDBKohta"]) => Promise<void>;
  let overwriteLogDir: string;

  beforeEach(() => {
    clearStatementCache();
    overwriteLogDir = mkdtempSync(join(tmpdir(), "kohta-overwrite-"));
    process.env.MIGRATOR_OVERWRITE_LOG_DIR = overwriteLogDir;
    db = createTestDb(); // Use latest schema
    migrate = createMigrator(db);
  });

  afterEach(() => {
    db.close();
    delete process.env.MIGRATOR_OVERWRITE_LOG_DIR;
    rmSync(overwriteLogDir, { recursive: true, force: true });
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

  test("falls back to Swedish title when Finnish title is missing", async () => {
    await migrate(
      makeSection({
        OtsikkoFI: "",
        OtsikkoSV: "Regeringens proposition till riksdagen",
      }),
    );

    const section = db.query("SELECT title FROM Section").get() as any;
    expect(section.title).toBe("[sv] Regeringens proposition till riksdagen");
  });

  test("inserts multiple sections", async () => {
    await migrate(makeSection({ Id: "10", TekninenAvain: "2024/1/3", VaskiID: "999" }));
    await migrate(makeSection({ Id: "11", TekninenAvain: "2024/1/4", VaskiID: "1000" }));
    await migrate(makeSection({ Id: "12", TekninenAvain: "2024/1/5", VaskiID: "1001" }));

    const rows = db.query("SELECT * FROM Section").all();
    expect(rows).toHaveLength(3);
  });

  test("overwrites existing section revision by session_key + vaski_id and logs diff", async () => {
    await migrate(
      makeSection({
        Id: "10",
        TekninenAvain: "2024/1/old",
        OtsikkoFI: "Vanha otsikko",
        VaskiID: "999",
        IstuntoTekninenAvain: "2024/1",
      }),
    );

    await migrate(
      makeSection({
        Id: "11",
        TekninenAvain: "2024/1/new",
        OtsikkoFI: "Uusi otsikko",
        Jarjestysnumero: "2",
        Tunniste: "2",
        VaskiID: "999",
        IstuntoTekninenAvain: "2024/1",
      }),
    );

    const rows = db.query("SELECT * FROM Section WHERE session_key = '2024/1' AND vaski_id = 999").all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(11);
    expect(rows[0].title).toBe("Uusi otsikko");
    expect(rows[0].key).toBe("2024/1/new");

    const files = readdirSync(overwriteLogDir).filter((f) => f.endsWith(".json"));
    expect(files).toHaveLength(1);

    const payload = JSON.parse(
      readFileSync(join(overwriteLogDir, files[0]), "utf8"),
    ) as any;
    expect(payload.old_row.id).toBe(10);
    expect(payload.incoming_row.id).toBe(11);
    expect(payload.new_row.id).toBe(11);
    expect(payload.unique_key.session_key).toBe("2024/1");
    expect(payload.unique_key.vaski_id).toBe(999);
    expect(payload.changed_fields.id.before).toBe(10);
    expect(payload.changed_fields.id.after).toBe(11);
    expect(payload.changed_fields.title.before).toBe("Vanha otsikko");
    expect(payload.changed_fields.title.after).toBe("Uusi otsikko");
  });

  test("preserves previous non-empty values when incoming overwrite is empty", async () => {
    await migrate(
      makeSection({
        Id: "20",
        VaskiID: "12345",
        IstuntoTekninenAvain: "2024/2",
        PaatosFI: "Vanha päätös",
        KasittelyotsikkoFI: "Vanha käsittely",
      }),
    );

    await migrate(
      makeSection({
        Id: "21",
        VaskiID: "12345",
        IstuntoTekninenAvain: "2024/2",
        PaatosFI: "",
        KasittelyotsikkoFI: "",
      }),
    );

    const row = db
      .query(
        "SELECT id, resolution, processing_title FROM Section WHERE session_key = '2024/2' AND vaski_id = 12345",
      )
      .get() as any;
    expect(row.id).toBe(21);
    expect(row.resolution).toBe("Vanha päätös");
    expect(row.processing_title).toBe("Vanha käsittely");

    const files = readdirSync(overwriteLogDir).filter((f) => f.endsWith(".json"));
    expect(files).toHaveLength(1);
    const payload = JSON.parse(readFileSync(join(overwriteLogDir, files[0]), "utf8")) as any;
    expect(payload.incoming_row.resolution).toBeNull();
    expect(payload.new_row.resolution).toBe("Vanha päätös");
    expect(payload.incoming_row.processing_title).toBeNull();
    expect(payload.new_row.processing_title).toBe("Vanha käsittely");
  });

  test("does not log can_request_speech as changed for equivalent 0/1 and false/true", async () => {
    await migrate(
      makeSection({
        Id: "30",
        VaskiID: "777",
        IstuntoTekninenAvain: "2024/3",
        VoikoPyytaaPV: "1",
      }),
    );

    await migrate(
      makeSection({
        Id: "31",
        VaskiID: "777",
        IstuntoTekninenAvain: "2024/3",
        VoikoPyytaaPV: "1",
      }),
    );

    const files = readdirSync(overwriteLogDir).filter((f) => f.endsWith(".json"));
    expect(files).toHaveLength(1);
    const payload = JSON.parse(readFileSync(join(overwriteLogDir, files[0]), "utf8")) as any;
    expect(payload.old_row.can_request_speech).toBe(1);
    expect(payload.new_row.can_request_speech).toBe(true);
    expect(payload.changed_fields.can_request_speech).toBeUndefined();
  });
});
