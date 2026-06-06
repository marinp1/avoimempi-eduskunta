import type {
  AsiakirjaViewModel,
  TextSection,
  Signatory,
} from "#webapp/templates/pages/asiakirja";
import { fetchedAt, formatFi } from "#webapp/templates/helpers";
import { partyColor } from "#shared/domain";
import type { WebappDeps } from "../deps";
import i18next from "i18next";
import { DOC_KIND_REGISTRY } from "#shared/constants/DocumentKinds";
import {
  authorsByName,
  initialsFrom,
  buildTextSection,
  textCharCount,
  mpDistrict,
  mapMpSignatories,
  mapSubjects,
  mapSessions,
} from "./shared";

export function buildWrittenQuestion(
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
  const rawStages = detail.stages;
  if (rawStages) {
    for (const s of rawStages) {
      lifecycleStages.push({
        step: lifecycleStages.length + 1,
        label: String(
          s.stage_title ||
            s.event_title ||
            i18next.t("asiakirjat:detail.stage_processing"),
        ),
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

  const signatories: Signatory[] = mapMpSignatories(detail.signers ?? []);

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
    subjects: mapSubjects(detail.subjects),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail.sessions),
    fetchedAt: fetchedAt(),
  };
}
