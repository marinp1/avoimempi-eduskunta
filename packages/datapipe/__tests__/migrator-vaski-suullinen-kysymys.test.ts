import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import createSubMigrator from "../migrator/VaskiData/submigrators/suullinen_kysymys";
import { clearStatementCache } from "../migrator/utils";
import type { VaskiEntry } from "../migrator/VaskiData/reader";
import { createTestDb } from "./helpers/setup-db";

function makeRow(overrides: Partial<VaskiEntry> = {}): VaskiEntry {
  return {
    id: "9501",
    eduskuntaTunnus: "SKT 15/2024 vp",
    status: "5",
    created: "2024-03-01 10:00:00",
    attachmentGroupId: "2",
    _source: {
      page: 20,
      parsedKey: "parsed/VaskiData/page_20.json",
      vaskiPath: "vaski-data/suullinen_kysymys/page_20.json",
    },
    contents: {
      Siirto: {
        SiirtoAsiakirja: {
          RakenneAsiakirja: {
            KasittelytiedotValtiopaivaasia: {
              IdentifiointiOsa: {
                Nimeke: {
                  NimekeTeksti: "Suullinen kysymys sähkömarkkinasta (Aino Esimerkki sd)",
                },
              },
              EduskuntakasittelyPaatosKuvaus: {
                EduskuntakasittelyPaatosNimi: "Vastattu",
                "@_eduskuntakasittelyPaatosKoodi": "replied",
              },
              YleinenKasittelyvaihe: [
                {
                  OtsikkoTeksti: "Käsittely täysistunnossa",
                  "@_yleinenKasittelyvaiheKoodi": "KAS",
                  ToimenpideJulkaisu: {
                    "@_tapahtumaPvm": "2024-03-05",
                    ValiotsikkoTeksti: "Keskustelu käytiin",
                  },
                },
              ],
              Asiasanat: {
                Aihe: [
                  { AiheTeksti: "Energia", "@_muuTunnus": "yso:p123" },
                ],
              },
              "@_viimeisinKasittelyvaiheKoodi": "KAS",
              "@_paattymisPvm": "2024-03-05",
              "@_laadintaPvm": "2024-03-01",
            },
          },
        },
      },
    },
    ...overrides,
  };
}

describe("Vaski suullinen_kysymys submigrator", () => {
  let db: Database;
  let migrateRow: (row: VaskiEntry) => Promise<void>;
  let reportLogDir: string;

  beforeEach(() => {
    clearStatementCache();
    reportLogDir = mkdtempSync(join(tmpdir(), "suullinen-kysymys-report-"));
    process.env.MIGRATOR_REPORT_LOG_DIR = reportLogDir;
    db = createTestDb(17);
    migrateRow = createSubMigrator(db).migrateRow;
  });

  afterEach(() => {
    db.close();
    delete process.env.MIGRATOR_REPORT_LOG_DIR;
    rmSync(reportLogDir, { recursive: true, force: true });
  });

  test("inserts oral question with stages and subjects", async () => {
    db.run(
      "INSERT INTO VaskiDocument (id, document_type, edk_identifier, source_path) VALUES (9501, 'suullinen_kysymys', NULL, 'test')",
    );

    await migrateRow(makeRow());

    const question = db
      .query(
        "SELECT id, parliament_identifier, title, question_text, asker_text, decision_outcome, latest_stage_code, end_date, vaski_document_id FROM OralQuestion WHERE id = 9501",
      )
      .get() as any;

    expect(question.parliament_identifier).toBe("SKT 15/2024 vp");
    expect(question.title).toBe("Suullinen kysymys sähkömarkkinasta (Aino Esimerkki sd)");
    expect(question.question_text).toBe("sähkömarkkinasta");
    expect(question.asker_text).toBe("Aino Esimerkki sd");
    expect(question.decision_outcome).toBe("Vastattu");
    expect(question.latest_stage_code).toBe("KAS");
    expect(question.end_date).toBe("2024-03-05");
    expect(question.vaski_document_id).toBe(9501);

    const stages = db
      .query(
        "SELECT stage_order, stage_title, stage_code, event_date, event_title FROM OralQuestionStage WHERE question_id = 9501 ORDER BY stage_order",
      )
      .all() as any[];
    expect(stages).toHaveLength(1);
    expect(stages[0].stage_title).toBe("Käsittely täysistunnossa");
    expect(stages[0].event_title).toBe("Keskustelu käytiin");

    const subjects = db
      .query("SELECT subject_text, yso_uri FROM OralQuestionSubject WHERE question_id = 9501")
      .all() as any[];
    expect(subjects).toHaveLength(1);
    expect(subjects[0].subject_text).toBe("Energia");
    expect(subjects[0].yso_uri).toBe("yso:p123");
  });

  test("skips unsupported identifier and writes migration report", async () => {
    await migrateRow(makeRow({ eduskuntaTunnus: "EDK-2016-001482" }));

    const questions = db.query("SELECT id FROM OralQuestion").all() as any[];
    expect(questions).toHaveLength(0);

    const reportFiles = readdirSync(reportLogDir).filter((f) => f.endsWith(".json"));
    expect(reportFiles.length).toBeGreaterThan(0);
    expect(reportFiles.some((f) => f.includes("invalid_parliament_identifier"))).toBe(true);
  });
});
