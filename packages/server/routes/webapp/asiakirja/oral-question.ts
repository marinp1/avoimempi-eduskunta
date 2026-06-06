import type {
  AsiakirjaViewModel,
  TextSection,
} from "#webapp/templates/pages/asiakirja";
import { fetchedAt, formatFi } from "#webapp/templates/helpers";
import type { WebappDeps } from "../deps";
import i18next from "i18next";
import { DOC_KIND_REGISTRY } from "#shared/constants/DocumentKinds";
import {
  buildLifecycleFromStages,
  buildTextSection,
  textCharCount,
  mapSubjects,
  mapSessions,
} from "./shared";

export function buildOralQuestion(
  id: string,
  deps: WebappDeps,
): AsiakirjaViewModel | null {
  const detail = deps.documentRepository.fetchOralQuestionById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? "";
  const lifecycleStages = buildLifecycleFromStages(detail.stages ?? []);

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
    subjects: mapSubjects(detail.subjects),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail.sessions),
    fetchedAt: fetchedAt(),
  };
}
