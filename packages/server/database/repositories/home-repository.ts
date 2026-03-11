import type { AnalyticsRepository } from "./analytics-repository";
import type { SessionRepository } from "./session-repository";

type FreshnessReader = () => Promise<string | null> | string | null;

type HomeOverviewParams = {
  asOfDate?: string;
  startDate?: string;
  endDate?: string;
  governmentName?: string;
  governmentStartDate?: string;
};

type SessionWithSections = ReturnType<
  SessionRepository["fetchSessionWithSectionsByDate"]
>[number];

export class HomeRepository {
  constructor(
    private readonly sessions: SessionRepository,
    private readonly analytics: AnalyticsRepository,
    private readonly freshness: {
      fetchLastMigrationTimestamp: FreshnessReader;
      fetchLastScraperRunAt: FreshnessReader;
      fetchLastMigratorRunAt: FreshnessReader;
    },
  ) {}

  public async fetchOverview(params: HomeOverviewParams) {
    const latestCompletedSessionDate = this.pickLatestCompletedSessionDate({
      startDate: params.startDate,
      endDate: params.endDate,
    });

    const asOfDate =
      params.asOfDate ||
      latestCompletedSessionDate ||
      new Date().toISOString().slice(0, 10);

    const [parties, vaskiLatestSpeechDate, recentActivity, closeVotes, speechActivity, coalitionOpposition, lastMigrationTimestamp, lastScraperRunAt, lastMigratorRunAt] =
      await Promise.all([
        Promise.resolve(
          this.analytics.fetchPartySummary({
            asOfDate,
            startDate: params.startDate,
            endDate: params.endDate,
            governmentName: params.governmentName,
            governmentStartDate: params.governmentStartDate,
          }),
        ),
        Promise.resolve(this.sessions.fetchLatestSpeechDate()),
        Promise.resolve(
          this.analytics.fetchRecentActivity({
            limit: 6,
            startDate: params.startDate,
            endDate: params.endDate,
          }),
        ),
        Promise.resolve(
          this.analytics.fetchCloseVotes({
            threshold: 10,
            limit: 5,
            startDate: params.startDate,
            endDate: params.endDate,
          }),
        ),
        Promise.resolve(
          this.analytics.fetchSpeechActivity({
            limit: 5,
            startDate: params.startDate,
            endDate: params.endDate,
          }),
        ),
        Promise.resolve(
          this.analytics.fetchCoalitionVsOpposition({
            limit: 5,
            startDate: params.startDate,
            endDate: params.endDate,
          }),
        ),
        Promise.resolve(this.freshness.fetchLastMigrationTimestamp()),
        Promise.resolve(this.freshness.fetchLastScraperRunAt()),
        Promise.resolve(this.freshness.fetchLastMigratorRunAt()),
      ]);

    const latestDaySessions = latestCompletedSessionDate
      ? this.sessions.fetchSessionWithSectionsByDate({
          date: latestCompletedSessionDate,
        })
      : [];
    const latestDay = this.enrichLatestDaySessions(
      latestCompletedSessionDate,
      latestDaySessions,
      vaskiLatestSpeechDate,
    );

    const totalMembers = parties.reduce(
      (sum, party) => sum + party.member_count,
      0,
    );
    const governmentMembers = parties.reduce(
      (sum, party) =>
        sum + (party.is_in_government === 1 ? party.member_count : 0),
      0,
    );

    return {
      scope: {
        asOfDate,
        startDate: params.startDate ?? null,
        endDate: params.endDate ?? null,
        governmentName: params.governmentName ?? null,
        governmentStartDate: params.governmentStartDate ?? null,
        latestCompletedSessionDate,
      },
      freshness: {
        lastMigrationTimestamp,
        lastScraperRunAt,
        lastMigratorRunAt,
      },
      composition: {
        totalMembers,
        governmentMembers,
        oppositionMembers: Math.max(totalMembers - governmentMembers, 0),
        partyCount: parties.length,
        parties,
      },
      latestDay,
      signals: {
        recentActivity,
        closeVotes,
        speechActivity,
        coalitionOpposition,
      },
    };
  }

  private pickLatestCompletedSessionDate(params: {
    startDate?: string;
    endDate?: string;
  }): string | null {
    const dates = this.sessions.fetchCompletedSessionDates();
    const filtered = dates.filter(({ date }) => {
      if (params.startDate && date < params.startDate) return false;
      if (params.endDate && date > params.endDate) return false;
      return true;
    });

    if (filtered.length === 0) return null;
    return filtered.sort((left, right) => right.date.localeCompare(left.date))[0]
      ?.date;
  }

  private enrichLatestDaySessions(
    latestCompletedSessionDate: string | null,
    sessions: SessionWithSections[],
    vaskiLatestSpeechDate: string | null,
  ) {
    return {
      date: latestCompletedSessionDate,
      vaskiLatestSpeechDate,
      sessions: sessions.map((session) => ({
        ...session,
        notices: this.sessions.fetchSessionNotices({ sessionKey: session.key }),
      })),
    };
  }
}
