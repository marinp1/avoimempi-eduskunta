import { Database } from "bun:sqlite";
import { getDatabasePath } from "#database";
import * as queries from "./queries";
import { SQLITE_PRAGMAS } from "./sql-statements";

export class DatabaseConnection {
  #database: Database | null = null;

  private get db() {
    if (!this.#database) throw new Error("Database not connected");
    return this.#database;
  }

  private buildFtsQuery(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const tokens = raw
      .trim()
      .split(/\s+/)
      .map((token) => token.replace(/"/g, '""'))
      .filter((token) => token.length > 0);
    if (tokens.length === 0) return null;
    return tokens.map((token) => `${token}*`).join(" ");
  }

  private endDateExclusive(endDate: string | null | undefined): string | null {
    if (!endDate) return null;
    const parsed = new Date(`${endDate}T00:00:00Z`);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setUTCDate(parsed.getUTCDate() + 1);
    return parsed.toISOString().substring(0, 10);
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
    >(queries.representativesPaginated);
    const data = stmt.all({ $limit: params.limit, $offset: offset });
    stmt.finalize();
    return data;
  }

  public async fetchPersonGroupMemberships(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.ParliamentGroupMembership,
      { $personId: number }
    >(queries.personGroupMemberships);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public async fetchPersonTerms(params: { id: string }) {
    const stmt = this.db.prepare<DatabaseTables.Term, { $personId: number }>(
      queries.personTerms,
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
    const ftsQuery = this.buildFtsQuery(params.q);
    if (!ftsQuery) return [];
    const stmt = this.db.prepare<
      DatabaseQueries.VotingSearchResult,
      { $query: string }
    >(queries.votingsSearch);
    const data = stmt.all({ $query: ftsQuery });
    stmt.finalize();
    return data;
  }

  public async fetchVotingById(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseQueries.VotingSearchResult,
      { $id: number }
    >(queries.votingById);
    const data = stmt.get({ $id: +params.id });
    stmt.finalize();
    return data ?? null;
  }

  public async fetchSessions(params: { page: number; limit: number }) {
    const offset = (params.page - 1) * params.limit;

    // Get total count
    const countStmt = this.db.prepare<{ count: number }, []>(
      queries.sessionCount,
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
      DatabaseTables.Section & {
        voting_count: number;
        speech_count: number;
        speaker_count: number;
        party_count: number;
        vaski_document_id?: number | null;
        vaski_document_type_name?: string | null;
        vaski_document_type_code?: string | null;
        vaski_eduskunta_tunnus?: string | null;
        vaski_document_number?: number | null;
        vaski_parliamentary_year?: string | null;
        vaski_title?: string | null;
        vaski_summary?: string | null;
        vaski_author_first_name?: string | null;
        vaski_author_last_name?: string | null;
        vaski_author_role?: string | null;
        vaski_author_organization?: string | null;
        vaski_creation_date?: string | null;
        vaski_status?: string | null;
        vaski_source_reference?: string | null;
        vaski_subjects?: string | null;
        minutes_entry_kind?: string | null;
        minutes_entry_order?: number | null;
        minutes_item_identifier?: number | null;
        minutes_parent_item_identifier?: string | null;
        minutes_item_number?: string | null;
        minutes_item_order?: number | null;
        minutes_item_title?: string | null;
        minutes_related_document_identifier?: string | null;
        minutes_related_document_type?: string | null;
        minutes_processing_phase_code?: string | null;
        minutes_general_processing_phase_code?: string | null;
        minutes_content_text?: string | null;
        minutes_match_mode?: string | null;
      },
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

  public async fetchSectionSpeeches(params: {
    sectionKey: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = params.limit ?? 20;
    const offset = params.offset ?? 0;

    const countStmt = this.db.prepare<
      { count: number },
      { $sectionKey: string }
    >(queries.sectionSpeechCount);
    const countResult = countStmt.get({ $sectionKey: params.sectionKey });
    const total = countResult?.count || 0;
    countStmt.finalize();

    const stmt = this.db.prepare<
      DatabaseTables.Speech,
      { $sectionKey: string; $limit: number; $offset: number }
    >(queries.sectionSpeeches);
    const speeches = stmt.all({
      $sectionKey: params.sectionKey,
      $limit: limit,
      $offset: offset,
    });
    stmt.finalize();

    return {
      speeches,
      total,
      page: Math.floor(offset / limit) + 1,
      totalPages: Math.ceil(total / limit),
    };
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

  public async fetchSectionSubSections(params: { sectionKey: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.SubSection,
      { $sectionKey: string }
    >(queries.sectionSubSections);
    const rows = stmt.all({ $sectionKey: params.sectionKey });
    stmt.finalize();
    return rows;
  }

  public async fetchSectionRollCall(params: { sectionKey: string }) {
    const reportStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        session_date: string;
        roll_call_start_time?: string | null;
        roll_call_end_time?: string | null;
        title?: string | null;
        status?: string | null;
        created_at?: string | null;
        edk_identifier: string;
        source_path: string;
        attachment_group_id?: number | null;
        entry_count: number;
        absent_count: number;
        late_count: number;
      },
      { $sectionKey: string }
    >(queries.sectionRollCallReport);
    const report = reportStmt.get({ $sectionKey: params.sectionKey });
    reportStmt.finalize();

    if (!report) return null;

    const entriesStmt = this.db.prepare<
      {
        roll_call_id: number;
        entry_order: number;
        person_id?: number | null;
        first_name: string;
        last_name: string;
        party?: string | null;
        entry_type: "absent" | "late";
        absence_reason?: string | null;
        arrival_time?: string | null;
      },
      { $rollCallId: number }
    >(queries.rollCallEntries);
    const entries = entriesStmt.all({ $rollCallId: report.id });
    entriesStmt.finalize();

    return {
      report,
      entries,
    };
  }

  public async fetchVotingParticipation(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusive = this.endDateExclusive(params?.endDate);
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
      $endDateExclusive: endDateExclusive,
    });
    stmt.finalize();
    return data;
  }

  public async fetchVotingParticipationByGovernment(params: {
    personId: string;
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusive = this.endDateExclusive(params?.endDate);
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
      $endDateExclusive: endDateExclusive,
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
    const endDateExclusive = this.endDateExclusive(params?.endDate);
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
      $endDateExclusive: endDateExclusive,
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
      DatabaseTables.Section & {
        voting_count: number;
        speech_count: number;
        speaker_count: number;
        party_count: number;
        vaski_document_id?: number | null;
        vaski_document_type_name?: string | null;
        vaski_document_type_code?: string | null;
        vaski_eduskunta_tunnus?: string | null;
        vaski_document_number?: number | null;
        vaski_parliamentary_year?: string | null;
        vaski_title?: string | null;
        vaski_summary?: string | null;
        vaski_author_first_name?: string | null;
        vaski_author_last_name?: string | null;
        vaski_author_role?: string | null;
        vaski_author_organization?: string | null;
        vaski_creation_date?: string | null;
        vaski_status?: string | null;
        vaski_source_reference?: string | null;
        vaski_subjects?: string | null;
        minutes_entry_kind?: string | null;
        minutes_entry_order?: number | null;
        minutes_item_identifier?: number | null;
        minutes_parent_item_identifier?: string | null;
        minutes_item_number?: string | null;
        minutes_item_order?: number | null;
        minutes_item_title?: string | null;
        minutes_related_document_identifier?: string | null;
        minutes_related_document_type?: string | null;
        minutes_processing_phase_code?: string | null;
        minutes_general_processing_phase_code?: string | null;
        minutes_content_text?: string | null;
        minutes_match_mode?: string | null;
      },
      { $sessionKey: string }
    >(queries.sessionSections);

    const votingCountStmt = this.db.prepare<
      { voting_count: number },
      { $sessionKey: string }
    >(queries.sessionVotingCount);

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

  public async fetchSessionDocuments(params: { sessionKey: string }) {
    const stmt = this.db.prepare<
      {
        document_kind: "agenda" | "minutes" | "roll_call";
        id: number;
        type_slug: string;
        type_name_fi: string | null;
        root_family: string | null;
        eduskunta_tunnus: string | null;
        document_type_code: string | null;
        document_number_text: string | null;
        parliamentary_year_text: string | null;
        title: string | null;
        status_text: string | null;
        created_at: string | null;
      },
      { $sessionKey: string }
    >(queries.sessionDocuments);
    const data = stmt.all({ $sessionKey: params.sessionKey });
    stmt.finalize();
    return data;
  }

  public async fetchSessionNotices(params: { sessionKey: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.SessionNotice,
      { $sessionKey: string }
    >(queries.sessionNotices);
    const data = stmt.all({ $sessionKey: params.sessionKey });
    stmt.finalize();
    return data;
  }

  public async fetchSectionDocumentLinks(params: { sectionKey: string }) {
    const stmt = this.db.prepare<
      {
        id: number;
        section_key: string;
        label: string | null;
        url: string | null;
        document_tunnus: string | null;
        document_id: number | null;
        document_type_name: string | null;
        document_type_code: string | null;
        document_title: string | null;
        document_created_at: string | null;
        source_type: string | null;
      },
      { $sectionKey: string }
    >(queries.sectionDocumentLinks);
    const data = stmt.all({ $sectionKey: params.sectionKey });
    stmt.finalize();
    return data;
  }

  public async fetchSpeechesByDate(params: { date: string }) {
    const stmt = this.db.prepare<
      {
        id: number;
        excel_id?: string | null;
        processing_phase?: string | null;
        document?: string | null;
        ordinal?: number | null;
        position?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        party?: string | null;
        speech_type?: string | null;
        start_time?: string | null;
        end_time?: string | null;
        content?: string | null;
        minutes_url?: string | null;
        source_file?: string | null;
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
    const ftsQuery = this.buildFtsQuery(params.q);
    if (!ftsQuery) return [];
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
      $q: ftsQuery,
      $limit: params.limit ?? 30,
    });
    stmt.finalize();
    return data;
  }

  #connectToDatabase() {
    const databasePath = getDatabasePath();
    console.log("Using", databasePath);
    this.#database = new Database(databasePath, {
      create: false,
      readonly: true,
    });
    this.#database.exec(SQLITE_PRAGMAS.queryOnlyOn);
    this.#database.exec(SQLITE_PRAGMAS.tempStoreMemory);
    return this.#database;
  }

  constructor() {
    this.#connectToDatabase();
    return this;
  }
}
