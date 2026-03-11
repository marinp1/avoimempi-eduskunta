import type { Database } from "bun:sqlite";
import governmentMemberships from "../queries/GOVERNMENT_MEMBERSHIPS.sql";
import personGovernmentPeriods from "../queries/PERSON_GOVERNMENT_PERIODS.sql";
import leavingParliamentRecords from "../queries/LEAVING_PARLIAMENT.sql";
import personCommittees from "../queries/PERSON_COMMITTEES.sql";
import personDissents from "../queries/PERSON_DISSENTS.sql";
import personGroupMemberships from "../queries/PERSON_GROUP_MEMBERSHIPS.sql";
import personQuestions from "../queries/PERSON_QUESTIONS.sql";
import personSearch from "../queries/PERSON_SEARCH.sql";
import personSpeeches from "../queries/PERSON_SPEECHES.sql";
import personSpeechesCount from "../queries/PERSON_SPEECHES_COUNT.sql";
import personTerms from "../queries/PERSON_TERMS.sql";
import representativeDetails from "../queries/REPRESENTATIVE_DETAILS.sql";
import representativeDistricts from "../queries/REPRESENTATIVE_DISTRICTS.sql";
import representativesPaginated from "../queries/REPRESENTATIVES_PAGINATED.sql";
import trustPositions from "../queries/TRUST_POSITIONS.sql";
import votesByPerson from "../queries/VOTES_BY_PERSON.sql";
import { buildSearchQuery } from "../query-helpers";

export class PersonRepository {
  constructor(private readonly db: Database) {}

  public fetchRepresentativePage(params: { page: number; limit: number }) {
    const offset = (params.page - 1) * params.limit;
    const stmt = this.db.prepare<
      DatabaseTables.Representative,
      {
        $limit: number;
        $offset: number;
      }
    >(representativesPaginated);
    const data = stmt.all({ $limit: params.limit, $offset: offset });
    stmt.finalize();
    return data;
  }

  public fetchPersonSearch(params: {
    q: string;
    limit?: number;
    date?: string | null;
  }) {
    const searchQuery = buildSearchQuery(params.q);
    if (!searchQuery) return [];
    const exactQuery = params.q.trim().replace(/\s+/g, " ");
    const stmt = this.db.prepare<
      DatabaseQueries.PersonSearchResult,
      {
        $query: string;
        $exactQuery: string;
        $prefixQuery: string;
        $limit: number;
        $date: string | null;
      }
    >(personSearch);
    const data = stmt.all({
      $query: searchQuery,
      $exactQuery: exactQuery,
      $prefixQuery: `${exactQuery}%`,
      $limit: params.limit ?? 20,
      $date: params.date ?? null,
    });
    stmt.finalize();
    return data;
  }

  public fetchPersonGroupMemberships(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.ParliamentGroupMembership,
      { $personId: number }
    >(personGroupMemberships);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public fetchPersonTerms(params: { id: string }) {
    const stmt = this.db.prepare<DatabaseTables.Term, { $personId: number }>(
      personTerms,
    );
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public fetchPersonVotes(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseQueries.VotesByPerson,
      { $personId: number }
    >(votesByPerson);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public fetchRepresentativeDetails(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.Representative,
      { $personId: number }
    >(representativeDetails);
    const data = stmt.get({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public fetchRepresentativeDistricts(params: { id: string }) {
    const stmt = this.db.prepare<
      {
        id: number;
        person_id: number;
        district_name: string;
        start_date: string;
        end_date: string;
      },
      { $personId: number }
    >(representativeDistricts);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public fetchLeavingParliamentRecords(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.PeopleLeavingParliament,
      { $personId: number }
    >(leavingParliamentRecords);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public fetchTrustPositions(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.TrustPosition,
      { $personId: number }
    >(trustPositions);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public fetchGovernmentMemberships(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.GovernmentMembership,
      { $personId: number }
    >(governmentMemberships);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public fetchGovernmentPeriods(params: { id: string }) {
    const stmt = this.db.prepare<
      {
        government_name: string;
        government_start_date: string;
        government_end_date: string | null;
        is_coalition: 0 | 1;
      },
      { $personId: number }
    >(personGovernmentPeriods);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public fetchPersonSpeeches(params: {
    personId: string;
    limit?: number;
    offset?: number;
  }) {
    const stmt = this.db.prepare<
      {
        id: number;
        section_key: string;
        session_key: string;
        section_title: string | null;
        section_identifier: string | null;
        start_time: string | null;
        end_time: string | null;
        speech_type: string | null;
        processing_phase: string | null;
        document: string | null;
        content: string | null;
        party: string | null;
        minutes_url: string | null;
        word_count: number;
      },
      { $personId: number; $limit: number; $offset: number }
    >(personSpeeches);
    const data = stmt.all({
      $personId: +params.personId,
      $limit: params.limit ?? 50,
      $offset: params.offset ?? 0,
    });
    stmt.finalize();
    const countStmt = this.db.prepare<{ total: number }, { $personId: number }>(
      personSpeechesCount,
    );
    const { total } = countStmt.get({ $personId: +params.personId })!;
    countStmt.finalize();
    return { speeches: data, total };
  }

  public fetchPersonQuestions(params: { personId: string; limit?: number }) {
    const stmt = this.db.prepare<
      {
        question_kind: "interpellation" | "written_question" | "oral_question";
        id: number;
        parliament_identifier: string;
        title: string | null;
        submission_date: string | null;
        relation_role: "asker" | "first_signer" | "signer";
      },
      { $personId: number; $limit: number }
    >(personQuestions);
    const data = stmt.all({
      $personId: +params.personId,
      $limit: params.limit ?? 500,
    });
    stmt.finalize();
    return data;
  }

  public fetchPersonCommittees(params: { personId: string }) {
    const stmt = this.db.prepare<
      {
        id: number;
        committee_code: string;
        committee_name: string;
        role: string;
        start_date: string;
        end_date: string | null;
      },
      { $personId: number }
    >(personCommittees);
    const data = stmt.all({ $personId: +params.personId });
    stmt.finalize();
    return data;
  }

  public fetchPersonDissents(params: { personId: string; limit?: number }) {
    const stmt = this.db.prepare<
      {
        voting_id: number;
        start_time: string;
        title: string;
        section_title: string;
        mp_vote: string;
        majority_vote: string;
        party_name: string;
      },
      { $personId: number; $limit: number }
    >(personDissents);
    const data = stmt.all({
      $personId: +params.personId,
      $limit: params.limit ?? 100,
    });
    stmt.finalize();
    return data;
  }
}
