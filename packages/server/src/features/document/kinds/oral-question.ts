import type { AsiakirjaViewModel, TextSection } from "../pages/detail.page";
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
import { dateLabel, handledStatus, splitSubjects } from "./row-helpers";

export function buildOralQuestion(
  ctx: DocumentDetailContext,
  id: string,
): AsiakirjaViewModel | null {
  const detail = ctx.documentRepo.fetchOralQuestionById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? "";
  const lifecycleStages = buildLifecycleFromStages(detail.stages ?? []);

  const textSections: TextSection[] = [];
  const qs = buildTextSection(
    i18next.t("documents:detail.text_section_oral_question"),
    detail.question_text,
    null,
  );
  if (qs) textSections.push(qs);

  if (detail.body_text) {
    const body = buildTextSection(
      i18next.t("documents:detail.text_section_body"),
      detail.body_text,
      null,
    );
    if (body) textSections.push(body);
  }

  const author = detail.asker_text ?? "";

  return {
    kind: "suullinen",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: i18next.t("documents:kind_labels.suullinen"),
    title: detail.title ?? "",
    authorName: author || i18next.t("documents:detail.unknown_author"),
    authorRole: null,
    authorParty: null,
    authorPartyColor: "#999999",
    authorPersonId: null,
    authorInitials: author ? author.slice(0, 2).toUpperCase() : "?",
    authorDistrict: null,
    primaryDate: formatFi(submissionDate),
    primaryDateLabel: i18next.t("documents:status_labels.submitted"),
    secondaryDate: null,
    secondaryDateLabel: null,
    statusLabel: detail.decision_outcome
      ? i18next.t("documents:status_labels.handled")
      : submissionDate
        ? i18next.t("documents:status_labels.submitted_on", {
            date: formatFi(submissionDate),
          })
        : i18next.t("documents:status_labels.pending"),
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
    subjects: mapSubjects(detail.subjects),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail.sessions),
    fetchedAt: fetchedAt(),
  };
}

export const oralQuestion: DocumentKindModule = {
  key: "suullinen",
  chip: {
    labelI18n: "documents:chip_labels.suullinen",
    dotColor: "var(--blue)",
  },
  list(repo, params) {
    const { items, totalCount } = repo.fetchOralQuestions(params);
    return {
      totalCount,
      rows: items.map((r) => ({
        id: r.id,
        linkId: r.id,
        hasDetail: true,
        kind: "suullinen" as const,
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
        highlight: null,
      })),
    };
  },
  detail: buildOralQuestion,
};
