import type { AsiakirjaViewModel, TextSection } from "../pages/detail.page";
import type { DocumentKindModule, DocumentDetailContext } from "./types";
import { fetchedAt, formatFi } from "#server/helpers/template-helpers";
import { partyColor } from "#server/domain";
import i18next from "i18next";
import { buildTextSection, textCharCount } from "./detail-helpers";
import { noStatus, joinHighlight } from "./row-helpers";

function buildExpertStatementDetail(
  ctx: DocumentDetailContext,
  id: string,
): AsiakirjaViewModel | null {
  const detail = ctx.documentRepo.fetchExpertStatementById({ id });
  if (!detail) return null;

  const textSections: TextSection[] = [];
  const body = buildTextSection(
    i18next.t("documents:detail.text_section_body"),
    detail.body_text,
    null,
  );
  if (body) textSections.push(body);

  const meetingDate = detail.meeting_date ?? "";
  const docTypeLabels: Record<string, string> = {
    asiantuntijalausunto: i18next.t(
      "documents:kind_labels.asiantuntijalausunto",
    ),
    asiantuntijalausunnon_liite: i18next.t(
      "documents:kind_labels.asiantuntijalausunnon_liite",
    ),
    asiantuntijasuunnitelma: i18next.t(
      "documents:kind_labels.asiantuntijasuunnitelma",
    ),
  };

  return {
    kind: "asiantuntija",
    id: detail.id,
    identifier: detail.edk_identifier,
    documentTypeLabel:
      docTypeLabels[detail.document_type] ?? detail.document_type,
    title: detail.title ?? "",
    authorName:
      detail.committee_name ?? i18next.t("documents:detail.unknown_author"),
    authorRole: detail.bill_identifier ?? null,
    authorParty: detail.committee_name ?? null,
    authorPartyColor: partyColor(""),
    authorPersonId: null,
    authorInitials: detail.committee_name?.charAt(0)?.toUpperCase() ?? "?",
    authorDistrict: null,
    primaryDate: formatFi(meetingDate),
    primaryDateLabel: meetingDate
      ? i18next.t("documents:status_labels.meeting_date")
      : "",
    secondaryDate: null,
    secondaryDateLabel: null,
    statusLabel: detail.publicity ?? "",
    statusColor: "var(--muted)",
    textSections,
    lifecycleStages: [],
    hasAnswer: false,
    answerTextSections: [],
    answerIdentifier: null,
    answerDate: null,
    answerMinisterTitle: null,
    answerMinisterName: null,
    signatories: [],
    laws: [],
    sourceReference: null,
    subjects: [],
    charCount: textCharCount(textSections),
    sessions: [],
    fetchedAt: fetchedAt(),
  };
}

export const expertStatement: DocumentKindModule = {
  key: "asiantuntija",
  chip: {
    labelI18n: "documents:chip_labels.asiantuntija",
    dotColor: "var(--faint)",
  },
  list(repo, params) {
    const { items, totalCount } = repo.fetchExpertStatements(params);
    return {
      totalCount,
      rows: items.map((r) => ({
        id: r.id,
        linkId: r.id,
        hasDetail: true,
        kind: "asiantuntija" as const,
        identifier: r.edk_identifier,
        title: r.title ?? "",
        date: r.meeting_date ?? "",
        dateLabel: "",
        authorName: null,
        authorParty: null,
        authorPartyColor: partyColor(""),
        ...noStatus,
        subjects: [],
        highlight: joinHighlight([r.committee_name, r.bill_identifier]),
      })),
    };
  },
  detail: buildExpertStatementDetail,
};
