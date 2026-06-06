import type {
  AsiakirjaViewModel,
  TextSection,
  Signatory,
} from "../pages/detail.page";
import type { DocumentKindModule, DocumentDetailContext } from "./types";
import { fetchedAt, formatFi } from "#server/helpers/template-helpers";
import { partyColor } from "#server/domain";
import i18next from "i18next";
import {
  authorsByName,
  initialsFrom,
  buildTextSection,
  textCharCount,
  mpDistrict,
  mapMpSignatories,
  mapSubjects,
  mapSessions,
} from "./detail-helpers";
import {
  dateLabel,
  authorName,
  answeredStatus,
  splitSubjects,
  joinHighlight,
} from "./row-helpers";

export function buildWrittenQuestion(
  ctx: DocumentDetailContext,
  id: string,
): AsiakirjaViewModel | null {
  const detail = ctx.documentRepo.fetchWrittenQuestionById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? "";
  const answerDate = detail.answer_date ?? null;

  const lifecycleStages: AsiakirjaViewModel["lifecycleStages"] = [];
  if (submissionDate) {
    lifecycleStages.push({
      step: 1,
      label: i18next.t("documents:detail.stage_question_submitted"),
      date: submissionDate,
      done: true,
    });
  }
  const rawStages = detail.stages;
  if (rawStages) {
    for (const s of rawStages) {
      lifecycleStages.push({
        step: lifecycleStages.length + 1,
        label: String(
          s.stage_title ||
            s.event_title ||
            i18next.t("documents:detail.stage_processing"),
        ),
        date: s.event_date ?? null,
        done: true,
      });
    }
  }
  if (answerDate) {
    lifecycleStages.push({
      step: lifecycleStages.length + 1,
      label: i18next.t("documents:detail.stage_minister_answer"),
      date: answerDate,
      done: true,
      tag: "vastattu",
    });
  }

  const textSections: TextSection[] = [];
  const qs = buildTextSection(
    i18next.t("documents:detail.text_section_question"),
    detail.question_text,
    detail.question_rich_text,
  );
  if (qs) textSections.push(qs);

  const signatories: Signatory[] = mapMpSignatories(detail.signers ?? []);

  const authorParty = detail.first_signer_party ?? "";
  return {
    kind: "kk",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: i18next.t("documents:kind_labels.kk"),
    title: detail.title ?? "",
    authorName: authorsByName(
      detail.first_signer_first_name,
      detail.first_signer_last_name,
    ),
    authorRole: i18next.t("documents:detail.mp_role"),
    authorParty,
    authorPartyColor: partyColor(authorParty),
    authorPersonId: detail.first_signer_person_id,
    authorInitials: initialsFrom(
      detail.first_signer_first_name,
      detail.first_signer_last_name,
    ),
    authorDistrict: mpDistrict(detail.first_signer_person_id, ctx.personRepo),
    primaryDate: formatFi(submissionDate),
    primaryDateLabel: i18next.t("documents:status_labels.submitted"),
    secondaryDate: answerDate ? formatFi(answerDate) : null,
    secondaryDateLabel: answerDate
      ? i18next.t("documents:status_labels.answered")
      : null,
    statusLabel: answerDate
      ? i18next.t("documents:status_labels.answered_on", {
          date: formatFi(answerDate),
        })
      : submissionDate
        ? i18next.t("documents:status_labels.submitted_on", {
            date: formatFi(submissionDate),
          })
        : i18next.t("documents:status_labels.pending"),
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
    subjects: mapSubjects(detail.subjects),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail.sessions),
    fetchedAt: fetchedAt(),
  };
}

export const writtenQuestion: DocumentKindModule = {
  key: "kk",
  chip: { labelI18n: "documents:chip_labels.kk", dotColor: "var(--blue)" },
  list(repo, params) {
    const { items, totalCount } = repo.fetchWrittenQuestions(params);
    return {
      totalCount,
      rows: items.map((r) => {
        const party = r.first_signer_party ?? null;
        return {
          id: r.id,
          linkId: r.id,
          hasDetail: true,
          kind: "kk" as const,
          identifier: r.parliament_identifier,
          title: r.title ?? "",
          date: r.submission_date ?? "",
          dateLabel: dateLabel(
            r.submission_date,
            "documents:status_labels.submitted_on",
          ),
          authorName: authorName(
            r.first_signer_first_name,
            r.first_signer_last_name,
          ),
          authorParty: party,
          authorPartyColor: partyColor(party ?? ""),
          ...answeredStatus(r.answer_date),
          subjects: splitSubjects(r.subjects),
          highlight: joinHighlight([r.answer_minister_title]),
        };
      }),
    };
  },
  detail: buildWrittenQuestion,
};
