import type { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { insertRows, parseDateTime } from "../utils";

function withSwedishFallback(
  fiValue: string | null | undefined,
  svValue: string | null | undefined,
): string | null {
  const fi = fiValue?.trim();
  if (fi) return fi;

  const sv = svValue?.trim();
  if (sv) return `[sv] ${sv}`;

  return null;
}

function toSafeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function buildChangeSet(
  previousRow: Record<string, unknown>,
  nextRow: Record<string, unknown>,
): Record<string, { before: unknown; after: unknown }> {
  const changed: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of Object.keys(nextRow)) {
    const before = previousRow[key];
    const after = nextRow[key];
    if (!isEquivalentValue(key, before, after)) {
      changed[key] = { before, after };
    }
  }
  return changed;
}

function asBooleanNumeric(value: unknown): number | null {
  if (value === true) return 1;
  if (value === false) return 0;
  if (value === 1 || value === 0) return value;
  if (value === "1") return 1;
  if (value === "0") return 0;
  return null;
}

function isEquivalentValue(
  key: string,
  before: unknown,
  after: unknown,
): boolean {
  if (before === after) return true;
  if (key === "can_request_speech") {
    const b = asBooleanNumeric(before);
    const a = asBooleanNumeric(after);
    if (b !== null && a !== null && b === a) return true;
  }
  return false;
}

function isBlank(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

function mergeRowPreservingNonEmptyFields(
  previousRow: Record<string, unknown>,
  nextRow: Record<string, unknown>,
): Record<string, unknown> {
  const merged = { ...nextRow };
  for (const key of Object.keys(previousRow)) {
    if (key === "id") continue;
    if (isBlank(merged[key]) && !isBlank(previousRow[key])) {
      merged[key] = previousRow[key];
    }
  }
  return merged;
}

function writeOverwriteLog(
  previousRow: Record<string, unknown>,
  incomingRow: Record<string, unknown>,
  appliedRow: Record<string, unknown>,
) {
  const sessionKey = String(appliedRow.session_key ?? "unknown-session");
  const vaskiId = String(appliedRow.vaski_id ?? "unknown-vaski");
  const oldId = String(previousRow.id ?? "unknown-old-id");
  const newId = String(appliedRow.id ?? "unknown-new-id");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  const baseDir =
    process.env.MIGRATOR_OVERWRITE_LOG_DIR ||
    join(process.cwd(), "data", "migration-overwrites", "SaliDBKohta");
  mkdirSync(baseDir, { recursive: true });

  const fileName = [
    timestamp,
    toSafeFilePart(sessionKey),
    toSafeFilePart(vaskiId),
    `${toSafeFilePart(oldId)}_to_${toSafeFilePart(newId)}`,
  ].join("__");
  const filePath = join(baseDir, `${fileName}.json`);

  const payload = {
    table: "Section",
    unique_key: {
      session_key: appliedRow.session_key,
      vaski_id: appliedRow.vaski_id,
    },
    old_row: previousRow,
    incoming_row: incomingRow,
    new_row: appliedRow,
    changed_fields: buildChangeSet(previousRow, appliedRow),
  };

  writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
}

export default (db: Database) =>
  (dataToImport: RawDataModels["SaliDBKohta"]) => {
    const sessionKey = dataToImport.IstuntoTekninenAvain;
    const vaskiId = +dataToImport.VaskiID;

    const sectionRow: DatabaseTables.Section = {
      id: +dataToImport.Id,
      identifier: dataToImport.Tunniste,
      key: dataToImport.TekninenAvain,
      note: dataToImport.HuomautusFI || null,
      ordinal: +dataToImport.Jarjestysnumero,
      processing_title: dataToImport.KasittelyotsikkoFI || null,
      title: withSwedishFallback(
        dataToImport.OtsikkoFI,
        dataToImport.OtsikkoSV,
      ),
      resolution: dataToImport.PaatosFI || null,
      agenda_key: dataToImport.PJKohtaTunnus,
      session_key: sessionKey,
      vaski_id: vaskiId,
      modified_datetime: parseDateTime(dataToImport.Modified),
      default_speech_type: dataToImport.PuheenvuoroTyyppiOletus || null,
      can_request_speech: !!+dataToImport.VoikoPyytaaPV,
      created_datetime: parseDateTime(dataToImport.Created),
      imported_datetime: parseDateTime(dataToImport.Imported),
    };

    // Revisions for the same agenda item arrive as new rows with new IDs.
    // We keep only the latest row for a (session_key, vaski_id) pair.
    const previousRow = db
      .query(
        "SELECT * FROM Section WHERE session_key = ? AND vaski_id = ? ORDER BY modified_datetime DESC, id DESC LIMIT 1",
      )
      .get(sessionKey, vaskiId) as Record<string, unknown> | undefined;
    if (previousRow) {
      const mergedRow = mergeRowPreservingNonEmptyFields(
        previousRow,
        sectionRow as unknown as Record<string, unknown>,
      ) as DatabaseTables.Section;
      writeOverwriteLog(
        previousRow,
        sectionRow as unknown as Record<string, unknown>,
        mergedRow as unknown as Record<string, unknown>,
      );
      db.run("DELETE FROM Section WHERE session_key = ? AND vaski_id = ?", [
        sessionKey,
        vaskiId,
      ]);
      insertRows(db)("Section", [mergedRow]);
      return;
    }

    insertRows(db)("Section", [sectionRow]);
  };
