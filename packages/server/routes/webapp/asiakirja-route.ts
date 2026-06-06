import Asiakirja, {
  type AsiakirjaViewModel,
  type TextSection,
  type Signatory,
  type Law,
} from "../../../webapp/templates/pages/asiakirja";
import {
  partyColor,
  fetchedAt,
  formatFi,
} from "../../../webapp/templates/helpers";
import { richTextToHtml } from "../../../webapp/templates/components/rich-text";
import { renderFullPage } from "../../../webapp/eta";
import {
  page,
  getWebappContext,
  isHtmx,
  getPeriodSelectorData,
} from "./helpers";
import { assetVersion } from "./assets";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#shared-helpers";
import {
  type DocumentKind,
  DOC_KIND_REGISTRY,
  LA_LABELS,
  REPORT_LABELS,
} from "#shared/constants/DocumentKinds";

interface DocSigner {
  person_id: number | null;
  first_name: string;
  last_name: string;
  party: string | null;
  is_first_signer?: number;
  signer_order?: number;
}

interface DocStage {
  stage_order?: number;
  stage_title?: string;
  stage_code?: string | null;
  event_date?: string | null;
  event_title?: string | null;
  event_description?: string | null;
}

interface DocSession {
  session_key: string;
  session_date: string;
  session_number: number;
  session_year: string;
  section_title: string | null;
}

interface DocMember {
  person_id: number | null;
  first_name: string | null;
  last_name: string | null;
  party?: string | null;
  role?: string | null;
  title?: string | null;
  organization?: string | null;
}

interface DocSignatory {
  person_id?: number | null;
  first_name: string;
  last_name: string;
  title_text?: string | null;
  signatory_order?: number;
}

interface DocLaw {
  law_order: number;
  law_type: string | null;
  law_name: string | null;
}

interface DocSubject {
  subject_text: string;
}

interface DocDetail {
  stages?: DocStage[];
  signers?: DocSigner[];
  signatories?: DocSignatory[];
  members?: DocMember[];
  experts?: DocMember[];
  laws?: DocLaw[];
  subjects?: unknown;
  sessions?: DocSession[];
}

const KIND_BUILDERS: Record<DocumentKind, BuilderFn | undefined> = {
  kk: buildWrittenQuestion,
  suullinen: buildOralQuestion,
  valikysymys: buildInterpellation,
  he: buildGovernmentProposal,
  aloite: buildLegislativeInitiative,
  mietinto: buildCommitteeReport,
  vastaus: buildWrittenQuestion,
  asiantuntija: undefined, // expert statements are not supported as standalone documents — available via committee reports
  "vastaus-edk": buildParliamentAnswer,
};

type BuilderFn = (id: string, deps: WebappDeps) => AsiakirjaViewModel | null;

export function createAsiakirjaRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/asiakirja/:id",
    GET: (req, params) => {
      const rawId = params.id;
        if (!rawId || !/^\d+$/.test(rawId)) {
          return notFoundResponse(req);
        }
        const id = rawId;

        const url = new URL(req.url);
        const kind = (url.searchParams.get("kind") ?? "kk") as DocumentKind;

        const builder = KIND_BUILDERS[kind];
        const data = builder ? builder(id, deps) : null;
        if (!data) return notFoundResponse(req);

        const { tlData } = getWebappContext(req, deps);
        const periodData = getPeriodSelectorData(req, deps.metadataRepository);
        return page({
          req,
          fragment: Asiakirja({ data }),
          activePath: "/asiakirjat",
          title: data.identifier,
          timelineData: tlData,
          periodData,
        });
      },
  });
}

