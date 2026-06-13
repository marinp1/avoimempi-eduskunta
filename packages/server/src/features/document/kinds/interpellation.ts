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
} from "./row-helpers";

export function buildInterpellation(
  ctx: DocumentDetailContext,
  id: string,
): AsiakirjaViewModel | null {
  const detail = ctx.documentRepo.fetchInterpellationById({ id });
  if (!detail) return null;

  const submissionDate = detail.submission_date ?? "";
  const lifecycleStages = buildLifecycleFromStages(detail.stages ?? []);

  const textSections: TextSection[] = [];
  const qs = buildTextSection(
    i18next.t("documents:detail.text_section_interpellation"),
    detail.question_text,
    detail.question_rich_text,
  );
  if (qs) textSections.push(qs);
  const rs = buildTextSection(
    i18next.t("documents:detail.text_section_resolution"),
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
    documentTypeLabel: i18next.t("documents:kind_labels.valikysymys"),
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
    answerTextSections: [],
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

export const interpellation: DocumentKindModule = {
  key: "valikysymys",
  chip: {
    labelI18n: "documents:chip_labels.valikysymys",
    dotColor: "var(--red)",
  },
  list(repo, params) {
    const { items, totalCount } = repo.fetchInterpellations(params);
    return {
      totalCount,
      rows: items.map((r) => {
        const party = r.first_signer_party ?? null;
        return {
          id: r.id,
          linkId: r.id,
          hasDetail: true,
          kind: "valikysymys" as const,
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
          highlight: null,
        };
      }),
    };
  },
  detail: buildInterpellation,
};
