import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { VaskiEntry } from "../migrator/fn/VaskiData/reader";
import createSubMigrator from "../migrator/fn/VaskiData/submigrators/pöytäkirjan_liite";
import { clearStatementCache } from "../migrator/utils";
import { createTestDb } from "./helpers/setup-db";

function makeLiiteRow(
  metaOverrides: Record<string, unknown> = {},
  rowOverrides: Partial<VaskiEntry> = {},
): VaskiEntry {
  return {
    id: "344763",
    eduskuntaTunnus: "EDK-2026-AK-35124",
    status: "5",
    created: "2026-06-10 15:18:21",
    attachmentGroupId: "1013225",
    "#avoimempieduskunta": {
      documentType: "pöytäkirjan_liite",
    },
    _source: {
      page: 1,
      parsedKey: "parsed/VaskiData/page_000000000001+000000000100.json",
      vaskiPath:
        "vaski-data/pöytäkirjan_liite/page_000000000001+000000000100.json",
    },
    contents: {
      Siirto: {
        SiirtoMetatieto: {
          JulkaisuMetatieto: {
            IdentifiointiOsa: {
              AsiakirjatyyppiNimi: "Pöytäkirjan liite",
              Vireilletulo: { EduskuntaTunnus: "HE 2/2026 vp" },
              LaadintaPvmTeksti: "10.06.2026",
              Nimeke: { NimekeTeksti: "Lausumaehdotukset 9.6.2026" },
            },
            KokousViite: {
              YhteisoTeksti: "Täysistunto",
              "@_kokousPvm": "2026-06-10",
              "@_kokousTunnus": "Täysistunto 63/2026 vp",
            },
            "@_laadintaPvm": "2026-06-10",
            "@_muuTunnus": "EDK-2026-AK-35124",
            ...metaOverrides,
          },
        },
      },
    },
    ...rowOverrides,
  } as VaskiEntry;
}

describe("Vaski pöytäkirjan_liite submigrator", () => {
  let db: Database;
  let migrateRow: (row: VaskiEntry) => void | Promise<void>;
  let reportLogDir: string;

  beforeEach(() => {
    clearStatementCache();
    reportLogDir = mkdtempSync(join(tmpdir(), "poytakirjan-liite-report-"));
    process.env.MIGRATOR_REPORT_LOG_DIR = reportLogDir;
    db = createTestDb(45);
    migrateRow = createSubMigrator(db).migrateRow;
  });

  afterEach(() => {
    db.close();
    delete process.env.MIGRATOR_REPORT_LOG_DIR;
    rmSync(reportLogDir, { recursive: true, force: true });
  });

  test("imports annex metadata into PlenaryAnnex", async () => {
    await migrateRow(makeLiiteRow());

    const annex = db
      .query(
        "SELECT id, edk_identifier, title, source_reference, session_key, meeting_date, draft_date, source_path FROM PlenaryAnnex WHERE id = 344763",
      )
      .get() as any;

    expect(annex).not.toBeNull();
    expect(annex.edk_identifier).toBe("EDK-2026-AK-35124");
    expect(annex.title).toBe("Lausumaehdotukset 9.6.2026");
    expect(annex.source_reference).toBe("HE 2/2026 vp");
    expect(annex.session_key).toBe("2026/63");
    expect(annex.meeting_date).toBe("2026-06-10");
    expect(annex.draft_date).toBe("2026-06-10");
    expect(annex.source_path).toContain("pöytäkirjan_liite");
  });

  test("falls back to row eduskuntaTunnus when @_muuTunnus is missing", async () => {
    await migrateRow(makeLiiteRow({ "@_muuTunnus": undefined }));

    const annex = db
      .query("SELECT edk_identifier FROM PlenaryAnnex WHERE id = 344763")
      .get() as any;
    expect(annex.edk_identifier).toBe("EDK-2026-AK-35124");
  });

  test("stores null session_key and meeting_date when KokousViite is missing", async () => {
    await migrateRow(makeLiiteRow({ KokousViite: undefined }));

    const annex = db
      .query(
        "SELECT session_key, meeting_date, draft_date FROM PlenaryAnnex WHERE id = 344763",
      )
      .get() as any;
    expect(annex.session_key).toBeNull();
    expect(annex.meeting_date).toBeNull();
    expect(annex.draft_date).toBe("2026-06-10");
  });

  test("stores null session_key when kokousTunnus has an unexpected format", async () => {
    await migrateRow(
      makeLiiteRow({
        KokousViite: {
          YhteisoTeksti: "Täysistunto",
          "@_kokousPvm": "2026-06-10",
          "@_kokousTunnus": "jotain muuta",
        },
      }),
    );

    const annex = db
      .query(
        "SELECT session_key, meeting_date FROM PlenaryAnnex WHERE id = 344763",
      )
      .get() as any;
    expect(annex.session_key).toBeNull();
    expect(annex.meeting_date).toBe("2026-06-10");
  });

  test("ignores rows of other document types", async () => {
    await migrateRow(
      makeLiiteRow({}, {
        "#avoimempieduskunta": { documentType: "pöytäkirja" },
      } as Partial<VaskiEntry>),
    );

    const count = db
      .query("SELECT COUNT(*) AS n FROM PlenaryAnnex")
      .get() as any;
    expect(count.n).toBe(0);
  });

  test("skips row with non-numeric id and writes migration report", async () => {
    await migrateRow(makeLiiteRow({}, { id: "ei-numero" }));

    const count = db
      .query("SELECT COUNT(*) AS n FROM PlenaryAnnex")
      .get() as any;
    expect(count.n).toBe(0);

    const reportFiles = readdirSync(reportLogDir).filter((f) =>
      f.endsWith(".json"),
    );
    expect(reportFiles.some((f) => f.includes("invalid_id"))).toBe(true);
  });

  test("re-importing the same row updates in place", async () => {
    await migrateRow(makeLiiteRow());
    await migrateRow(
      makeLiiteRow({
        IdentifiointiOsa: {
          Vireilletulo: { EduskuntaTunnus: "HE 2/2026 vp" },
          Nimeke: { NimekeTeksti: "Lausumaehdotukset 10.6.2026" },
        },
      }),
    );

    const rows = db
      .query("SELECT title FROM PlenaryAnnex WHERE id = 344763")
      .all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Lausumaehdotukset 10.6.2026");
  });
});
