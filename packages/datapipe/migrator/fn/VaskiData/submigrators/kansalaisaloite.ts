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
      "kansalaisaloite",
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
  initiativeTypeCode: string;
  identifier: string;
  number: number;
  year: string;
} | null {
  const normalized = normalizeText(eduskuntaTunnus);
  if (!normalized) return null;

  const match = normalized.match(/^KAA\s+(\d+)\/(\d+)\s*(?:vp)?$/i);
  if (!match) return null;

  const number = Number.parseInt(match[1], 10);
  const year = match[2];
  if (Number.isNaN(number)) return null;

  return {
    initiativeTypeCode: "KAA",
    identifier: `KAA ${number}/${year} vp`,
    number,
    year,
  };
}

function getBody(row: VaskiEntry): Record<string, any> | null {
  const asiakirja = row.contents?.Siirto?.SiirtoAsiakirja?.RakenneAsiakirja;
  if (!asiakirja || typeof asiakirja !== "object") return null;
  return asiakirja as Record<string, any>;
}

type InitiativeSigner = {
  signer_order: number;
  person_id: number | null;
  first_name: string;
  last_name: string;
  party: string | null;
  is_first_signer: number;
};

type InitiativeStage = {
  stage_order: number;
  stage_title: string;
  stage_code: string | null;
  event_date: string | null;
  event_title: string | null;
  event_description: string | null;
};

type InitiativeSubject = {
  subject_text: string;
  yso_uri: string | null;
};

function buildSigner(
  henkilo: Record<string, any> | null | undefined,
  signerOrder: number,
): InitiativeSigner | null {
  if (!henkilo || typeof henkilo !== "object") return null;

  const first_name = normalizeText(henkilo.EtuNimi);
  const last_name = normalizeText(henkilo.SukuNimi);
  if (!first_name || !last_name) return null;

  return {
    signer_order: signerOrder,
    person_id:
      parseOptionalInteger(henkilo["@_muuTunnus"], "signer_person_id") ?? null,
    first_name,
    last_name,
    party: normalizeText(henkilo.LisatietoTeksti),
    is_first_signer: signerOrder === 1 ? 1 : 0,
  };
}

function parseKasittelytiedot(
  body: Record<string, any>,
  context: string,
): {
  title: string | null;
  submission_date: string | null;
  first_signer_person_id: number | null;
  first_signer_first_name: string | null;
  first_signer_last_name: string | null;
  first_signer_party: string | null;
  decision_outcome: string | null;
  decision_outcome_code: string | null;
  latest_stage_code: string | null;
  end_date: string | null;
  signers: InitiativeSigner[];
  stages: InitiativeStage[];
  subjects: InitiativeSubject[];
} {
  const kasittely = body.KasittelytiedotValtiopaivaasia;
  if (!kasittely || typeof kasittely !== "object") {
    throw new Error(`Missing KasittelytiedotValtiopaivaasia body (${context})`);
  }

  const identifiointiOsa = kasittely.IdentifiointiOsa || {};
  const title =
    normalizeText(identifiointiOsa.Nimeke?.NimekeTeksti) ||
    normalizeText(identifiointiOsa.OtsikkoTeksti);
  const submission_date =
    normalizeText(kasittely["@_laadintaPvm"]) ||
    normalizeText(identifiointiOsa.LaadintaPvmTeksti);

  const firstSigner = buildSigner(identifiointiOsa.Toimija?.Henkilo, 1);
  const signers: InitiativeSigner[] = [];
  if (firstSigner) signers.push(firstSigner);

  const paatos = kasittely.EduskuntakasittelyPaatosKuvaus;
  const decision_outcome = normalizeText(paatos?.EduskuntakasittelyPaatosNimi);
  const decision_outcome_code = normalizeText(
    paatos?.["@_eduskuntakasittelyPaatosKoodi"],
  );

  const latest_stage_code =
    normalizeText(kasittely["@_viimeisinKasittelyvaiheKoodi"]) ||
    normalizeText(kasittely["@_viimeisinYleinenKasittelyvaiheKoodi"]);
  const end_date = normalizeText(kasittely["@_paattymisPvm"]);

  const stages: InitiativeStage[] = [];
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

  const subjects: InitiativeSubject[] = [];
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
    submission_date,
    first_signer_person_id: firstSigner?.person_id ?? null,
    first_signer_first_name: firstSigner?.first_name ?? null,
    first_signer_last_name: firstSigner?.last_name ?? null,
    first_signer_party: firstSigner?.party ?? null,
    decision_outcome,
    decision_outcome_code,
    latest_stage_code,
    end_date,
    signers,
    stages,
    subjects,
  };
}

