import type {
  AsiakirjaViewModel,
  TextSection,
  Signatory,
  Law,
} from "../pages/detail.page";
import type { DocumentKindModule, DocumentDetailContext } from "./types";
import { fetchedAt, formatFi } from "#server/helpers/template-helpers";
import { partyColor } from "#server/domain";
import i18next from "i18next";
import {
  buildLifecycleFromStages,
  buildTextSection,
  textCharCount,
  mapSubjects,
  mapSessions,
} from "./detail-helpers";
import {
  dateLabel,
  handledStatus,
  splitSubjects,
  joinHighlight,
} from "./row-helpers";

export function buildGovernmentProposal(
  ctx: DocumentDetailContext,
  id: string,
): AsiakirjaViewModel | null {
  const detail = ctx.documentRepo.fetchGovernmentProposalById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? "";
  const lifecycleStages = buildLifecycleFromStages(detail.stages ?? []);

  const textSections: TextSection[] = [];
  const sum = buildTextSection(
    i18next.t("documents:detail.text_section_summary"),
    detail.summary_text,
    detail.summary_rich_text,
  );
  if (sum) textSections.push(sum);
  const jst = buildTextSection(
    i18next.t("documents:detail.text_section_justification"),
    detail.justification_text,
    detail.justification_rich_text,
  );
  if (jst) textSections.push(jst);
  const prop = buildTextSection(
    i18next.t("documents:detail.text_section_proposal"),
    detail.proposal_text,
    detail.proposal_rich_text,
  );
  if (prop) textSections.push(prop);
  const app = buildTextSection(
    i18next.t("documents:detail.text_section_appendix"),
    detail.appendix_text,
    detail.appendix_rich_text,
  );
  if (app) textSections.push(app);

  const rawSignatories = detail.signatories ?? [];
  const signatories: Signatory[] = rawSignatories.map((s) => ({
    name:
      [s.first_name, s.last_name].filter(Boolean).join(" ") ||
      i18next.t("documents:detail.unknown_author"),
    role: s.title_text ?? null,
    party: null,
    partyColor: null,
    personId: null,
  }));

  const rawLaws = detail.laws ?? [];
  const laws: Law[] = rawLaws.map((l) => ({
    order: l.law_order,
    type: l.law_type ?? null,
    name: l.law_name ?? null,
  }));

  const author = detail.author ?? "";
  return {
    kind: "he",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: i18next.t("documents:kind_labels.he"),
    title: detail.title ?? "",
    authorName: author || i18next.t("documents:detail.unknown_author"),
    authorRole: i18next.t("documents:detail.ministry_role"),
    authorParty: null,
    authorPartyColor: "#999999",
    authorPersonId: null,
    authorInitials: author ? author.slice(0, 2).toUpperCase() : "?",
    authorDistrict: null,
    primaryDate: formatFi(submissionDate),
    primaryDateLabel: i18next.t("documents:status_labels.submitted"),
    secondaryDate: detail.signature_date
      ? formatFi(detail.signature_date)
      : null,
    secondaryDateLabel: detail.signature_date
      ? i18next.t("documents:status_labels.signed")
      : null,
    statusLabel: detail.decision_outcome
      ? i18next.t("documents:status_labels.handled")
      : i18next.t("documents:status_labels.pending"),
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
    subjects: mapSubjects(detail.subjects),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail.sessions),
    fetchedAt: fetchedAt(),
  };
}

export const governmentProposal: DocumentKindModule = {
  key: "he",
  chip: { labelI18n: "documents:chip_labels.he", dotColor: "var(--opp)" },
  list(repo, params) {
    const { items, totalCount } = repo.fetchGovernmentProposals(params);
    return {
      totalCount,
      rows: items.map((r) => ({
        id: r.id,
        linkId: r.id,
        hasDetail: true,
        kind: "he" as const,
        identifier: r.parliament_identifier,
        title: r.title ?? "",
        date: r.submission_date ?? "",
        dateLabel: dateLabel(
          r.submission_date,
          "documents:status_labels.submitted_on",
        ),
        authorName: null,
        authorParty: null,
        authorPartyColor: partyColor(""),
        ...handledStatus(r.decision_outcome),
        subjects: splitSubjects(r.subjects),
        highlight: joinHighlight([r.author]),
      })),
    };
  },
  detail: buildGovernmentProposal,
};
