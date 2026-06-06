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
  buildLifecycleFromStages,
  buildTextSection,
  textCharCount,
  mpDistrict,
  mapMpSignatories,
  mapSubjects,
  mapSessions,
} from "./shared";

export function buildInterpellation(
  id: string,
  deps: WebappDeps,
): AsiakirjaViewModel | null {
  const detail = deps.documentRepository.fetchInterpellationById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? "";
  const lifecycleStages = buildLifecycleFromStages(detail.stages ?? []);

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

  const signatories: Signatory[] = mapMpSignatories(detail.signers ?? []);

  const authorParty = detail.first_signer_party ?? "";
  return {
    kind: "valikysymys",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: i18next.t(DOC_KIND_REGISTRY.valikysymys.detailLabelI18n),
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
    subjects: mapSubjects(detail.subjects),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail.sessions),
    fetchedAt: fetchedAt(),
  };
}
