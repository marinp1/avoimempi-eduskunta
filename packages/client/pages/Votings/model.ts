import { extractDocumentIdentifiers } from "#client/components/DocumentCards";
import type { VotingSortMode } from "./url-state";

export type VotingListRow = DatabaseQueries.VotingSearchResult;

export const CLOSE_VOTE_THRESHOLD = 10;

export const voteMargin = (vote: Pick<VotingListRow, "n_yes" | "n_no">) =>
  Math.abs(vote.n_yes - vote.n_no);

export const isCloseVote = (vote: Pick<VotingListRow, "n_yes" | "n_no">) =>
  voteMargin(vote) <= CLOSE_VOTE_THRESHOLD;

export const getDocumentGroupKey = (vote: VotingListRow): string | null => {
  const docRefs = extractDocumentIdentifiers([
    vote.parliamentary_item,
    vote.section_title,
    vote.main_section_title,
    vote.agenda_title,
  ]);
  return docRefs.length > 0 ? docRefs[0].identifier : null;
};

export const sortRows = (rows: VotingListRow[], sortMode: VotingSortMode) => {
  const copy = [...rows];
  switch (sortMode) {
    case "oldest":
      return copy.sort((a, b) =>
        (a.start_time ?? "").localeCompare(b.start_time ?? ""),
      );
    case "closest":
      return copy.sort(
        (a, b) =>
          voteMargin(a) - voteMargin(b) ||
          (b.start_time ?? "").localeCompare(a.start_time ?? ""),
      );
    case "largest":
      return copy.sort(
        (a, b) =>
          b.n_total - a.n_total ||
          (b.start_time ?? "").localeCompare(a.start_time ?? ""),
      );
    default:
      return copy.sort((a, b) =>
        (b.start_time ?? "").localeCompare(a.start_time ?? ""),
      );
  }
};

export const groupVotingRows = (rows: VotingListRow[]) => {
  const groups: VotingListRow[][] = [];
  const keyToIndex = new Map<string, number>();

  for (const vote of rows) {
    const key = getDocumentGroupKey(vote);
    if (!key) {
      groups.push([vote]);
      continue;
    }

    const existingIdx = keyToIndex.get(key);
    if (existingIdx !== undefined) {
      groups[existingIdx].push(vote);
      continue;
    }

    keyToIndex.set(key, groups.length);
    groups.push([vote]);
  }

  for (const group of groups) {
    if (group.length > 1) {
      group.sort((a, b) =>
        (a.start_time ?? "").localeCompare(b.start_time ?? ""),
      );
    }
  }

  return groups;
};