function notFoundResponse(req: Request): Response {
  const htmx = isHtmx(req);
  const fragment = `<title>${i18next.t("common:page_title_format", { title: i18next.t("asiakirjat:detail.not_found_title"), brand: i18next.t("common:brand_name") })}</title>
<div class="wrap">
  <section class="page-head">
    <h1>${i18next.t("asiakirjat:detail.not_found_title")}</h1>
    <p class="sub">${i18next.t("asiakirjat:detail.not_found_desc")}</p>
    <p><a href="/asiakirjat">${i18next.t("asiakirjat:detail.back_to_docs")}</a></p>
  </section>
</div>`;
  const body = htmx
    ? fragment
    : renderFullPage(fragment, {
        activePath: "/asiakirjat",
        title: i18next.t("asiakirjat:detail.not_found_title"),
        assetVersion,
      });
  return new Response(body, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", Vary: "HX-Request" },
  });
}

// ─── Shared helpers ───────────────────────────────────────

function authorsByName(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  return (
    [first, last].filter(Boolean).join(" ") ||
    i18next.t("asiakirjat:detail.unknown_author")
  );
}

function initialsFrom(
  first: string | null | undefined,
  last: string | null | undefined,
): string {
  return (
    `${first?.charAt(0) ?? ""}${last?.charAt(0) ?? ""}`.toUpperCase() || "?"
  );
}

function splitParagraphs(text: string | null | undefined): string[] {
  if (!text) return [];
  const parts = text
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [text.trim()].filter(Boolean);
}

function buildTextSection(
  heading: string,
  plainText: string | null | undefined,
  richTextJson: string | null | undefined,
): TextSection | null {
  const html = richTextToHtml(richTextJson);
  const paragraphs = splitParagraphs(plainText);
  if (!html && paragraphs.length === 0) return null;
  return { heading, paragraphs, html: html || null };
}

function textCharCount(sections: TextSection[]): number {
  return sections.reduce(
    (sum, s) => sum + s.paragraphs.reduce((ss, p) => ss + p.length, 0),
    0,
  );
}

function mapSessions(
  detail: DocDetail,
): AsiakirjaViewModel["sessions"] {
  const sessions = detail.sessions ?? [];
  return sessions.map((s) => ({
    sessionKey: String(s.session_key ?? ""),
    sessionDate: String(s.session_date ?? ""),
    sessionNumber: Number(s.session_number ?? 0),
    sessionYear: String(s.session_year ?? ""),
    sectionTitle: s.section_title ? String(s.section_title) : null,
  }));
}

function mapSubjects(detail: DocDetail): string[] {
  const raw = detail.subjects;
  if (!raw) return [];
  if (Array.isArray(raw))
    return (raw as DocSubject[])
      .map((s) => s.subject_text ?? "")
      .filter(Boolean);
  if (typeof raw === "string") return raw.split("||").filter(Boolean);
  return [];
}

function mpDistrict(
  personId: number | null | undefined,
  deps: WebappDeps,
): string | null {
  if (!personId) return null;
  const districts = deps.personRepository.fetchRepresentativeDistricts({
    id: String(personId),
  });
  const current = districts.find((d) => !d.end_date);
  return (
    (current?.district_name ?? districts[0]?.district_name ?? null)
      ?.replace(/ vaalipiiri$/, "")
      ?.replace(/n$/, "") ?? null
  );
}

// ─── Kind-specific builders ────────────────────────────────

