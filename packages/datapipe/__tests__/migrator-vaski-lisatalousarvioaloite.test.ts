import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clearStatementCache } from "../migrator/utils";
import type { VaskiEntry } from "../migrator/VaskiData/reader";
import createSubMigrator from "../migrator/VaskiData/submigrators/lisätalousarvioaloite";
import { createTestDb } from "./helpers/setup-db";

function makeAloiteRow(overrides: Partial<VaskiEntry> = {}): VaskiEntry {
  return {
    id: "9901",
    eduskuntaTunnus: "LTA 3/2024 vp",
    status: "5",
    created: "2024-04-12 13:00:00",
    attachmentGroupId: "1",
    _source: {
      page: 1,
      parsedKey: "parsed/VaskiData/page_000000000001+000000000100.json",
      vaskiPath: "vaski-data/lisätalousarvioaloite/page_000000000001+000000000100.json",
    },
    contents: {
      Siirto: {
        SiirtoMetatieto: {
          JulkaisuMetatieto: {
            Aihe: [{ AiheTeksti: "Valtiontalous", "@_muuTunnus": "yso:p1" }],
          },
        },
        SiirtoAsiakirja: {
          RakenneAsiakirja: {
            EduskuntaAloite: {
              IdentifiointiOsa: {
                Nimeke: {
                  NimekeTeksti: "Lisätalousarvioaloite määrärahan lisäämisestä",
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
    id: "9902",
    eduskuntaTunnus: "LTA 3/2024 vp",
    status: "5",
    created: "2024-05-01 11:00:00",
    attachmentGroupId: "2",
    _source: {
      page: 2,
      parsedKey: "parsed/VaskiData/page_000000000002+000000000101.json",
      vaskiPath: "vaski-data/lisätalousarvioaloite/page_000000000002+000000000101.json",
    },
    contents: {
      Siirto: {
        SiirtoAsiakirja: {
          RakenneAsiakirja: {
            KasittelytiedotValtiopaivaasia: {
              IdentifiointiOsa: {
                Nimeke: {
                  NimekeTeksti: "Lisätalousarvioaloite määrärahan lisäämisestä",
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
                EduskuntakasittelyPaatosNimi: "Hylätty",
                "@_eduskuntakasittelyPaatosKoodi": "rejected",
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
                  { AiheTeksti: "Valtiontalous", "@_muuTunnus": "yso:p1" },
                  { AiheTeksti: "Budjetti", "@_muuTunnus": "yso:p2" },
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

describe("Vaski lisätalousarvioaloite submigrator", () => {
  let db: Database;
  let migrateRow: (row: VaskiEntry) => Promise<void>;
  let reportLogDir: string;

  beforeEach(() => {
    clearStatementCache();
    reportLogDir = mkdtempSync(join(tmpdir(), "lisatalousarvioaloite-report-"));
    process.env.MIGRATOR_REPORT_LOG_DIR = reportLogDir;
    db = createTestDb(20);
    migrateRow = createSubMigrator(db).migrateRow;
  });

  afterEach(() => {
    db.close();
    delete process.env.MIGRATOR_REPORT_LOG_DIR;
    rmSync(reportLogDir, { recursive: true, force: true });
  });

  test("merges full content and processing metadata into LegislativeInitiative with LTA type", async () => {
    db.run(
      "INSERT INTO VaskiDocument (id, document_type, edk_identifier, source_path) VALUES (9901, 'lisätalousarvioaloite', NULL, 'test')",
    );
    db.run(
      "INSERT INTO VaskiDocument (id, document_type, edk_identifier, source_path) VALUES (9902, 'lisätalousarvioaloite', NULL, 'test')",
    );

    await migrateRow(makeAloiteRow());
    await migrateRow(makeKasittelyRow());

    const initiative = db
      .query(
        "SELECT id, initiative_type_code, parliament_identifier, title, first_signer_first_name, first_signer_last_name, justification_text, proposal_text, law_text, decision_outcome, latest_stage_code, end_date, vaski_document_id FROM LegislativeInitiative WHERE parliament_identifier = 'LTA 3/2024 vp'",
      )
      .get() as any;

    expect(initiative.initiative_type_code).toBe("LTA");
    expect(initiative.parliament_identifier).toBe("LTA 3/2024 vp");
    expect(initiative.title).toBe(
      "Lisätalousarvioaloite määrärahan lisäämisestä",
    );
    expect(initiative.justification_text).toContain("Perusteluteksti");
    expect(initiative.proposal_text).toContain("Ponsiteksti");
    expect(initiative.law_text).toBeNull();
    expect(initiative.decision_outcome).toBe("Hylätty");
    expect(initiative.latest_stage_code).toBe("KAS");
    expect(initiative.vaski_document_id).toBe(9902);
  });

  test("skips unsupported identifier and writes migration report", async () => {
    await migrateRow(makeAloiteRow({ eduskuntaTunnus: "TAA 1/2024 vp" }));

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