export default function createKansalaisaloiteSubMigrator(db: Database) {
  const insertInitiative = db.prepare(
    `INSERT INTO LegislativeInitiative (id, initiative_type_code, parliament_identifier, document_number, parliamentary_year, title, submission_date, first_signer_person_id, first_signer_first_name, first_signer_last_name, first_signer_party, decision_outcome, decision_outcome_code, latest_stage_code, end_date, source_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(parliament_identifier) DO UPDATE SET
       title = COALESCE(excluded.title, LegislativeInitiative.title),
       submission_date = COALESCE(excluded.submission_date, LegislativeInitiative.submission_date),
       first_signer_person_id = COALESCE(excluded.first_signer_person_id, LegislativeInitiative.first_signer_person_id),
       first_signer_first_name = COALESCE(excluded.first_signer_first_name, LegislativeInitiative.first_signer_first_name),
       first_signer_last_name = COALESCE(excluded.first_signer_last_name, LegislativeInitiative.first_signer_last_name),
       first_signer_party = COALESCE(excluded.first_signer_party, LegislativeInitiative.first_signer_party),
       decision_outcome = COALESCE(excluded.decision_outcome, LegislativeInitiative.decision_outcome),
       decision_outcome_code = COALESCE(excluded.decision_outcome_code, LegislativeInitiative.decision_outcome_code),
       latest_stage_code = COALESCE(excluded.latest_stage_code, LegislativeInitiative.latest_stage_code),
       end_date = COALESCE(excluded.end_date, LegislativeInitiative.end_date),
       source_path = excluded.source_path
     RETURNING id`,
  );

  const deleteSigners = db.prepare(
    "DELETE FROM LegislativeInitiativeSigner WHERE initiative_id = ?",
  );
  const insertSigner = db.prepare(
    "INSERT INTO LegislativeInitiativeSigner (initiative_id, signer_order, person_id, first_name, last_name, party, is_first_signer) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );

  const deleteSubjects = db.prepare(
    "DELETE FROM LegislativeInitiativeSubject WHERE initiative_id = ?",
  );
  const insertSubject = db.prepare(
    "INSERT OR IGNORE INTO LegislativeInitiativeSubject (initiative_id, subject_text, yso_uri) VALUES (?, ?, ?)",
  );

  const deleteStages = db.prepare(
    "DELETE FROM LegislativeInitiativeStage WHERE initiative_id = ?",
  );
  const insertStage = db.prepare(
    "INSERT INTO LegislativeInitiativeStage (initiative_id, stage_order, stage_title, stage_code, event_date, event_title, event_description) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );

  const linkVaskiDocument = db.prepare(
    "UPDATE LegislativeInitiative SET vaski_document_id = ? WHERE id = ?",
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
        : `vaski-data/kansalaisaloite/unknown#id=${id}`;

      try {
        const data = parseKasittelytiedot(body, context);

        const initiativeRow = insertInitiative.get(
          id,
          parsed.initiativeTypeCode,
          parsed.identifier,
          parsed.number,
          parsed.year,
          data.title,
          data.submission_date,
          data.first_signer_person_id,
          data.first_signer_first_name,
          data.first_signer_last_name,
          data.first_signer_party,
          data.decision_outcome,
          data.decision_outcome_code,
          data.latest_stage_code,
          data.end_date,
          sourcePath,
        );

        const initiativeId =
          (initiativeRow as { id: number } | undefined)?.id ?? id;

        linkVaskiDocument.run(id, initiativeId);
        if (data.title) updateVaskiTitle.run(data.title, id);

        if (data.signers.length > 0) {
          deleteSigners.run(initiativeId);
          for (const signer of data.signers) {
            insertSigner.run(
              initiativeId,
              signer.signer_order,
              signer.person_id,
              signer.first_name,
              signer.last_name,
              signer.party,
              signer.is_first_signer,
            );
          }
        }

        if (data.stages.length > 0) {
          deleteStages.run(initiativeId);
          for (const stage of data.stages) {
            insertStage.run(
              initiativeId,
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
          deleteSubjects.run(initiativeId);
          for (const subject of data.subjects) {
            insertSubject.run(
              initiativeId,
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
      insertInitiative.finalize();
      deleteSigners.finalize();
      insertSigner.finalize();
      deleteSubjects.finalize();
      insertSubject.finalize();
      deleteStages.finalize();
      insertStage.finalize();
      linkVaskiDocument.finalize();
      updateVaskiTitle.finalize();
    },
  };
}
