import type { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { VaskiEntry } from "../reader";

type RollCallEntryType = DatabaseTables.RollCallEntry["entry_type"];
type MigrationIssueLevel = "warning" | "error";

type RollCallMigrationIssue = {
  level: MigrationIssueLevel;
  code: string;
  context: string;
  note: string | null;
  details: string;
};

function toSafeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function isBlank(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && value.trim() === "")
  );
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function parseOptionalInteger(
  value: unknown,
  fieldName: string,
  context: string,
): number | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(
      `Invalid integer in ${fieldName}: '${normalized}' (${context})`,
    );
  }
  return parsed;
}

function parseRequiredInteger(
  value: unknown,
  fieldName: string,
  context: string,
): number {
  const parsed = parseOptionalInteger(value, fieldName, context);
  if (parsed === null) {
    throw new Error(`Missing required integer in ${fieldName} (${context})`);
  }
  return parsed;
}

function parseMeta(row: VaskiEntry): Record<string, any> {
  const siirto = row.contents?.Siirto as VaskiEntry["contents"]["Siirto"] & {
    JulkaisuMetatieto?: Record<string, any>;
  };
  return (
    siirto?.SiirtoMetatieto?.JulkaisuMetatieto ||
    siirto?.JulkaisuMetatieto ||
    siirto?.SiirtoMetatieto ||
    {}
  );
}

function parseRollCallBody(row: VaskiEntry): Record<string, any> {
  const body =
    row.contents?.Siirto?.SiirtoAsiakirja?.RakenneAsiakirja?.PoytakirjaLiite;
  if (!body || typeof body !== "object") {
    throw new Error(`Roll call body missing for row id=${row.id}`);
  }
  return body;
}

function parsePartyAndNote(
  partySlot: unknown,
  noteSlot: unknown,
  context: string,
): { party: string | null; note: string | null } {
  let party = normalizeText(partySlot);
  let note = normalizeText(noteSlot);

  if (party) {
    const bracketInParty = party.match(/^(.*?)\s*\(([^()]*)\)\s*$/);
    if (bracketInParty) {
      if (note) {
        throw new Error(
          `Conflicting note in party and note slots (${context})`,
        );
      }
      const prefix = bracketInParty[1].trim();
      const suffix = bracketInParty[2].trim();
      note = `(${suffix})`;
      party = prefix === "" ? null : prefix;
    }
  }

  if (party && /[()]/.test(party)) {
    throw new Error(
      `Unexpected bracket content in party value '${party}' (${context})`,
    );
  }

  if (party) {
    party = party.toLowerCase();
    if (!/^[a-zåäö]{1,16}$/i.test(party)) {
      throw new Error(`Invalid party value '${party}' (${context})`);
    }
  }

  return { party, note };
}

function parseMarker(
  note: string | null,
  entryType: RollCallEntryType,
  context: string,
): {
  absenceReason: string | null;
  arrivalTime: string | null;
  issue?: RollCallMigrationIssue;
} {
  if (!note) return { absenceReason: null, arrivalTime: null };

  const reasonMatch = note.match(/^\(([a-zA-Z])\)$/);
  if (reasonMatch) {
    const reasonCode = reasonMatch[1].toLowerCase();
    if (!["e", "s", "p", "h"].includes(reasonCode)) {
      throw new Error(`Unsupported absence reason '${note}' (${context})`);
    }
    if (entryType === "late") {
      return {
        absenceReason: reasonCode,
        arrivalTime: null,
        issue: {
          level: "warning",
          code: "late_entry_with_absence_reason",
          context,
          note,
          details: `Late entry had absence reason marker '${note}'`,
        },
      };
    }
    return { absenceReason: reasonCode, arrivalTime: null };
  }

  const reasonWithSuffixMatch = note.match(/^\(([a-zA-Z])\)(.+)$/);
  if (reasonWithSuffixMatch) {
    const reasonCode = reasonWithSuffixMatch[1].toLowerCase();
    const suffix = reasonWithSuffixMatch[2].trim();
    if (!["e", "s", "p", "h"].includes(reasonCode)) {
      throw new Error(`Unsupported absence reason '${note}' (${context})`);
    }

    if (entryType === "late") {
      return {
        absenceReason: reasonCode,
        arrivalTime: null,
        issue: {
          level: "warning",
          code: "late_entry_with_absence_reason_suffix",
          context,
          note,
          details: `Late entry marker '${note}' contains reason code '${reasonCode}' and suffix '${suffix}'`,
        },
      };
    }

    return {
      absenceReason: reasonCode,
      arrivalTime: null,
      issue: {
        level: "warning",
        code: "absence_reason_with_suffix",
        context,
        note,
        details: `Parsed absence reason '${reasonCode}' from marker with suffix '${suffix}'`,
      },
    };
  }

  const timeMatch = note.match(/^\((\d{1,2})[:.](\d{2})\)$/);
  if (timeMatch) {
    const hh = timeMatch[1].padStart(2, "0");
    const mm = timeMatch[2];
    if (entryType === "absent") {
      return {
        absenceReason: null,
        arrivalTime: `${hh}:${mm}`,
        issue: {
          level: "warning",
          code: "absent_entry_with_arrival_time",
          context,
          note,
          details: `Absent entry had arrival time marker '${note}'`,
        },
      };
    }
    return { absenceReason: null, arrivalTime: `${hh}:${mm}` };
  }

  return {
    absenceReason: null,
    arrivalTime: null,
    issue: {
      level: "warning",
      code: "unrecognized_note_format",
      context,
      note,
      details: `Unrecognized note format '${note}'`,
    },
  };
}

