import type { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { VaskiEntry } from "../reader";

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function normalizeArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
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
      "vastaus_kirjalliseen_kysymykseen",
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
  };

  writeFileSync(
    join(baseDir, `${fileName}.json`),
    JSON.stringify(payload, null, 2),
    "utf8",
  );
}

function getMeta(row: VaskiEntry): Record<string, any> {
  return (
    row.contents?.Siirto?.SiirtoMetatieto?.JulkaisuMetatieto ||
    row.contents?.Siirto?.SiirtoMetatieto ||
    {}
  );
}

function parseKKVIdentifier(eduskuntaTunnus: string): {
  identifier: string;
  number: number;
  year: string;
} | null {
  const match = eduskuntaTunnus.match(/^KKV\s+(\d+)\/(\d+)\s*(?:vp)?$/i);
  if (!match) return null;
  const number = Number.parseInt(match[1], 10);
  if (Number.isNaN(number)) return null;
  return {
    identifier: `KKV ${number}/${match[2]} vp`,
    number,
    year: match[2],
  };
}

function normalizeFinnishDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const match = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (match) {
    return `${match[3]}-${match[2].padStart(2, "0")}-${match[1].padStart(2, "0")}`;
  }
  return dateStr;
}

export default function createVastausKirjallinenKysymysSubMigrator(
  db: Database,
) {
  const lookupQuestion = db.prepare(
    "SELECT id FROM WrittenQuestion WHERE parliament_identifier = ? LIMIT 1",
  );

  const insertResponse = db.prepare(
    `INSERT INTO WrittenQuestionResponse (id, question_id, parliament_identifier, document_number, parliamentary_year, title, answer_date, minister_title, minister_first_name, minister_last_name, vaski_guid, edk_identifier, status, created, source_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(parliament_identifier) DO UPDATE SET
       question_id = COALESCE(excluded.question_id, WrittenQuestionResponse.question_id),
       title = COALESCE(excluded.title, WrittenQuestionResponse.title),
       answer_date = COALESCE(excluded.answer_date, WrittenQuestionResponse.answer_date),
       minister_title = COALESCE(excluded.minister_title, WrittenQuestionResponse.minister_title),
       minister_first_name = COALESCE(excluded.minister_first_name, WrittenQuestionResponse.minister_first_name),
       minister_last_name = COALESCE(excluded.minister_last_name, WrittenQuestionResponse.minister_last_name),
       vaski_guid = COALESCE(excluded.vaski_guid, WrittenQuestionResponse.vaski_guid),
       edk_identifier = COALESCE(excluded.edk_identifier, WrittenQuestionResponse.edk_identifier),
       source_path = excluded.source_path
     RETURNING id`,
  );

  const insertSubject = db.prepare(
    "INSERT OR IGNORE INTO WrittenQuestionResponseSubject (response_id, subject_text) VALUES (?, ?)",
  );

  const updateAnswer = db.prepare(
    `UPDATE WrittenQuestion SET
       answer_parliament_identifier = COALESCE(?, WrittenQuestion.answer_parliament_identifier),
       answer_minister_title = COALESCE(?, WrittenQuestion.answer_minister_title),
       answer_minister_first_name = COALESCE(?, WrittenQuestion.answer_minister_first_name),
       answer_minister_last_name = COALESCE(?, WrittenQuestion.answer_minister_last_name),
       answer_date = COALESCE(?, WrittenQuestion.answer_date)
     WHERE parliament_identifier = ?`,
  );

  return {
    migrateRow(row: VaskiEntry): void {
      const kkvIdentifier = normalizeText(row.eduskuntaTunnus);
      if (!kkvIdentifier) return;

      const kkvParsed = parseKKVIdentifier(kkvIdentifier);
      if (!kkvParsed) {
        writeMigrationReport(
          row,
          "invalid_kkv_identifier",
          `Could not parse KKV identifier from '${row.eduskuntaTunnus}'`,
        );
        return;
      }

      const id = parseOptionalInteger(row.id);
      if (id === null) {
        writeMigrationReport(
          row,
          "invalid_id",
          `Could not parse numeric id from '${row.id}'`,
        );
        return;
      }

      const meta = getMeta(row);
      const identOsa = meta?.IdentifiointiOsa;
      if (!identOsa) {
        writeMigrationReport(
          row,
          "missing_identifiointiosa",
          `No IdentifiointiOsa in metadata for ${kkvParsed.identifier}`,
        );
        return;
      }

      const kkIdentifier = normalizeText(
        identOsa.Vireilletulo?.EduskuntaTunnus,
      );

      if (!kkIdentifier) {
        writeMigrationReport(
          row,
          "missing_kk_identifier",
          `No Vireilletulo.EduskuntaTunnus for ${kkvParsed.identifier}`,
        );
        return;
      }

      const questionRow = lookupQuestion.get(kkIdentifier) as
        | { id: number }
        | undefined;
      if (!questionRow) {
        writeMigrationReport(
          row,
          "question_not_found",
          `WrittenQuestion not found for KK identifier '${kkIdentifier}' (answer: ${kkvParsed.identifier})`,
        );
        return;
      }
      const questionId = questionRow.id;

      const toimija = identOsa.Toimija;
      const henkilo = toimija?.Henkilo;
      const ministerTitle = normalizeText(henkilo?.AsemaTeksti);
      const ministerFirstName = normalizeText(henkilo?.EtuNimi);
      const ministerLastName = normalizeText(henkilo?.SukuNimi);

      const answerDate =
        normalizeText(meta?.["@_laadintaPvm"]) ||
        normalizeFinnishDate(normalizeText(identOsa.LaadintaPvmTeksti));

      const title = normalizeText(identOsa.Nimeke?.NimekeTeksti);
      const vaskiGuid = normalizeText(meta?.["@_identifiointiTunnus"]);
      const edkIdentifier = normalizeText(meta?.["@_muuTunnus"]);
      const status = parseOptionalInteger(row.status) ?? 5;

      const documentNumber =
        parseOptionalInteger(identOsa.EduskuntaTunniste?.AsiakirjaNroTeksti) ??
        kkvParsed.number;
      const parliamentaryYear =
        normalizeText(identOsa.EduskuntaTunniste?.ValtiopaivavuosiTeksti) ??
        kkvParsed.year;

      const sourcePath = row._source?.vaskiPath
        ? `${row._source.vaskiPath}#id=${id}`
        : `vaski-data/vastaus_kirjalliseen_kysymykseen/unknown#id=${id}`;

      try {
        const responseRow = insertResponse.get(
          id,
          questionId,
          kkvParsed.identifier,
          documentNumber,
          parliamentaryYear,
          title,
          answerDate,
          ministerTitle,
          ministerFirstName,
          ministerLastName,
          vaskiGuid,
          edkIdentifier,
          status,
          normalizeText(row.created),
          sourcePath,
        ) as { id: number } | undefined;

        const responseId = responseRow?.id ?? id;

        const aiheet = normalizeArray<Record<string, any>>(meta?.Aihe);
        for (const aihe of aiheet) {
          const text = normalizeText(aihe?.AiheTeksti);
          if (text) insertSubject.run(responseId, text);
        }

        updateAnswer.run(
          kkvParsed.identifier,
          ministerTitle,
          ministerFirstName,
          ministerLastName,
          answerDate,
          kkIdentifier,
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        writeMigrationReport(row, "insert_error", message);
      }
    },

    flush() {
      lookupQuestion.finalize();
      insertResponse.finalize();
      insertSubject.finalize();
      updateAnswer.finalize();
    },
  };
}
