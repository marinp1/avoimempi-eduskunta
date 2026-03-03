import type { Database } from "bun:sqlite";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { VaskiEntry } from "../migrator/fn/VaskiData/reader";
import createSubMigrator from "../migrator/fn/VaskiData/submigrators/nimenhuutoraportti";
import { clearStatementCache } from "../migrator/utils";
import { createTestDb } from "./helpers/setup-db";

function makeParticipant(
  personId: string,
  firstName: string,
  lastName: string,
  party: string,
  note: string,
) {
  return {
    Henkilo: {
      EtuNimi: firstName,
      SukuNimi: lastName,
      LisatietoTeksti: [party, note],
      "@_muuTunnus": personId,
    },
    "@_rooliKoodi": "jäsen",
  };
}

function makeRow(
  overrides: Partial<VaskiEntry> & {
    edkIdentifier?: string | null;
    startTime?: string | null;
    endTime?: string | null;
    absentParticipants?: any[];
    lateParticipants?: any[];
  } = {},
): VaskiEntry {
  const edkIdentifier =
    overrides.edkIdentifier === undefined
      ? "EDK-TEST-AK-0001"
      : overrides.edkIdentifier;
  const startTime =
    overrides.startTime === undefined
      ? "2024-01-01T14:00:00"
      : overrides.startTime;
  const endTime =
    overrides.endTime === undefined ? "2024-01-01T14:30:00" : overrides.endTime;
  const absentParticipants = overrides.absentParticipants ?? [
    makeParticipant("1001", "Aino", "Esimerkki", "sd", "(e)"),
    makeParticipant("1002", "Matti", "Mallinen", "kok", ""),
  ];
  const lateParticipants = overrides.lateParticipants ?? [
    makeParticipant("1003", "Liisa", "Viive", "vihr", "(14.17)"),
  ];

  const body: Record<string, any> = {
    IdentifiointiOsa: {
      Nimeke: {
        NimekeTeksti: "Nimenhuutoraportti maanantai 1.1.2024 klo 14.00",
      },
    },
    MuuAsiakohta: {
      KohtaSisalto: {
        OsallistujaOsa: [
          { Toimija: absentParticipants },
          { Toimija: lateParticipants },
        ],
      },
    },
  };

  if (startTime !== null) body["@_kokousAloitusHetki"] = startTime;
  if (endTime !== null) body["@_kokousLopetusHetki"] = endTime;

  const metadata: Record<string, any> = {
    "@_laadintaPvm": "2024-01-01",
    IdentifiointiOsa: {
      Nimeke: {
        NimekeTeksti: "Nimenhuutoraportti maanantai 1.1.2024 klo 14.00",
      },
    },
  };
  if (edkIdentifier !== null) {
    metadata["@_muuTunnus"] = edkIdentifier;
  }

  return {
    id: "9001",
    eduskuntaTunnus: "PTK 1/2024 vp",
    status: "5",
    created: "2024-01-01 13:59:00",
    attachmentGroupId: "555",
    _source: {
      page: 1,
      parsedKey: "parsed/VaskiData/page_000000000001+000000000100.json",
      vaskiPath:
        "vaski-data/nimenhuutoraportti/page_000000000001+000000000100.json",
    },
    contents: {
      Siirto: {
        SiirtoMetatieto: {
          JulkaisuMetatieto: metadata,
        },
        SiirtoAsiakirja: {
          RakenneAsiakirja: {
            PoytakirjaLiite: body,
          },
        },
      },
    },
    ...overrides,
  };
}

