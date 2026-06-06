import type { DocumentKindModule } from "./types";
import { partyColor } from "#server/domain";
import { noStatus, joinHighlight } from "./row-helpers";

/**
 * Expert statements (asiantuntijalausunto) appear in the unified listing but
 * have no detail page — there is no `detail` builder.
 */
export const expertStatement: DocumentKindModule = {
  key: "asiantuntija",
  chip: {
    labelI18n: "documents:chip_labels.asiantuntija",
    dotColor: "var(--faint)",
  },
  list(repo, params) {
    const { items, totalCount } = repo.fetchExpertStatements(params);
    return {
      totalCount,
      rows: items.map((r) => ({
        id: r.id,
        linkId: r.id,
        hasDetail: false,
        kind: "asiantuntija" as const,
        identifier: r.edk_identifier,
        title: r.title ?? "",
        date: r.meeting_date ?? "",
        dateLabel: "",
        authorName: null,
        authorParty: null,
        authorPartyColor: partyColor(""),
        ...noStatus,
        subjects: [],
        highlight: joinHighlight([r.committee_name, r.bill_identifier]),
      })),
    };
  },
};
