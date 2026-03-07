export type ParticipationData = ApiRouteItem<`/api/insights/participation`>;

export type ParticipationByGovernmentData =
  ApiRouteItem<`/api/insights/participation/:personId/by-government`>;

export type SortField = "participation_rate" | "votes_cast" | "sort_name";

export type SortDirection = "asc" | "desc";