function buildWrittenQuestion(
  id: string,
  deps: WebappDeps,
): AsiakirjaViewModel | null {
  const detail = deps.documentRepository.fetchWrittenQuestionById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? "";
  const answerDate = detail.answer_date ?? null;

  const lifecycleStages: AsiakirjaViewModel["lifecycleStages"] = [];
  if (submissionDate) {
    lifecycleStages.push({
      step: 1,
      label: i18next.t("asiakirjat:detail.stage_question_submitted"),
      date: submissionDate,
      done: true,
    });
  }
  const rawStages = (detail as DocDetail).stages;
  if (rawStages) {
    for (const s of rawStages) {
      lifecycleStages.push({
        step: lifecycleStages.length + 1,
        label: String(
          s.stage_title ||
          s.event_title ||
          i18next.t("asiakirjat:detail.stage_processing")),
        date: s.event_date ?? null,
        done: true,
      });
    }
  }
  if (answerDate) {
    lifecycleStages.push({
      step: lifecycleStages.length + 1,
      label: i18next.t("asiakirjat:detail.stage_minister_answer"),
      date: answerDate,
      done: true,
      tag: "vastattu",
    });
  }

  const textSections: TextSection[] = [];
  const qs = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_question"),
    detail.question_text,
    detail.question_rich_text,
  );
  if (qs) textSections.push(qs);

  const rawSigners =
    ((detail as DocDetail).signers ?? []);
  const signatories: Signatory[] = rawSigners.map((s) => ({
    name:
      ([s.first_name, s.last_name].filter(Boolean).join(" ") as string) ||
      i18next.t("asiakirjat:detail.unknown_author"),
    role: s.is_first_signer
      ? i18next.t("asiakirjat:detail.first_signer")
      : i18next.t("asiakirjat:detail.signer"),
    party: (s.party as string) ?? null,
    partyColor: s.party ? partyColor(s.party as string) : null,
    personId: (s.person_id as number) ?? null,
  }));

  const authorParty = detail.first_signer_party ?? "";
  return {
    kind: "kk",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: i18next.t(DOC_KIND_REGISTRY.kk.detailLabelI18n),
    title: detail.title ?? "",
    authorName: authorsByName(
      detail.first_signer_first_name,
      detail.first_signer_last_name,
    ),
    authorRole: i18next.t("asiakirjat:detail.mp_role"),
    authorParty,
    authorPartyColor: partyColor(authorParty),
    authorPersonId: detail.first_signer_person_id,
    authorInitials: initialsFrom(
      detail.first_signer_first_name,
      detail.first_signer_last_name,
    ),
    authorDistrict: mpDistrict(detail.first_signer_person_id, deps),
    primaryDate: formatFi(submissionDate),
    primaryDateLabel: i18next.t("asiakirjat:status_labels.submitted"),
    secondaryDate: answerDate ? formatFi(answerDate) : null,
    secondaryDateLabel: answerDate
      ? i18next.t("asiakirjat:status_labels.answered")
      : null,
    statusLabel: answerDate
      ? i18next.t("asiakirjat:status_labels.answered_on", {
          date: formatFi(answerDate),
        })
      : submissionDate
        ? i18next.t("asiakirjat:status_labels.submitted_on", {
            date: formatFi(submissionDate),
          })
        : i18next.t("asiakirjat:status_labels.pending"),
    statusColor: answerDate ? "var(--hall)" : "var(--muted)",
    textSections,
    lifecycleStages,
    hasAnswer: answerDate !== null,
    answerIdentifier: detail.answer_parliament_identifier,
    answerDate,
    answerMinisterTitle: detail.answer_minister_title,
    answerMinisterName:
      authorsByName(
        detail.answer_minister_first_name,
        detail.answer_minister_last_name,
      ) || null,
    signatories,
    laws: [],
    sourceReference: null,
    subjects: mapSubjects(detail as DocDetail),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as DocDetail),
    fetchedAt: fetchedAt(),
  };
}

function buildOralQuestion(
  id: string,
  deps: WebappDeps,
): AsiakirjaViewModel | null {
  const detail = deps.documentRepository.fetchOralQuestionById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? "";
  const lifecycleStages = buildLifecycleFromStages(
    ((detail as DocDetail).stages ?? []),
  );

  const textSections: TextSection[] = [];
  const qs = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_oral_question"),
    detail.question_text,
    null,
  );
  if (qs) textSections.push(qs);

  const author = detail.asker_text ?? "";

  return {
    kind: "suullinen",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: i18next.t(DOC_KIND_REGISTRY.suullinen.detailLabelI18n),
    title: detail.title ?? "",
    authorName: author || i18next.t("asiakirjat:detail.unknown_author"),
    authorRole: null,
    authorParty: null,
    authorPartyColor: "#999999",
    authorPersonId: null,
    authorInitials: author ? author.slice(0, 2).toUpperCase() : "?",
    authorDistrict: null,
    primaryDate: formatFi(submissionDate),
    primaryDateLabel: i18next.t("asiakirjat:status_labels.submitted"),
    secondaryDate: null,
    secondaryDateLabel: null,
    statusLabel: detail.decision_outcome
      ? i18next.t("asiakirjat:status_labels.handled")
      : submissionDate
        ? i18next.t("asiakirjat:status_labels.submitted_on", {
            date: formatFi(submissionDate),
          })
        : i18next.t("asiakirjat:status_labels.pending"),
    statusColor: detail.decision_outcome ? "var(--hall)" : "var(--muted)",
    textSections,
    lifecycleStages,
    hasAnswer: false,
    answerIdentifier: null,
    answerDate: null,
    answerMinisterTitle: null,
    answerMinisterName: null,
    signatories: [],
    laws: [],
    sourceReference: null,
    subjects: mapSubjects(detail as DocDetail),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as DocDetail),
    fetchedAt: fetchedAt(),
  };
}

