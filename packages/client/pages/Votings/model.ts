import { extractDocumentIdentifiers } from "#client/components/DocumentCards";
import type { VotingSortMode } from "./url-state";

export type VotingListRow = DatabaseQueries.VotingSearchResult;
export type VotingDocumentRefs = ReturnType<typeof extractDocumentIdentifiers>;
export type VotingViewModel = VotingListRow & {
  primary_title: string | null;
  secondary_title: string | null;
  document_refs: VotingDocumentRefs;
  group_key: string | null;
  passed: boolean;
  close: boolean;
  margin: number;
};
export type VotingGroupViewModel = {
  id: string;
  votes: VotingViewModel[];
};

export const CLOSE_VOTE_THRESHOLD = 10;

export const voteMargin = (vote: Pick<VotingListRow, "n_yes" | "n_no">) =>
  Math.abs(vote.n_yes - vote.n_no);

export const isCloseVote = (vote: Pick<VotingListRow, "n_yes" | "n_no">) =>
  voteMargin(vote) <= CLOSE_VOTE_THRESHOLD;

export const getPrimaryVotingTitle = (vote: {
  context_title?: string | null;
  section_title?: string | null;
  main_section_title?: string | null;
  agenda_title?: string | null;
  title?: string | null;
}) =>
  vote.context_title ||
  vote.section_title ||
  vote.main_section_title ||
  vote.agenda_title ||
  vote.title ||
  null;

export const getSecondaryVotingTitle = (vote: {
  title?: string | null;
  context_title?: string | null;
  section_title?: string | null;
  main_section_title?: string | null;
  agenda_title?: string | null;
}) => {
  const primary = getPrimaryVotingTitle(vote);
  if (!vote.title || vote.title === primary) return null;
  return vote.title;
};

export const getVotingDocumentRefs = (vote: {
  parliamentary_item?: string | null;
  context_title?: string | null;
  section_title?: string | null;
  main_section_title?: string | null;
  agenda_title?: string | null;
}) =>
  extractDocumentIdentifiers([
    vote.parliamentary_item,
    vote.context_title,
    vote.section_title,
    vote.main_section_title,
    vote.agenda_title,
  ]);

export const getDocumentGroupKey = (vote: {
  parliamentary_item?: string | null;
  context_title?: string | null;
  section_title?: string | null;
  main_section_title?: string | null;
  agenda_title?: string | null;
}) => {
  const docRefs = getVotingDocumentRefs(vote);
  return docRefs.length > 0 ? docRefs[0].identifier : null;
};

export const buildVotingViewModels = (
  rows: VotingListRow[],
): VotingViewModel[] =>
  rows.map((row) => {
    const documentRefs = getVotingDocumentRefs(row);
    const groupKey = documentRefs[0]?.identifier ?? null;
    const margin = voteMargin(row);

    return {
      ...row,
      primary_title: getPrimaryVotingTitle(row),
      secondary_title: getSecondaryVotingTitle(row),
      document_refs: documentRefs,
      group_key: groupKey,
      passed: row.n_yes > row.n_no,
      close: margin <= CLOSE_VOTE_THRESHOLD,
      margin,
    };
  });

export const sortRows = <
  T extends Pick<VotingListRow, "n_yes" | "n_no" | "n_total" | "start_time">,
>(
  rows: T[],
  sortMode: VotingSortMode,
) => {
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

export const groupVotingViewModels = (
  rows: VotingViewModel[],
): VotingGroupViewModel[] => {
  const groups: VotingGroupViewModel[] = [];
  const keyToIndex = new Map<string, number>();

  for (const vote of rows) {
    if (!vote.group_key) {
      groups.push({ id: `single:${vote.id}`, votes: [vote] });
      continue;
    }

    const existingIdx = keyToIndex.get(vote.group_key);
    if (existingIdx !== undefined) {
      groups[existingIdx].votes.push(vote);
      continue;
    }

    keyToIndex.set(vote.group_key, groups.length);
    groups.push({ id: vote.group_key, votes: [vote] });
  }

  for (const group of groups) {
    if (group.votes.length > 1) {
      group.votes.sort((a, b) =>
        (a.start_time ?? "").localeCompare(b.start_time ?? ""),
      );
    }
  }

  return groups;
};

export const getVisibleGroups = <T>(groups: T[], count: number) =>
  groups.slice(0, Math.max(0, count));

export const hasMoreGroups = (groups: unknown[], visibleCount: number) =>
  visibleCount < groups.length;

export const getNextVisibleGroupCount = (
  currentCount: number,
  totalCount: number,
  increment: number,
) => Math.min(totalCount, currentCount + increment);
