import type {
  AsiakirjaViewModel,
  TextSection,
  Signatory,
} from "#webapp/templates/pages/asiakirja";
import { fetchedAt, formatFi } from "#webapp/templates/helpers";
import { partyColor } from "#shared/domain";
import type { WebappDeps } from "../deps";
import i18next from "i18next";
import { LA_LABELS } from "#shared/constants/DocumentKinds";
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

export function buildLegislativeInitiative(
  id: string,
  deps: WebappDeps,
): AsiakirjaViewModel | null {
  const detail = deps.documentRepository.fetchLegislativeInitiativeById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? "";
  const typeCode = detail.initiative_type_code ?? "";
  const lifecycleStages = buildLifecycleFromStages(detail.stages ?? []);

  const textSections: TextSection[] = [];
  const jst = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_justification"),
    detail.justification_text,
    detail.justification_rich_text,
  );
  if (jst) textSections.push(jst);
  const prop = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_proposal"),
    detail.proposal_text,
    detail.proposal_rich_text,
  );
  if (prop) textSections.push(prop);
  const law = buildTextSection(
    i18next.t("asiakirjat:detail.text_section_law_text"),
    detail.law_text,
    detail.law_rich_text,
  );
  if (law) textSections.push(law);

  const signatories: Signatory[] = mapMpSignatories(detail.signers ?? []);

  const authorParty = detail.first_signer_party ?? "";
  const label = i18next.t(
    LA_LABELS[typeCode] ?? "asiakirjat:initiative_type_labels.RA",
  );
  return {
    kind: "aloite",
    id: detail.id,
    identifier: detail.parliament_identifier,
    documentTypeLabel: label,
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
