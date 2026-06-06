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
import { page, getWebappContext, getRouteParam, isHtmx } from "./helpers";
import type { WebappDeps } from "./deps";
import i18next from "i18next";

const KIND_TO_LABEL: Record<string, string> = {
  kk: i18next.t("asiakirjat:kind_labels.kk"),
  suullinen: i18next.t("asiakirjat:kind_labels.suullinen"),
  valikysymys: i18next.t("asiakirjat:kind_labels.valikysymys"),
  he: i18next.t("asiakirjat:kind_labels.he"),
  aloite: i18next.t("asiakirjat:kind_labels.aloite"),
  mietinto: i18next.t("asiakirjat:kind_labels.mietinto"),
  vastaus: i18next.t("asiakirjat:kind_labels.vastaus"),
  "vastaus-edk": i18next.t("asiakirjat:kind_labels.vastaus-edk"),
};

const LA_LABELS: Record<string, string> = {
  LA: i18next.t("asiakirjat:initiative_type_labels.LA"),
  TPA: i18next.t("asiakirjat:initiative_type_labels.TPA"),
  RA: i18next.t("asiakirjat:initiative_type_labels.RA"),
  A: i18next.t("asiakirjat:initiative_type_labels.RA"),
};

const REPORT_LABELS: Record<string, string> = {
  M: i18next.t("asiakirjat:report_type_labels.M"),
  L: i18next.t("asiakirjat:report_type_labels.L"),
};

export function createAsiakirjaRoute(deps: WebappDeps) {
  return {
    "/asiakirja/:id": {
      GET: (req: Request) => {
        const rawId = getRouteParam(req, "id") ?? "";
        if (!rawId || !/^\d+$/.test(rawId)) {
          return notFoundResponse(req);
        }
        const id = rawId;

        const url = new URL(req.url);
        const kind = url.searchParams.get("kind") ?? "kk";

        const builder = KIND_BUILDERS[kind];
        const data = builder ? builder(id, deps) : null;
        if (!data) return notFoundResponse(req);

        const { tlData } = getWebappContext(req, deps);
        return page(
          req,
          Asiakirja({ data }),
          "/asiakirjat",
          data.identifier,
          tlData,
        );
      },
    },
  } as const;
}

type BuilderFn = (id: string, deps: WebappDeps) => AsiakirjaViewModel | null;

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
      });
  return new Response(body, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", Vary: "HX-Request" },
  });
}

const KIND_BUILDERS: Record<string, BuilderFn> = {
  kk: buildWrittenQuestion,
  suullinen: buildOralQuestion,
  valikysymys: buildInterpellation,
  he: buildGovernmentProposal,
  aloite: buildLegislativeInitiative,
  mietinto: buildCommitteeReport,
  vastaus: buildWrittenQuestion,
  "vastaus-edk": buildParliamentAnswer,
};

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
  detail: Record<string, unknown>,
): AsiakirjaViewModel["sessions"] {
  const sessions = (detail.sessions ?? []) as Array<Record<string, unknown>>;
  return sessions.map((s) => ({
    sessionKey: String(s.session_key ?? ""),
    sessionDate: String(s.session_date ?? ""),
    sessionNumber: Number(s.session_number ?? 0),
    sessionYear: String(s.session_year ?? ""),
    sectionTitle: s.section_title ? String(s.section_title) : null,
  }));
}

function mapSubjects(detail: Record<string, unknown>): string[] {
  const raw = detail.subjects;
  if (!raw) return [];
  if (Array.isArray(raw))
    return (raw as Array<{ subject_text?: string } | string>)
      .map((s) => (typeof s === "string" ? s : (s.subject_text ?? "")))
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
  const rawStages = (detail as Record<string, unknown>).stages as
    | Array<Record<string, unknown>>
    | undefined;
  if (rawStages) {
    for (const s of rawStages) {
      lifecycleStages.push({
        step: lifecycleStages.length + 1,
        label: (s.stage_title ||
          s.event_title ||
          i18next.t("asiakirjat:detail.stage_processing")) as string,
        date: (s.event_date as string) ?? null,
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
    ((detail as Record<string, unknown>).signers as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
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
    documentTypeLabel: KIND_TO_LABEL.kk!,
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
    subjects: mapSubjects(detail as Record<string, unknown>),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as Record<string, unknown>),
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
    ((detail as Record<string, unknown>).stages as
      | Array<Record<string, unknown>>
      | undefined) ?? [],
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
    documentTypeLabel: KIND_TO_LABEL.suullinen!,
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
    subjects: mapSubjects(detail as Record<string, unknown>),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as Record<string, unknown>),
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
    ((detail as Record<string, unknown>).stages as
      | Array<Record<string, unknown>>
      | undefined) ?? [],
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
    ((detail as Record<string, unknown>).signers as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
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
    documentTypeLabel: KIND_TO_LABEL.valikysymys!,
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
    subjects: mapSubjects(detail as Record<string, unknown>),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as Record<string, unknown>),
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
    ((detail as Record<string, unknown>).stages as
      | Array<Record<string, unknown>>
      | undefined) ?? [],
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
    ((detail as Record<string, unknown>).signatories as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
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
    ((detail as Record<string, unknown>).laws as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
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
    documentTypeLabel: KIND_TO_LABEL.he!,
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
    subjects: mapSubjects(detail as Record<string, unknown>),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as Record<string, unknown>),
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
    ((detail as Record<string, unknown>).stages as
      | Array<Record<string, unknown>>
      | undefined) ?? [],
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
    ((detail as Record<string, unknown>).signers as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
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
    LA_LABELS[typeCode] ?? i18next.t("asiakirjat:initiative_type_labels.RA");
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
    subjects: mapSubjects(detail as Record<string, unknown>),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as Record<string, unknown>),
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
    REPORT_LABELS[detail.report_type_code ?? ""] ??
    i18next.t("asiakirjat:report_type_labels.M");

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
    ((detail as Record<string, unknown>).members as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
  const rawExperts =
    ((detail as Record<string, unknown>).experts as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
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
    subjects: mapSubjects(detail as Record<string, unknown>),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as Record<string, unknown>),
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
    documentTypeLabel: KIND_TO_LABEL["vastaus-edk"]!,
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
    subjects: mapSubjects(detail as Record<string, unknown>),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail as Record<string, unknown>),
    fetchedAt: fetchedAt(),
  };
}

function buildLifecycleFromStages(
  stages: Array<Record<string, unknown>>,
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
