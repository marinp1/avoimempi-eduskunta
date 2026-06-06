import i18next, { type ParseKeys, type Namespace } from "i18next";
import { formatFi } from "#server/helpers/template-helpers";

type Key = ParseKeys<Namespace>;

/** Formatted listing date label, or `""` when there is no date/format. */
export function dateLabel(
  date: string | null | undefined,
  formatKey: Key,
): string {
  return date ? i18next.t(formatKey, { date: formatFi(date) }) : "";
}

/** First+last signer name joined, or `null` when both are empty. */
export function authorName(
  first: string | null | undefined,
  last: string | null | undefined,
): string | null {
  return [first, last].filter(Boolean).join(" ") || null;
}

/** The status badge `{ statusLabel, statusClass }` for a listing row. */
export interface RowStatus {
  statusLabel: string | null;
  statusClass: string;
}

/** Present → done badge with the given label; absent → generic "pending". */
function presenceStatus(
  value: string | null | undefined,
  presentLabelKey: Key,
): RowStatus {
  return value
    ? { statusLabel: i18next.t(presentLabelKey), statusClass: "spill--done" }
    : {
        statusLabel: i18next.t("asiakirjat:status_labels.pending"),
        statusClass: "spill--draft",
      };
}

/** Answered (if `answer_date`) / pending. */
export const answeredStatus = (
  answerDate: string | null | undefined,
): RowStatus => presenceStatus(answerDate, "asiakirjat:status_labels.answered");

/** Handled (if `decision_outcome`) / pending. */
export const handledStatus = (
  decisionOutcome: string | null | undefined,
): RowStatus =>
  presenceStatus(decisionOutcome, "asiakirjat:status_labels.handled");

/** Always-present "response" badge. */
export const responseStatus = (): RowStatus => ({
  statusLabel: i18next.t("asiakirjat:status_labels.response"),
  statusClass: "spill--done",
});

/** No status badge. */
export const noStatus: RowStatus = { statusLabel: null, statusClass: "" };

/** Splits the `||`-joined subjects column into a list. */
export function splitSubjects(subjects: string | null | undefined): string[] {
  return typeof subjects === "string"
    ? subjects.split("||").filter(Boolean)
    : [];
}

/** Joins non-empty highlight parts with the listing separator, or `null`. */
export function joinHighlight(
  parts: Array<string | null | undefined>,
): string | null {
  return parts.filter(Boolean).join(" · ") || null;
}
