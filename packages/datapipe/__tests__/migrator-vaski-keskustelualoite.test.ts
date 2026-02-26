import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clearStatementCache } from "../migrator/utils";
import type { VaskiEntry } from "../migrator/VaskiData/reader";
import createSubMigrator from "../migrator/VaskiData/submigrators/keskustelualoite";
import { createTestDb } from "./helpers/setup-db";

function makeAloiteRow(overrides: Partial<VaskiEntry> = {}): VaskiEntry {
  return {
    id: "9801",
    eduskuntaTunnus: "KA 5/2024 vp",
    status: "5",
    created: "2024-04-12 13:00:00",
    attachmentGroupId: "1",
    _source: {
      page: 1,
      parsedKey: "parsed/VaskiData/page_000000000001+000000000100.json",
      vaskiPath:
        "vaski-data/keskustelualoite/page_000000000001+000000000100.json",
    },
    contents: {
      Siirto: {
        SiirtoMetatieto: {
          JulkaisuMetatieto: {
            Aihe: [{ AiheTeksti: "Turvallisuus", "@_muuTunnus": "yso:p21" }],
          },
        },
        SiirtoAsiakirja: {
          RakenneAsiakirja: {
            EduskuntaAloite: {
              IdentifiointiOsa: {
                Nimeke: {
                  NimekeTeksti: "Keskustelualoite kokonaisturvallisuudesta",
                },
                Toimija: {
                  Henkilo: {
                    "@_muuTunnus": "1001",
                    EtuNimi: "Aino",
                    SukuNimi: "Esimerkki",
                    LisatietoTeksti: "sd",
                  },
                },
              },
              PerusteluOsa: { KappaleKooste: "Perusteluteksti" },
              PonsiOsa: { KappaleKooste: "Ponsiteksti" },
              "@_laadintaPvm": "2024-04-12",
            },
          },
        },
      },
    },
    ...overrides,
  };
}

function makeKasittelyRow(overrides: Partial<VaskiEntry> = {}): VaskiEntry {
  return {
    id: "9802",
    eduskuntaTunnus: "KA 5/2024 vp",
    status: "5",
    created: "2024-05-01 11:00:00",
    attachmentGroupId: "2",
    _source: {
      page: 2,
      parsedKey: "parsed/VaskiData/page_000000000002+000000000101.json",
      vaskiPath:
        "vaski-data/keskustelualoite/page_000000000002+000000000101.json",
    },
    contents: {
      Siirto: {
        SiirtoAsiakirja: {
          RakenneAsiakirja: {
            KasittelytiedotValtiopaivaasia: {
              IdentifiointiOsa: {
                Nimeke: {
                  NimekeTeksti: "Keskustelualoite kokonaisturvallisuudesta",
                },
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
                  OtsikkoTeksti: "Keskustelu",
                  "@_yleinenKasittelyvaiheKoodi": "KES",
                  ToimenpideJulkaisu: {
                    "@_tapahtumaPvm": "2024-05-10",
                    ValiotsikkoTeksti: "Keskustelu käytiin",
                  },
                },
              ],
              Asiasanat: {
                Aihe: [
                  { AiheTeksti: "Turvallisuus", "@_muuTunnus": "yso:p21" },
                  { AiheTeksti: "Varautuminen", "@_muuTunnus": "yso:p22" },
                ],
              },
              "@_viimeisinKasittelyvaiheKoodi": "KES",
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

describe("Vaski keskustelualoite submigrator", () => {
  let db: Database;
  let migrateRow: (row: VaskiEntry) => Promise<void>;
  let reportLogDir: string;

  beforeEach(() => {
    clearStatementCache();
    reportLogDir = mkdtempSync(join(tmpdir(), "keskustelualoite-report-"));
    process.env.MIGRATOR_REPORT_LOG_DIR = reportLogDir;
    db = createTestDb(20);
    migrateRow = createSubMigrator(db).migrateRow;
  });

  afterEach(() => {
    db.close();
    delete process.env.MIGRATOR_REPORT_LOG_DIR;
    rmSync(reportLogDir, { recursive: true, force: true });
  });

  test("merges full content and processing metadata into LegislativeInitiative with KA type", async () => {
    db.run(
      "INSERT INTO VaskiDocument (id, document_type, edk_identifier, source_path) VALUES (9801, 'keskustelualoite', NULL, 'test')",
    );
    db.run(
      "INSERT INTO VaskiDocument (id, document_type, edk_identifier, source_path) VALUES (9802, 'keskustelualoite', NULL, 'test')",
    );

    await migrateRow(makeAloiteRow());
    await migrateRow(makeKasittelyRow());

    const initiative = db
      .query(
        "SELECT id, initiative_type_code, parliament_identifier, title, first_signer_first_name, first_signer_last_name, justification_text, proposal_text, decision_outcome, latest_stage_code, end_date, vaski_document_id FROM LegislativeInitiative WHERE parliament_identifier = 'KA 5/2024 vp'",
      )
      .get() as any;

    expect(initiative.initiative_type_code).toBe("KA");
    expect(initiative.parliament_identifier).toBe("KA 5/2024 vp");
    expect(initiative.title).toBe("Keskustelualoite kokonaisturvallisuudesta");
    expect(initiative.justification_text).toContain("Perusteluteksti");
    expect(initiative.proposal_text).toContain("Ponsiteksti");
    expect(initiative.decision_outcome).toBe("Hyväksytty");
    expect(initiative.latest_stage_code).toBe("KES");
    expect(initiative.vaski_document_id).toBe(9802);
  });

  test("skips unsupported identifier and writes migration report", async () => {
    await migrateRow(makeAloiteRow({ eduskuntaTunnus: "TPA 1/2024 vp" }));

    const initiatives = db
      .query("SELECT id FROM LegislativeInitiative")
      .all() as any[];
    expect(initiatives).toHaveLength(0);

    const reportFiles = readdirSync(reportLogDir).filter((f) =>
      f.endsWith(".json"),
    );
    expect(reportFiles.length).toBeGreaterThan(0);
    expect(
      reportFiles.some((f) => f.includes("invalid_parliament_identifier")),
    ).toBe(true);
  });
});
