import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clearStatementCache } from "../migrator/utils";
import type { VaskiEntry } from "../migrator/VaskiData/reader";
import createSubMigrator from "../migrator/VaskiData/submigrators/kansalaisaloite";
import { createTestDb } from "./helpers/setup-db";

function makeKasittelyRow(overrides: Partial<VaskiEntry> = {}): VaskiEntry {
  return {
    id: "9951",
    eduskuntaTunnus: "KAA 4/2024 vp",
    status: "5",
    created: "2024-05-01 11:00:00",
    attachmentGroupId: "2",
    _source: {
      page: 2,
      parsedKey: "parsed/VaskiData/page_000000000002+000000000101.json",
      vaskiPath:
        "vaski-data/kansalaisaloite/page_000000000002+000000000101.json",
    },
    contents: {
      Siirto: {
        SiirtoAsiakirja: {
          RakenneAsiakirja: {
            KasittelytiedotValtiopaivaasia: {
              IdentifiointiOsa: {
                Nimeke: { NimekeTeksti: "Kansalaisaloite testiaiheesta" },
                Toimija: {
                  Henkilo: {
                    "@_muuTunnus": "1001",
                    EtuNimi: "Aino",
                    SukuNimi: "Esimerkki",
                    LisatietoTeksti: "sd",
                  },
                },
              },
              EduskuntakasittelyPaatosKuvaus: {
                EduskuntakasittelyPaatosNimi: "Hyväksytty",
                "@_eduskuntakasittelyPaatosKoodi": "accepted",
              },
              YleinenKasittelyvaihe: [
                {
                  OtsikkoTeksti: "Käsittely",
                  "@_yleinenKasittelyvaiheKoodi": "KAS",
                  ToimenpideJulkaisu: {
                    "@_tapahtumaPvm": "2024-05-10",
                    ValiotsikkoTeksti: "Lähetekeskustelu käytiin",
                  },
                },
              ],
              Asiasanat: {
                Aihe: [
                  { AiheTeksti: "Demokratia", "@_muuTunnus": "yso:p31" },
                  {
                    AiheTeksti: "Kansalaisvaikuttaminen",
                    "@_muuTunnus": "yso:p32",
                  },
                ],
              },
              "@_viimeisinKasittelyvaiheKoodi": "KAS",
              "@_paattymisPvm": "2024-06-01",
              "@_laadintaPvm": "2024-05-01",
            },
          },
        },
      },
    },
    ...overrides,
  };
}

describe("Vaski kansalaisaloite submigrator", () => {
  let db: Database;
  let migrateRow: (row: VaskiEntry) => Promise<void>;
  let reportLogDir: string;

  beforeEach(() => {
    clearStatementCache();
    reportLogDir = mkdtempSync(join(tmpdir(), "kansalaisaloite-report-"));
    process.env.MIGRATOR_REPORT_LOG_DIR = reportLogDir;
    db = createTestDb(20);
    migrateRow = createSubMigrator(db).migrateRow;
  });

  afterEach(() => {
    db.close();
    delete process.env.MIGRATOR_REPORT_LOG_DIR;
    rmSync(reportLogDir, { recursive: true, force: true });
  });

  test("imports processing metadata into LegislativeInitiative with KAA type", async () => {
    db.run(
      "INSERT INTO VaskiDocument (id, document_type, edk_identifier, source_path) VALUES (9951, 'kansalaisaloite', NULL, 'test')",
    );

    await migrateRow(makeKasittelyRow());

    const initiative = db
      .query(
        "SELECT id, initiative_type_code, parliament_identifier, title, first_signer_first_name, first_signer_last_name, decision_outcome, latest_stage_code, end_date, vaski_document_id FROM LegislativeInitiative WHERE parliament_identifier = 'KAA 4/2024 vp'",
      )
      .get() as any;

    expect(initiative.initiative_type_code).toBe("KAA");
    expect(initiative.parliament_identifier).toBe("KAA 4/2024 vp");
    expect(initiative.title).toBe("Kansalaisaloite testiaiheesta");
    expect(initiative.first_signer_first_name).toBe("Aino");
    expect(initiative.first_signer_last_name).toBe("Esimerkki");
    expect(initiative.decision_outcome).toBe("Hyväksytty");
    expect(initiative.latest_stage_code).toBe("KAS");
    expect(initiative.end_date).toBe("2024-06-01");
    expect(initiative.vaski_document_id).toBe(9951);

    const subjects = db
      .query(
        "SELECT subject_text FROM LegislativeInitiativeSubject WHERE initiative_id = ? ORDER BY subject_text",
      )
      .all(initiative.id) as any[];
    expect(subjects.map((row) => row.subject_text)).toEqual([
      "Demokratia",
      "Kansalaisvaikuttaminen",
    ]);
  });

  test("skips rows without processing body", async () => {
    await migrateRow(
      makeKasittelyRow({
        contents: {
          Siirto: {
            SiirtoAsiakirja: {
              RakenneAsiakirja: {},
            },
          },
        },
      } as unknown as VaskiEntry),
    );

    const initiatives = db
      .query("SELECT id FROM LegislativeInitiative")
      .all() as any[];
    expect(initiatives).toHaveLength(0);

    const reportFiles = readdirSync(reportLogDir).filter((f) =>
      f.endsWith(".json"),
    );
    expect(reportFiles.length).toBeGreaterThan(0);
    expect(reportFiles.some((f) => f.includes("unknown_body_type"))).toBe(true);
  });
});
