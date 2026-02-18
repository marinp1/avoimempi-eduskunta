import { Database } from "bun:sqlite";
import { getDatabasePath } from "#database";
import * as queries from "./queries";
import { SQLITE_PRAGMAS } from "./sql-statements";
import {
  fetchGovernmentMemberships,
  fetchLeavingParliamentRecords,
  fetchPersonGroupMemberships,
  fetchPersonTerms,
  fetchPersonVotes,
  fetchRepresentativeDetails,
  fetchRepresentativeDistricts,
  fetchRepresentativePage,
  fetchTrustPositions,
} from "./services/person";
import {
  fetchSessionByDate,
  fetchSessionDocuments,
  fetchSessionDates,
  fetchSessionNotices,
  fetchSessions,
  fetchSectionDocumentLinks,
  fetchSectionRollCall,
  fetchSectionSpeeches,
  fetchSectionSubSections,
  fetchSectionVotings,
  fetchSpeechesByDate,
  fetchSessionWithSectionsByDate,
} from "./services/session";
import {
  fetchVotingsByDocument,
  fetchVotingById,
  fetchVotingInlineDetails,
  queryVotings,
} from "./services/voting";

export class DatabaseConnection {
  #database: Database | null = null;

  private get db() {
    if (!this.#database) throw new Error("Database not connected");
    return this.#database;
  }

  private buildSearchQuery(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const tokens = raw
      .trim()
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 0);
    if (tokens.length === 0) return null;
    return tokens.join("%");
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
    return fetchRepresentativePage(this.db, params);
  }

  public async fetchPersonGroupMemberships(params: { id: string }) {
    return fetchPersonGroupMemberships(this.db, params);
  }

  public async fetchPersonTerms(params: { id: string }) {
    return fetchPersonTerms(this.db, params);
  }

  public async fetchPersonVotes(params: { id: string }) {
    return fetchPersonVotes(this.db, params);
  }

  public async fetchRepresentativeDetails(params: { id: string }) {
    return fetchRepresentativeDetails(this.db, params);
  }

  public async fetchRepresentativeDistricts(params: { id: string }) {
    return fetchRepresentativeDistricts(this.db, params);
  }

  public async fetchLeavingParliamentRecords(params: { id: string }) {
    return fetchLeavingParliamentRecords(this.db, params);
  }

  public async fetchTrustPositions(params: { id: string }) {
    return fetchTrustPositions(this.db, params);
  }

  public async fetchGovernmentMemberships(params: { id: string }) {
    return fetchGovernmentMemberships(this.db, params);
  }

  public async queryVotings(params: { q: string }) {
    const searchQuery = this.buildSearchQuery(params.q);
    if (!searchQuery) return [];
    return queryVotings(this.db, searchQuery);
  }

  public async fetchVotingById(params: { id: string }) {
    const votingId = Number.parseInt(params.id, 10);
    if (!Number.isFinite(votingId)) return null;
    return fetchVotingById(this.db, votingId);
  }

  public async fetchVotingInlineDetails(params: { id: string }) {
    const votingId = Number.parseInt(params.id, 10);
    if (!Number.isFinite(votingId)) return null;
    return fetchVotingInlineDetails(this.db, votingId);
  }

  public async fetchVotingsByDocument(params: { identifier: string }) {
    return fetchVotingsByDocument(this.db, params.identifier);
  }

  public async fetchSessions(params: { page: number; limit: number }) {
    return fetchSessions(this.db, params);
  }

  public async fetchSectionSpeeches(params: {
    sectionKey: string;
    limit?: number;
    offset?: number;
  }) {
    return fetchSectionSpeeches(this.db, params);
  }

  public async fetchSectionVotings(params: { sectionKey: string }) {
    return fetchSectionVotings(this.db, params);
  }

  public async fetchSectionSubSections(params: { sectionKey: string }) {
    return fetchSectionSubSections(this.db, params);
  }

  public async fetchSectionRollCall(params: { sectionKey: string }) {
    return fetchSectionRollCall(this.db, params);
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
    return fetchSessionByDate(this.db, params);
  }

  public async fetchSessionWithSectionsByDate(params: { date: string }) {
    return fetchSessionWithSectionsByDate(this.db, params);
  }

  public async fetchSessionDocuments(params: { sessionKey: string }) {
    return fetchSessionDocuments(this.db, params);
  }

