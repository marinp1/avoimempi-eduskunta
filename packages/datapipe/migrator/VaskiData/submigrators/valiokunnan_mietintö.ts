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
    join(process.cwd(), "data", "migration-reports", "VaskiData", "valiokunnan_mietintö");
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
  typeCode: string;
  number: number;
  year: string;
} | null {
  const normalized = normalizeText(eduskuntaTunnus);
  if (!normalized) return null;

  const match = normalized.match(/^([A-ZÄÖa-zäö]+[A-Za-z]M)\s+(\d+)\/(\d+)\s*(?:vp)?$/i);
  if (!match) return null;

  const typeCode = match[1];
  const number = Number.parseInt(match[2], 10);
  const year = match[3];
  if (Number.isNaN(number)) return null;

  return {
    identifier: `${typeCode} ${number}/${year} vp`,
    typeCode,
    number,
    year,
  };
}

type CommitteeReportMember = {
  member_order: number;
  person_id: number | null;
  first_name: string;
  last_name: string;
  party: string | null;
  role: string | null;
};

type CommitteeReportExpert = {
  expert_order: number;
  person_id: number | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  organization: string | null;
};

function parseMietinto(
  row: VaskiEntry,
  body: Record<string, any>,
  parsed: ReturnType<typeof parseParliamentIdentifier> & {},
  context: string,
): {
  title: string | null;
  committee_name: string | null;
  source_reference: string | null;
  draft_date: string | null;
  signature_date: string | null;
  edk_identifier: string | null;
  summary_text: string | null;
  general_reasoning_text: string | null;
  detailed_reasoning_text: string | null;
  decision_text: string | null;
  legislation_amendment_text: string | null;
  minority_opinion_text: string | null;
  resolution_text: string | null;
  members: CommitteeReportMember[];
  experts: CommitteeReportExpert[];
} {
  const mietinto = body.Mietinto;
  if (!mietinto || typeof mietinto !== "object") {
    throw new Error(`Missing Mietinto body (${context})`);
  }

  const meta = getMeta(row);
  const identOsa = mietinto.IdentifiointiOsa || {};
  const title = normalizeText(identOsa.Nimeke?.NimekeTeksti);
  const committee_name = normalizeText(identOsa.OrganisaatioTeksti);
  const draft_date = normalizeText(identOsa["@_laadintaPvm"]) ||
    normalizeText(meta?.["@_laadintaPvm"]);
  const edk_identifier = normalizeText(meta?.EduskuntaTunniste?.["@_asiakirjaEduskuntaTunnus"]);

  const asiaKuvaus = mietinto.AsiaKuvaus;
  const vireilletulo = asiaKuvaus?.VireilletuloAsia || asiaKuvaus?.Vireilletulo;
  const source_reference = normalizeText(vireilletulo?.EduskuntaTunnus) ||
    normalizeText(vireilletulo?.EduskuntaTunnusTeksti);

  const osallistujaOsa = mietinto.OsallistujaOsa;
  const signature_date = normalizeText(osallistujaOsa?.PaivaysKooste?.["@_allekirjoitusPvm"]);

  const summaryParts: string[] = [];
  collectTextFragments(mietinto.SisaltoKuvaus, summaryParts);
  const summary_text = summaryParts.length > 0 ? summaryParts.join("\n\n") : null;

  const perusteluOsat = normalizeArray<Record<string, any>>(mietinto.PerusteluOsa);
  let general_reasoning_text: string | null = null;
  let detailed_reasoning_text: string | null = null;

  if (perusteluOsat.length === 1) {
    const parts: string[] = [];
    collectTextFragments(perusteluOsat[0], parts);
    general_reasoning_text = parts.length > 0 ? parts.join("\n\n") : null;
  } else if (perusteluOsat.length >= 2) {
    const generalParts: string[] = [];
    collectTextFragments(perusteluOsat[0], generalParts);
    general_reasoning_text = generalParts.length > 0 ? generalParts.join("\n\n") : null;

    const detailedParts: string[] = [];
    for (let i = 1; i < perusteluOsat.length; i++) {
      collectTextFragments(perusteluOsat[i], detailedParts);
    }
    detailed_reasoning_text = detailedParts.length > 0 ? detailedParts.join("\n\n") : null;
  }

  const decisionParts: string[] = [];
  collectTextFragments(mietinto.PaatosOsa, decisionParts);
  const decision_text = decisionParts.length > 0 ? decisionParts.join("\n\n") : null;

  const legislationParts: string[] = [];
  collectTextFragments(mietinto.SaadosOsa, legislationParts);
  const legislation_amendment_text = legislationParts.length > 0 ? legislationParts.join("\n\n") : null;

  const minorityParts: string[] = [];
  collectTextFragments(mietinto.JasenMielipideOsa, minorityParts);
  const minority_opinion_text = minorityParts.length > 0 ? minorityParts.join("\n\n") : null;

  const resolutionParts: string[] = [];
  collectTextFragments(mietinto.LausumaKannanottoOsa, resolutionParts);
  const resolution_text = resolutionParts.length > 0 ? resolutionParts.join("\n\n") : null;

  const members: CommitteeReportMember[] = [];
  if (osallistujaOsa) {
    const toimijat = normalizeArray<Record<string, any>>(osallistujaOsa.Toimija);
    for (const [index, toimija] of toimijat.entries()) {
      const henkilo = toimija?.Henkilo;
      if (!henkilo) continue;

      const firstName = normalizeText(henkilo.EtuNimi);
      const lastName = normalizeText(henkilo.SukuNimi);
      if (!firstName || !lastName) continue;

      members.push({
        member_order: index + 1,
        person_id: parseOptionalInteger(henkilo["@_muuTunnus"], "person_id", context),
        first_name: firstName,
        last_name: lastName,
        party: normalizeText(henkilo.LisatietoTeksti),
        role: normalizeText(toimija["@_rooliKoodi"]) ||
          normalizeText(toimija.TarkennusAsemaTeksti),
      });
    }
  }

  const experts: CommitteeReportExpert[] = [];
  if (asiaKuvaus) {
    const toimenpiteet = normalizeArray<Record<string, any>>(asiaKuvaus.AsiantuntijatToimenpide);
    let expertOrder = 0;
    for (const toimenpide of toimenpiteet) {
      const asiantuntijat = normalizeArray<Record<string, any>>(toimenpide?.Asiantuntija);
      for (const asiantuntija of asiantuntijat) {
        expertOrder++;
        const henkilo = asiantuntija?.Henkilo;
        experts.push({
          expert_order: expertOrder,
          person_id: henkilo ? parseOptionalInteger(henkilo["@_muuTunnus"], "expert_person_id", context) : null,
          first_name: henkilo ? normalizeText(henkilo.EtuNimi) : null,
          last_name: henkilo ? normalizeText(henkilo.SukuNimi) : null,
          title: henkilo ? normalizeText(henkilo.AsemaTeksti) : null,
          organization: normalizeText(asiantuntija.YhteisoTeksti),
        });
      }
    }
  }

  return {
    title,
    committee_name,
    source_reference,
    draft_date,
    signature_date,
    edk_identifier,
    summary_text,
    general_reasoning_text,
    detailed_reasoning_text,
    decision_text,
    legislation_amendment_text,
    minority_opinion_text,
    resolution_text,
    members,
    experts,
  };
}

