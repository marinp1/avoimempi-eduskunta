import type {
  AsiakirjaViewModel,
  TextSection,
} from "#webapp/templates/pages/asiakirja";
import { fetchedAt, formatFi } from "#webapp/templates/helpers";
import type { WebappDeps } from "../deps";
import i18next from "i18next";
import { DOC_KIND_REGISTRY } from "#shared/constants/DocumentKinds";
import {
  buildTextSection,
  textCharCount,
  mapSubjects,
  mapSessions,
} from "./shared";

export function buildParliamentAnswer(
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
    documentTypeLabel: i18next.t(
      DOC_KIND_REGISTRY["vastaus-edk"].detailLabelI18n,
    ),
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
    subjects: mapSubjects(detail.subjects),
    charCount: textCharCount(textSections),
    sessions: mapSessions(undefined),
    fetchedAt: fetchedAt(),
  };
}
