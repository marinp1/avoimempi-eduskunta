import type { WebappDeps } from "./deps";
import type {
  DocumentKind,
  DocKindDescriptor,
  DocSearchItem,
  DocQueryParams,
  DocResult,
} from "#shared/constants/DocumentKinds";
import { docStatus, mapDocHighlight } from "#shared/constants/DocumentKinds";
import { formatFi } from "#webapp/templates/helpers";
import { partyColor } from "#shared/domain";
import type { DocumentRow } from "#webapp/templates/pages/asiakirjat";
import i18next from "i18next";

export const DOC_KIND_DISPATCH: Record<
  DocumentKind,
  (deps: WebappDeps, params: DocQueryParams) => DocResult
> = {
  kk: (deps, params) => deps.documentRepository.fetchWrittenQuestions(params),
  suullinen: (deps, params) =>
    deps.documentRepository.fetchOralQuestions(params),
  valikysymys: (deps, params) =>
    deps.documentRepository.fetchInterpellations(params),
  vastaus: (deps, params) =>
    deps.documentRepository.fetchWrittenQuestionResponses(params),
  he: (deps, params) =>
    deps.documentRepository.fetchGovernmentProposals(params),
  aloite: (deps, params) =>
    deps.documentRepository.fetchLegislativeInitiatives(params),
  mietinto: (deps, params) =>
    deps.documentRepository.fetchCommitteeReports(params),
  asiantuntija: (deps, params) =>
    deps.documentRepository.fetchExpertStatements(params),
  "vastaus-edk": (deps, params) =>
    deps.documentRepository.fetchParliamentAnswers(params),
};

export function mapToDocRow(
  item: DocSearchItem,
  desc: DocKindDescriptor,
): DocumentRow {
  const date = (item[desc.dateField] as string) ?? "";
  const dateLabel =
    date && desc.dateFormatKey
      ? i18next.t(desc.dateFormatKey, { date: formatFi(date) })
      : "";

  const status = docStatus(item, desc.key);
  const authorName =
    desc.authorFields.length > 0
      ? desc.authorFields
          .map((f) => (item[f] as string) ?? "")
          .filter(Boolean)
          .join(" ") || null
      : null;

  const authorParty = desc.partyField
    ? ((item[desc.partyField] as string) ?? null)
    : null;

  const subjects: string[] =
    typeof item.subjects === "string"
      ? (item.subjects as string).split("||").filter(Boolean)
      : [];

  return {
    id: item.id as number,
    linkId: (item[desc.linkField] as number) ?? (item.id as number),
    hasDetail: desc.hasDetail,
    kind: desc.key,
    identifier: (item[desc.identifierField] as string) ?? "",
    title: (item.title as string) ?? "",
    date: date as string,
    dateLabel,
    authorName,
    authorParty,
    authorPartyColor: partyColor(authorParty ?? ""),
    statusLabel: status.label ? i18next.t(status.label) : null,
    statusClass: status.class,
    subjects,
    highlight: mapDocHighlight(item, desc.key),
  };
}
