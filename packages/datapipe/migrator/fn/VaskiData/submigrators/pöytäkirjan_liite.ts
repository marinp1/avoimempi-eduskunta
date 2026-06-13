/**
 * Submigrator for pöytäkirjan_liite (plenary session annex) rows.
 *
 * These rows carry no RakenneAsiakirja body — only JulkaisuMetatieto pointing
 * at a PDF attachment (e.g. "Lausumaehdotukset 9.6.2026" handouts voted on in
 * a plenary session). Imported as metadata into PlenaryAnnex; the public PDF
 * URL is derived from edk_identifier at render time.
 */
import type { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { VaskiEntry } from "../reader";

const DOCUMENT_TYPE = "pöytäkirjan_liite";

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
  if (!normalized || !/^\d+$/.test(normalized)) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

/**
 * Normalizes a meeting identifier like "Täysistunto 63/2026 vp" into the
 * Session/Voting session_key format "2026/63" (year first, number second —
 * the order is reversed between the two representations).
 */
function parseSessionKey(kokousTunnus: string | null): string | null {
  if (!kokousTunnus) return null;
  const match = kokousTunnus.match(/(\d+)\/(\d{4})/);
  if (!match) return null;
  return `${match[2]}/${match[1]}`;
}

function toSafeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function writeMigrationReport(
  row: VaskiEntry,
  reason: string,
  details: string,
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseDir =
    process.env.MIGRATOR_REPORT_LOG_DIR ||
    join(
      process.cwd(),
      "data",
      "migration-reports",
      "VaskiData",
      DOCUMENT_TYPE,
    );
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

export default function createSubMigrator(db: Database) {
  const insertAnnex = db.prepare(
    `INSERT INTO PlenaryAnnex (id, edk_identifier, title, source_reference, session_key, meeting_date, draft_date, source_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       edk_identifier = COALESCE(excluded.edk_identifier, PlenaryAnnex.edk_identifier),
       title = COALESCE(excluded.title, PlenaryAnnex.title),
       source_reference = COALESCE(excluded.source_reference, PlenaryAnnex.source_reference),
       session_key = COALESCE(excluded.session_key, PlenaryAnnex.session_key),
       meeting_date = COALESCE(excluded.meeting_date, PlenaryAnnex.meeting_date),
       draft_date = COALESCE(excluded.draft_date, PlenaryAnnex.draft_date),
       source_path = excluded.source_path`,
  );

  return {
    migrateRow(row: VaskiEntry): void {
      const rowDocType = row["#avoimempieduskunta"]?.documentType;
      if (rowDocType !== DOCUMENT_TYPE) return;

      const id = parseOptionalInteger(row.id);
      if (id === null) {
        writeMigrationReport(
          row,
          "invalid_id",
          `Could not parse numeric id from '${row.id}'`,
        );
        return;
      }

      const meta = (row.contents?.Siirto?.SiirtoMetatieto?.JulkaisuMetatieto ||
        {}) as Record<string, any>;
      const identOsa = meta.IdentifiointiOsa || {};
      const kokousViite = meta.KokousViite;

      const edkIdentifier =
        normalizeText(meta["@_muuTunnus"]) ||
        normalizeText(row.eduskuntaTunnus);
      const title = normalizeText(identOsa.Nimeke?.NimekeTeksti);
      const sourceReference = normalizeText(
        identOsa.Vireilletulo?.EduskuntaTunnus,
      );
      const sessionKey = parseSessionKey(
        normalizeText(kokousViite?.["@_kokousTunnus"]),
      );
      const meetingDate = normalizeText(kokousViite?.["@_kokousPvm"]);
      const draftDate = normalizeText(meta["@_laadintaPvm"]);

      const sourcePath = row._source?.vaskiPath
        ? `${row._source.vaskiPath}#id=${id}`
        : `vaski-data/${DOCUMENT_TYPE}/unknown#id=${id}`;

      try {
        insertAnnex.run(
          id,
          edkIdentifier,
          title,
          sourceReference,
          sessionKey,
          meetingDate,
          draftDate,
          sourcePath,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        writeMigrationReport(row, "insert_error", message);
      }
    },
    flush(): void {
      insertAnnex.finalize();
    },
  };
}
