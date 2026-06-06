import type { AsiakirjaViewModel, TextSection } from "../pages/detail.page";
import type { DocumentKindModule, DocumentDetailContext } from "./types";
import { fetchedAt, formatFi } from "#server/helpers/template-helpers";
import { partyColor } from "#server/domain";
import i18next from "i18next";
import {
  buildTextSection,
  textCharCount,
  mapSubjects,
  mapSessions,
} from "./detail-helpers";
import {
  dateLabel,
  noStatus,
  splitSubjects,
  joinHighlight,
} from "./row-helpers";

export function buildParliamentAnswer(
  ctx: DocumentDetailContext,
  id: string,
): AsiakirjaViewModel | null {
  const detail = ctx.documentRepo.fetchParliamentAnswerById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? detail.signature_date ?? "";

  const textSections: TextSection[] = [];
  const dec = buildTextSection(
    i18next.t("documents:detail.text_section_decision"),
    detail.decision_text,
    detail.decision_rich_text,
  );
  if (dec) textSections.push(dec);
  const leg = buildTextSection(
    i18next.t("documents:detail.text_section_legislation"),
    detail.legislation_text,
    detail.legislation_rich_text,
  );
  if (leg) textSections.push(leg);

  return {
    kind: "vastaus-edk",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: i18next.t("documents:kind_labels.vastaus-edk"),
    title: detail.title ?? "",
    authorName: i18next.t("documents:detail.author_parliament"),
    authorRole: null,
    authorParty: null,
    authorPartyColor: "#999999",
    authorPersonId: null,
    authorInitials: "E",
    authorDistrict: null,
    primaryDate: formatFi(submissionDate),
    primaryDateLabel: i18next.t("documents:status_labels.given"),
    secondaryDate: detail.signature_date
      ? formatFi(detail.signature_date)
      : null,
    secondaryDateLabel: detail.signature_date
      ? i18next.t("documents:status_labels.signed")
      : null,
    statusLabel: i18next.t("documents:status_labels.given"),
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
    subjects: mapSubjects(detail.subjects),
    charCount: textCharCount(textSections),
    sessions: mapSessions(undefined),
    fetchedAt: fetchedAt(),
  };
}

export const parliamentAnswer: DocumentKindModule = {
  key: "vastaus-edk",
  chip: {
    labelI18n: "documents:chip_labels.vastaus-edk",
    dotColor: "var(--hall)",
  },
  list(repo, params) {
    const { items, totalCount } = repo.fetchParliamentAnswers(params);
    return {
      totalCount,
      rows: items.map((r) => ({
        id: r.id,
        linkId: r.id,
        hasDetail: true,
        kind: "vastaus-edk" as const,
        identifier: r.parliament_identifier,
        title: r.title ?? "",
        date: r.submission_date ?? "",
        dateLabel: dateLabel(
          r.submission_date,
          "documents:status_labels.given_on",
        ),
        authorName: null,
        authorParty: null,
        authorPartyColor: partyColor(""),
        ...noStatus,
        subjects: splitSubjects(r.subjects),
        highlight: joinHighlight([r.source_reference]),
      })),
    };
  },
  detail: buildParliamentAnswer,
};
