import type {
  AsiakirjaViewModel,
  TextSection,
  Signatory,
} from "../pages/detail.page";
import type { DocumentKindModule, DocumentDetailContext } from "./types";
import { fetchedAt, formatFi } from "#server/helpers/template-helpers";
import { partyColor } from "#server/domain";
import i18next from "i18next";
import { LA_LABELS, initiativeTypeLabel } from "./labels";
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
} from "./detail-helpers";
import {
  dateLabel,
  authorName,
  handledStatus,
  splitSubjects,
  joinHighlight,
} from "./row-helpers";

export function buildLegislativeInitiative(
  ctx: DocumentDetailContext,
  id: string,
): AsiakirjaViewModel | null {
  const detail = ctx.documentRepo.fetchLegislativeInitiativeById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? "";
  const typeCode = detail.initiative_type_code ?? "";
  const lifecycleStages = buildLifecycleFromStages(detail.stages ?? []);

  const textSections: TextSection[] = [];
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
  const law = buildTextSection(
    i18next.t("documents:detail.text_section_law_text"),
    detail.law_text,
    detail.law_rich_text,
  );
  if (law) textSections.push(law);

  if (textSections.length === 0 && detail.body_text) {
    const body = buildTextSection(
      i18next.t("documents:detail.text_section_body"),
      detail.body_text,
      null,
    );
    if (body) textSections.push(body);
  }

  const signatories: Signatory[] = mapMpSignatories(detail.signers ?? []);

  const authorParty = detail.first_signer_party ?? "";
  const label = i18next.t(
    typeCode in LA_LABELS
      ? LA_LABELS[typeCode as keyof typeof LA_LABELS]
      : "documents:initiative_type_labels.RA",
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
    secondaryDate: null,
    secondaryDateLabel: null,
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
    laws: [],
    sourceReference: null,
    subjects: mapSubjects(detail.subjects),
    charCount: textCharCount(textSections),
    sessions: mapSessions(detail.sessions),
    fetchedAt: fetchedAt(),
  };
}

export const legislativeInitiative: DocumentKindModule = {
  key: "aloite",
  chip: { labelI18n: "documents:chip_labels.aloite", dotColor: "var(--hall)" },
  list(repo, params) {
    const { items, totalCount } = repo.fetchLegislativeInitiatives(params);
    return {
      totalCount,
      rows: items.map((r) => {
        const party = r.first_signer_party ?? null;
        return {
          id: r.id,
          linkId: r.id,
          hasDetail: true,
          kind: "aloite" as const,
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
          ...handledStatus(r.decision_outcome),
          subjects: splitSubjects(r.subjects),
          highlight: joinHighlight([
            initiativeTypeLabel(r.initiative_type_code),
          ]),
        };
      }),
    };
  },
  detail: buildLegislativeInitiative,
};
