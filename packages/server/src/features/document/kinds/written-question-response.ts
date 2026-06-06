import type { DocumentKindModule } from "./types";
import { partyColor } from "#server/domain";
import {
  dateLabel,
  responseStatus,
  splitSubjects,
  joinHighlight,
} from "./row-helpers";
import { buildWrittenQuestion } from "./written-question";

export const writtenQuestionResponse: DocumentKindModule = {
  key: "vastaus",
  chip: {
    labelI18n: "asiakirjat:chip_labels.vastaus",
    dotColor: "var(--hall)",
  },
  list(repo, params) {
    const { items, totalCount } = repo.fetchWrittenQuestionResponses(params);
    return {
      totalCount,
      rows: items.map((r) => ({
        id: r.id,
        linkId: r.question_id,
        hasDetail: true,
        kind: "vastaus" as const,
        identifier: r.parliament_identifier,
        title: r.title ?? "",
        date: r.answer_date ?? "",
        dateLabel: dateLabel(
          r.answer_date,
          "asiakirjat:status_labels.answered_on",
        ),
        authorName: null,
        authorParty: null,
        authorPartyColor: partyColor(""),
        ...responseStatus(),
        subjects: splitSubjects(r.subjects),
        highlight: joinHighlight([r.minister_title, r.question_identifier]),
      })),
    };
  },
  detail: buildWrittenQuestion,
};
