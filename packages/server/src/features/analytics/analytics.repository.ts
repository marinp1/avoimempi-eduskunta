import type { Database } from "bun:sqlite";
import closeVotes from "./sql/analytics-close-votes.sql";
import coalitionVsOpposition from "./sql/analytics-coalition-opposition.sql";
import partyDiscipline from "./sql/analytics-party-discipline.sql";
import partyMembers from "./sql/analytics-party-members.sql";
import partySummary from "./sql/analytics-party-summary.sql";
import recentActivity from "./sql/analytics-recent-activity.sql";
import speechActivity from "./sql/analytics-speech-activity.sql";
import { endDateExclusive } from "../../database/query-helpers";

export class AnalyticsRepository {
  constructor(private readonly db: Database) {}

  public fetchPartyDiscipline(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusiveValue = endDateExclusive(params?.endDate);
    const stmt = this.db.query<
      {
        party_name: string;
        party_code: string;
        total_votes: number;
        votes_with_majority: number;
        discipline_rate: number;
      },
      { $startDate: string | null; $endDateExclusive: string | null }
    >(partyDiscipline);
    const data = stmt.all({
      $startDate: params?.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    return data;
  }

  public fetchCloseVotes(params: {
    threshold?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const stmt = this.db.query<
      {
        id: number;
        start_time: string;
        title: string;
        section_title: string;
        n_yes: number;
        n_no: number;
        n_abstain: number;
        n_absent: number;
        n_total: number;
        margin: number;
        session_key: string;
        section_key: string;
        result_url: string;
        proceedings_url: string;
      },
      {
        $threshold: number;
        $limit: number;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(closeVotes);
    const data = stmt.all({
      $threshold: params.threshold ?? 10,
      $limit: params.limit ?? 50,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    return data;
  }

  public fetchCoalitionVsOpposition(params: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const stmt = this.db.query<
      {
        voting_id: number;
        start_time: string;
        title: string;
        section_title: string;
        n_yes: number;
        n_no: number;
        coalition_yes: number;
        coalition_no: number;
        coalition_total: number;
        opposition_yes: number;
        opposition_no: number;
        opposition_total: number;
      },
      {
        $limit: number;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(coalitionVsOpposition);
    const data = stmt.all({
      $limit: params.limit ?? 50,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    return data;
  }

  public fetchSpeechActivity(params: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const stmt = this.db.query<
      {
        person_id: number;
        first_name: string;
        last_name: string;
        party: string;
        speech_count: number;
        total_words: number;
        avg_words_per_speech: number;
        first_speech: string;
        last_speech: string;
      },
      {
        $limit: number;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(speechActivity);
    const data = stmt.all({
      $limit: params.limit ?? 50,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    return data;
  }

  public fetchRecentActivity(params: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const stmt = this.db.query<
      {
        date: string;
        session_key: string;
        description: string;
        session_type: string;
        section_count: number;
        voting_count: number;
        total_votes_cast: number;
        close_vote_count: number;
      },
      {
        $limit: number;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(recentActivity);
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const data = stmt.all({
      $limit: params.limit ?? 20,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    return data;
  }

  public fetchPartySummary(params?: {
    asOfDate?: string;
    startDate?: string;
    endDate?: string;
    governmentName?: string;
    governmentStartDate?: string;
  }) {
    const asOfDate =
      params?.asOfDate || new Date().toISOString().substring(0, 10);
    const startDate = params?.startDate ?? null;
    const endDateExclusiveValue = endDateExclusive(params?.endDate);
    const governmentName = params?.governmentName ?? null;
    const governmentStartDate = params?.governmentStartDate ?? null;
    const stmt = this.db.query<
      {
        party_code: string;
        party_display_code: string;
        party_name: string;
        member_count: number;
        is_in_government: number;
        votes_cast: number;
        total_votings: number;
        participation_rate: number;
        female_count: number;
        male_count: number;
        average_age: number;
      },
      {
        $asOfDate: string;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $governmentName: string | null;
        $governmentStartDate: string | null;
      }
    >(partySummary);
    const data = stmt.all({
      $asOfDate: asOfDate,
      $startDate: startDate,
      $endDateExclusive: endDateExclusiveValue,
      $governmentName: governmentName,
      $governmentStartDate: governmentStartDate,
    });
    return data;
  }

  public fetchPartyMembers(params: {
    partyCode: string;
    asOfDate?: string;
    startDate?: string;
    endDate?: string;
    governmentName?: string;
    governmentStartDate?: string;
  }) {
    const asOfDate =
      params.asOfDate || new Date().toISOString().substring(0, 10);
    const startDate = params.startDate ?? null;
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const governmentName = params.governmentName ?? null;
    const governmentStartDate = params.governmentStartDate ?? null;
    const stmt = this.db.query<
      {
        person_id: number;
        first_name: string;
        last_name: string;
        party: string;
        gender: string;
        birth_date: string;
        current_municipality: string;
        profession: string;
        is_minister: number;
        ministry: string | null;
      },
      {
        $partyCode: string;
        $asOfDate: string;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $governmentName: string | null;
        $governmentStartDate: string | null;
      }
    >(partyMembers);
    const data = stmt.all({
      $partyCode: params.partyCode,
      $asOfDate: asOfDate,
      $startDate: startDate,
      $endDateExclusive: endDateExclusiveValue,
      $governmentName: governmentName,
      $governmentStartDate: governmentStartDate,
    });
    return data;
  }
}
