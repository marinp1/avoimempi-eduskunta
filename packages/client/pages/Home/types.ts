export type HomeOverview = ApiRouteResponse<`/api/home/overview`>;
export type HomeSession = HomeOverview["latestDay"]["sessions"][number];
export type HomeSection = NonNullable<HomeSession["sections"]>[number];
export type HomeRecentActivityItem =
  HomeOverview["signals"]["recentActivity"][number];
export type HomeCloseVote = HomeOverview["signals"]["closeVotes"][number];
export type HomeSpeechActivityItem =
  HomeOverview["signals"]["speechActivity"][number];
export type HomeCoalitionVote =
  HomeOverview["signals"]["coalitionOpposition"][number];
