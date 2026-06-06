export type VoteToken = "jaa" | "ei" | "tyhjaa" | "poissa" | "tuntematon";
export type Bloc = "government" | "opposition";

const VOTE_MAP: Record<string, VoteToken> = {
  Jaa: "jaa",
  Ei: "ei",
  Tyhjää: "tyhjaa",
  Poissa: "poissa",
};

export function normalizeVote(raw: string | null | undefined): VoteToken {
  if (!raw) return "poissa";
  return VOTE_MAP[raw] ?? "tuntematon";
}

export function normalizeBloc(
  isGovernment: number | boolean | null | undefined,
): Bloc {
  return isGovernment === 1 || isGovernment === true
    ? "government"
    : "opposition";
}

export interface VoteCounts {
  nYes: number;
  nNo: number;
  nEmpty: number;
  nAbsent: number;
  nTotal: number;
}

export interface VoteTally extends VoteCounts {
  nCast: number;
  yesPct: number;
  noPct: number;
  emptyPct: number;
  absentPct: number;
  participationPct: number;
  outcome: "ok" | "no";
}

const pct = (part: number, total: number) =>
  total > 0 ? (part / total) * 100 : 0;

export function buildVoteTally(c: Partial<VoteCounts>): VoteTally {
  const nYes = c.nYes ?? 0;
  const nNo = c.nNo ?? 0;
  const nEmpty = c.nEmpty ?? 0;
  const nAbsent = c.nAbsent ?? 0;
  const nTotal = c.nTotal ?? 0;
  const nCast = nYes + nNo + nEmpty;
  return {
    nYes,
    nNo,
    nEmpty,
    nAbsent,
    nTotal,
    nCast,
    yesPct: pct(nYes, nTotal),
    noPct: pct(nNo, nTotal),
    emptyPct: pct(nEmpty, nTotal),
    absentPct: pct(nAbsent, nTotal),
    participationPct: pct(nCast, nTotal),
    outcome: nYes > nNo ? "ok" : "no",
  };
}

export function tallyVoteList(
  votes: ReadonlyArray<{ vote: string }>,
): VoteTally {
  return buildVoteTally({
    nYes: votes.filter((v) => v.vote === "Jaa").length,
    nNo: votes.filter((v) => v.vote === "Ei").length,
    nEmpty: votes.filter((v) => v.vote === "Tyhjää").length,
    nAbsent: votes.filter((v) => v.vote === "Poissa").length,
    nTotal: votes.length,
  });
}
