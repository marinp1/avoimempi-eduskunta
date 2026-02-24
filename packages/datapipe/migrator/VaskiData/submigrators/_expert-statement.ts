/**
 * Shared submigrator factory for expert statement document types:
 *   - asiantuntijalausunto        (expert statement)
 *   - asiantuntijalausunnon_liite (attachment to expert statement)
 *   - asiantuntijasuunnitelma     (committee expert hearing plan)
 *
 * All three share identical metadata structure: no body XML, only a PDF reference.
 * Expert identity is embedded in the title string only.
 */
import type { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { VaskiEntry } from "../reader";

type ExpertStatementDocumentType =
  | "asiantuntijalausunto"
  | "asiantuntijalausunnon_liite"
  | "asiantuntijasuunnitelma";

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function parseOptionalInteger(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeFinnishDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }
  return dateStr;
}

function toSafeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function writeMigrationReport(
  documentType: string,
  row: VaskiEntry,
  reason: string,
  details: string,
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseDir =
    process.env.MIGRATOR_REPORT_LOG_DIR ||
    join(process.cwd(), "data", "migration-reports", "VaskiData", documentType);
  mkdirSync(baseDir, { recursive: true });

  const id = normalizeText(row.id) || "unknown-id";
  const fileName = [timestamp, toSafeFilePart(reason), toSafeFilePart(id)].join(
    "__",
  );

  writeFileSync(
    join(baseDir, `${fileName}.json`),
    JSON.stringify(
      {
        reason,
        details,
        id: row.id,
        eduskuntaTunnus: row.eduskuntaTunnus,
        source: row._source || null,
      },
      null,
      2,
    ),
    "utf8",
  );
}

export function createExpertStatementSubMigrator(
  db: Database,
  documentType: ExpertStatementDocumentType,
) {
  const insertStatement = db.prepare(
    `INSERT INTO ExpertStatement (id, document_type, edk_identifier, bill_identifier, committee_name, meeting_identifier, meeting_date, title, publicity, language, status, created, source_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(edk_identifier) DO UPDATE SET
       bill_identifier = COALESCE(excluded.bill_identifier, ExpertStatement.bill_identifier),
       committee_name = COALESCE(excluded.committee_name, ExpertStatement.committee_name),
       meeting_identifier = COALESCE(excluded.meeting_identifier, ExpertStatement.meeting_identifier),
       meeting_date = COALESCE(excluded.meeting_date, ExpertStatement.meeting_date),
       title = COALESCE(excluded.title, ExpertStatement.title),
       publicity = COALESCE(excluded.publicity, ExpertStatement.publicity),
       language = COALESCE(excluded.language, ExpertStatement.language),
       source_path = excluded.source_path`,
  );

  return {
    migrateRow(row: VaskiEntry): void {
      const rowDocType = row["#avoimempieduskunta"]?.documentType;
      if (rowDocType !== documentType) return;

      const edkIdentifier = normalizeText(row.eduskuntaTunnus);
      if (!edkIdentifier) {
        writeMigrationReport(
          documentType,
          row,
          "missing_edk_identifier",
          `No eduskuntaTunnus on row id=${row.id}`,
        );
        return;
      }

      const id = parseOptionalInteger(row.id);
      if (id === null) {
        writeMigrationReport(
          documentType,
          row,
          "invalid_id",
          `Could not parse numeric id from '${row.id}'`,
        );
        return;
      }

      const meta =
        row.contents?.Siirto?.SiirtoMetatieto?.JulkaisuMetatieto ||
        row.contents?.Siirto?.SiirtoMetatieto ||
        {};
      const identOsa = (meta as Record<string, any>)?.IdentifiointiOsa || {};
      const kokousViite = (meta as Record<string, any>)?.KokousViite;

      const billIdentifier = normalizeText(
        identOsa.Vireilletulo?.EduskuntaTunnus,
      );
      const committeeName = normalizeText(identOsa.Toimija?.YhteisoTeksti);
      const meetingIdentifier = normalizeText(kokousViite?.["@_kokousTunnus"]);
      const meetingDate =
        normalizeText(kokousViite?.["@_kokousPvm"]) ||
        normalizeText((meta as Record<string, any>)?.["@_laadintaPvm"]) ||
        normalizeFinnishDate(normalizeText(identOsa.LaadintaPvmTeksti));

      const title = normalizeText(identOsa.Nimeke?.NimekeTeksti);
      const publicity = normalizeText(
        (meta as Record<string, any>)?.["@_julkisuusKoodi"],
      );
      const language = normalizeText(
        (meta as Record<string, any>)?.["@_kieliKoodi"],
      );
      const status = parseOptionalInteger(row.status) ?? 5;

      const sourcePath = row._source?.vaskiPath
        ? `${row._source.vaskiPath}#id=${id}`
        : `vaski-data/${documentType}/unknown#id=${id}`;

      try {
        insertStatement.run(
          id,
          documentType,
          edkIdentifier,
          billIdentifier,
          committeeName,
          meetingIdentifier,
          meetingDate,
          title,
          publicity,
          language,
          status,
          normalizeText(row.created),
          sourcePath,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        writeMigrationReport(documentType, row, "insert_error", message);
      }
    },

    flush() {
      insertStatement.finalize();
    },
  };
}