function buildRollCallEntries(
  row: VaskiEntry,
  rollCallId: number,
  issues: RollCallMigrationIssue[],
): DatabaseTables.RollCallEntry[] {
  const body = parseRollCallBody(row);
  const osallistujaOsa = body?.MuuAsiakohta?.KohtaSisalto?.OsallistujaOsa;

  const parts = Array.isArray(osallistujaOsa)
    ? osallistujaOsa
    : osallistujaOsa
      ? [osallistujaOsa]
      : [];

  if (parts.length > 2) {
    throw new Error(
      `Unexpected participant group count (${parts.length}) for row id=${row.id}`,
    );
  }

  const entries: DatabaseTables.RollCallEntry[] = [];

  for (let groupIndex = 0; groupIndex < parts.length; groupIndex++) {
    const entryType: RollCallEntryType = groupIndex === 0 ? "absent" : "late";
    const toimija = parts[groupIndex]?.Toimija;
    const participants = Array.isArray(toimija)
      ? toimija
      : toimija
        ? [toimija]
        : [];

    for (const participant of participants) {
      const person = participant?.Henkilo;
      if (!person || typeof person !== "object") {
        throw new Error(
          `Participant missing Henkilo object for row id=${row.id}, group=${groupIndex}`,
        );
      }

      const firstName = normalizeText(person.EtuNimi);
      const lastName = normalizeText(person.SukuNimi);
      if (!firstName || !lastName) {
        throw new Error(
          `Participant missing first/last name for row id=${row.id}, group=${groupIndex}`,
        );
      }

      const lisatieto = Array.isArray(person.LisatietoTeksti)
        ? person.LisatietoTeksti
        : person.LisatietoTeksti
          ? [person.LisatietoTeksti]
          : [];

      const context = `row id=${row.id}, person=${firstName} ${lastName}, type=${entryType}`;
      const { party, note } = parsePartyAndNote(
        lisatieto[0],
        lisatieto[1],
        context,
      );
      const { absenceReason, arrivalTime, issue } = parseMarker(
        note,
        entryType,
        context,
      );
      if (issue) {
        issues.push(issue);
      }

      entries.push({
        roll_call_id: rollCallId,
        entry_order: entries.length + 1,
        person_id: parseOptionalInteger(
          person["@_muuTunnus"],
          "person_id",
          context,
        ),
        first_name: firstName,
        last_name: lastName,
        party,
        entry_type: entryType,
        absence_reason: absenceReason,
        arrival_time: arrivalTime,
      });
    }
  }

  return entries;
}

function buildRollCallReport(row: VaskiEntry): DatabaseTables.RollCallReport {
  const context = `row id=${row.id}`;
  const rollCallId = parseRequiredInteger(row.id, "id", context);
  const meta = parseMeta(row);
  const body = parseRollCallBody(row);

  const parliamentIdentifier = normalizeText(row.eduskuntaTunnus);
  if (!parliamentIdentifier) {
    throw new Error(`Missing parliament_identifier (${context})`);
  }

  const sessionDate = normalizeText(
    meta?.["@_laadintaPvm"] || meta?.KokousViite?.["@_kokousPvm"],
  );
  if (!sessionDate) {
    throw new Error(`Missing session_date (${context})`);
  }

  const title =
    normalizeText(body?.IdentifiointiOsa?.Nimeke?.NimekeTeksti) ||
    normalizeText(meta?.IdentifiointiOsa?.Nimeke?.NimekeTeksti);

  const edkIdentifier = normalizeText(meta?.["@_muuTunnus"]);
  if (!edkIdentifier) {
    throw new Error(`Missing edk_identifier (${context})`);
  }

  const sourcePath = row._source?.vaskiPath
    ? `${row._source.vaskiPath}#id=${rollCallId}`
    : `vaski-data/nimenhuutoraportti/unknown#id=${rollCallId}`;

  return {
    id: rollCallId,
    parliament_identifier: parliamentIdentifier,
    session_date: sessionDate,
    roll_call_start_time: normalizeText(body?.["@_kokousAloitusHetki"]),
    roll_call_end_time: normalizeText(body?.["@_kokousLopetusHetki"]),
    title,
    status: normalizeText(row.status),
    created_at: normalizeText(row.created),
    edk_identifier: edkIdentifier,
    source_path: sourcePath,
    attachment_group_id: parseOptionalInteger(
      row.attachmentGroupId,
      "attachment_group_id",
      context,
    ),
  };
}

