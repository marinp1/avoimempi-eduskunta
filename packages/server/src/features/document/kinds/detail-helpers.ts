import type {
  AsiakirjaViewModel,
  TextSection,
  Signatory,
} from "../pages/detail.page";
import type { PersonRepository } from "#server/features/person/person.repository";
import { richTextToHtml } from "#server/components/rich-text";
import i18next from "i18next";
import { resolveParty, findCurrentDistrict } from "#server/domain";

export function authorsByName(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  return (
    [first, last].filter(Boolean).join(" ") ||
    i18next.t("documents:detail.unknown_author")
  );
}

export function initialsFrom(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  return (
    `${first?.charAt(0) ?? ""}${last?.charAt(0) ?? ""}`.toUpperCase() || "?"
  );
}

export function splitParagraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  const parts = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text.trim()].filter(Boolean);
}

export function buildTextSection(
  heading: string,
  plainText: string | null | undefined,
  richTextJson: string | null | undefined,
): TextSection | null {
  const html = richTextToHtml(richTextJson);
  const paragraphs = splitParagraphs(plainText);
  if (!html && paragraphs.length === 0) return null;
  return { heading, paragraphs, html: html || null };
}

export function textCharCount(sections: TextSection[]): number {
  return sections.reduce(
    (sum, s) => sum + s.paragraphs.reduce((ss, p) => ss + p.length, 0),
    0,
  );
}

export function mpDistrict(
  personId: number | null | undefined,
  personRepo: PersonRepository,
): string | null {
  if (!personId) return null;
  const districts = personRepo.fetchRepresentativeDistricts({
    personId: String(personId),
  });
  const current = findCurrentDistrict(districts);
  return (
    (current?.district_name ?? districts[0]?.district_name ?? null)
      ?.replace(/ vaalipiiri$/, "")
      ?.replace(/n$/, "") ?? null
  );
}

export interface DocStage {
  stage_order?: number;
  stage_title?: string;
  stage_code?: string | null;
  event_date?: string | null;
  event_title?: string | null;
  event_description?: string | null;
}

export function buildLifecycleFromStages(
  stages: DocStage[],
): AsiakirjaViewModel["lifecycleStages"] {
  const result: AsiakirjaViewModel["lifecycleStages"] = [];
  for (const s of stages) {
    result.push({
      step: result.length + 1,
      label: String(
        s.stage_title ||
          s.event_title ||
          i18next.t("documents:detail.stage_processing"),
      ),
      date: s.event_date ?? null,
      done: true,
    });
  }
  return result;
}

export interface DocSigner {
  person_id: number | null;
  first_name: string;
  last_name: string;
  party: string | null;
  is_first_signer?: number;
  signer_order?: number;
}

export function mapMpSignatories(rawSigners: DocSigner[]): Signatory[] {
  return rawSigners.map((s) => {
    const party = s.party ? resolveParty(s.party) : null;
    return {
      name:
        [s.first_name, s.last_name].filter(Boolean).join(" ") ||
        i18next.t("documents:detail.unknown_author"),
      role: s.is_first_signer
        ? i18next.t("documents:detail.first_signer")
        : i18next.t("documents:detail.signer"),
      party: party?.code ?? null,
      partyColor: party?.color ?? null,
      personId: s.person_id ?? null,
    };
  });
}

export interface DocSubject {
  subject_text: string;
}

export function mapSubjects(
  subjects: DocSubject[] | string | null | undefined,
): string[] {
  if (!subjects) return [];
  if (Array.isArray(subjects))
    return subjects.map((s) => s.subject_text ?? "").filter(Boolean);
  if (typeof subjects === "string") return subjects.split("||").filter(Boolean);
  return [];
}

export interface DocSession {
  session_key: string;
  session_date: string;
  session_number: number;
  session_year: string;
  section_title: string | null;
}

export function mapSessions(
  sessions: DocSession[] | null | undefined,
): AsiakirjaViewModel["sessions"] {
  const list = sessions ?? [];
  return list.map((s) => ({
    sessionKey: String(s.session_key ?? ""),
    sessionDate: String(s.session_date ?? ""),
    sessionNumber: Number(s.session_number ?? 0),
    sessionYear: String(s.session_year ?? ""),
    sectionTitle: s.section_title ? String(s.section_title) : null,
  }));
}
