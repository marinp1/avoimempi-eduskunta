import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import createSubMigrator from "../migrator/VaskiData/submigrators/toimenpidealoite";
import { clearStatementCache } from "../migrator/utils";
import type { VaskiEntry } from "../migrator/VaskiData/reader";
import { createTestDb } from "./helpers/setup-db";

function makeAloiteRow(
  overrides: Partial<VaskiEntry> = {},
): VaskiEntry {
  return {
    id: "9701",
    eduskuntaTunnus: "TPA 5/2024 vp",
    status: "5",
    created: "2024-04-12 13:00:00",
    attachmentGroupId: "1",
    _source: {
      page: 1,
      parsedKey: "parsed/VaskiData/page_1.json",
      vaskiPath: "vaski-data/toimenpidealoite/page_1.json",
    },
    contents: {
      Siirto: {
        SiirtoMetatieto: {
          JulkaisuMetatieto: {
            Aihe: [
              { AiheTeksti: "Liikenne", "@_muuTunnus": "yso:p11" },
            ],
          },
        },
        SiirtoAsiakirja: {
          RakenneAsiakirja: {
            EduskuntaAloite: {
              IdentifiointiOsa: {
                Nimeke: { NimekeTeksti: "Toimenpidealoite joukkoliikenteen parantamisesta" },
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

function makeKasittelyRow(
  overrides: Partial<VaskiEntry> = {},
): VaskiEntry {
  return {
    id: "9702",
    eduskuntaTunnus: "TPA 5/2024 vp",
    status: "5",
    created: "2024-05-01 11:00:00",
    attachmentGroupId: "2",
    _source: {
      page: 2,
      parsedKey: "parsed/VaskiData/page_2.json",
      vaskiPath: "vaski-data/toimenpidealoite/page_2.json",
    },
    contents: {
      Siirto: {
        SiirtoAsiakirja: {
          RakenneAsiakirja: {
            KasittelytiedotValtiopaivaasia: {
              IdentifiointiOsa: {
                Nimeke: { NimekeTeksti: "Toimenpidealoite joukkoliikenteen parantamisesta" },
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
                  { AiheTeksti: "Liikenne", "@_muuTunnus": "yso:p11" },
                  { AiheTeksti: "Joukkoliikenne", "@_muuTunnus": "yso:p12" },
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

describe("Vaski toimenpidealoite submigrator", () => {
  let db: Database;
  let migrateRow: (row: VaskiEntry) => Promise<void>;
  let reportLogDir: string;

  beforeEach(() => {
    clearStatementCache();
    reportLogDir = mkdtempSync(join(tmpdir(), "toimenpidealoite-report-"));
    process.env.MIGRATOR_REPORT_LOG_DIR = reportLogDir;
    db = createTestDb(20);
    migrateRow = createSubMigrator(db).migrateRow;
  });

  afterEach(() => {
    db.close();
    delete process.env.MIGRATOR_REPORT_LOG_DIR;
    rmSync(reportLogDir, { recursive: true, force: true });
  });

  test("merges full content and processing metadata into LegislativeInitiative with TPA type", async () => {
    db.run(
      "INSERT INTO VaskiDocument (id, document_type, edk_identifier, source_path) VALUES (9701, 'toimenpidealoite', NULL, 'test')",
    );
    db.run(
      "INSERT INTO VaskiDocument (id, document_type, edk_identifier, source_path) VALUES (9702, 'toimenpidealoite', NULL, 'test')",
    );

    await migrateRow(makeAloiteRow());
    await migrateRow(makeKasittelyRow());

    const initiative = db
      .query(
        "SELECT id, initiative_type_code, parliament_identifier, title, first_signer_first_name, first_signer_last_name, justification_text, proposal_text, decision_outcome, latest_stage_code, end_date, vaski_document_id FROM LegislativeInitiative WHERE parliament_identifier = 'TPA 5/2024 vp'",
      )
      .get() as any;

    expect(initiative.initiative_type_code).toBe("TPA");
    expect(initiative.parliament_identifier).toBe("TPA 5/2024 vp");
    expect(initiative.title).toBe("Toimenpidealoite joukkoliikenteen parantamisesta");
    expect(initiative.first_signer_first_name).toBe("Aino");
    expect(initiative.first_signer_last_name).toBe("Esimerkki");
    expect(initiative.justification_text).toContain("Perusteluteksti");
    expect(initiative.proposal_text).toContain("Ponsiteksti");
    expect(initiative.decision_outcome).toBe("Hyväksytty");
    expect(initiative.latest_stage_code).toBe("KAS");
    expect(initiative.end_date).toBe("2024-06-01");
    expect(initiative.vaski_document_id).toBe(9702);

    const signers = db
      .query(
        "SELECT signer_order, person_id, first_name, last_name, party, is_first_signer FROM LegislativeInitiativeSigner WHERE initiative_id = ? ORDER BY signer_order",
      )
      .all(initiative.id) as any[];
    expect(signers).toHaveLength(1);
    expect(signers[0].person_id).toBe(1001);
    expect(signers[0].is_first_signer).toBe(1);

    const stages = db
      .query(
        "SELECT stage_order, stage_title, stage_code, event_date, event_title FROM LegislativeInitiativeStage WHERE initiative_id = ? ORDER BY stage_order",
      )
      .all(initiative.id) as any[];
    expect(stages).toHaveLength(1);
    expect(stages[0].stage_title).toBe("Käsittely");
    expect(stages[0].stage_code).toBe("KAS");

    const subjects = db
      .query(
        "SELECT subject_text FROM LegislativeInitiativeSubject WHERE initiative_id = ? ORDER BY subject_text",
      )
      .all(initiative.id) as any[];
    expect(subjects.map((row) => row.subject_text)).toEqual([
      "Joukkoliikenne",
      "Liikenne",
    ]);
  });

  test("skips unsupported identifier and writes migration report", async () => {
    await migrateRow(makeAloiteRow({ eduskuntaTunnus: "KK 1/2024 vp" }));

    const initiatives = db.query("SELECT id FROM LegislativeInitiative").all() as any[];
    expect(initiatives).toHaveLength(0);

    const reportFiles = readdirSync(reportLogDir).filter((f) => f.endsWith(".json"));
    expect(reportFiles.length).toBeGreaterThan(0);
    expect(reportFiles.some((f) => f.includes("invalid_parliament_identifier"))).toBe(true);
  });
});