function mergeReportPreservingNonEmptyFields(
  previousRow: Record<string, unknown>,
  incomingRow: DatabaseTables.RollCallReport,
): DatabaseTables.RollCallReport {
  const merged = { ...incomingRow } as Record<string, unknown>;
  for (const key of Object.keys(previousRow)) {
    if (key === "id" || key === "edk_identifier") continue;
    if (isBlank(merged[key]) && !isBlank(previousRow[key])) {
      merged[key] = previousRow[key];
    }
  }
  return merged as DatabaseTables.RollCallReport;
}

function buildChangeSet(
  previousRow: Record<string, unknown>,
  nextRow: Record<string, unknown>,
): Record<string, { before: unknown; after: unknown }> {
  const changed: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of Object.keys(nextRow)) {
    if (previousRow[key] !== nextRow[key]) {
      changed[key] = { before: previousRow[key], after: nextRow[key] };
    }
  }
  return changed;
}

function writeOverwriteLog(
  previousRow: Record<string, unknown>,
  previousEntries: DatabaseTables.RollCallEntry[],
  incomingRow: DatabaseTables.RollCallReport,
  incomingEntries: DatabaseTables.RollCallEntry[],
  appliedRow: DatabaseTables.RollCallReport,
  appliedEntries: DatabaseTables.RollCallEntry[],
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseDir =
    process.env.MIGRATOR_OVERWRITE_LOG_DIR ||
    join(
      process.cwd(),
      "data",
      "migration-overwrites",
      "VaskiData",
      "nimenhuutoraportti",
    );
  mkdirSync(baseDir, { recursive: true });

  const fileName = [
    timestamp,
    toSafeFilePart(String(appliedRow.edk_identifier)),
    `old_${toSafeFilePart(String(previousRow.id ?? "unknown"))}`,
    `new_${toSafeFilePart(String(appliedRow.id))}`,
  ].join("__");

  const payload = {
    table: "RollCallReport",
    unique_key: {
      edk_identifier: appliedRow.edk_identifier,
    },
    old_row: previousRow,
    old_entries: previousEntries,
    incoming_row: incomingRow,
    incoming_entries: incomingEntries,
    new_row: appliedRow,
    new_entries: appliedEntries,
    changed_fields: buildChangeSet(
      previousRow,
      appliedRow as unknown as Record<string, unknown>,
    ),
  };

  writeFileSync(
    join(baseDir, `${fileName}.json`),
    JSON.stringify(payload, null, 2),
    "utf8",
  );
}

function writeKnownIssue(row: VaskiEntry, reason: string, details?: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseDir =
    process.env.MIGRATOR_KNOWN_ISSUE_LOG_DIR ||
    join(
      process.cwd(),
      "data",
      "migration-known-issues",
      "VaskiData",
      "nimenhuutoraportti",
    );
  mkdirSync(baseDir, { recursive: true });

  const id = normalizeText(row.id) || "unknown-id";
  const fileName = [timestamp, toSafeFilePart(reason), toSafeFilePart(id)].join(
    "__",
  );

  const payload = {
    reason,
    details: details || null,
    id: row.id,
    eduskuntaTunnus: row.eduskuntaTunnus,
    created: row.created,
    source: row._source || null,
  };

  writeFileSync(
    join(baseDir, `${fileName}.json`),
    JSON.stringify(payload, null, 2),
    "utf8",
  );
}

function writeMigrationReport(
  row: VaskiEntry,
  reason: string,
  details: string,
  issues: RollCallMigrationIssue[] = [],
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseDir =
    process.env.MIGRATOR_REPORT_LOG_DIR ||
    join(
      process.cwd(),
      "data",
      "migration-reports",
      "VaskiData",
      "nimenhuutoraportti",
    );
  mkdirSync(baseDir, { recursive: true });

  const id = normalizeText(row.id) || "unknown-id";
  const fileName = [timestamp, toSafeFilePart(reason), toSafeFilePart(id)].join(
    "__",
  );

  const payload = {
    reason,
    details,
    id: row.id,
    eduskuntaTunnus: row.eduskuntaTunnus,
    created: row.created,
    source: row._source || null,
    issue_count: issues.length,
    issues,
  };

  writeFileSync(
    join(baseDir, `${fileName}.json`),
    JSON.stringify(payload, null, 2),
    "utf8",
  );
}