describe("Vaski nimenhuutoraportti submigrator", () => {
  let db: Database;
  let migrateRow: (row: VaskiEntry) => Promise<void>;
  let overwriteLogDir: string;
  let knownIssueLogDir: string;
  let reportLogDir: string;

  beforeEach(() => {
    clearStatementCache();
    overwriteLogDir = mkdtempSync(join(tmpdir(), "rollcall-overwrite-"));
    knownIssueLogDir = mkdtempSync(join(tmpdir(), "rollcall-known-issue-"));
    reportLogDir = mkdtempSync(join(tmpdir(), "rollcall-report-"));
    process.env.MIGRATOR_OVERWRITE_LOG_DIR = overwriteLogDir;
    process.env.MIGRATOR_KNOWN_ISSUE_LOG_DIR = knownIssueLogDir;
    process.env.MIGRATOR_REPORT_LOG_DIR = reportLogDir;
    db = createTestDb();
    migrateRow = createSubMigrator(db).migrateRow;
  });

  afterEach(() => {
    db.close();
    delete process.env.MIGRATOR_OVERWRITE_LOG_DIR;
    delete process.env.MIGRATOR_KNOWN_ISSUE_LOG_DIR;
    delete process.env.MIGRATOR_REPORT_LOG_DIR;
    rmSync(overwriteLogDir, { recursive: true, force: true });
    rmSync(knownIssueLogDir, { recursive: true, force: true });
    rmSync(reportLogDir, { recursive: true, force: true });
  });

  test("inserts roll call report and entries", async () => {
    await migrateRow(makeRow());

    const report = db.query("SELECT * FROM RollCallReport").get() as any;
    expect(report.id).toBe(9001);
    expect(report.edk_identifier).toBe("EDK-TEST-AK-0001");
    expect(report.parliament_identifier).toBe("PTK 1/2024 vp");
    expect(report.roll_call_start_time).toBe("2024-01-01T14:00:00");
    expect(report.roll_call_end_time).toBe("2024-01-01T14:30:00");
    expect(report.source_path).toContain(
      "vaski-data/nimenhuutoraportti/page_000000000001+000000000100.json",
    );

    const entries = db
      .query("SELECT * FROM RollCallEntry ORDER BY entry_order")
      .all() as any[];
    expect(entries).toHaveLength(3);
    expect(entries[0].roll_call_id).toBe(9001);
    expect(entries[0].entry_type).toBe("absent");
    expect(entries[0].absence_reason).toBe("e");
    expect(entries[0].arrival_time).toBeNull();
    expect(entries[2].entry_type).toBe("late");
    expect(entries[2].arrival_time).toBe("14:17");
    expect(entries[2].absence_reason).toBeNull();
  });

  test("overwrites duplicate by edk_identifier and preserves existing non-empty fields", async () => {
    await migrateRow(
      makeRow({
        id: "9001",
        startTime: "2024-01-01T14:00:00",
        endTime: "2024-01-01T14:30:00",
      }),
    );
    await migrateRow(
      makeRow({
        id: "9002",
        startTime: null,
        endTime: null,
      }),
    );

    const reports = db.query("SELECT * FROM RollCallReport").all() as any[];
    expect(reports).toHaveLength(1);
    expect(reports[0].id).toBe(9002);
    expect(reports[0].edk_identifier).toBe("EDK-TEST-AK-0001");
    expect(reports[0].roll_call_start_time).toBe("2024-01-01T14:00:00");
    expect(reports[0].roll_call_end_time).toBe("2024-01-01T14:30:00");

    const entries = db.query("SELECT * FROM RollCallEntry").all() as any[];
    expect(entries).toHaveLength(3);
    expect(entries.every((entry) => entry.roll_call_id === 9002)).toBe(true);

    const logFiles = readdirSync(overwriteLogDir).filter((f) =>
      f.endsWith(".json"),
    );
    expect(logFiles.length).toBe(1);
  });

  test("skips row with missing edk_identifier and records known issue", async () => {
    await migrateRow(
      makeRow({
        id: "9100",
        edkIdentifier: null,
      }),
    );

    const reports = db.query("SELECT * FROM RollCallReport").all();
    expect(reports).toHaveLength(0);

    const issueFiles = readdirSync(knownIssueLogDir).filter((f) =>
      f.endsWith(".json"),
    );
    expect(issueFiles.length).toBe(1);
  });

  test("parses malformed note marker and logs warning report", async () => {
    await migrateRow(
      makeRow({
        absentParticipants: [
          makeParticipant("1001", "Aino", "Esimerkki", "sd", "(s)zf"),
        ],
        lateParticipants: [],
      }),
    );

    const entry = db.query("SELECT * FROM RollCallEntry LIMIT 1").get() as any;
    expect(entry.absence_reason).toBe("s");
    expect(entry.arrival_time).toBeNull();

    const reportFiles = readdirSync(reportLogDir).filter((f) =>
      f.endsWith(".json"),
    );
    expect(reportFiles.length).toBe(1);
    expect(reportFiles[0]).toContain("parsed_with_warnings");
  });

  test("skips row and writes migration report on parse error", async () => {
    await migrateRow(
      makeRow({
        absentParticipants: [
          makeParticipant("1001", "Aino", "Esimerkki", "sd(", "(s)"),
        ],
        lateParticipants: [],
      }),
    );

    const reports = db.query("SELECT * FROM RollCallReport").all() as any[];
    expect(reports).toHaveLength(0);

    const reportFiles = readdirSync(reportLogDir).filter((f) =>
      f.endsWith(".json"),
    );
    expect(reportFiles.length).toBe(1);
    expect(reportFiles[0]).toContain("parse_error_row_skipped");
  });
});