export default function createValiokunnanMietintoSubMigrator(db: Database) {
  const insertReport = db.prepare(
    `INSERT INTO CommitteeReport (id, parliament_identifier, report_type_code, document_number, parliamentary_year, title, committee_name, source_reference, draft_date, signature_date, language, edk_identifier, summary_text, general_reasoning_text, detailed_reasoning_text, decision_text, legislation_amendment_text, minority_opinion_text, resolution_text, source_path)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'fi', ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(parliament_identifier) DO UPDATE SET
       title = COALESCE(excluded.title, CommitteeReport.title),
       committee_name = COALESCE(excluded.committee_name, CommitteeReport.committee_name),
       source_reference = COALESCE(excluded.source_reference, CommitteeReport.source_reference),
       draft_date = COALESCE(excluded.draft_date, CommitteeReport.draft_date),
       signature_date = COALESCE(excluded.signature_date, CommitteeReport.signature_date),
       edk_identifier = COALESCE(excluded.edk_identifier, CommitteeReport.edk_identifier),
       summary_text = COALESCE(excluded.summary_text, CommitteeReport.summary_text),
       general_reasoning_text = COALESCE(excluded.general_reasoning_text, CommitteeReport.general_reasoning_text),
       detailed_reasoning_text = COALESCE(excluded.detailed_reasoning_text, CommitteeReport.detailed_reasoning_text),
       decision_text = COALESCE(excluded.decision_text, CommitteeReport.decision_text),
       legislation_amendment_text = COALESCE(excluded.legislation_amendment_text, CommitteeReport.legislation_amendment_text),
       minority_opinion_text = COALESCE(excluded.minority_opinion_text, CommitteeReport.minority_opinion_text),
       resolution_text = COALESCE(excluded.resolution_text, CommitteeReport.resolution_text),
       source_path = excluded.source_path`,
  );

  const deleteMembers = db.prepare("DELETE FROM CommitteeReportMember WHERE report_id = ?");
  const insertMember = db.prepare(
    "INSERT INTO CommitteeReportMember (report_id, member_order, person_id, first_name, last_name, party, role) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );

  const deleteExperts = db.prepare("DELETE FROM CommitteeReportExpert WHERE report_id = ?");
  const insertExpert = db.prepare(
    "INSERT INTO CommitteeReportExpert (report_id, expert_order, person_id, first_name, last_name, title, organization) VALUES (?, ?, ?, ?, ?, ?, ?)",
  );

  const linkVaskiDocument = db.prepare(
    "UPDATE CommitteeReport SET vaski_document_id = ? WHERE id = ?",
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

      if (!body.Mietinto) {
        writeMigrationReport(
          row,
          "no_mietinto_body",
          `Body has no Mietinto section for ${parsed.identifier}`,
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
        : `vaski-data/valiokunnan_mietintö/unknown#id=${id}`;

      try {
        const data = parseMietinto(row, body, parsed, context);

        insertReport.run(
          id,
          parsed.identifier,
          parsed.typeCode,
          parsed.number,
          parsed.year,
          data.title,
          data.committee_name,
          data.source_reference,
          data.draft_date,
          data.signature_date,
          data.edk_identifier,
          data.summary_text,
          data.general_reasoning_text,
          data.detailed_reasoning_text,
          data.decision_text,
          data.legislation_amendment_text,
          data.minority_opinion_text,
          data.resolution_text,
          sourcePath,
        );

        const existing = db
          .query("SELECT id FROM CommitteeReport WHERE parliament_identifier = ? LIMIT 1")
          .get(parsed.identifier) as { id: number } | undefined;
        const reportId = existing?.id ?? id;

        linkVaskiDocument.run(id, reportId);
        if (data.title) updateVaskiTitle.run(data.title, id);

        if (data.members.length > 0) {
          deleteMembers.run(reportId);
          for (const member of data.members) {
            insertMember.run(
              reportId,
              member.member_order,
              member.person_id,
              member.first_name,
              member.last_name,
              member.party,
              member.role,
            );
          }
        }

        if (data.experts.length > 0) {
          deleteExperts.run(reportId);
          for (const expert of data.experts) {
            insertExpert.run(
              reportId,
              expert.expert_order,
              expert.person_id,
              expert.first_name,
              expert.last_name,
              expert.title,
              expert.organization,
            );
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        writeMigrationReport(row, "parse_error_row_skipped", message);
      }
    },

    async flush() {
      insertReport.finalize();
      deleteMembers.finalize();
      insertMember.finalize();
      deleteExperts.finalize();
      insertExpert.finalize();
      linkVaskiDocument.finalize();
      updateVaskiTitle.finalize();
    },
  };
}