function buildInterpellation(
  id: string,
  deps: WebappDeps,
): AsiakirjaViewModel | null {
  const detail = deps.documentRepository.fetchInterpellationById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? "";
  const lifecycleStages = buildLifecycleFromStages(
    ((detail as DocDetail).stages ?? []),
  );

  const textSections: TextSection[] = [];
  const qs = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_interpellation"),
    detail.question_text,
    detail.question_rich_text,
  );
  if (qs) textSections.push(qs);
  const rs = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_resolution"),
    detail.resolution_text,
    detail.resolution_rich_text,
  );
  if (rs) textSections.push(rs);

  const rawSigners =
    ((detail as DocDetail).signers ?? []);
  const signatories: Signatory[] = rawSigners.map((s) => ({
    name:
      ([s.first_name, s.last_name].filter(Boolean).join(" ") as string) ||
      i18next.t("asiakirjat:detail.unknown_author"),
    role: s.is_first_signer
      ? i18next.t("asiakirjat:detail.first_signer")
      : i18next.t("asiakirjat:detail.signer"),
    party: (s.party as string) ?? null,
    partyColor: s.party ? partyColor(s.party as string) : null,
    personId: (s.person_id as number) ?? null,
  }));

  const authorParty = detail.first_signer_party ?? "";
  return {
    kind: "valikysymys",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: i18next.t(DOC_KIND_REGISTRY.valikysymys.detailLabelI18n),
    title: detail.title ?? "",
    authorName: authorsByName(
      detail.first_signer_first_name,
      detail.first_signer_last_name,
    ),
    authorRole: i18next.t("asiakirjat:detail.mp_role"),
    authorParty,
    authorPartyColor: partyColor(authorParty),
    authorPersonId: detail.first_signer_person_id,
    authorInitials: initialsFrom(
      detail.first_signer_first_name,
      detail.first_signer_last_name,
    ),
    authorDistrict: mpDistrict(detail.first_signer_person_id, deps),
    primaryDate: formatFi(submissionDate),
    primaryDateLabel: i18next.t("asiakirjat:status_labels.submitted"),
    secondaryDate: null,
    secondaryDateLabel: null,
    statusLabel: detail.decision_outcome
      ? i18next.t("asiakirjat:status_labels.handled")
      : i18next.t("asiakirjat:status_labels.pending"),
    statusColor: detail.decision_outcome ? "var(--hall)" : "var(--muted)",
    textSections,
    lifecycleStages,
    hasAnswer: false,
    answerIdentifier: null,
    answerDate: null,
    answerMinisterTitle: null,
    answerMinisterName: null,
    signatories,
    laws: [],
    sourceReference: null,
    subjects: mapSubjects(detail as DocDetail),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as DocDetail),
    fetchedAt: fetchedAt(),
  };
}

