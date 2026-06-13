import type {
  AsiakirjaViewModel,
  TextSection,
  Signatory,
} from "../pages/detail.page";
import type { DocumentKindModule, DocumentDetailContext } from "./types";
import { fetchedAt, formatFi } from "#server/helpers/template-helpers";
import { partyColor } from "#server/domain";
import i18next from "i18next";
import { REPORT_LABELS, reportTypeLabel } from "./labels";
import {
  buildTextSection,
  textCharCount,
  mapSubjects,
  mapSessions,
} from "./detail-helpers";
import { dateLabel, noStatus, joinHighlight } from "./row-helpers";

export function buildCommitteeReport(
  ctx: DocumentDetailContext,
  id: string,
): AsiakirjaViewModel | null {
  const detail = ctx.documentRepo.fetchCommitteeReportById({ id });
  if (!detail) return null;

  const signatureDate = detail.signature_date ?? detail.draft_date ?? "";
  const reportTypeCode = detail.report_type_code;
  const reportType = i18next.t(
    reportTypeCode in REPORT_LABELS
      ? REPORT_LABELS[reportTypeCode as keyof typeof REPORT_LABELS]
      : "documents:report_type_labels.M",
  );

  const textSections: TextSection[] = [];
  const sum = buildTextSection(
    i18next.t("documents:detail.text_section_summary"),
    detail.summary_text,
    detail.summary_rich_text,
  );
  if (sum) textSections.push(sum);
  const gen = buildTextSection(
    i18next.t("documents:detail.text_section_general_reasoning"),
    detail.general_reasoning_text,
    detail.general_reasoning_rich_text,
  );
  if (gen) textSections.push(gen);
  const det = buildTextSection(
    i18next.t("documents:detail.text_section_detailed_reasoning"),
    detail.detailed_reasoning_text,
    detail.detailed_reasoning_rich_text,
  );
  if (det) textSections.push(det);
  const dec = buildTextSection(
    i18next.t("documents:detail.text_section_decision_proposal"),
    detail.decision_text,
    detail.decision_rich_text,
  );
  if (dec) textSections.push(dec);
  const amd = buildTextSection(
    i18next.t("documents:detail.text_section_legislation_amendment"),
    detail.legislation_amendment_text,
    detail.legislation_amendment_rich_text,
  );
  if (amd) textSections.push(amd);
  const min = buildTextSection(
    i18next.t("documents:detail.text_section_minority_opinion"),
    detail.minority_opinion_text,
    detail.minority_opinion_rich_text,
  );
  if (min) textSections.push(min);
  const res = buildTextSection(
    i18next.t("documents:detail.text_section_resolution"),
    detail.resolution_text,
    detail.resolution_rich_text,
  );
  if (res) textSections.push(res);

  const rawMembers = detail.members ?? [];
  const rawExperts = detail.experts ?? [];
  const signatories: Signatory[] = [
    ...rawMembers.map((m) => ({
      name:
        [m.first_name, m.last_name].filter(Boolean).join(" ") ||
        i18next.t("documents:detail.unknown_author"),
      role: (m.role ?? "") || i18next.t("documents:detail.member_role"),
      party: m.party ?? null,
      partyColor: m.party ? partyColor(m.party) : null,
      personId: m.person_id ?? null,
    })),
    ...rawExperts.map((e) => ({
      name:
        [e.first_name, e.last_name].filter(Boolean).join(" ") ||
        i18next.t("documents:detail.unknown_author"),
      role:
        (e.title ?? "") ||
        (e.organization ?? "") ||
        i18next.t("documents:detail.expert_role"),
      party: null,
      partyColor: null,
      personId: e.person_id ?? null,
    })),
  ];

  const committee = detail.committee_name ?? "";
  return {
    kind: "mietinto",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: reportType,
    title: detail.title ?? "",
    authorName: committee || i18next.t("documents:detail.unknown_author"),
    authorRole: i18next.t("documents:detail.committee_role"),
    authorParty: null,
    authorPartyColor: "#999999",
    authorPersonId: null,
    authorInitials: committee ? committee.slice(0, 2).toUpperCase() : "?",
    authorDistrict: null,
    primaryDate: formatFi(signatureDate),
    primaryDateLabel: i18next.t("documents:status_labels.given"),
    secondaryDate: detail.draft_date ? formatFi(detail.draft_date) : null,
    secondaryDateLabel: detail.draft_date
      ? i18next.t("documents:detail.stage_draft")
      : null,
    statusLabel: i18next.t("documents:status_labels.given"),
    statusColor: "var(--hall)",
    textSections,
    lifecycleStages: [],
    hasAnswer: false,
    answerTextSections: [],
    answerIdentifier: null,
    answerDate: null,
    answerMinisterTitle: null,
    answerMinisterName: null,
    signatories,
    laws: [],
    sourceReference: detail.source_reference ?? null,
    subjects: mapSubjects(undefined),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail.sessions),
    fetchedAt: fetchedAt(),
  };
}

export const committeeReport: DocumentKindModule = {
  key: "mietinto",
  chip: {
    labelI18n: "documents:chip_labels.mietinto",
    dotColor: "var(--muted)",
  },
  list(repo, params) {
    const { items, totalCount } = repo.fetchCommitteeReports(params);
    return {
      totalCount,
      rows: items.map((r) => ({
        id: r.id,
        linkId: r.id,
        hasDetail: true,
        kind: "mietinto" as const,
        identifier: r.parliament_identifier,
        title: r.title ?? "",
        date: r.signature_date ?? "",
        dateLabel: dateLabel(
          r.signature_date,
          "documents:status_labels.given_on",
        ),
        authorName: null,
        authorParty: null,
        authorPartyColor: partyColor(""),
        ...noStatus,
        subjects: [],
        highlight: joinHighlight([
          r.committee_name,
          reportTypeLabel(r.report_type_code),
        ]),
      })),
    };
  },
  detail: buildCommitteeReport,
};
