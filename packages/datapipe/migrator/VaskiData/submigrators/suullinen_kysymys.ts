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
      "suullinen_kysymys",
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

function collectTextFragments(node: unknown, output: string[]): void {
  if (node === null || node === undefined) return;

  if (typeof node === "string") {
    const normalized = normalizeText(node);
    if (normalized) output.push(normalized);
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectTextFragments(item, output);
    }
    return;
  }

  if (typeof node === "object") {
    for (const [key, value] of Object.entries(
      node as Record<string, unknown>,
    )) {
      if (
        typeof value === "string" &&
        (key === "KappaleKooste" || key.endsWith("Teksti"))
      ) {
        const normalized = normalizeText(value);
        if (normalized) output.push(normalized);
        continue;
      }
      collectTextFragments(value, output);
    }
  }
}

function parseParliamentIdentifier(eduskuntaTunnus: unknown): {
  identifier: string;
  number: number;
  year: string;
} | null {
  const normalized = normalizeText(eduskuntaTunnus);
  if (!normalized) return null;

  const match = normalized.match(/^SKT\s+(\d+)\/(\d+)\s*(?:vp)?$/i);
  if (!match) return null;

  const number = Number.parseInt(match[1], 10);
  const year = match[2];
  if (Number.isNaN(number)) return null;

  return {
    identifier: `SKT ${number}/${year} vp`,
    number,
    year,
  };
}

function getBody(row: VaskiEntry): Record<string, any> | null {
  const asiakirja = row.contents?.Siirto?.SiirtoAsiakirja?.RakenneAsiakirja;
  if (!asiakirja || typeof asiakirja !== "object") return null;
  return asiakirja as Record<string, any>;
}

type OralQuestionStage = {
  stage_order: number;
  stage_title: string;
  stage_code: string | null;
  event_date: string | null;
  event_title: string | null;
  event_description: string | null;
};

type OralQuestionSubject = {
  subject_text: string;
  yso_uri: string | null;
};

function extractQuestionAndAsker(title: string | null): {
  question_text: string | null;
  asker_text: string | null;
} {
  if (!title) return { question_text: null, asker_text: null };

  const askerMatch = title.match(/\(([^()]+)\)\s*$/);
  const asker_text = askerMatch ? normalizeText(askerMatch[1]) : null;

  let question_text = title;
  if (askerMatch) {
    question_text = title.slice(0, askerMatch.index).trim();
  }

  question_text = question_text.replace(/^Suullinen\s+kysymys\s*/i, "").trim();
  return {
    question_text: question_text || null,
    asker_text,
  };
}

function parseKasittelytiedot(
  body: Record<string, any>,
  context: string,
): {
  title: string | null;
  question_text: string | null;
  asker_text: string | null;
  submission_date: string | null;
  decision_outcome: string | null;
  decision_outcome_code: string | null;
  latest_stage_code: string | null;
  end_date: string | null;
  stages: OralQuestionStage[];
  subjects: OralQuestionSubject[];
} {
  const kasittely = body.KasittelytiedotValtiopaivaasia;
  if (!kasittely || typeof kasittely !== "object") {
    throw new Error(`Missing KasittelytiedotValtiopaivaasia body (${context})`);
  }

  const identifiointiOsa = kasittely.IdentifiointiOsa || {};
  const title =
    normalizeText(identifiointiOsa.Nimeke?.NimekeTeksti) ||
    normalizeText(identifiointiOsa.OtsikkoTeksti);
  const { question_text, asker_text } = extractQuestionAndAsker(title);

  const submission_date =
    normalizeText(kasittely["@_laadintaPvm"]) ||
    normalizeText(identifiointiOsa.LaadintaPvmTeksti);

  const paatos = kasittely.EduskuntakasittelyPaatosKuvaus;
  const decision_outcome = normalizeText(paatos?.EduskuntakasittelyPaatosNimi);
  const decision_outcome_code = normalizeText(
    paatos?.["@_eduskuntakasittelyPaatosKoodi"],
  );

  const latest_stage_code =
    normalizeText(kasittely["@_viimeisinKasittelyvaiheKoodi"]) ||
    normalizeText(kasittely["@_viimeisinYleinenKasittelyvaiheKoodi"]);
  const end_date = normalizeText(kasittely["@_paattymisPvm"]);

  const stages: OralQuestionStage[] = [];
  let stageOrder = 0;
  const yleinenVaiheet = normalizeArray<Record<string, any>>(
    kasittely.YleinenKasittelyvaihe,
  );
  for (const vaihe of yleinenVaiheet) {
    if (!vaihe || typeof vaihe !== "object") continue;
    const stageTitle = normalizeText(vaihe.OtsikkoTeksti);
    const stageCode = normalizeText(vaihe["@_yleinenKasittelyvaiheKoodi"]);

    const toimenpiteet = normalizeArray<Record<string, any>>(
      vaihe.ToimenpideJulkaisu,
    );
    for (const toimenpide of toimenpiteet) {
      if (!toimenpide || typeof toimenpide !== "object") continue;
      stageOrder++;

      const eventDate = normalizeText(toimenpide["@_tapahtumaPvm"]);
      const eventTitle = normalizeText(toimenpide.ValiotsikkoTeksti);

      const descParts: string[] = [];
      const fraasi = toimenpide.Fraasi;
      if (fraasi) {
        const fraasiPerus = fraasi.FraasiPerus;
        if (fraasiPerus) {
          collectTextFragments(fraasiPerus.FraasiKappaleKooste, descParts);
        }
        const fraasiPaatos = fraasi.FraasiPaatos;
        if (fraasiPaatos) {
          collectTextFragments(
            fraasiPaatos.FraasiPaatosKappaleKooste,
            descParts,
          );
        }
      }

      stages.push({
        stage_order: stageOrder,
        stage_title: stageTitle || eventTitle || `Stage ${stageOrder}`,
        stage_code: stageCode,
        event_date: eventDate,
        event_title: eventTitle,
        event_description: descParts.length > 0 ? descParts.join("\n\n") : null,
      });
    }

    if (toimenpiteet.length === 0 && stageTitle) {
      stageOrder++;
      stages.push({
        stage_order: stageOrder,
        stage_title: stageTitle,
        stage_code: stageCode,
        event_date: null,
        event_title: null,
        event_description: null,
      });
    }
  }

  const subjects: OralQuestionSubject[] = [];
  const asiasanat = kasittely.Asiasanat;
  const aiheet = normalizeArray<Record<string, any>>(
    asiasanat?.Aihe || asiasanat?.AsiaSana,
  );
  for (const aihe of aiheet) {
    const text = normalizeText(aihe?.AiheTeksti);
    if (!text) continue;
    subjects.push({
      subject_text: text,
      yso_uri: normalizeText(aihe?.["@_muuTunnus"]),
    });
  }

  return {
    title,
    question_text,
    asker_text,
    submission_date,
    decision_outcome,
    decision_outcome_code,
    latest_stage_code,
    end_date,
    stages,
    subjects,
  };
}