function buildGovernmentProposal(
  id: string,
  deps: WebappDeps,
): AsiakirjaViewModel | null {
  const detail = deps.documentRepository.fetchGovernmentProposalById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? "";
  const lifecycleStages = buildLifecycleFromStages(
    ((detail as DocDetail).stages ?? []),
  );

  const textSections: TextSection[] = [];
  const sum = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_summary"),
    detail.summary_text,
    detail.summary_rich_text,
  );
  if (sum) textSections.push(sum);
  const jst = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_justification"),
    detail.justification_text,
    detail.justification_rich_text,
  );
  if (jst) textSections.push(jst);
  const prop = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_proposal"),
    detail.proposal_text,
    detail.proposal_rich_text,
  );
  if (prop) textSections.push(prop);
  const app = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_appendix"),
    detail.appendix_text,
    detail.appendix_rich_text,
  );
  if (app) textSections.push(app);

  const rawSignatories =
    ((detail as DocDetail).signatories ?? []);
  const signatories: Signatory[] = rawSignatories.map((s) => ({
    name:
      ([s.first_name, s.last_name].filter(Boolean).join(" ") as string) ||
      i18next.t("asiakirjat:detail.unknown_author"),
    role: (s.title_text as string) ?? null,
    party: null,
    partyColor: null,
    personId: null,
  }));

  const rawLaws =
    ((detail as DocDetail).laws ?? []);
  const laws: Law[] = rawLaws.map((l) => ({
    order: l.law_order as number,
    type: (l.law_type as string) ?? null,
    name: (l.law_name as string) ?? null,
  }));

  const author = detail.author ?? "";
  return {
    kind: "he",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: i18next.t(DOC_KIND_REGISTRY.he.detailLabelI18n),
    title: detail.title ?? "",
    authorName: author || i18next.t("asiakirjat:detail.unknown_author"),
    authorRole: i18next.t("asiakirjat:detail.ministry_role"),
    authorParty: null,
    authorPartyColor: "#999999",
    authorPersonId: null,
    authorInitials: author ? author.slice(0, 2).toUpperCase() : "?",
    authorDistrict: null,
    primaryDate: formatFi(submissionDate),
    primaryDateLabel: i18next.t("asiakirjat:status_labels.submitted"),
    secondaryDate: detail.signature_date
      ? formatFi(detail.signature_date)
      : null,
    secondaryDateLabel: detail.signature_date
      ? i18next.t("asiakirjat:status_labels.signed")
      : null,
    statusLabel: detail.decision_outcome
      ? i18next.t("asiakirjat:status_labels.handled")
      : i18next.t("asiakirjat:status_labels.pending"),
    statusColor: detail.decision_outcome ? "var(--hall)" : "var(--muted)",
    textSections,
    lifecycleStages,
    hasAnswer: false,
    answerIdentifier: null,
    answerDate: null,
    answerMinisterTitle: null,
    answerMinisterName: null,
    signatories,
    laws,
    sourceReference: null,
    subjects: mapSubjects(detail as DocDetail),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as DocDetail),
    fetchedAt: fetchedAt(),
  };
}