  public async fetchSessionNotices(params: { sessionKey: string }) {
    return fetchSessionNotices(this.db, params);
  }

  public async fetchSectionDocumentLinks(params: { sectionKey: string }) {
    return fetchSectionDocumentLinks(this.db, params);
  }

  public async fetchSpeechesByDate(params: { date: string }) {
    return fetchSpeechesByDate(this.db, params);
  }

  public async fetchSessionDates() {
    return fetchSessionDates(this.db);
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

  // ─── Interpellation queries ───

  public async fetchInterpellations(params: {
    query?: string;
    year?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const $query = params.query?.trim() || null;
    const $year = params.year || null;

    const countStmt = this.db.prepare<
      { count: number },
      { $query: string | null; $year: string | null }
    >(queries.interpellationsCount);
    const countResult = countStmt.get({ $query, $year });
    const totalCount = countResult?.count || 0;
    countStmt.finalize();

    const stmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        first_signer_first_name: string | null;
        first_signer_last_name: string | null;
        first_signer_party: string | null;
        co_signer_count: number | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        subjects: string | null;
      },
      {
        $query: string | null;
        $year: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.interpellationsList);
    const rows = stmt.all({ $query, $year, $limit: params.limit, $offset: offset });
    stmt.finalize();

    return {
      items: rows,
      totalCount,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(totalCount / params.limit),
    };
  }

  public async fetchInterpellationById(params: { id: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        first_signer_person_id: number | null;
        first_signer_first_name: string | null;
        first_signer_last_name: string | null;
        first_signer_party: string | null;
        co_signer_count: number | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        question_text: string | null;
        question_rich_text: string | null;
        resolution_text: string | null;
        resolution_rich_text: string | null;
      },
      { $id: number }
    >(queries.interpellationById);
    const detail = detailStmt.get({ $id: +params.id });
    detailStmt.finalize();
    if (!detail) return null;

    const signersStmt = this.db.prepare<
      {
        interpellation_id: number;
        signer_order: number;
        person_id: number | null;
        first_name: string;
        last_name: string;
        party: string | null;
        is_first_signer: number;
      },
      { $interpellationId: number }
    >(queries.interpellationSigners);
    const signers = signersStmt.all({ $interpellationId: detail.id });
    signersStmt.finalize();

    const stagesStmt = this.db.prepare<
      {
        interpellation_id: number;
        stage_order: number;
        stage_title: string;
        stage_code: string | null;
        event_date: string | null;
        event_title: string | null;
        event_description: string | null;
      },
      { $interpellationId: number }
    >(queries.interpellationStages);
    const stages = stagesStmt.all({ $interpellationId: detail.id });
    stagesStmt.finalize();

    const subjectsStmt = this.db.prepare<
      { interpellation_id: number; subject_text: string },
      { $interpellationId: number }
    >(queries.interpellationSubjects);
    const subjects = subjectsStmt.all({ $interpellationId: detail.id });
    subjectsStmt.finalize();

    const sessionsStmt = this.db.prepare<
      {
        session_key: string;
        session_date: string;
        session_type: string;
        session_number: number;
        session_year: string;
        section_title: string | null;
        section_key: string;
      },
      { $identifier: string }
    >(queries.interpellationSessions);
    const sessions = sessionsStmt.all({ $identifier: detail.parliament_identifier });
    sessionsStmt.finalize();

    return { ...detail, signers, stages, subjects, sessions };
  }

  public async fetchInterpellationByIdentifier(params: { identifier: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        first_signer_person_id: number | null;
        first_signer_first_name: string | null;
        first_signer_last_name: string | null;
        first_signer_party: string | null;
        co_signer_count: number | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        question_text: string | null;
        question_rich_text: string | null;
        resolution_text: string | null;
        resolution_rich_text: string | null;
      },
      { $identifier: string }
    >(queries.interpellationByIdentifier);
    const detail = detailStmt.get({ $identifier: params.identifier });
    detailStmt.finalize();
    if (!detail) return null;

    const subjectsStmt = this.db.prepare<
      { interpellation_id: number; subject_text: string },
      { $interpellationId: number }
    >(queries.interpellationSubjects);
    const subjects = subjectsStmt.all({ $interpellationId: detail.id });
    subjectsStmt.finalize();

    const stagesStmt = this.db.prepare<
      {
        interpellation_id: number;
        stage_order: number;
        stage_title: string;
        stage_code: string | null;
        event_date: string | null;
        event_title: string | null;
        event_description: string | null;
      },
      { $interpellationId: number }
    >(queries.interpellationStages);
    const stages = stagesStmt.all({ $interpellationId: detail.id });
    stagesStmt.finalize();

    return { ...detail, subjects, stages };
  }

  public async fetchInterpellationYears() {
    const stmt = this.db.prepare<{ year: string }, []>(
      queries.interpellationYears,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  // ─── Government proposal queries ───

  public async fetchGovernmentProposals(params: {
    query?: string;
    year?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const $query = params.query?.trim() || null;
    const $year = params.year || null;

    const countStmt = this.db.prepare<
      { count: number },
      { $query: string | null; $year: string | null }
    >(queries.govProposalsCount);
    const countResult = countStmt.get({ $query, $year });
    const totalCount = countResult?.count || 0;
    countStmt.finalize();

    const stmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        author: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
        subjects: string | null;
      },
      {
        $query: string | null;
        $year: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.govProposalsList);
    const rows = stmt.all({ $query, $year, $limit: params.limit, $offset: offset });
    stmt.finalize();

    return {
      items: rows,
      totalCount,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(totalCount / params.limit),
    };
  }

  public async fetchGovernmentProposalById(params: { id: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        author: string | null;
        summary_text: string | null;
        summary_rich_text: string | null;
        justification_text: string | null;
        justification_rich_text: string | null;
        proposal_text: string | null;
        proposal_rich_text: string | null;
        appendix_text: string | null;
        appendix_rich_text: string | null;
        signature_date: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        law_decision_text: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
      },
      { $id: number }
    >(queries.govProposalById);
    const detail = detailStmt.get({ $id: +params.id });
    detailStmt.finalize();
    if (!detail) return null;

    const signatoriesStmt = this.db.prepare<
      {
        proposal_id: number;
        signatory_order: number;
        first_name: string;
        last_name: string;
        title_text: string | null;
      },
      { $proposalId: number }
    >(queries.govProposalSignatories);
    const signatories = signatoriesStmt.all({ $proposalId: detail.id });
    signatoriesStmt.finalize();

    const stagesStmt = this.db.prepare<
      {
        proposal_id: number;
        stage_order: number;
        stage_title: string;
        stage_code: string | null;
        event_date: string | null;
        event_title: string | null;
        event_description: string | null;
      },
      { $proposalId: number }
    >(queries.govProposalStages);
    const stages = stagesStmt.all({ $proposalId: detail.id });
    stagesStmt.finalize();

    const subjectsStmt = this.db.prepare<
      { proposal_id: number; subject_text: string; yso_uri: string | null },
      { $proposalId: number }
    >(queries.govProposalSubjects);
    const subjects = subjectsStmt.all({ $proposalId: detail.id });
    subjectsStmt.finalize();

    const lawsStmt = this.db.prepare<
      {
        proposal_id: number;
        law_order: number;
        law_type: string | null;
        law_name: string | null;
      },
      { $proposalId: number }
    >(queries.govProposalLaws);
    const laws = lawsStmt.all({ $proposalId: detail.id });
    lawsStmt.finalize();

    const sessionsStmt = this.db.prepare<
      {
        session_key: string;
        session_date: string;
        session_type: string;
        session_number: number;
        session_year: string;
        section_title: string | null;
        section_key: string;
      },
      { $identifier: string }
    >(queries.govProposalSessions);
    const sessions = sessionsStmt.all({ $identifier: detail.parliament_identifier });
    sessionsStmt.finalize();

    return { ...detail, signatories, stages, subjects, laws, sessions };
  }

  public async fetchGovernmentProposalByIdentifier(params: { identifier: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        author: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
        summary_text: string | null;
        summary_rich_text: string | null;
        proposal_text: string | null;
        proposal_rich_text: string | null;
        justification_text: string | null;
        justification_rich_text: string | null;
      },
      { $identifier: string }
    >(queries.govProposalByIdentifier);
    const detail = detailStmt.get({ $identifier: params.identifier });
    detailStmt.finalize();
    if (!detail) return null;

    const subjectsStmt = this.db.prepare<
      { proposal_id: number; subject_text: string; yso_uri: string | null },
      { $proposalId: number }
    >(queries.govProposalSubjects);
    const subjects = subjectsStmt.all({ $proposalId: detail.id });
    subjectsStmt.finalize();

    return { ...detail, subjects };
  }

  public async fetchGovernmentProposalYears() {
    const stmt = this.db.prepare<{ year: string }, []>(
      queries.govProposalYears,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  // ─── Written question queries ───

  public async fetchWrittenQuestions(params: {
    query?: string;
    year?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const $query = params.query?.trim() || null;
    const $year = params.year || null;

    const countStmt = this.db.prepare<
      { count: number },
      { $query: string | null; $year: string | null }
    >(queries.writtenQuestionsCount);
    const countResult = countStmt.get({ $query, $year });
    const totalCount = countResult?.count || 0;
    countStmt.finalize();

    const stmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        first_signer_first_name: string | null;
        first_signer_last_name: string | null;
        first_signer_party: string | null;
        co_signer_count: number | null;
        answer_minister_first_name: string | null;
        answer_minister_last_name: string | null;
        answer_minister_title: string | null;
        answer_date: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
        subjects: string | null;
      },
      {
        $query: string | null;
        $year: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.writtenQuestionsList);
    const rows = stmt.all({ $query, $year, $limit: params.limit, $offset: offset });
    stmt.finalize();

    return {
      items: rows,
      totalCount,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(totalCount / params.limit),
    };
  }

  public async fetchWrittenQuestionById(params: { id: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        first_signer_person_id: number | null;
        first_signer_first_name: string | null;
        first_signer_last_name: string | null;
        first_signer_party: string | null;
        co_signer_count: number | null;
        question_text: string | null;
        question_rich_text: string | null;
        answer_parliament_identifier: string | null;
        answer_minister_title: string | null;
        answer_minister_first_name: string | null;
        answer_minister_last_name: string | null;
        answer_date: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
      },
      { $id: number }
    >(queries.writtenQuestionById);
    const detail = detailStmt.get({ $id: +params.id });
    detailStmt.finalize();
    if (!detail) return null;

    const signersStmt = this.db.prepare<
      {
        question_id: number;
        signer_order: number;
        person_id: number | null;
        first_name: string;
        last_name: string;
        party: string | null;
        is_first_signer: number;
      },
      { $questionId: number }
    >(queries.writtenQuestionSigners);
    const signers = signersStmt.all({ $questionId: detail.id });
    signersStmt.finalize();

    const stagesStmt = this.db.prepare<
      {
        question_id: number;
        stage_order: number;
        stage_title: string;
        stage_code: string | null;
        event_date: string | null;
        event_title: string | null;
        event_description: string | null;
      },
      { $questionId: number }
    >(queries.writtenQuestionStages);
    const stages = stagesStmt.all({ $questionId: detail.id });
    stagesStmt.finalize();

    const subjectsStmt = this.db.prepare<
      { question_id: number; subject_text: string },
      { $questionId: number }
    >(queries.writtenQuestionSubjects);
    const subjects = subjectsStmt.all({ $questionId: detail.id });
    subjectsStmt.finalize();

    const sessionsStmt = this.db.prepare<
      {
        session_key: string;
        session_date: string;
        session_type: string;
        session_number: number;
        session_year: string;
        section_title: string | null;
        section_key: string;
      },
      { $identifier: string }
    >(queries.writtenQuestionSessions);
    const sessions = sessionsStmt.all({ $identifier: detail.parliament_identifier });
    sessionsStmt.finalize();

    return { ...detail, signers, stages, subjects, sessions };
  }

  public async fetchWrittenQuestionByIdentifier(params: { identifier: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        first_signer_person_id: number | null;
        first_signer_first_name: string | null;
        first_signer_last_name: string | null;
        first_signer_party: string | null;
        co_signer_count: number | null;
        answer_minister_title: string | null;
        answer_minister_first_name: string | null;
        answer_minister_last_name: string | null;
        answer_date: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        question_text: string | null;
        question_rich_text: string | null;
      },
      { $identifier: string }
    >(queries.writtenQuestionByIdentifier);
    const detail = detailStmt.get({ $identifier: params.identifier });
    detailStmt.finalize();
    if (!detail) return null;

    const subjectsStmt = this.db.prepare<
      { question_id: number; subject_text: string },
      { $questionId: number }
    >(queries.writtenQuestionSubjects);
    const subjects = subjectsStmt.all({ $questionId: detail.id });
    subjectsStmt.finalize();

    return { ...detail, subjects };
  }

  public async fetchWrittenQuestionYears() {
    const stmt = this.db.prepare<{ year: string }, []>(
      queries.writtenQuestionYears,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  // ─── Oral question queries ───

  public async fetchOralQuestions(params: {
    query?: string;
    year?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const $query = params.query?.trim() || null;
    const $year = params.year || null;

    const countStmt = this.db.prepare<
      { count: number },
      { $query: string | null; $year: string | null }
    >(queries.oralQuestionsCount);
    const countResult = countStmt.get({ $query, $year });
    const totalCount = countResult?.count || 0;
    countStmt.finalize();

    const stmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        question_text: string | null;
        asker_text: string | null;
        submission_date: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
        subjects: string | null;
      },
      {
        $query: string | null;
        $year: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.oralQuestionsList);
    const rows = stmt.all({ $query, $year, $limit: params.limit, $offset: offset });
    stmt.finalize();

    return {
      items: rows,
      totalCount,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(totalCount / params.limit),
    };
  }

  public async fetchOralQuestionById(params: { id: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        question_text: string | null;
        asker_text: string | null;
        submission_date: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
      },
      { $id: number }
    >(queries.oralQuestionById);
    const detail = detailStmt.get({ $id: +params.id });
    detailStmt.finalize();
    if (!detail) return null;

    const stagesStmt = this.db.prepare<
      {
        question_id: number;
        stage_order: number;
        stage_title: string;
        stage_code: string | null;
        event_date: string | null;
        event_title: string | null;
        event_description: string | null;
      },
      { $questionId: number }
    >(queries.oralQuestionStages);
    const stages = stagesStmt.all({ $questionId: detail.id });
    stagesStmt.finalize();

    const subjectsStmt = this.db.prepare<
      { question_id: number; subject_text: string; yso_uri: string | null },
      { $questionId: number }
    >(queries.oralQuestionSubjects);
    const subjects = subjectsStmt.all({ $questionId: detail.id });
    subjectsStmt.finalize();

    const sessionsStmt = this.db.prepare<
      {
        session_key: string;
        session_date: string;
        session_type: string;
        session_number: number;
        session_year: string;
        section_title: string | null;
        section_key: string;
      },
      { $identifier: string }
    >(queries.oralQuestionSessions);
    const sessions = sessionsStmt.all({ $identifier: detail.parliament_identifier });
    sessionsStmt.finalize();

    return { ...detail, stages, subjects, sessions };
  }

  public async fetchOralQuestionByIdentifier(params: { identifier: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        question_text: string | null;
        asker_text: string | null;
        submission_date: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
      },
      { $identifier: string }
    >(queries.oralQuestionByIdentifier);
    const detail = detailStmt.get({ $identifier: params.identifier });
    detailStmt.finalize();
    if (!detail) return null;

    const subjectsStmt = this.db.prepare<
      { question_id: number; subject_text: string; yso_uri: string | null },
      { $questionId: number }
    >(queries.oralQuestionSubjects);
    const subjects = subjectsStmt.all({ $questionId: detail.id });
    subjectsStmt.finalize();

    return { ...detail, subjects };
  }

  public async fetchOralQuestionYears() {
    const stmt = this.db.prepare<{ year: string }, []>(
      queries.oralQuestionYears,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  // ─── Committee report queries ───

  public async fetchCommitteeReports(params: {
    query?: string;
    year?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const $query = params.query?.trim() || null;
    const $year = params.year || null;

    const countStmt = this.db.prepare<
      { count: number },
      { $query: string | null; $year: string | null }
    >(queries.committeeReportsCount);
    const countResult = countStmt.get({ $query, $year });
    const totalCount = countResult?.count || 0;
    countStmt.finalize();

    const stmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        report_type_code: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        committee_name: string | null;
        recipient_committee: string | null;
        source_reference: string | null;
        draft_date: string | null;
        signature_date: string | null;
      },
      {
        $query: string | null;
        $year: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.committeeReportsList);
    const rows = stmt.all({ $query, $year, $limit: params.limit, $offset: offset });
    stmt.finalize();

    return {
      items: rows,
      totalCount,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(totalCount / params.limit),
    };
  }

  public async fetchCommitteeReportById(params: { id: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        report_type_code: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        committee_name: string | null;
        recipient_committee: string | null;
        source_reference: string | null;
        draft_date: string | null;
        signature_date: string | null;
        summary_text: string | null;
        summary_rich_text: string | null;
        general_reasoning_text: string | null;
        general_reasoning_rich_text: string | null;
        detailed_reasoning_text: string | null;
        detailed_reasoning_rich_text: string | null;
        decision_text: string | null;
        decision_rich_text: string | null;
        legislation_amendment_text: string | null;
        legislation_amendment_rich_text: string | null;
        minority_opinion_text: string | null;
        minority_opinion_rich_text: string | null;
        resolution_text: string | null;
        resolution_rich_text: string | null;
      },
      { $id: number }
    >(queries.committeeReportById);
    const detail = detailStmt.get({ $id: +params.id });
    detailStmt.finalize();
    if (!detail) return null;

    const membersStmt = this.db.prepare<
      {
        report_id: number;
        member_order: number;
        person_id: number | null;
        first_name: string;
        last_name: string;
        party: string | null;
        role: string | null;
      },
      { $reportId: number }
    >(queries.committeeReportMembers);
    const members = membersStmt.all({ $reportId: detail.id });
    membersStmt.finalize();

    const expertsStmt = this.db.prepare<
      {
        report_id: number;
        expert_order: number;
        person_id: number | null;
        first_name: string | null;
        last_name: string | null;
        title: string | null;
        organization: string | null;
      },
      { $reportId: number }
    >(queries.committeeReportExperts);
    const experts = expertsStmt.all({ $reportId: detail.id });
    expertsStmt.finalize();

    const sessionsStmt = this.db.prepare<
      {
        session_key: string;
        session_date: string;
        session_type: string;
        session_number: number;
        session_year: string;
        section_title: string | null;
        section_key: string;
      },
      { $identifier: string }
    >(queries.committeeReportSessions);
    const sessions = sessionsStmt.all({ $identifier: detail.parliament_identifier });
    sessionsStmt.finalize();

    return { ...detail, members, experts, sessions };
  }

  public async fetchCommitteeReportByIdentifier(params: { identifier: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        report_type_code: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        committee_name: string | null;
        recipient_committee: string | null;
        source_reference: string | null;
        draft_date: string | null;
        signature_date: string | null;
        summary_text: string | null;
        summary_rich_text: string | null;
        decision_text: string | null;
        decision_rich_text: string | null;
        resolution_text: string | null;
        resolution_rich_text: string | null;
        legislation_amendment_text: string | null;
        legislation_amendment_rich_text: string | null;
      },
      { $identifier: string }
    >(queries.committeeReportByIdentifier);
    const detail = detailStmt.get({ $identifier: params.identifier });
    detailStmt.finalize();
    if (!detail) return null;

    return detail;
  }

  public async fetchCommitteeReportYears() {
    const stmt = this.db.prepare<{ year: string }, []>(
      queries.committeeReportYears,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  // ─── Legislative initiative queries ───

  public async fetchLegislativeInitiatives(params: {
    query?: string;
    year?: string;
    initiativeTypeCode?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const $query = params.query?.trim() || null;
    const $year = params.year || null;
    const $typeCode = params.initiativeTypeCode?.trim().toUpperCase() || null;

    const countStmt = this.db.prepare<
      { count: number },
      { $query: string | null; $year: string | null; $typeCode: string | null }
    >(queries.legislativeInitiativesCount);
    const countResult = countStmt.get({ $query, $year, $typeCode });
    const totalCount = countResult?.count || 0;
    countStmt.finalize();

    const stmt = this.db.prepare<
      {
        id: number;
        initiative_type_code: string;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        first_signer_first_name: string | null;
        first_signer_last_name: string | null;
        first_signer_party: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
        subjects: string | null;
      },
      {
        $query: string | null;
        $year: string | null;
        $typeCode: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.legislativeInitiativesList);
    const rows = stmt.all({
      $query,
      $year,
      $typeCode,
      $limit: params.limit,
      $offset: offset,
    });
    stmt.finalize();

    return {
      items: rows,
      totalCount,
      page: params.page,
      limit: params.limit,
      totalPages: Math.ceil(totalCount / params.limit),
    };
  }

  public async fetchLegislativeInitiativeById(params: { id: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        initiative_type_code: string;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        first_signer_person_id: number | null;
        first_signer_first_name: string | null;
        first_signer_last_name: string | null;
        first_signer_party: string | null;
        justification_text: string | null;
        justification_rich_text: string | null;
        proposal_text: string | null;
        proposal_rich_text: string | null;
        law_text: string | null;
        law_rich_text: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
        latest_stage_code: string | null;
        end_date: string | null;
      },
      { $id: number }
    >(queries.legislativeInitiativeById);
    const detail = detailStmt.get({ $id: +params.id });
    detailStmt.finalize();
    if (!detail) return null;

    const signersStmt = this.db.prepare<
      {
        initiative_id: number;
        signer_order: number;
        person_id: number | null;
        first_name: string;
        last_name: string;
        party: string | null;
        is_first_signer: number;
      },
      { $initiativeId: number }
    >(queries.legislativeInitiativeSigners);
    const signers = signersStmt.all({ $initiativeId: detail.id });
    signersStmt.finalize();

    const stagesStmt = this.db.prepare<
      {
        initiative_id: number;
        stage_order: number;
        stage_title: string;
        stage_code: string | null;
        event_date: string | null;
        event_title: string | null;
        event_description: string | null;
      },
      { $initiativeId: number }
    >(queries.legislativeInitiativeStages);
    const stages = stagesStmt.all({ $initiativeId: detail.id });
    stagesStmt.finalize();

    const subjectsStmt = this.db.prepare<
      { initiative_id: number; subject_text: string; yso_uri: string | null },
      { $initiativeId: number }
    >(queries.legislativeInitiativeSubjects);
    const subjects = subjectsStmt.all({ $initiativeId: detail.id });
    subjectsStmt.finalize();

    const sessionsStmt = this.db.prepare<
      {
        session_key: string;
        session_date: string;
        session_type: string;
        session_number: number;
        session_year: string;
        section_title: string | null;
        section_key: string;
      },
      { $identifier: string }
    >(queries.legislativeInitiativeSessions);
    const sessions = sessionsStmt.all({ $identifier: detail.parliament_identifier });
    sessionsStmt.finalize();

    return { ...detail, signers, stages, subjects, sessions };
  }

  public async fetchLegislativeInitiativeByIdentifier(params: { identifier: string }) {
    const detailStmt = this.db.prepare<
      {
        id: number;
        initiative_type_code: string;
        parliament_identifier: string;
        document_number: number;
        parliamentary_year: string;
        title: string | null;
        submission_date: string | null;
        first_signer_person_id: number | null;
        first_signer_first_name: string | null;
        first_signer_last_name: string | null;
        first_signer_party: string | null;
        justification_text: string | null;
        justification_rich_text: string | null;
        proposal_text: string | null;
        proposal_rich_text: string | null;
        law_text: string | null;
        law_rich_text: string | null;
        decision_outcome: string | null;
        decision_outcome_code: string | null;
      },
      { $identifier: string }
    >(queries.legislativeInitiativeByIdentifier);
    const detail = detailStmt.get({ $identifier: params.identifier });
    detailStmt.finalize();
    if (!detail) return null;

    const subjectsStmt = this.db.prepare<
      { initiative_id: number; subject_text: string; yso_uri: string | null },
      { $initiativeId: number }
    >(queries.legislativeInitiativeSubjects);
    const subjects = subjectsStmt.all({ $initiativeId: detail.id });
    subjectsStmt.finalize();

    return { ...detail, subjects };
  }

  public async fetchLegislativeInitiativeYears(params?: {
    initiativeTypeCode?: string;
  }) {
    const $typeCode = params?.initiativeTypeCode?.trim().toUpperCase() || null;
    const stmt = this.db.prepare<
      { year: string },
      { $typeCode: string | null }
    >(
      queries.legislativeInitiativeYears,
    );
    const data = stmt.all({ $typeCode });
    stmt.finalize();
    return data;
  }

  public async federatedSearch(params: { q: string; limit?: number }) {
    const searchQuery = this.buildSearchQuery(params.q);
    if (!searchQuery) return [];
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
      $q: searchQuery,
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
