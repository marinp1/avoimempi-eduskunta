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
      "välikysymys",
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

function parseParliamentIdentifier(eduskuntaTunnus: unknown): {
  identifier: string;
  number: number;
  year: string;
} | null {
  const normalized = normalizeText(eduskuntaTunnus);
  if (!normalized) return null;

  const match = normalized.match(/^VK\s+(\d+)\/(\d+)\s*(?:vp)?$/i);
  if (!match) return null;

  const number = Number.parseInt(match[1], 10);
  const year = match[2];
  if (Number.isNaN(number)) return null;

  return {
    identifier: `VK ${number}/${year} vp`,
    number,
    year,
  };
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

type InterpellationSigner = {
  signer_order: number;
  person_id: number | null;
  first_name: string;
  last_name: string;
  party: string | null;
  is_first_signer: number;
};

type InterpellationStage = {
  stage_order: number;
  stage_title: string;
  stage_code: string | null;
  event_date: string | null;
  event_title: string | null;
  event_description: string | null;
};

type InterpellationSubject = {
  subject_text: string;
};

/**
 * Extract data from a KasittelytiedotValtiopaivaasia variant.
 */
function parseKasittelytiedot(
  _row: VaskiEntry,
  body: Record<string, any>,
  _parsed: ReturnType<typeof parseParliamentIdentifier>,
  context: string,
): {
  title: string | null;
  submission_date: string | null;
  first_signer_person_id: number | null;
  first_signer_first_name: string | null;
  first_signer_last_name: string | null;
  first_signer_party: string | null;
  co_signer_count: number | null;
  decision_outcome: string | null;
  decision_outcome_code: string | null;
  stages: InterpellationStage[];
  subjects: InterpellationSubject[];
} {
  const kasittely = body.KasittelytiedotValtiopaivaasia;
  if (!kasittely || typeof kasittely !== "object") {
    throw new Error(`Missing KasittelytiedotValtiopaivaasia body (${context})`);
  }

  const identifiointiOsa = kasittely.IdentifiointiOsa || {};
  const title = normalizeText(identifiointiOsa.Nimeke?.NimekeTeksti);
  const submission_date =
    normalizeText(kasittely["@_laadintaPvm"]) ||
    normalizeText(identifiointiOsa.LaadintaPvmTeksti);

  const toimija = identifiointiOsa.Toimija;
  const henkilo = toimija?.Henkilo;
  const first_signer_person_id = henkilo
    ? parseOptionalInteger(
        henkilo["@_muuTunnus"],
        "first_signer_person_id",
        context,
      )
    : null;
  const first_signer_first_name = normalizeText(henkilo?.EtuNimi);
  const first_signer_last_name = normalizeText(henkilo?.SukuNimi);
  const first_signer_party = normalizeText(henkilo?.LisatietoTeksti);

  const paatos = kasittely.EduskuntakasittelyPaatosKuvaus;
  const decision_outcome = normalizeText(paatos?.EduskuntakasittelyPaatosNimi);
  const decision_outcome_code = normalizeText(
    paatos?.["@_eduskuntakasittelyPaatosKoodi"],
  );

  const stages: InterpellationStage[] = [];
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
      const eventDescription =
        descParts.length > 0 ? descParts.join("\n\n") : null;

      stages.push({
        stage_order: stageOrder,
        stage_title: stageTitle || eventTitle || `Stage ${stageOrder}`,
        stage_code: stageCode,
        event_date: eventDate,
        event_title: eventTitle,
        event_description: eventDescription,
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

  const subjects: InterpellationSubject[] = [];
  const asiasanat = kasittely.Asiasanat;
  const aiheet = normalizeArray<Record<string, any>>(
    asiasanat?.Aihe || asiasanat?.AsiaSana,
  );
  for (const aihe of aiheet) {
    const text = normalizeText(aihe?.AiheTeksti);
    if (text) {
      subjects.push({ subject_text: text });
    }
  }

  let co_signer_count: number | null = null;
  for (const vaihe of yleinenVaiheet) {
    const toimenpiteet = normalizeArray<Record<string, any>>(
      vaihe?.ToimenpideJulkaisu,
    );
    for (const toimenpide of toimenpiteet) {
      const count = parseOptionalInteger(
        toimenpide?.MuuAllekirjoittajaLkm,
        "co_signer_count",
        context,
      );
      if (count !== null) {
        co_signer_count = count;
        break;
      }
    }
    if (co_signer_count !== null) break;
  }

  return {
    title,
    submission_date,
    first_signer_person_id,
    first_signer_first_name,
    first_signer_last_name,
    first_signer_party,
    co_signer_count,
    decision_outcome,
    decision_outcome_code,
    stages,
    subjects,
  };
}

/**
 * Extract data from a Kysymys variant.
 */
function parseKysymys(
  row: VaskiEntry,
  body: Record<string, any>,
  _parsed: ReturnType<typeof parseParliamentIdentifier>,
  context: string,
): {
  title: string | null;
  submission_date: string | null;
  first_signer_person_id: number | null;
  first_signer_first_name: string | null;
  first_signer_last_name: string | null;
  first_signer_party: string | null;
  question_text: string | null;
  question_rich_text: string | null;
  resolution_text: string | null;
  resolution_rich_text: string | null;
  signers: InterpellationSigner[];
  subjects: InterpellationSubject[];
} {
  const kysymys = body.Kysymys;
  if (!kysymys || typeof kysymys !== "object") {
    throw new Error(`Missing Kysymys body (${context})`);
  }

  const meta = getMeta(row);
  const identifiointiOsa =
    meta?.IdentifiointiOsa || kysymys?.IdentifiointiOsa || {};
  const title = normalizeText(identifiointiOsa.Nimeke?.NimekeTeksti);
  const submission_date =
    normalizeText(identifiointiOsa["@_laadintaPvm"]) ||
    normalizeText(meta?.["@_laadintaPvm"]);

  const questionRichText = convertVaskiNodeToRichText(kysymys.PerusteluOsa);
  const question_text = questionRichText.plainText;
  const question_rich_text = questionRichText.json;

  const resolutionRichText = convertVaskiNodeToRichText(kysymys.PonsiOsa);
  const resolution_text = resolutionRichText.plainText;
  const resolution_rich_text = resolutionRichText.json;

  const signers: InterpellationSigner[] = [];
  const allekirjoitusOsa = kysymys.AllekirjoitusOsa;
  if (allekirjoitusOsa) {
    const allekirjoittajat = normalizeArray<Record<string, any>>(
      allekirjoitusOsa.Allekirjoittaja,
    );
    for (const [index, allekirjoittaja] of allekirjoittajat.entries()) {
      const henkilo = allekirjoittaja?.Henkilo;
      if (!henkilo) continue;

      const firstName = normalizeText(henkilo.EtuNimi);
      const lastName = normalizeText(henkilo.SukuNimi);
      if (!firstName || !lastName) continue;

      const isFirst =
        normalizeText(allekirjoittaja["@_allekirjoitusLuokitusKoodi"]) ===
        "EnsimmainenAllekirjoittaja"
          ? 1
          : 0;

      signers.push({
        signer_order: index + 1,
        person_id: parseOptionalInteger(
          henkilo["@_muuTunnus"],
          "person_id",
          context,
        ),
        first_name: firstName,
        last_name: lastName,
        party: normalizeText(henkilo.LisatietoTeksti),
        is_first_signer: isFirst,
      });
    }
  }

  const first =
    signers.find((s) => s.is_first_signer === 1) || signers[0] || null;

  const subjects: InterpellationSubject[] = [];
  const aiheet = normalizeArray<Record<string, any>>(meta?.Aihe);
  for (const aihe of aiheet) {
    const text = normalizeText(aihe?.AiheTeksti);
    if (text) subjects.push({ subject_text: text });
  }

  return {
    title,
    submission_date,
    first_signer_person_id: first?.person_id ?? null,
    first_signer_first_name: first?.first_name ?? null,
    first_signer_last_name: first?.last_name ?? null,
    first_signer_party: first?.party ?? null,
    question_text,
    question_rich_text,
    resolution_text,
    resolution_rich_text,
    signers,
    subjects,
  };
}

export default function createValikysymysSubMigrator(db: Database) {
  const insertInterpellation = db.prepare(
    `INSERT INTO Interpellation (id, parliament_identifier, document_number, parliamentary_year, title, submission_date, first_signer_person_id, first_signer_first_name, first_signer_last_name, first_signer_party, co_signer_count, decision_outcome, decision_outcome_code, question_text, question_rich_text, resolution_text, resolution_rich_text, source_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(parliament_identifier) DO UPDATE SET
       title = COALESCE(excluded.title, Interpellation.title),
       submission_date = COALESCE(excluded.submission_date, Interpellation.submission_date),
       first_signer_person_id = COALESCE(excluded.first_signer_person_id, Interpellation.first_signer_person_id),
       first_signer_first_name = COALESCE(excluded.first_signer_first_name, Interpellation.first_signer_first_name),
       first_signer_last_name = COALESCE(excluded.first_signer_last_name, Interpellation.first_signer_last_name),
       first_signer_party = COALESCE(excluded.first_signer_party, Interpellation.first_signer_party),
       co_signer_count = COALESCE(excluded.co_signer_count, Interpellation.co_signer_count),
       decision_outcome = COALESCE(excluded.decision_outcome, Interpellation.decision_outcome),
       decision_outcome_code = COALESCE(excluded.decision_outcome_code, Interpellation.decision_outcome_code),
       question_text = COALESCE(excluded.question_text, Interpellation.question_text),
       question_rich_text = COALESCE(excluded.question_rich_text, Interpellation.question_rich_text),
       resolution_text = COALESCE(excluded.resolution_text, Interpellation.resolution_text),
       resolution_rich_text = COALESCE(excluded.resolution_rich_text, Interpellation.resolution_rich_text),
       source_path = excluded.source_path
     RETURNING id`,
  );

  const deleteSigners = db.prepare(
    "DELETE FROM InterpellationSigner WHERE interpellation_id = ?",
  );
  const insertSigner = db.prepare(
    "INSERT INTO InterpellationSigner (interpellation_id, signer_order, person_id, first_name, last_name, party, is_first_signer) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );

  const deleteStages = db.prepare(
    "DELETE FROM InterpellationStage WHERE interpellation_id = ?",
  );
  const insertStage = db.prepare(
    "INSERT INTO InterpellationStage (interpellation_id, stage_order, stage_title, stage_code, event_date, event_title, event_description) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );

  const deleteSubjects = db.prepare(
    "DELETE FROM InterpellationSubject WHERE interpellation_id = ?",
  );
  const insertSubject = db.prepare(
    "INSERT OR IGNORE INTO InterpellationSubject (interpellation_id, subject_text) VALUES (?, ?)",
  );

  const linkVaskiDocument = db.prepare(
    "UPDATE Interpellation SET vaski_document_id = ? WHERE id = ?",
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
        : `vaski-data/välikysymys/unknown#id=${id}`;

      const isKasittelytiedot = !!body.KasittelytiedotValtiopaivaasia;
      const isKysymys = !!body.Kysymys;

      if (!isKasittelytiedot && !isKysymys) {
        writeMigrationReport(
          row,
          "unknown_body_type",
          `Body has neither KasittelytiedotValtiopaivaasia nor Kysymys (${context})`,
        );
        return;
      }

      try {
        if (isKasittelytiedot) {
          const data = parseKasittelytiedot(row, body, parsed, context);

          const interpellationRow = insertInterpellation.get(
            id,
            parsed.identifier,
            parsed.number,
            parsed.year,
            data.title,
            data.submission_date,
            data.first_signer_person_id,
            data.first_signer_first_name,
            data.first_signer_last_name,
            data.first_signer_party,
            data.co_signer_count,
            data.decision_outcome,
            data.decision_outcome_code,
            null,
            null,
            null,
            null,
            sourcePath,
          );

          const interpellationId =
            (interpellationRow as { id: number } | undefined)?.id ?? id;

          linkVaskiDocument.run(id, interpellationId);
          if (data.title) updateVaskiTitle.run(data.title, id);

          deleteStages.run(interpellationId);
          for (const stage of data.stages) {
            insertStage.run(
              interpellationId,
              stage.stage_order,
              stage.stage_title,
              stage.stage_code,
              stage.event_date,
              stage.event_title,
              stage.event_description,
            );
          }

          for (const subject of data.subjects) {
            insertSubject.run(interpellationId, subject.subject_text);
          }
        } else if (isKysymys) {
          const data = parseKysymys(row, body, parsed, context);

          const interpellationRow = insertInterpellation.get(
            id,
            parsed.identifier,
            parsed.number,
            parsed.year,
            data.title,
            data.submission_date,
            data.first_signer_person_id,
            data.first_signer_first_name,
            data.first_signer_last_name,
            data.first_signer_party,
            null,
            null,
            null,
            data.question_text,
            data.question_rich_text,
            data.resolution_text,
            data.resolution_rich_text,
            sourcePath,
          );

          const interpellationId =
            (interpellationRow as { id: number } | undefined)?.id ?? id;

          linkVaskiDocument.run(id, interpellationId);
          if (data.title) updateVaskiTitle.run(data.title, id);

          if (data.signers.length > 0) {
            deleteSigners.run(interpellationId);
            for (const signer of data.signers) {
              insertSigner.run(
                interpellationId,
                signer.signer_order,
                signer.person_id,
                signer.first_name,
                signer.last_name,
                signer.party,
                signer.is_first_signer,
              );
            }
          }

          for (const subject of data.subjects) {
            insertSubject.run(interpellationId, subject.subject_text);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        writeMigrationReport(row, "parse_error_row_skipped", message);
      }
    },

    flush() {
      insertInterpellation.finalize();
      deleteSigners.finalize();
      insertSigner.finalize();
      deleteStages.finalize();
      insertStage.finalize();
      deleteSubjects.finalize();
      insertSubject.finalize();
      linkVaskiDocument.finalize();
      updateVaskiTitle.finalize();
    },
  };
}