function buildLegislativeInitiative(
  id: string,
  deps: WebappDeps,
): AsiakirjaViewModel | null {
  const detail = deps.documentRepository.fetchLegislativeInitiativeById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? "";
  const typeCode = detail.initiative_type_code ?? "";
  const lifecycleStages = buildLifecycleFromStages(
    ((detail as DocDetail).stages ?? []),
  );

  const textSections: TextSection[] = [];
  const jst = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_justification"),
    detail.justification_text,
    detail.justification_rich_text,
  );
  if (jst) textSections.push(jst);
  const prop = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_proposal"),
    detail.proposal_text,
    detail.proposal_rich_text,
  );
  if (prop) textSections.push(prop);
  const law = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_law_text"),
    detail.law_text,
    detail.law_rich_text,
  );
  if (law) textSections.push(law);

  const rawSigners =
    ((detail as DocDetail).signers ?? []);
  const signatories: Signatory[] = rawSigners.map((s) => ({
    name:
      ([s.first_name, s.last_name].filter(Boolean).join(" ") as string) ||
      i18next.t("asiakirjat:detail.unknown_author"),
    role: s.is_first_signer
      ? i18next.t("asiakirjat:detail.first_signer")
      : i18next.t("asiakirjat:detail.signer"),
    party: (s.party as string) ?? null,
    partyColor: s.party ? partyColor(s.party as string) : null,
    personId: (s.person_id as number) ?? null,
  }));

  const authorParty = detail.first_signer_party ?? "";
  const label =
    i18next.t(LA_LABELS[typeCode] ?? "asiakirjat:initiative_type_labels.RA");
  return {
    kind: "aloite",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: label,
    title: detail.title ?? "",
    authorName: authorsByName(
      detail.first_signer_first_name,
      detail.first_signer_last_name,
    ),
    authorRole: i18next.t("asiakirjat:detail.mp_role"),
    authorParty,
    authorPartyColor: partyColor(authorParty),
    authorPersonId: detail.first_signer_person_id,
    authorInitials: initialsFrom(
      detail.first_signer_first_name,
      detail.first_signer_last_name,
    ),
    authorDistrict: mpDistrict(detail.first_signer_person_id, deps),
    primaryDate: formatFi(submissionDate),
    primaryDateLabel: i18next.t("asiakirjat:status_labels.submitted"),
    secondaryDate: null,
    secondaryDateLabel: null,
    statusLabel: detail.decision_outcome
      ? i18next.t("asiakirjat:status_labels.handled")
      : i18next.t("asiakirjat:status_labels.pending"),
    statusColor: detail.decision_outcome ? "var(--hall)" : "var(--muted)",
    textSections,
    lifecycleStages,
    hasAnswer: false,
    answerIdentifier: null,
    answerDate: null,
    answerMinisterTitle: null,
    answerMinisterName: null,
    signatories,
    laws: [],
    sourceReference: null,
    subjects: mapSubjects(detail as DocDetail),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as DocDetail),
    fetchedAt: fetchedAt(),
  };
}

function buildCommitteeReport(
  id: string,
  deps: WebappDeps,
): AsiakirjaViewModel | null {
  const detail = deps.documentRepository.fetchCommitteeReportById({ id });
  if (!detail) return null;

  const signatureDate = detail.signature_date ?? detail.draft_date ?? "";
  const reportType =
    i18next.t(REPORT_LABELS[detail.report_type_code ?? ""] ??
     "asiakirjat:report_type_labels.M");

  const textSections: TextSection[] = [];
  const sum = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_summary"),
    detail.summary_text,
    detail.summary_rich_text,
  );
  if (sum) textSections.push(sum);
  const gen = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_general_reasoning"),
    detail.general_reasoning_text,
    detail.general_reasoning_rich_text,
  );
  if (gen) textSections.push(gen);
  const det = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_detailed_reasoning"),
    detail.detailed_reasoning_text,
    detail.detailed_reasoning_rich_text,
  );
  if (det) textSections.push(det);
  const dec = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_decision_proposal"),
    detail.decision_text,
    detail.decision_rich_text,
  );
  if (dec) textSections.push(dec);
  const amd = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_legislation_amendment"),
    detail.legislation_amendment_text,
    detail.legislation_amendment_rich_text,
  );
  if (amd) textSections.push(amd);
  const min = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_minority_opinion"),
    detail.minority_opinion_text,
    detail.minority_opinion_rich_text,
  );
  if (min) textSections.push(min);
  const res = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_resolution"),
    detail.resolution_text,
    detail.resolution_rich_text,
  );
  if (res) textSections.push(res);

  const rawMembers =
    ((detail as DocDetail).members ?? []);
  const rawExperts =
    ((detail as DocDetail).experts ?? []);
  const signatories: Signatory[] = [
    ...rawMembers.map((m) => ({
      name:
        ([m.first_name, m.last_name].filter(Boolean).join(" ") as string) ||
        i18next.t("asiakirjat:detail.unknown_author"),
      role: (m.role as string) ?? i18next.t("asiakirjat:detail.member_role"),
      party: (m.party as string) ?? null,
      partyColor: m.party ? partyColor(m.party as string) : null,
      personId: (m.person_id as number) ?? null,
    })),
    ...rawExperts.map((e) => ({
      name:
        ([e.first_name, e.last_name].filter(Boolean).join(" ") as string) ||
        i18next.t("asiakirjat:detail.unknown_author"),
      role:
        (e.title as string) ??
        (e.organization as string) ??
        i18next.t("asiakirjat:detail.expert_role"),
      party: null,
      partyColor: null,
      personId: (e.person_id as number) ?? null,
    })),
  ];

  const committee = detail.committee_name ?? "";
  return {
    kind: "mietinto",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: reportType,
    title: detail.title ?? "",
    authorName: committee || i18next.t("asiakirjat:detail.unknown_author"),
    authorRole: i18next.t("asiakirjat:detail.committee_role"),
    authorParty: null,
    authorPartyColor: "#999999",
    authorPersonId: null,
    authorInitials: committee ? committee.slice(0, 2).toUpperCase() : "?",
    authorDistrict: null,
    primaryDate: formatFi(signatureDate),
    primaryDateLabel: i18next.t("asiakirjat:status_labels.given"),
    secondaryDate: detail.draft_date ? formatFi(detail.draft_date) : null,
    secondaryDateLabel: detail.draft_date
      ? i18next.t("asiakirjat:detail.stage_draft")
      : null,
    statusLabel: i18next.t("asiakirjat:status_labels.given"),
    statusColor: "var(--hall)",
    textSections,
    lifecycleStages: [],
    hasAnswer: false,
    answerIdentifier: null,
    answerDate: null,
    answerMinisterTitle: null,
    answerMinisterName: null,
    signatories,
    laws: [],
    sourceReference: detail.source_reference ?? null,
    subjects: mapSubjects(detail as DocDetail),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as DocDetail),
    fetchedAt: fetchedAt(),
  };
}

