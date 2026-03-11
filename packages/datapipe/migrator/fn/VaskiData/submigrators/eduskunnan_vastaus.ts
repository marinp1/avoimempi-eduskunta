import type { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { VaskiEntry } from "../reader";
import { convertVaskiNodeToRichText } from "../rich-text";

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

function parseOptionalInteger(
  value: unknown,
  fieldName: string,
  context?: string,
): number | null {
  const suffix = context ? ` (${context})` : "";
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid integer in ${fieldName}${suffix}: '${value}'`);
    }
    return Math.trunc(value);
  }
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(
      `Invalid integer in ${fieldName}${suffix}: '${normalized}'`,
    );
  }
  return parsed;
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
      "eduskunnan_vastaus",
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

function getBody(row: VaskiEntry): Record<string, any> | null {
  const asiakirja = row.contents?.Siirto?.SiirtoAsiakirja?.RakenneAsiakirja;
  if (!asiakirja || typeof asiakirja !== "object") return null;
  return asiakirja as Record<string, any>;
}

function parseParliamentIdentifier(eduskuntaTunnus: unknown): {
  identifier: string;
  number: number;
  year: string;
} | null {
  const normalized = normalizeText(eduskuntaTunnus);
  if (!normalized) return null;

  const match = normalized.match(/^EV\s+(\d+)\/(\d+)\s*(?:vp)?$/i);
  if (!match) return null;

  const number = Number.parseInt(match[1], 10);
  const year = match[2];
  if (Number.isNaN(number)) return null;

  return {
    identifier: `EV ${number}/${year} vp`,
    number,
    year,
  };
}

type Subject = {
  subject_order: number;
  subject_text: string;
};

function parseEduskunnanVastaus(
  row: VaskiEntry,
  body: Record<string, any>,
  context: string,
): {
  title: string | null;
  source_reference: string | null;
  committee_report_reference: string | null;
  submission_date: string | null;
  signature_date: string | null;
  edk_identifier: string | null;
  decision_text: string | null;
  decision_rich_text: string | null;
  legislation_text: string | null;
  legislation_rich_text: string | null;
  signatory_count: number;
  subjects: Subject[];
} {
  const ev = body.EduskunnanVastaus;
  if (!ev || typeof ev !== "object") {
    throw new Error(`Missing EduskunnanVastaus body (${context})`);
  }

  const meta = getMeta(row);

  // Title from meta IdentifiointiOsa or from body IdentifiointiOsa
  const metaIdentOsa = meta?.IdentifiointiOsa || {};
  const evIdentOsa = ev.IdentifiointiOsa || {};
  const title =
    normalizeText(metaIdentOsa?.Nimeke?.NimekeTeksti) ||
    normalizeText(evIdentOsa?.Nimeke?.NimekeTeksti);

  // source_reference: HE identifier this EV answers (from body IdentifiointiOsa.Vireilletulo)
  const vireilletulo =
    evIdentOsa?.Vireilletulo || metaIdentOsa?.Vireilletulo || {};
  const source_reference = normalizeText(vireilletulo?.EduskuntaTunnus);

  // committee_report_reference: try body's AsiakirjaViitteet
  let committee_report_reference: string | null = null;
  const asiakirjaViitteet = evIdentOsa?.AsiakirjaViitteet;
  if (asiakirjaViitteet) {
    // Muu2Viite is typically the committee report reference
    const muu2 = asiakirjaViitteet?.Muu2Viite;
    if (muu2) {
      committee_report_reference = normalizeText(muu2?.ViiteTeksti);
    }
    // Fallback to Muu1Viite if it doesn't look like a HE
    if (!committee_report_reference) {
      const muu1 = asiakirjaViitteet?.Muu1Viite;
      if (muu1) {
        const muu1Text = normalizeText(muu1?.ViiteTeksti);
        if (muu1Text && !muu1Text.match(/^HE\s+/i)) {
          committee_report_reference = muu1Text;
        }
      }
    }
    // Try array of viitteet
    if (!committee_report_reference && Array.isArray(asiakirjaViitteet)) {
      for (const viite of asiakirjaViitteet) {
        const muu2Text = normalizeText(viite?.Muu2Viite?.ViiteTeksti);
        if (muu2Text) {
          committee_report_reference = muu2Text;
          break;
        }
      }
    }
  }

  // submission_date from meta
  const submission_date = normalizeText(meta?.["@_laadintaPvm"]);

  // signature_date from body AllekirjoitusOsa
  const signature_date = normalizeText(
    ev.AllekirjoitusOsa?.PaivaysKooste?.["@_allekirjoitusPvm"],
  );

  // edk_identifier from meta
  const edk_identifier = normalizeText(meta?.["@_muuTunnus"]);

  // decision_text/rich_text from PaatosOsa
  const decisionRichText = convertVaskiNodeToRichText(ev.PaatosOsa);
  const decision_text = decisionRichText.plainText;
  const decision_rich_text = decisionRichText.json;

  // legislation_text/rich_text from SaadosOsa
  const legislationRichText = convertVaskiNodeToRichText(ev.SaadosOsa);
  const legislation_text = legislationRichText.plainText;
  const legislation_rich_text = legislationRichText.json;

  // signatory_count from AllekirjoitusOsa.Allekirjoittaja
  const signatoryCount = normalizeArray(
    ev.AllekirjoitusOsa?.Allekirjoittaja,
  ).length;

  // subjects from meta Aihe
  const rawSubjects = normalizeArray<Record<string, any>>(meta?.Aihe);
  const subjects: Subject[] = [];
  for (const [index, aihe] of rawSubjects.entries()) {
    const subjectText = normalizeText(aihe?.AiheTeksti);
    if (subjectText) {
      subjects.push({
        subject_order: index + 1,
        subject_text: subjectText,
      });
    }
  }

  return {
    title,
    source_reference,
    committee_report_reference,
    submission_date,
    signature_date,
    edk_identifier,
    decision_text,
    decision_rich_text,
    legislation_text,
    legislation_rich_text,
    signatory_count: signatoryCount,
    subjects,
  };
}

export default function createEduskunnanVastausSubMigrator(db: Database) {
  const insertAnswer = db.prepare(
    `INSERT INTO ParliamentAnswer (id, parliament_identifier, document_number, parliamentary_year, title, source_reference, committee_report_reference, submission_date, signature_date, language, edk_identifier, decision_text, decision_rich_text, legislation_text, legislation_rich_text, signatory_count, vaski_document_id, source_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'fi', ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(parliament_identifier) DO UPDATE SET
       title = COALESCE(excluded.title, ParliamentAnswer.title),
       source_reference = COALESCE(excluded.source_reference, ParliamentAnswer.source_reference),
       committee_report_reference = COALESCE(excluded.committee_report_reference, ParliamentAnswer.committee_report_reference),
       submission_date = COALESCE(excluded.submission_date, ParliamentAnswer.submission_date),
       signature_date = COALESCE(excluded.signature_date, ParliamentAnswer.signature_date),
       edk_identifier = COALESCE(excluded.edk_identifier, ParliamentAnswer.edk_identifier),
       decision_text = COALESCE(excluded.decision_text, ParliamentAnswer.decision_text),
       decision_rich_text = COALESCE(excluded.decision_rich_text, ParliamentAnswer.decision_rich_text),
       legislation_text = COALESCE(excluded.legislation_text, ParliamentAnswer.legislation_text),
       legislation_rich_text = COALESCE(excluded.legislation_rich_text, ParliamentAnswer.legislation_rich_text),
       signatory_count = excluded.signatory_count,
       source_path = excluded.source_path
     RETURNING id`,
  );

  const deleteSubjects = db.prepare(
    "DELETE FROM ParliamentAnswerSubject WHERE answer_id = ?",
  );
  const insertSubject = db.prepare(
    "INSERT INTO ParliamentAnswerSubject (answer_id, subject_order, subject_text) VALUES (?, ?, ?)",
  );

  const linkVaskiDocument = db.prepare(
    "UPDATE ParliamentAnswer SET vaski_document_id = ? WHERE id = ?",
  );
  const updateVaskiTitle = db.prepare(
    "UPDATE VaskiDocument SET title = ? WHERE id = ? AND title IS NULL",
  );

  return {
    async migrateRow(row: VaskiEntry): Promise<void> {
      const parsed = parseParliamentIdentifier(row.eduskuntaTunnus);
      if (!parsed) {
        writeMigrationReport(
          row,
          "invalid_parliament_identifier",
          `Could not parse parliament identifier from '${row.eduskuntaTunnus}'`,
        );
        return;
      }

      const body = getBody(row);
      if (!body) {
        writeMigrationReport(
          row,
          "no_body",
          `No SiirtoAsiakirja body for ${parsed.identifier}`,
        );
        return;
      }

      if (!body.EduskunnanVastaus) {
        writeMigrationReport(
          row,
          "no_eduskunnanvastaus_body",
          `Body has no EduskunnanVastaus section for ${parsed.identifier}`,
        );
        return;
      }

      const context = `row id=${row.id}, ${parsed.identifier}`;
      const id = parseOptionalInteger(row.id, "id", context);
      if (id === null) {
        writeMigrationReport(
          row,
          "invalid_id",
          `Could not parse numeric id from '${row.id}'`,
        );
        return;
      }

      const sourcePath = row._source?.vaskiPath
        ? `${row._source.vaskiPath}#id=${id}`
        : `vaski-data/eduskunnan_vastaus/unknown#id=${id}`;

      try {
        const data = parseEduskunnanVastaus(row, body, context);

        const answerRow = insertAnswer.get(
          id,
          parsed.identifier,
          parsed.number,
          parsed.year,
          data.title,
          data.source_reference,
          data.committee_report_reference,
          data.submission_date,
          data.signature_date,
          data.edk_identifier,
          data.decision_text,
          data.decision_rich_text,
          data.legislation_text,
          data.legislation_rich_text,
          data.signatory_count,
          id,
          sourcePath,
        );

        const answerId = (answerRow as { id: number } | undefined)?.id ?? id;

        linkVaskiDocument.run(id, answerId);
        if (data.title) updateVaskiTitle.run(data.title, id);

        if (data.subjects.length > 0) {
          deleteSubjects.run(answerId);
          for (const subject of data.subjects) {
            insertSubject.run(
              answerId,
              subject.subject_order,
              subject.subject_text,
            );
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        writeMigrationReport(row, "parse_error_row_skipped", message);
      }
    },

    async flush() {
      insertAnswer.finalize();
      deleteSubjects.finalize();
      insertSubject.finalize();
      linkVaskiDocument.finalize();
      updateVaskiTitle.finalize();
    },
  };
}
