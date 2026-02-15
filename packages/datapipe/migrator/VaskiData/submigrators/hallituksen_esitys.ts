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
    throw new Error(`Invalid integer in ${fieldName}${suffix}: '${normalized}'`);
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
    join(process.cwd(), "data", "migration-reports", "VaskiData", "hallituksen_esitys");
  mkdirSync(baseDir, { recursive: true });

  const id = normalizeText(row.id) || "unknown-id";
  const fileName = [
    timestamp,
    toSafeFilePart(reason),
    toSafeFilePart(id),
  ].join("__");

  const payload = {
    reason,
    details,
    id: row.id,
    eduskuntaTunnus: row.eduskuntaTunnus,
    created: row.created,
    source: row._source || null,
  };

  writeFileSync(join(baseDir, `${fileName}.json`), JSON.stringify(payload, null, 2), "utf8");
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
    for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
      if (typeof value === "string" && (key === "KappaleKooste" || key.endsWith("Teksti"))) {
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

  const match = normalized.match(/^HE\s+(\d+)\/(\d+)\s*(?:vp)?$/i);
  if (!match) return null;

  const number = Number.parseInt(match[1], 10);
  const year = match[2];
  if (Number.isNaN(number)) return null;

  return {
    identifier: `HE ${number}/${year} vp`,
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

type ProposalSignatory = {
  signatory_order: number;
  first_name: string;
  last_name: string;
  title_text: string | null;
};

type ProposalSubject = {
  subject_text: string;
  yso_uri: string | null;
};

type ProposalLaw = {
  law_order: number;
  law_type: string | null;
  law_name: string | null;
};

type ProposalStage = {
  stage_order: number;
  stage_title: string;
  stage_code: string | null;
  event_date: string | null;
  event_title: string | null;
  event_description: string | null;
};

/**
 * Extract data from a HallituksenEsitys variant.
 */
function parseHallituksenEsitys(
  row: VaskiEntry,
  body: Record<string, any>,
  parsed: ReturnType<typeof parseParliamentIdentifier>,
  context: string,
): {
  title: string | null;
  author: string | null;
  submission_date: string | null;
  summary_text: string | null;
  justification_text: string | null;
  proposal_text: string | null;
  appendix_text: string | null;
  signature_date: string | null;
  signatories: ProposalSignatory[];
  subjects: ProposalSubject[];
  laws: ProposalLaw[];
} {
  const he = body.HallituksenEsitys;
  if (!he || typeof he !== "object") {
    throw new Error(`Missing HallituksenEsitys body (${context})`);
  }

  const meta = getMeta(row);
  const identifiointiOsa = he.IdentifiointiOsa || meta?.IdentifiointiOsa || {};
  const title = normalizeText(identifiointiOsa.Nimeke?.NimekeTeksti) ||
    normalizeText(meta?.IdentifiointiOsa?.Nimeke?.NimekeTeksti);
  const submission_date = normalizeText(he["@_laadintaPvm"]) ||
    normalizeText(identifiointiOsa.LaadintaPvmTeksti);

  const author = normalizeText(identifiointiOsa.Toimija?.YhteisoTeksti) ||
    normalizeText(meta?.IdentifiointiOsa?.Toimija?.YhteisoTeksti);

  // Summary from SisaltoKuvaus
  const summaryParts: string[] = [];
  const sisaltoKuvaus = he.SisaltoKuvaus;
  if (sisaltoKuvaus) {
    collectTextFragments(sisaltoKuvaus, summaryParts);
  }
  const summary_text = summaryParts.length > 0 ? summaryParts.join("\n\n") : null;

  // Justification from PerusteluOsa (can be object or array)
  const justificationParts: string[] = [];
  const perusteluOsa = he.PerusteluOsa;
  if (perusteluOsa) {
    collectTextFragments(perusteluOsa, justificationParts);
  }
  const justification_text = justificationParts.length > 0 ? justificationParts.join("\n\n") : null;

  // Proposal text from PonsiOsa
  const proposalParts: string[] = [];
  const ponsiOsa = he.PonsiOsa;
  if (ponsiOsa) {
    collectTextFragments(ponsiOsa, proposalParts);
  }
  const proposal_text = proposalParts.length > 0 ? proposalParts.join("\n\n") : null;

  // Appendix text from LiiteOsa (if present)
  const appendixParts: string[] = [];
  const liiteOsa = he.LiiteOsa;
  if (liiteOsa) {
    collectTextFragments(liiteOsa, appendixParts);
  }
  const appendix_text = appendixParts.length > 0 ? appendixParts.join("\n\n") : null;

  // Signatories from AllekirjoitusOsa
  const signatories: ProposalSignatory[] = [];
  const allekirjoitusOsa = he.AllekirjoitusOsa;
  const signature_date = normalizeText(allekirjoitusOsa?.PaivaysKooste);
  if (allekirjoitusOsa) {
    const allekirjoittajat = normalizeArray<Record<string, any>>(allekirjoitusOsa.Allekirjoittaja);
    for (const [index, allekirjoittaja] of allekirjoittajat.entries()) {
      const henkilo = allekirjoittaja?.Henkilo;
      if (!henkilo) continue;

      const firstName = normalizeText(henkilo.EtuNimi);
      const lastName = normalizeText(henkilo.SukuNimi);
      if (!firstName || !lastName) continue;

      signatories.push({
        signatory_order: index + 1,
        first_name: firstName,
        last_name: lastName,
        title_text: normalizeText(henkilo.AsemaTeksti),
      });
    }
  }

  // Subjects from metadata Aihe
  const subjects: ProposalSubject[] = [];
  const aiheet = normalizeArray<Record<string, any>>(meta?.Aihe);
  for (const aihe of aiheet) {
    const text = normalizeText(aihe?.AiheTeksti);
    if (text) {
      subjects.push({
        subject_text: text,
        yso_uri: normalizeText(aihe?.["@_muuTunnus"]),
      });
    }
  }

  // Laws from SaadosOsa
  const laws: ProposalLaw[] = [];
  const saadosOsa = he.SaadosOsa;
  if (saadosOsa) {
    const saadokset = normalizeArray<Record<string, any>>(saadosOsa.Saados);
    for (const [index, saados] of saadokset.entries()) {
      if (!saados || typeof saados !== "object") continue;
      const nimeke = saados.SaadosNimeke;
      laws.push({
        law_order: index + 1,
        law_type: normalizeText(nimeke?.SaadostyyppiKooste),
        law_name: normalizeText(nimeke?.SaadosNimekeKooste),
      });
    }
  }

  return {
    title,
    author,
    submission_date,
    summary_text,
    justification_text,
    proposal_text,
    appendix_text,
    signature_date,
    signatories,
    subjects,
    laws,
  };
}

/**
 * Extract data from a KasittelytiedotValtiopaivaasia variant.
 */
function parseKasittelytiedot(
  row: VaskiEntry,
  body: Record<string, any>,
  parsed: ReturnType<typeof parseParliamentIdentifier>,
  context: string,
): {
  title: string | null;
  submission_date: string | null;
  decision_outcome: string | null;
  decision_outcome_code: string | null;
  law_decision_text: string | null;
  latest_stage_code: string | null;
  end_date: string | null;
  stages: ProposalStage[];
  subjects: ProposalSubject[];
} {
  const kasittely = body.KasittelytiedotValtiopaivaasia;
  if (!kasittely || typeof kasittely !== "object") {
    throw new Error(`Missing KasittelytiedotValtiopaivaasia body (${context})`);
  }

  const identifiointiOsa = kasittely.IdentifiointiOsa || {};
  const title = normalizeText(identifiointiOsa.Nimeke?.NimekeTeksti);
  const submission_date = normalizeText(kasittely["@_laadintaPvm"]) ||
    normalizeText(identifiointiOsa.LaadintaPvmTeksti);

  const paatos = kasittely.EduskuntakasittelyPaatosKuvaus;
  const decision_outcome = normalizeText(paatos?.EduskuntakasittelyPaatosNimi);
  const decision_outcome_code = normalizeText(paatos?.["@_eduskuntakasittelyPaatosKoodi"]);

  // Law decision text from LakiehdotusJulkaisu
  const lawDecisionParts: string[] = [];
  const lakiehdotukset = normalizeArray<Record<string, any>>(paatos?.LakiehdotusJulkaisu);
  for (const laki of lakiehdotukset) {
    const name = normalizeText(laki?.NimekeTeksti);
    const paatosNimi = normalizeText(laki?.LakiehdotusPaatosKuvaus?.LakiehdotusPaatosNimi);
    if (name) {
      lawDecisionParts.push(paatosNimi ? `${name}: ${paatosNimi}` : name);
    }
  }
  const law_decision_text = lawDecisionParts.length > 0 ? lawDecisionParts.join("\n") : null;

  const latest_stage_code = normalizeText(kasittely["@_viimeisinKasittelyvaiheKoodi"]) ||
    normalizeText(kasittely["@_viimeisinYleinenKasittelyvaiheKoodi"]);
  const end_date = normalizeText(kasittely["@_paattymisPvm"]);

  // Processing stages
  const stages: ProposalStage[] = [];
  let stageOrder = 0;
  const yleinenVaiheet = normalizeArray<Record<string, any>>(kasittely.YleinenKasittelyvaihe);
  for (const vaihe of yleinenVaiheet) {
    if (!vaihe || typeof vaihe !== "object") continue;
    const stageTitle = normalizeText(vaihe.OtsikkoTeksti);
    const stageCode = normalizeText(vaihe["@_yleinenKasittelyvaiheKoodi"]);

    const toimenpiteet = normalizeArray<Record<string, any>>(vaihe.ToimenpideJulkaisu);
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
          collectTextFragments(fraasiPaatos.FraasiPaatosKappaleKooste, descParts);
        }
      }
      const eventDescription = descParts.length > 0 ? descParts.join("\n\n") : null;

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

  // Subjects
  const subjects: ProposalSubject[] = [];
  const asiasanat = kasittely.Asiasanat;
  const aiheet = normalizeArray<Record<string, any>>(
    asiasanat?.Aihe || asiasanat?.AsiaSana,
  );
  for (const aihe of aiheet) {
    const text = normalizeText(aihe?.AiheTeksti);
    if (text) {
      subjects.push({
        subject_text: text,
        yso_uri: normalizeText(aihe?.["@_muuTunnus"]),
      });
    }
  }

  return {
    title,
    submission_date,
    decision_outcome,
    decision_outcome_code,
    law_decision_text,
    latest_stage_code,
    end_date,
    stages,
    subjects,
  };
}

export default function createHallituksenEsitysSubMigrator(db: Database) {
  const insertProposal = db.prepare(
    `INSERT INTO GovernmentProposal (id, parliament_identifier, document_number, parliamentary_year, title, submission_date, author, summary_text, justification_text, proposal_text, appendix_text, signature_date, decision_outcome, decision_outcome_code, law_decision_text, latest_stage_code, end_date, source_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(parliament_identifier) DO UPDATE SET
       title = COALESCE(excluded.title, GovernmentProposal.title),
       submission_date = COALESCE(excluded.submission_date, GovernmentProposal.submission_date),
       author = COALESCE(excluded.author, GovernmentProposal.author),
       summary_text = COALESCE(excluded.summary_text, GovernmentProposal.summary_text),
       justification_text = COALESCE(excluded.justification_text, GovernmentProposal.justification_text),
       proposal_text = COALESCE(excluded.proposal_text, GovernmentProposal.proposal_text),
       appendix_text = COALESCE(excluded.appendix_text, GovernmentProposal.appendix_text),
       signature_date = COALESCE(excluded.signature_date, GovernmentProposal.signature_date),
       decision_outcome = COALESCE(excluded.decision_outcome, GovernmentProposal.decision_outcome),
       decision_outcome_code = COALESCE(excluded.decision_outcome_code, GovernmentProposal.decision_outcome_code),
       law_decision_text = COALESCE(excluded.law_decision_text, GovernmentProposal.law_decision_text),
       latest_stage_code = COALESCE(excluded.latest_stage_code, GovernmentProposal.latest_stage_code),
       end_date = COALESCE(excluded.end_date, GovernmentProposal.end_date),
       source_path = excluded.source_path`,
  );

  const deleteSignatories = db.prepare("DELETE FROM GovernmentProposalSignatory WHERE proposal_id = ?");
  const insertSignatory = db.prepare(
    "INSERT INTO GovernmentProposalSignatory (proposal_id, signatory_order, first_name, last_name, title_text) VALUES (?, ?, ?, ?, ?)",
  );

  const deleteSubjects = db.prepare("DELETE FROM GovernmentProposalSubject WHERE proposal_id = ?");
  const insertSubject = db.prepare(
    "INSERT OR IGNORE INTO GovernmentProposalSubject (proposal_id, subject_text, yso_uri) VALUES (?, ?, ?)",
  );

  const deleteLaws = db.prepare("DELETE FROM GovernmentProposalLaw WHERE proposal_id = ?");
  const insertLaw = db.prepare(
    "INSERT INTO GovernmentProposalLaw (proposal_id, law_order, law_type, law_name) VALUES (?, ?, ?, ?)",
  );

  const deleteStages = db.prepare("DELETE FROM GovernmentProposalStage WHERE proposal_id = ?");
  const insertStage = db.prepare(
    "INSERT INTO GovernmentProposalStage (proposal_id, stage_order, stage_title, stage_code, event_date, event_title, event_description) VALUES (?, ?, ?, ?, ?, ?, ?)",
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
        writeMigrationReport(row, "invalid_id", `Could not parse numeric id from '${row.id}'`);
        return;
      }

      const sourcePath = row._source?.vaskiPath
        ? `${row._source.vaskiPath}#id=${id}`
        : `vaski-data/hallituksen_esitys/unknown#id=${id}`;

      const isKasittelytiedot = !!body.KasittelytiedotValtiopaivaasia;
      const isHE = !!body.HallituksenEsitys;

      if (!isKasittelytiedot && !isHE) {
        writeMigrationReport(
          row,
          "unknown_body_type",
          `Body has neither KasittelytiedotValtiopaivaasia nor HallituksenEsitys (${context})`,
        );
        return;
      }

      try {
        if (isHE) {
          const data = parseHallituksenEsitys(row, body, parsed, context);

          insertProposal.run(
            id,
            parsed.identifier,
            parsed.number,
            parsed.year,
            data.title,
            data.submission_date,
            data.author,
            data.summary_text,
            data.justification_text,
            data.proposal_text,
            data.appendix_text,
            data.signature_date,
            null, // decision_outcome
            null, // decision_outcome_code
            null, // law_decision_text
            null, // latest_stage_code
            null, // end_date
            sourcePath,
          );

          const existing = db
            .query("SELECT id FROM GovernmentProposal WHERE parliament_identifier = ? LIMIT 1")
            .get(parsed.identifier) as { id: number } | undefined;
          const proposalId = existing?.id ?? id;

          if (data.signatories.length > 0) {
            deleteSignatories.run(proposalId);
            for (const sig of data.signatories) {
              insertSignatory.run(
                proposalId,
                sig.signatory_order,
                sig.first_name,
                sig.last_name,
                sig.title_text,
              );
            }
          }

          if (data.laws.length > 0) {
            deleteLaws.run(proposalId);
            for (const law of data.laws) {
              insertLaw.run(proposalId, law.law_order, law.law_type, law.law_name);
            }
          }

          for (const subject of data.subjects) {
            insertSubject.run(proposalId, subject.subject_text, subject.yso_uri);
          }
        } else if (isKasittelytiedot) {
          const data = parseKasittelytiedot(row, body, parsed, context);

          insertProposal.run(
            id,
            parsed.identifier,
            parsed.number,
            parsed.year,
            data.title,
            data.submission_date,
            null, // author
            null, // summary_text
            null, // justification_text
            null, // proposal_text
            null, // appendix_text
            null, // signature_date
            data.decision_outcome,
            data.decision_outcome_code,
            data.law_decision_text,
            data.latest_stage_code,
            data.end_date,
            sourcePath,
          );

          const existing = db
            .query("SELECT id FROM GovernmentProposal WHERE parliament_identifier = ? LIMIT 1")
            .get(parsed.identifier) as { id: number } | undefined;
          const proposalId = existing?.id ?? id;

          if (data.stages.length > 0) {
            deleteStages.run(proposalId);
            for (const stage of data.stages) {
              insertStage.run(
                proposalId,
                stage.stage_order,
                stage.stage_title,
                stage.stage_code,
                stage.event_date,
                stage.event_title,
                stage.event_description,
              );
            }
          }

          for (const subject of data.subjects) {
            insertSubject.run(proposalId, subject.subject_text, subject.yso_uri);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        writeMigrationReport(row, "parse_error_row_skipped", message);
      }
    },

    flush() {
      insertProposal.finalize();
      deleteSignatories.finalize();
      insertSignatory.finalize();
      deleteSubjects.finalize();
      insertSubject.finalize();
      deleteLaws.finalize();
      insertLaw.finalize();
      deleteStages.finalize();
      insertStage.finalize();
    },
  };
}