export default function createNimenhuutoraporttiSubMigrator(db: Database) {
  const insertReport = db.prepare(
    "INSERT INTO RollCallReport (id, parliament_identifier, session_date, roll_call_start_time, roll_call_end_time, title, status, created_at, edk_identifier, source_path, attachment_group_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const insertEntry = db.prepare(
    "INSERT INTO RollCallEntry (roll_call_id, entry_order, person_id, first_name, last_name, party, entry_type, absence_reason, arrival_time) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );

  const insertEntries = (
    rollCallId: number,
    entries: Array<
      Pick<
        DatabaseTables.RollCallEntry,
        | "entry_order"
        | "person_id"
        | "first_name"
        | "last_name"
        | "party"
        | "entry_type"
        | "absence_reason"
        | "arrival_time"
      >
    >,
  ) => {
    for (const entry of entries) {
      insertEntry.run(
        rollCallId,
        entry.entry_order,
        entry.person_id,
        entry.first_name,
        entry.last_name,
        entry.party,
        entry.entry_type,
        entry.absence_reason,
        entry.arrival_time,
      );
    }
  };

  return {
    async migrateRow(row: VaskiEntry): Promise<void> {
      const meta = parseMeta(row);
      const edkIdentifier = normalizeText(meta?.["@_muuTunnus"]);
      if (!edkIdentifier) {
        writeKnownIssue(
          row,
          "missing_edk_identifier",
          "Skipped row because RollCallReport.edk_identifier is mandatory",
        );
        return;
      }

      let incomingReport: DatabaseTables.RollCallReport;
      let incomingEntries: DatabaseTables.RollCallEntry[];
      const issues: RollCallMigrationIssue[] = [];

      try {
        incomingReport = buildRollCallReport(row);
        incomingEntries = buildRollCallEntries(row, incomingReport.id, issues);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        writeMigrationReport(row, "parse_error_row_skipped", message, [
          {
            level: "error",
            code: "parse_error",
            context: `row id=${row.id}`,
            note: null,
            details: message,
          },
        ]);
        return;
      }

      if (issues.length > 0) {
        writeMigrationReport(
          row,
          "parsed_with_warnings",
          `Row parsed with ${issues.length} warning(s)`,
          issues,
        );
      }

      const previousReport = db
        .query("SELECT * FROM RollCallReport WHERE edk_identifier = ? LIMIT 1")
        .get(edkIdentifier) as DatabaseTables.RollCallReport | undefined;

      if (!previousReport) {
        db.run("DELETE FROM RollCallEntry WHERE roll_call_id = ?", [
          incomingReport.id,
        ]);
        db.run("DELETE FROM RollCallReport WHERE id = ?", [incomingReport.id]);
        insertReport.run(
          incomingReport.id,
          incomingReport.parliament_identifier,
          incomingReport.session_date,
          incomingReport.roll_call_start_time,
          incomingReport.roll_call_end_time,
          incomingReport.title,
          incomingReport.status,
          incomingReport.created_at,
          incomingReport.edk_identifier,
          incomingReport.source_path,
          incomingReport.attachment_group_id,
        );
        insertEntries(incomingReport.id, incomingEntries);
        return;
      }

      const previousEntries = db
        .query(
          "SELECT * FROM RollCallEntry WHERE roll_call_id = ? ORDER BY entry_order",
        )
        .all(previousReport.id) as DatabaseTables.RollCallEntry[];

      const mergedReport = mergeReportPreservingNonEmptyFields(
        previousReport,
        incomingReport,
      );

      const appliedEntries =
        incomingEntries.length > 0
          ? incomingEntries
          : previousEntries.map((entry, index) => ({
              ...entry,
              roll_call_id: mergedReport.id,
              entry_order: index + 1,
            }));

      writeOverwriteLog(
        previousReport,
        previousEntries,
        incomingReport,
        incomingEntries,
        mergedReport,
        appliedEntries,
      );

      db.run("DELETE FROM RollCallEntry WHERE roll_call_id = ?", [
        previousReport.id,
      ]);
      db.run("DELETE FROM RollCallReport WHERE id = ?", [previousReport.id]);
      db.run("DELETE FROM RollCallEntry WHERE roll_call_id = ?", [
        mergedReport.id,
      ]);
      db.run("DELETE FROM RollCallReport WHERE id = ?", [mergedReport.id]);

      insertReport.run(
        mergedReport.id,
        mergedReport.parliament_identifier,
        mergedReport.session_date,
        mergedReport.roll_call_start_time,
        mergedReport.roll_call_end_time,
        mergedReport.title,
        mergedReport.status,
        mergedReport.created_at,
        mergedReport.edk_identifier,
        mergedReport.source_path,
        mergedReport.attachment_group_id,
      );
      insertEntries(mergedReport.id, appliedEntries);
    },
  };
}