function buildParliamentAnswer(
  id: string,
  deps: WebappDeps,
): AsiakirjaViewModel | null {
  const detail = deps.documentRepository.fetchParliamentAnswerById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? detail.signature_date ?? "";

  const textSections: TextSection[] = [];
  const dec = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_decision"),
    detail.decision_text,
    detail.decision_rich_text,
  );
  if (dec) textSections.push(dec);
  const leg = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_legislation"),
    detail.legislation_text,
    detail.legislation_rich_text,
  );
  if (leg) textSections.push(leg);

  return {
    kind: "vastaus-edk",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: i18next.t(DOC_KIND_REGISTRY["vastaus-edk"].detailLabelI18n),
    title: detail.title ?? "",
    authorName: i18next.t("asiakirjat:detail.author_parliament"),
    authorRole: null,
    authorParty: null,
    authorPartyColor: "#999999",
    authorPersonId: null,
    authorInitials: "E",
    authorDistrict: null,
    primaryDate: formatFi(submissionDate),
    primaryDateLabel: i18next.t("asiakirjat:status_labels.given"),
    secondaryDate: detail.signature_date
      ? formatFi(detail.signature_date)
      : null,
    secondaryDateLabel: detail.signature_date
      ? i18next.t("asiakirjat:status_labels.signed")
      : null,
    statusLabel: i18next.t("asiakirjat:status_labels.given"),
    statusColor: "var(--hall)",
    textSections,
    lifecycleStages: [],
    hasAnswer: false,
    answerIdentifier: null,
    answerDate: null,
    answerMinisterTitle: null,
    answerMinisterName: null,
    signatories: [],
    laws: [],
    sourceReference:
      detail.source_reference ?? detail.committee_report_reference ?? null,
    subjects: mapSubjects(detail as DocDetail),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as DocDetail),
    fetchedAt: fetchedAt(),
  };
}

function buildLifecycleFromStages(
  stages: DocStage[],
): AsiakirjaViewModel["lifecycleStages"] {
  const result: AsiakirjaViewModel["lifecycleStages"] = [];
  for (const s of stages) {
    result.push({
      step: result.length + 1,
      label: String(
        s.stage_title ||
          s.event_title ||
          i18next.t("asiakirjat:detail.stage_processing"),
      ),
      date: (s.event_date as string) ?? null,
      done: true,
    });
  }
  return result;
}
