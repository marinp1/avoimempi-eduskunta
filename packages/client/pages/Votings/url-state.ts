export type VotingSortMode = "newest" | "oldest" | "closest" | "largest";

export type VotingsUrlState = {
  query: string;
  session: string;
  phase: string;
  sort: VotingSortMode;
  voting: number | null;
};

export const DEFAULT_VOTINGS_SESSION = "all";
export const DEFAULT_VOTINGS_PHASE = "all";
export const DEFAULT_VOTINGS_SORT: VotingSortMode = "newest";

const QUERY_PARAM = "q";
const SESSION_PARAM = "session";
const PHASE_PARAM = "phase";
const SORT_PARAM = "sort";
const VOTING_PARAM = "voting";

const VALID_SORTS = new Set<VotingSortMode>([
  "newest",
  "oldest",
  "closest",
  "largest",
]);

const normalizeFilterValue = (
  value: string | null,
  fallback: string,
): string => {
  const normalized = value?.trim();
  return normalized ? normalized : fallback;
};

export const parseVotingIdParam = (value: string | null) => {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const parseVotingsUrlState = (search: string): VotingsUrlState => {
  const params = new URLSearchParams(search);
  const sortValue = params.get(SORT_PARAM);

  return {
    query: params.get(QUERY_PARAM)?.trim() ?? "",
    session: normalizeFilterValue(
      params.get(SESSION_PARAM),
      DEFAULT_VOTINGS_SESSION,
    ),
    phase: normalizeFilterValue(params.get(PHASE_PARAM), DEFAULT_VOTINGS_PHASE),
    sort:
      sortValue && VALID_SORTS.has(sortValue as VotingSortMode)
        ? (sortValue as VotingSortMode)
        : DEFAULT_VOTINGS_SORT,
    voting: parseVotingIdParam(params.get(VOTING_PARAM)),
  };
};

export const buildVotingsUrl = (
  pathname: string,
  search: string,
  state: VotingsUrlState,
) => {
  const params = new URLSearchParams(search);
  const query = state.query.trim();

  if (query) params.set(QUERY_PARAM, query);
  else params.delete(QUERY_PARAM);

  if (state.session !== DEFAULT_VOTINGS_SESSION)
    params.set(SESSION_PARAM, state.session);
  else params.delete(SESSION_PARAM);

  if (state.phase !== DEFAULT_VOTINGS_PHASE)
    params.set(PHASE_PARAM, state.phase);
  else params.delete(PHASE_PARAM);

  if (state.sort !== DEFAULT_VOTINGS_SORT) params.set(SORT_PARAM, state.sort);
  else params.delete(SORT_PARAM);

  if (state.voting) params.set(VOTING_PARAM, String(state.voting));
  else params.delete(VOTING_PARAM);

  const nextQuery = params.toString();
  return nextQuery ? `${pathname}?${nextQuery}` : pathname;
};
