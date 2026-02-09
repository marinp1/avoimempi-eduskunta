import { Database } from "bun:sqlite";
import { getDatabasePath } from "#database";
import * as queries from "./queries";

export class DatabaseConnection {
  #database: Database | null = null;

  private get db() {
    if (!this.#database) throw new Error("Database not connected");
    return this.#database;
  }

  public async fetchParliamentComposition(params: { date: string }) {
    const dateObj = new Date(params.date);
    if (Number.isNaN(dateObj.getTime())) throw new Error("Invalid date");
    const $date = dateObj.toISOString();
    const stmt = this.db.query<
      DatabaseQueries.GetParliamentComposition,
      { $date: string }
    >(queries.currentComposition);
    const data = stmt.all({ $date });
    stmt.finalize();
    return data;
  }

  public async fetchRepresentativePage(params: {
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const stmt = this.db.prepare<
      DatabaseTables.Representative,
      { $limit: number; $offset: number }
    >(queries.sql`SELECT * FROM Representative LIMIT $limit OFFSET $offset`);
    const data = stmt.all({ $limit: params.limit, $offset: offset });
    stmt.finalize();
    return data;
  }

  public async fetchPersonGroupMemberships(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.ParliamentGroupMembership,
      { $personId: number }
    >(
      queries.sql`SELECT pgm.* FROM Representative r JOIN ParliamentaryGroupMembership pgm ON r.person_id = pgm.person_id WHERE r.person_id = $personId ORDER BY start_date ASC;`,
    );
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public async fetchPersonTerms(params: { id: string }) {
    const stmt = this.db.prepare<DatabaseTables.Term, { $personId: number }>(
      queries.sql`SELECT t.* FROM Representative r JOIN term t ON r.person_id = t.person_id WHERE r.person_id = $personId ORDER BY t.start_date ASC;`,
    );
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public async fetchPersonVotes(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseQueries.VotesByPerson,
      { $personId: number }
    >(queries.votesByPerson);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public async fetchRepresentativeDetails(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.Representative,
      { $personId: number }
    >(queries.representativeDetails);
    const data = stmt.get({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public async fetchRepresentativeDistricts(params: { id: string }) {
    const stmt = this.db.prepare<
      {
        id: number;
        person_id: number;
        district_name: string;
        start_date: string;
        end_date: string;
      },
      { $personId: number }
    >(queries.representativeDistricts);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public async fetchLeavingParliamentRecords(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.PeopleLeavingParliament,
      { $personId: number }
    >(queries.leavingParliamentRecords);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public async fetchTrustPositions(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.TrustPosition,
      { $personId: number }
    >(queries.trustPositions);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public async fetchGovernmentMemberships(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.GovernmentMembership,
      { $personId: number }
    >(queries.governmentMemberships);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public async queryVotings(params: { q: string }) {
    const stmt = this.db.prepare<DatabaseTables.Voting, []>(
      queries.sql`SELECT v.* FROM voting v WHERE v.section_title LIKE '%${params.q}%' ORDER BY start_time ASC LIMIT 100`,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public async fetchSessions(params: { page: number; limit: number }) {
    const offset = (params.page - 1) * params.limit;

    // Get total count
    const countStmt = this.db.prepare<{ count: number }, []>(
      queries.sql`SELECT COUNT(*) as count FROM Session`,
    );
    const countResult = countStmt.get();
    const totalCount = countResult?.count || 0;
    countStmt.finalize();

    // Get paginated sessions
    const stmt = this.db.prepare<
      DatabaseTables.Session & { agenda_title?: string; agenda_state?: string },
      { $limit: number; $offset: number }
    >(queries.sessionsPaginated);
    const sessions = stmt.all({ $limit: params.limit, $offset: offset });
    stmt.finalize();

    // Fetch sections for each session
    const sectionsStmt = this.db.prepare<
      DatabaseTables.Section,
      { $sessionKey: string }
    >(queries.sessionSections);

    const sessionsWithSections = sessions.map((session) => {
      const sections = sectionsStmt.all({ $sessionKey: session.key });
      return {
        ...session,
        sections,
      };
    });

    sectionsStmt.finalize();
    return {
      sessions: sessionsWithSections,
      totalCount,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(totalCount / params.limit),
    };
  }

  public async fetchSectionSpeeches(params: { sectionKey: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.Speech,
      { $sectionKey: string }
    >(queries.sectionSpeeches);
    const speeches = stmt.all({ $sectionKey: params.sectionKey });
    stmt.finalize();
    return speeches;
  }

  public async fetchSectionVotings(params: { sectionKey: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.Voting,
      { $sectionKey: string }
    >(queries.sectionVotings);
    const votings = stmt.all({ $sectionKey: params.sectionKey });
    stmt.finalize();
    return votings;
  }

  public async fetchVotingParticipation(params?: {
    startDate?: string;
    endDate?: string;
  }) {
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
        $endDate: string | null;
      }
    >(queries.votingParticipation);
    const data = stmt.all({
      $startDate: params?.startDate || null,
      $endDate: params?.endDate || null,
    });
    stmt.finalize();
    return data;
  }

  public async fetchVotingParticipationByGovernment(params: {
    personId: string;
    startDate?: string;
    endDate?: string;
  }) {
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
        $endDate: string | null;
      }
    >(queries.votingParticipationByGovernment);
    const data = stmt.all({
      $personId: +params.personId,
      $startDate: params?.startDate || null,
      $endDate: params?.endDate || null,
    });
    stmt.finalize();
    return data;
  }

  public async fetchGenderDivisionOverTime() {
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

  public async fetchAgeDivisionOverTime() {
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

  public async fetchPartyParticipationByGovernment(params?: {
    startDate?: string;
    endDate?: string;
  }) {
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
        $endDate: string | null;
      }
    >(queries.partyParticipationByGovernment);
    const data = stmt.all({
      $startDate: params?.startDate || null,
      $endDate: params?.endDate || null,
    });
    stmt.finalize();
    return data;
  }

  public async fetchSessionByDate(params: { date: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.Session & { agenda_title?: string; agenda_state?: string },
      { $date: string }
    >(queries.sessionByDate);
    const data = stmt.all({ $date: params.date });
    stmt.finalize();
    return data;
  }

  public async fetchSessionWithSectionsByDate(params: { date: string }) {
    const sessions = await this.fetchSessionByDate(params);

    const sectionsStmt = this.db.prepare<
      DatabaseTables.Section,
      { $sessionKey: string }
    >(queries.sessionSections);

    const votingCountStmt = this.db.prepare<
      { voting_count: number },
      { $sessionKey: string }
    >(
      queries.sql`SELECT COUNT(*) as voting_count FROM Voting v JOIN Section sec ON v.section_key = sec.key WHERE sec.session_key = $sessionKey`,
    );

    const sessionsWithSections = sessions.map((session) => {
      const sections = sectionsStmt.all({ $sessionKey: session.key });
      const votingCountResult = votingCountStmt.get({
        $sessionKey: session.key,
      });
      return {
        ...session,
        sections,
        section_count: sections.length,
        voting_count: votingCountResult?.voting_count || 0,
      };
    });

    sectionsStmt.finalize();
    votingCountStmt.finalize();
    return sessionsWithSections;
  }

  public async fetchSpeechesByDate(params: { date: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.ExcelSpeech & {
        section_title?: string;
        section_processing_title?: string;
        section_ordinal?: number;
      },
      { $date: string }
    >(queries.speechesByDate);
    const data = stmt.all({ $date: params.date });
    stmt.finalize();
    return data;
  }

  public async fetchSessionDates() {
    const stmt = this.db.prepare<{ date: string }, []>(queries.sessionDates);
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  // ─── Analytics queries ───

  public async fetchPartyDiscipline() {
    const stmt = this.db.prepare<
      {
        party_name: string;
        party_code: string;
        total_votes: number;
        votes_with_majority: number;
        discipline_rate: number;
      },
      []
    >(queries.partyDiscipline);
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public async fetchCloseVotes(params: { threshold?: number; limit?: number }) {
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
      { $threshold: number; $limit: number }
    >(queries.closeVotes);
    const data = stmt.all({
      $threshold: params.threshold ?? 10,
      $limit: params.limit ?? 50,
    });
    stmt.finalize();
    return data;
  }

  public async fetchMpActivityRanking(params: { limit?: number }) {
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

  public async fetchCoalitionVsOpposition(params: { limit?: number }) {
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
      { $limit: number }
    >(queries.coalitionVsOpposition);
    const data = stmt.all({ $limit: params.limit ?? 50 });
    stmt.finalize();
    return data;
  }

  public async fetchDissentTracking(params: {
    personId?: number;
    limit?: number;
  }) {
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
      { $personId: number | null; $limit: number }
    >(queries.dissentTracking);
    const data = stmt.all({
      $personId: params.personId ?? null,
      $limit: params.limit ?? 100,
    });
    stmt.finalize();
    return data;
  }

  public async fetchSpeechActivity(params: { limit?: number }) {
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
      { $limit: number }
    >(queries.speechActivity);
    const data = stmt.all({ $limit: params.limit ?? 50 });
    stmt.finalize();
    return data;
  }

  public async fetchCommitteeOverview() {
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

  public async fetchRecentActivity(params: { limit?: number }) {
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

  public async fetchPartySummary() {
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
      []
    >(queries.partySummary);
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public async fetchPartyMembers(params: { partyCode: string }) {
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
      { $partyCode: string }
    >(queries.partyMembers);
    const data = stmt.all({ $partyCode: params.partyCode });
    stmt.finalize();
    return data;
  }

  public async searchDocuments(params: {
    q?: string;
    type?: string;
    year?: string;
    limit?: number;
    offset?: number;
  }) {
    const stmt = this.db.prepare<
      {
        id: number;
        eduskunta_tunnus: string;
        document_type_code: string;
        document_type_name: string;
        document_number: number;
        parliamentary_year: string;
        title: string;
        author_first_name: string;
        author_last_name: string;
        author_role: string;
        creation_date: string;
        status: string;
        summary: string;
        subjects: string | null;
      },
      {
        $q: string | null;
        $type: string | null;
        $year: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.documentsSearch);
    const data = stmt.all({
      $q: params.q || null,
      $type: params.type || null,
      $year: params.year || null,
      $limit: params.limit ?? 50,
      $offset: params.offset ?? 0,
    });
    stmt.finalize();
    return data;
  }

  public async fetchDocumentsByType() {
    const stmt = this.db.prepare<
      {
        document_type_code: string;
        document_type_name: string;
        document_count: number;
        earliest: string;
        latest: string;
      },
      []
    >(queries.documentsByType);
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public async fetchDocumentDetail(params: { id: string }) {
    const stmt = this.db.prepare<
      {
        id: number;
        eduskunta_tunnus: string;
        document_type_code: string;
        document_type_name: string;
        document_number: number;
        parliamentary_year: string;
        title: string;
        author_first_name: string;
        author_last_name: string;
        author_role: string;
        author_organization: string;
        creation_date: string;
        status: string;
        language_code: string;
        publicity_code: string;
        source_reference: string;
        summary: string;
        subjects: string | null;
      },
      { $id: number }
    >(queries.documentDetail);
    const data = stmt.get({ $id: +params.id });
    stmt.finalize();
    return data;
  }

  public async fetchPersonSpeeches(params: {
    personId: string;
    limit?: number;
    offset?: number;
  }) {
    const stmt = this.db.prepare<
      {
        id: number;
        start_time: string;
        end_time: string;
        speech_type: string;
        processing_phase: string;
        document: string;
        content: string;
        party: string;
        minutes_url: string;
        word_count: number;
      },
      { $personId: number; $limit: number; $offset: number }
    >(queries.personSpeeches);
    const data = stmt.all({
      $personId: +params.personId,
      $limit: params.limit ?? 50,
      $offset: params.offset ?? 0,
    });
    stmt.finalize();
    return data;
  }

  public async fetchPersonCommittees(params: { personId: string }) {
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
    >(queries.personCommittees);
    const data = stmt.all({ $personId: +params.personId });
    stmt.finalize();
    return data;
  }

  public async fetchPersonDissents(params: {
    personId: string;
    limit?: number;
  }) {
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
    >(queries.personDissents);
    const data = stmt.all({
      $personId: +params.personId,
      $limit: params.limit ?? 100,
    });
    stmt.finalize();
    return data;
  }

  public async federatedSearch(params: { q: string; limit?: number }) {
    const stmt = this.db.prepare<
      {
        type: string;
        id: string;
        title: string;
        subtitle: string | null;
        date: string | null;
      },
      { $q: string; $limit: number }
    >(queries.federatedSearch);
    const data = stmt.all({
      $q: params.q,
      $limit: params.limit ?? 30,
    });
    stmt.finalize();
    return data;
  }

  #connectToDatabase() {
    const databasePath = getDatabasePath();
    console.log("Using", databasePath);
    this.#database = new Database(databasePath, {
      create: true,
      readonly: true,
    });
    this.#database.exec("PRAGMA journal_mode = WAL;");
    return this.#database;
  }

  constructor() {
    this.#connectToDatabase();
    return this;
  }
}
