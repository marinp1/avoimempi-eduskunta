import type { Database } from "bun:sqlite";
import * as queries from "../queries";
import { endDateExclusive } from "../query-helpers";

export class AnalyticsRepository {
  constructor(private readonly db: Database) {}

  public fetchVotingParticipation(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusiveValue = endDateExclusive(params?.endDate);
    const stmt = this.db.prepare<
      {
        person_id: number;
        first_name: string;
        last_name: string;
        sort_name: string;
        votes_cast: number;
        total_votings: number;
        participation_rate: number;
      },
      {
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.votingParticipation);
    const data = stmt.all({
      $startDate: params?.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    stmt.finalize();
    return data;
  }

  public fetchVotingParticipationByGovernment(params: {
    personId: string;
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusiveValue = endDateExclusive(params?.endDate);
    const stmt = this.db.prepare<
      {
        person_id: number;
        first_name: string;
        last_name: string;
        sort_name: string;
        government: string;
        government_start: string;
        government_end: string | null;
        votes_cast: number;
        total_votings: number;
        participation_rate: number;
      },
      {
        $personId: number;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.votingParticipationByGovernment);
    const data = stmt.all({
      $personId: +params.personId,
      $startDate: params?.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    stmt.finalize();
    return data;
  }

  public fetchGenderDivisionOverTime() {
    const stmt = this.db.prepare<
      {
        year: number;
        female_count: number;
        male_count: number;
        total_count: number;
        female_percentage: number;
        male_percentage: number;
      },
      []
    >(queries.genderDivisionOverTime);
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public fetchAgeDivisionOverTime() {
    const stmt = this.db.prepare<
      {
        year: number;
        age_under_30: number;
        age_30_39: number;
        age_40_49: number;
        age_50_59: number;
        age_60_plus: number;
        average_age: number;
        min_age: number;
        max_age: number;
        total_count: number;
      },
      []
    >(queries.ageDivisionOverTime);
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public fetchPartyParticipationByGovernment(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusiveValue = endDateExclusive(params?.endDate);
    const stmt = this.db.prepare<
      {
        government: string;
        government_start: string;
        government_end: string | null;
        party_name: string;
        votes_cast: number;
        total_votings: number;
        participation_rate: number;
        party_member_count: number;
        was_in_coalition: number;
      },
      {
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.partyParticipationByGovernment);
    const data = stmt.all({
      $startDate: params?.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    stmt.finalize();
    return data;
  }

  public fetchPartyDiscipline(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusiveValue = endDateExclusive(params?.endDate);
    const stmt = this.db.prepare<
      {
        party_name: string;
        party_code: string;
        total_votes: number;
        votes_with_majority: number;
        discipline_rate: number;
      },
      { $startDate: string | null; $endDateExclusive: string | null }
    >(queries.partyDiscipline);
    const data = stmt.all({
      $startDate: params?.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    stmt.finalize();
    return data;
  }

  public fetchCloseVotes(params: {
    threshold?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const stmt = this.db.prepare<
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
    >(queries.closeVotes);
    const data = stmt.all({
      $threshold: params.threshold ?? 10,
      $limit: params.limit ?? 50,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    stmt.finalize();
    return data;
  }

  public fetchMpActivityRanking(params: { limit?: number }) {
    const stmt = this.db.prepare<
      {
        person_id: number;
        first_name: string;
        last_name: string;
        party: string;
        votes_cast: number;
        total_votings: number;
        speech_count: number;
        committee_count: number;
        activity_score: number;
      },
      { $limit: number }
    >(queries.mpActivityRanking);
    const data = stmt.all({ $limit: params.limit ?? 50 });
    stmt.finalize();
    return data;
  }

  public fetchCoalitionVsOpposition(params: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const stmt = this.db.prepare<
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
    >(queries.coalitionVsOpposition);
    const data = stmt.all({
      $limit: params.limit ?? 50,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    stmt.finalize();
    return data;
  }

  public fetchDissentTracking(params: {
    personId?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const stmt = this.db.prepare<
      {
        person_id: number;
        first_name: string;
        last_name: string;
        party_name: string;
        party_code: string;
        voting_id: number;
        start_time: string;
        title: string;
        section_title: string;
        mp_vote: string;
        majority_vote: string;
      },
      {
        $personId: number | null;
        $limit: number;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.dissentTracking);
    const data = stmt.all({
      $personId: params.personId ?? null,
      $limit: params.limit ?? 100,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    stmt.finalize();
    return data;
  }

  public fetchSpeechActivity(params: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const stmt = this.db.prepare<
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
    >(queries.speechActivity);
    const data = stmt.all({
      $limit: params.limit ?? 50,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusiveValue,
    });
    stmt.finalize();
    return data;
  }

  public fetchCommitteeOverview() {
    const stmt = this.db.prepare<
      {
        committee_code: string;
        committee_name: string;
        current_members: number;
        total_historical_members: number;
        current_chairs: string | null;
      },
      []
    >(queries.committeeOverview);
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public fetchRecentActivity(params: { limit?: number }) {
    const stmt = this.db.prepare<
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
      { $limit: number }
    >(queries.recentActivity);
    const data = stmt.all({ $limit: params.limit ?? 20 });
    stmt.finalize();
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
    const stmt = this.db.prepare<
      {
        party_code: string;
        party_name: string;
        member_count: number;
        is_in_government: number;
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
    >(queries.partySummary);
    const data = stmt.all({
      $asOfDate: asOfDate,
      $startDate: startDate,
      $endDateExclusive: endDateExclusiveValue,
      $governmentName: governmentName,
      $governmentStartDate: governmentStartDate,
    });
    stmt.finalize();
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
    const stmt = this.db.prepare<
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
    >(queries.partyMembers);
    const data = stmt.all({
      $partyCode: params.partyCode,
      $asOfDate: asOfDate,
      $startDate: startDate,
      $endDateExclusive: endDateExclusiveValue,
      $governmentName: governmentName,
      $governmentStartDate: governmentStartDate,
    });
    stmt.finalize();
    return data;
  }
}