export default function createSuullinenKysymysSubMigrator(db: Database) {
  const insertQuestion = db.prepare(
    `INSERT INTO OralQuestion (id, parliament_identifier, document_number, parliamentary_year, title, question_text, asker_text, submission_date, decision_outcome, decision_outcome_code, latest_stage_code, end_date, source_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(parliament_identifier) DO UPDATE SET
       title = COALESCE(excluded.title, OralQuestion.title),
       question_text = COALESCE(excluded.question_text, OralQuestion.question_text),
       asker_text = COALESCE(excluded.asker_text, OralQuestion.asker_text),
       submission_date = COALESCE(excluded.submission_date, OralQuestion.submission_date),
       decision_outcome = COALESCE(excluded.decision_outcome, OralQuestion.decision_outcome),
       decision_outcome_code = COALESCE(excluded.decision_outcome_code, OralQuestion.decision_outcome_code),
       latest_stage_code = COALESCE(excluded.latest_stage_code, OralQuestion.latest_stage_code),
       end_date = COALESCE(excluded.end_date, OralQuestion.end_date),
       source_path = excluded.source_path
     RETURNING id`,
  );

  const deleteStages = db.prepare(
    "DELETE FROM OralQuestionStage WHERE question_id = ?",
  );
  const insertStage = db.prepare(
    "INSERT INTO OralQuestionStage (question_id, stage_order, stage_title, stage_code, event_date, event_title, event_description) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );

  const deleteSubjects = db.prepare(
    "DELETE FROM OralQuestionSubject WHERE question_id = ?",
  );
  const insertSubject = db.prepare(
    "INSERT OR IGNORE INTO OralQuestionSubject (question_id, subject_text, yso_uri) VALUES (?, ?, ?)",
  );

  const linkVaskiDocument = db.prepare(
    "UPDATE OralQuestion SET vaski_document_id = ? WHERE id = ?",
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
          "metadata_only_skipped",
          `No SiirtoAsiakirja body for ${parsed.identifier}`,
        );
        return;
      }

      if (!body.KasittelytiedotValtiopaivaasia) {
        writeMigrationReport(
          row,
          "unknown_body_type",
          `Body has no KasittelytiedotValtiopaivaasia for ${parsed.identifier}`,
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
        : `vaski-data/suullinen_kysymys/unknown#id=${id}`;

      try {
        const data = parseKasittelytiedot(body, context);

        const questionRow = insertQuestion.get(
          id,
          parsed.identifier,
          parsed.number,
          parsed.year,
          data.title,
          data.question_text,
          data.asker_text,
          data.submission_date,
          data.decision_outcome,
          data.decision_outcome_code,
          data.latest_stage_code,
          data.end_date,
          sourcePath,
        );

        const questionId =
          (questionRow as { id: number } | undefined)?.id ?? id;

        linkVaskiDocument.run(id, questionId);
        if (data.title) updateVaskiTitle.run(data.title, id);

        if (data.stages.length > 0) {
          deleteStages.run(questionId);
          for (const stage of data.stages) {
            insertStage.run(
              questionId,
              stage.stage_order,
              stage.stage_title,
              stage.stage_code,
              stage.event_date,
              stage.event_title,
              stage.event_description,
            );
          }
        }

        if (data.subjects.length > 0) {
          deleteSubjects.run(questionId);
          for (const subject of data.subjects) {
            insertSubject.run(
              questionId,
              subject.subject_text,
              subject.yso_uri,
            );
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        writeMigrationReport(row, "parse_error_row_skipped", message);
      }
    },

    flush() {
      insertQuestion.finalize();
      deleteStages.finalize();
      insertStage.finalize();
      deleteSubjects.finalize();
      insertSubject.finalize();
      linkVaskiDocument.finalize();
      updateVaskiTitle.finalize();
    },
  };
}
