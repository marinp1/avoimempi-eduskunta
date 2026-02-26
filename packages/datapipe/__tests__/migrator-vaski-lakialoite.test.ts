import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clearStatementCache } from "../migrator/utils";
import type { VaskiEntry } from "../migrator/VaskiData/reader";
import createSubMigrator from "../migrator/VaskiData/submigrators/lakialoite";
import { createTestDb } from "./helpers/setup-db";

function makeLakialoiteRow(overrides: Partial<VaskiEntry> = {}): VaskiEntry {
  return {
    id: "9001",
    eduskuntaTunnus: "LA 12/2024 vp",
    status: "5",
    created: "2024-04-12 13:00:00",
    attachmentGroupId: "1",
    _source: {
      page: 1,
      parsedKey: "parsed/VaskiData/page_000000000001+000000000100.json",
      vaskiPath: "vaski-data/lakialoite/page_000000000001+000000000100.json",
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
            Lakialoite: {
              IdentifiointiOsa: {
                Nimeke: { NimekeTeksti: "Lakialoite testinimi" },
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
              SaadosOsa: { KappaleKooste: "Lakiteksti" },
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
    id: "9002",
    eduskuntaTunnus: "LA 12/2024 vp",
    status: "5",
    created: "2024-05-01 11:00:00",
    attachmentGroupId: "2",
    _source: {
      page: 2,
      parsedKey: "parsed/VaskiData/page_000000000002+000000000101.json",
      vaskiPath: "vaski-data/lakialoite/page_000000000002+000000000101.json",
    },
    contents: {
      Siirto: {
        SiirtoAsiakirja: {
          RakenneAsiakirja: {
            KasittelytiedotValtiopaivaasia: {
              IdentifiointiOsa: {
                Nimeke: { NimekeTeksti: "Lakialoite testinimi" },
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
                  OtsikkoTeksti: "Ensimmäinen käsittely",
                  "@_yleinenKasittelyvaiheKoodi": "EK",
                  ToimenpideJulkaisu: {
                    "@_tapahtumaPvm": "2024-05-10",
                    ValiotsikkoTeksti: "Lähetettiin valiokuntaan",
                  },
                },
              ],
              Asiasanat: {
                Aihe: [
                  { AiheTeksti: "Valtiontalous", "@_muuTunnus": "yso:p1" },
                  { AiheTeksti: "Verotus", "@_muuTunnus": "yso:p2" },
                ],
              },
              "@_viimeisinKasittelyvaiheKoodi": "EK",
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

describe("Vaski lakialoite submigrator", () => {
  let db: Database;
  let migrateRow: (row: VaskiEntry) => Promise<void>;
  let reportLogDir: string;

  beforeEach(() => {
    clearStatementCache();
    reportLogDir = mkdtempSync(join(tmpdir(), "lakialoite-report-"));
    process.env.MIGRATOR_REPORT_LOG_DIR = reportLogDir;
    db = createTestDb(20);
    migrateRow = createSubMigrator(db).migrateRow;
  });

  afterEach(() => {
    db.close();
    delete process.env.MIGRATOR_REPORT_LOG_DIR;
    rmSync(reportLogDir, { recursive: true, force: true });
  });

  test("merges full content and processing metadata into LegislativeInitiative", async () => {
    db.run(
      "INSERT INTO VaskiDocument (id, document_type, edk_identifier, source_path) VALUES (9001, 'lakialoite', NULL, 'test')",
    );
    db.run(
      "INSERT INTO VaskiDocument (id, document_type, edk_identifier, source_path) VALUES (9002, 'lakialoite', NULL, 'test')",
    );

    await migrateRow(makeLakialoiteRow());
    await migrateRow(makeKasittelyRow());

    const initiative = db
      .query(
        "SELECT id, initiative_type_code, parliament_identifier, title, first_signer_first_name, first_signer_last_name, justification_text, proposal_text, law_text, decision_outcome, latest_stage_code, end_date, vaski_document_id FROM LegislativeInitiative WHERE parliament_identifier = 'LA 12/2024 vp'",
      )
      .get() as any;

    expect(initiative.initiative_type_code).toBe("LA");
    expect(initiative.parliament_identifier).toBe("LA 12/2024 vp");
    expect(initiative.title).toBe("Lakialoite testinimi");
    expect(initiative.first_signer_first_name).toBe("Aino");
    expect(initiative.first_signer_last_name).toBe("Esimerkki");
    expect(initiative.justification_text).toContain("Perusteluteksti");
    expect(initiative.proposal_text).toContain("Ponsiteksti");
    expect(initiative.law_text).toContain("Lakiteksti");
    expect(initiative.decision_outcome).toBe("Hyväksytty");
    expect(initiative.latest_stage_code).toBe("EK");
    expect(initiative.end_date).toBe("2024-06-01");
    expect(initiative.vaski_document_id).toBe(9002);

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
    expect(stages[0].stage_title).toBe("Ensimmäinen käsittely");
    expect(stages[0].stage_code).toBe("EK");
    expect(stages[0].event_date).toBe("2024-05-10");

    const subjects = db
      .query(
        "SELECT subject_text FROM LegislativeInitiativeSubject WHERE initiative_id = ? ORDER BY subject_text",
      )
      .all(initiative.id) as any[];
    expect(subjects.map((row) => row.subject_text)).toEqual([
      "Valtiontalous",
      "Verotus",
    ]);

    const vaskiDoc = db
      .query("SELECT title FROM VaskiDocument WHERE id = 9001")
      .get() as any;
    expect(vaskiDoc.title).toBe("Lakialoite testinimi");
  });

  test("skips unsupported identifier and writes migration report", async () => {
    await migrateRow(makeLakialoiteRow({ eduskuntaTunnus: "HE 1/2024 vp" }));

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
