import { Database } from "bun:sqlite";
import { getDatabasePath } from "#database";
import * as queries from "./queries";
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
  fetchCompletedSessionDates,
  fetchSectionDocumentLinks,
  fetchSectionRollCall,
  fetchSectionSpeeches,
  fetchSectionSubSections,
  fetchSectionVotings,
  fetchSessionByDate,
  fetchSessionDates,
  fetchSessionDocuments,
  fetchSessionNotices,
  fetchSessions,
  fetchSessionWithSectionsByDate,
  fetchSpeechesByDate,
} from "./services/session";
import {
  fetchVotingById,
  fetchVotingInlineDetails,
  fetchVotingsByDocument,
  queryVotings,
} from "./services/voting";
import { SQLITE_PRAGMAS } from "./sql-statements";

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

  private buildDocumentIdentifierVariants(
    identifier: string,
  ): [string, string, string] {
    const normalized = identifier.trim().replace(/\s+/g, " ");
    const withoutVp = normalized.replace(/\s+vp$/i, "");
    const withVp = withoutVp === "" ? normalized : `${withoutVp} vp`;
    return [normalized, withoutVp, withVp];
  }

  private hasImportSourceReferenceTable(): boolean {
    const stmt = this.db.prepare<{ exists_flag: number }, { $name: string }>(
      "SELECT 1 AS exists_flag FROM sqlite_master WHERE type = 'table' AND name = $name LIMIT 1",
    );
    const row = stmt.get({
      $name: "ImportSourceReference",
    });
    stmt.finalize();
    return !!row?.exists_flag;
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

  public async fetchHallituskaudet() {
    const stmt = this.db.prepare<
      {
        government: string;
        start_date: string;
        end_date: string | null;
      },
      []
    >(queries.hallituskaudet);
    const rows = stmt.all();
    stmt.finalize();

    return rows.map((row) => ({
      id: `${row.start_date}|${row.government}`,
      name: row.government,
      label: `${row.government} (${row.start_date} - ${row.end_date ?? "..."})`,
      startDate: row.start_date,
      endDate: row.end_date,
    }));
  }

  public async queryVotings(params: {
    q: string;
    startDate?: string;
    endDate?: string;
  }) {
    const searchQuery = this.buildSearchQuery(params.q);
    if (!searchQuery) return [];
    const endDateExclusive = this.endDateExclusive(params.endDate);
    return queryVotings(this.db, {
      searchQuery,
      startDate: params.startDate ?? null,
      endDateExclusive,
    });
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

  public async fetchDocumentRelations(params: { identifier: string }) {
    const [idA, idB, idC] = this.buildDocumentIdentifierVariants(
      params.identifier,
    );
    const stmt = this.db.prepare<
      {
        related_identifier: string;
        relation_types: string | null;
        evidence_count: number;
        first_date: string | null;
        last_date: string | null;
      },
      { $idA: string; $idB: string; $idC: string }
    >(queries.documentRelationsByIdentifier);
    const rows = stmt.all({ $idA: idA, $idB: idB, $idC: idC });
    stmt.finalize();

    return rows.map((row) => ({
      related_identifier: row.related_identifier,
      relation_types: row.relation_types
        ? row.relation_types.split("||").filter(Boolean)
        : [],
      evidence_count: row.evidence_count,
      first_date: row.first_date,
      last_date: row.last_date,
    }));
  }

  public async fetchImportSourceTableSummaries(params: {
    tableNames: string[];
  }) {
    const uniqueTableNames = Array.from(
      new Set(
        params.tableNames
          .map((tableName) => tableName.trim())
          .filter((tableName) => tableName.length > 0),
      ),
    );

    if (uniqueTableNames.length === 0) {
      return {
        tables: [],
      };
    }

    if (!this.hasImportSourceReferenceTable()) {
      return {
        tables: uniqueTableNames.map((tableName) => ({
          tableName,
          importedRows: 0,
          distinctPages: 0,
          firstScrapedAt: null,
          lastScrapedAt: null,
          firstMigratedAt: null,
          lastMigratedAt: null,
        })),
      };
    }

    const stmt = this.db.prepare<
      {
        imported_rows: number;
        distinct_pages: number;
        first_scraped_at: string | null;
        last_scraped_at: string | null;
        first_migrated_at: string | null;
        last_migrated_at: string | null;
      },
      {
        $tableName: string;
      }
    >(queries.importSourceTableSummary);

    const tables = uniqueTableNames.map((tableName) => {
      const row = stmt.get({
        $tableName: tableName,
      });

      return {
        tableName,
        importedRows: row?.imported_rows ?? 0,
        distinctPages: row?.distinct_pages ?? 0,
        firstScrapedAt: row?.first_scraped_at ?? null,
        lastScrapedAt: row?.last_scraped_at ?? null,
        firstMigratedAt: row?.first_migrated_at ?? null,
        lastMigratedAt: row?.last_migrated_at ?? null,
      };
    });

    stmt.finalize();

    return {
      tables,
    };
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

  public async fetchCompletedSessionDates() {
    return fetchCompletedSessionDates(this.db);
  }

  // ─── Analytics queries ───

  public async fetchPartyDiscipline(params?: {
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusive = this.endDateExclusive(params?.endDate);
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
      $endDateExclusive: endDateExclusive,
    });
    stmt.finalize();
    return data;
  }

  public async fetchCloseVotes(params: {
    threshold?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusive = this.endDateExclusive(params.endDate);
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
      $endDateExclusive: endDateExclusive,
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

  public async fetchCoalitionVsOpposition(params: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusive = this.endDateExclusive(params.endDate);
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
      $endDateExclusive: endDateExclusive,
    });
    stmt.finalize();
    return data;
  }

  public async fetchDissentTracking(params: {
    personId?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusive = this.endDateExclusive(params.endDate);
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
      $endDateExclusive: endDateExclusive,
    });
    stmt.finalize();
    return data;
  }

  public async fetchSpeechActivity(params: {
    limit?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusive = this.endDateExclusive(params.endDate);
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
      $endDateExclusive: endDateExclusive,
    });
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

  public async fetchPartySummary(params?: {
    asOfDate?: string;
    startDate?: string;
    endDate?: string;
    governmentName?: string;
    governmentStartDate?: string;
  }) {
    const asOfDate =
      params?.asOfDate ||
      new Date().toISOString().substring(0, 10);
    const startDate = params?.startDate ?? null;
    const endDateExclusive = this.endDateExclusive(params?.endDate);
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
      $endDateExclusive: endDateExclusive,
      $governmentName: governmentName,
      $governmentStartDate: governmentStartDate,
    });
    stmt.finalize();
    return data;
  }

  public async fetchPartyMembers(params: {
    partyCode: string;
    asOfDate?: string;
    startDate?: string;
    endDate?: string;
    governmentName?: string;
    governmentStartDate?: string;
  }) {
    const asOfDate =
      params.asOfDate ||
      new Date().toISOString().substring(0, 10);
    const startDate = params.startDate ?? null;
    const endDateExclusive = this.endDateExclusive(params.endDate);
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
      $endDateExclusive: endDateExclusive,
      $governmentName: governmentName,
      $governmentStartDate: governmentStartDate,
    });
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
    subject?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const endDateExclusive = this.endDateExclusive(params.endDate);
    const $query = params.query?.trim() || null;
    const $year = params.year || null;
    const $subject = params.subject?.trim() || null;

    const countStmt = this.db.prepare<
      { count: number },
      {
        $query: string | null;
        $year: string | null;
        $subject: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.interpellationsCount);
    const countResult = countStmt.get({
      $query,
      $year,
      $subject,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusive,
    });
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
        $subject: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.interpellationsList);
    const rows = stmt.all({
      $query,
      $year,
      $subject,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusive,
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
    const sessions = sessionsStmt.all({
      $identifier: detail.parliament_identifier,
    });
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

  public async fetchInterpellationsSubjects() {
    const stmt = this.db.prepare<{ subject_text: string; count: number }, []>(
      queries.interpellationsSubjectsList,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  // ─── Government proposal queries ───

  public async fetchGovernmentProposals(params: {
    query?: string;
    year?: string;
    subject?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const endDateExclusive = this.endDateExclusive(params.endDate);
    const $query = params.query?.trim() || null;
    const $year = params.year || null;
    const $subject = params.subject?.trim() || null;

    const countStmt = this.db.prepare<
      { count: number },
      {
        $query: string | null;
        $year: string | null;
        $subject: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.govProposalsCount);
    const countResult = countStmt.get({
      $query,
      $year,
      $subject,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusive,
    });
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
        $subject: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.govProposalsList);
    const rows = stmt.all({
      $query,
      $year,
      $subject,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusive,
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
    const sessions = sessionsStmt.all({
      $identifier: detail.parliament_identifier,
    });
    sessionsStmt.finalize();

    return { ...detail, signatories, stages, subjects, laws, sessions };
  }

  public async fetchGovernmentProposalByIdentifier(params: {
    identifier: string;
  }) {
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

  public async fetchGovernmentProposalsSubjects() {
    const stmt = this.db.prepare<{ subject_text: string; count: number }, []>(
      queries.govProposalsSubjectsList,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  // ─── Written question queries ───

  public async fetchWrittenQuestions(params: {
    query?: string;
    year?: string;
    subject?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const endDateExclusive = this.endDateExclusive(params.endDate);
    const $query = params.query?.trim() || null;
    const $year = params.year || null;
    const $subject = params.subject?.trim() || null;

    const countStmt = this.db.prepare<
      { count: number },
      {
        $query: string | null;
        $year: string | null;
        $subject: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.writtenQuestionsCount);
    const countResult = countStmt.get({
      $query,
      $year,
      $subject,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusive,
    });
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
        $subject: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.writtenQuestionsList);
    const rows = stmt.all({
      $query,
      $year,
      $subject,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusive,
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
    const sessions = sessionsStmt.all({
      $identifier: detail.parliament_identifier,
    });
    sessionsStmt.finalize();

    let response_subjects: Array<{ subject_text: string }> = [];
    try {
      const responseSubjectsStmt = this.db.prepare<
        { subject_text: string },
        { $questionId: number }
      >(queries.writtenQuestionResponseSubjects);
      response_subjects = responseSubjectsStmt.all({ $questionId: detail.id });
      responseSubjectsStmt.finalize();
    } catch {
      // WrittenQuestionResponse table may not exist yet (DB not rebuilt after migration)
    }

    return {
      ...detail,
      signers,
      stages,
      subjects,
      sessions,
      response_subjects,
    };
  }

  public async fetchWrittenQuestionByIdentifier(params: {
    identifier: string;
  }) {
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

  public async fetchWrittenQuestionsSubjects() {
    const stmt = this.db.prepare<{ subject_text: string; count: number }, []>(
      queries.writtenQuestionsSubjectsList,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  // ─── Expert statement queries ───

  public async fetchExpertStatements(params: {
    query?: string;
    year?: string;
    committee?: string;
    docType?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const endDateExclusive = this.endDateExclusive(params.endDate);
    const $query = params.query?.trim() || null;
    const $year = params.year || null;
    const $committee = params.committee || null;
    const $docType = params.docType || null;

    const countStmt = this.db.prepare<
      { count: number },
      {
        $query: string | null;
        $year: string | null;
        $committee: string | null;
        $docType: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.expertStatementsCount);
    const countResult = countStmt.get({
      $query,
      $year,
      $committee,
      $docType,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusive,
    });
    const totalCount = countResult?.count || 0;
    countStmt.finalize();

    const stmt = this.db.prepare<
      {
        id: number;
        document_type: string;
        edk_identifier: string;
        bill_identifier: string | null;
        committee_name: string | null;
        meeting_identifier: string | null;
        meeting_date: string | null;
        title: string | null;
        publicity: string | null;
        language: string | null;
      },
      {
        $query: string | null;
        $year: string | null;
        $committee: string | null;
        $docType: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.expertStatementsList);
    const rows = stmt.all({
      $query,
      $year,
      $committee,
      $docType,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusive,
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

  public async fetchExpertStatementYears() {
    const stmt = this.db.prepare<{ year: string }, []>(
      queries.expertStatementYears,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  public async fetchExpertStatementCommittees() {
    const stmt = this.db.prepare<{ committee_name: string; count: number }, []>(
      queries.expertStatementCommittees,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  // ─── Written question response queries ───

  public async fetchWrittenQuestionResponses(params: {
    query?: string;
    year?: string;
    minister?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const endDateExclusive = this.endDateExclusive(params.endDate);
    const $query = params.query?.trim() || null;
    const $year = params.year || null;
    const $minister = params.minister || null;

    const countStmt = this.db.prepare<
      { count: number },
      {
        $query: string | null;
        $year: string | null;
        $minister: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.writtenQuestionResponsesCount);
    const countResult = countStmt.get({
      $query,
      $year,
      $minister,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusive,
    });
    const totalCount = countResult?.count || 0;
    countStmt.finalize();

    const stmt = this.db.prepare<
      {
        id: number;
        parliament_identifier: string;
        document_number: number | null;
        parliamentary_year: string;
        title: string | null;
        answer_date: string | null;
        minister_title: string | null;
        minister_first_name: string | null;
        minister_last_name: string | null;
        question_id: number;
        question_identifier: string;
        question_title: string | null;
        subjects: string | null;
      },
      {
        $query: string | null;
        $year: string | null;
        $minister: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.writtenQuestionResponsesList);
    const rows = stmt.all({
      $query,
      $year,
      $minister,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusive,
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

  public async fetchWrittenQuestionResponseYears() {
    const stmt = this.db.prepare<{ year: string }, []>(
      queries.writtenQuestionResponsesYears,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  // ─── Oral question queries ───

  public async fetchOralQuestions(params: {
    query?: string;
    year?: string;
    subject?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const endDateExclusive = this.endDateExclusive(params.endDate);
    const $query = params.query?.trim() || null;
    const $year = params.year || null;
    const $subject = params.subject?.trim() || null;

    const countStmt = this.db.prepare<
      { count: number },
      {
        $query: string | null;
        $year: string | null;
        $subject: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.oralQuestionsCount);
    const countResult = countStmt.get({
      $query,
      $year,
      $subject,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusive,
    });
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
        $subject: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.oralQuestionsList);
    const rows = stmt.all({
      $query,
      $year,
      $subject,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusive,
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
    const sessions = sessionsStmt.all({
      $identifier: detail.parliament_identifier,
    });
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

  public async fetchOralQuestionsSubjects() {
    const stmt = this.db.prepare<{ subject_text: string; count: number }, []>(
      queries.oralQuestionsSubjectsList,
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  // ─── Committee report queries ───

  public async fetchCommitteeReports(params: {
    query?: string;
    year?: string;
    sourceCommittee?: string;
    recipientCommittee?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const endDateExclusive = this.endDateExclusive(params.endDate);
    const $query = params.query?.trim() || null;
    const $year = params.year || null;
    const $sourceCommittee = params.sourceCommittee?.trim() || null;
    const $recipientCommittee = params.recipientCommittee?.trim() || null;

    const countStmt = this.db.prepare<
      { count: number },
      {
        $query: string | null;
        $year: string | null;
        $sourceCommittee: string | null;
        $recipientCommittee: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.committeeReportsCount);
    const countResult = countStmt.get({
      $query,
      $year,
      $sourceCommittee,
      $recipientCommittee,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusive,
    });
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
        $sourceCommittee: string | null;
        $recipientCommittee: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.committeeReportsList);
    const rows = stmt.all({
      $query,
      $year,
      $sourceCommittee,
      $recipientCommittee,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusive,
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
    const sessions = sessionsStmt.all({
      $identifier: detail.parliament_identifier,
    });
    sessionsStmt.finalize();

    return { ...detail, members, experts, sessions };
  }

  public async fetchCommitteeReportByIdentifier(params: {
    identifier: string;
  }) {
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

  public async fetchCommitteeReportSourceCommittees(params?: {
    query?: string;
    year?: string;
    recipientCommittee?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusive = this.endDateExclusive(params?.endDate);
    const $query = params?.query?.trim() || null;
    const $year = params?.year?.trim() || null;
    const $recipientCommittee = params?.recipientCommittee?.trim() || null;
    const stmt = this.db.prepare<
      { committee_name: string; count: number },
      {
        $query: string | null;
        $year: string | null;
        $recipientCommittee: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.committeeReportSourceCommittees);
    const data = stmt.all({
      $query,
      $year,
      $recipientCommittee,
      $startDate: params?.startDate || null,
      $endDateExclusive: endDateExclusive,
    });
    stmt.finalize();
    return data;
  }

  public async fetchCommitteeReportRecipientCommittees(params?: {
    query?: string;
    year?: string;
    sourceCommittee?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const endDateExclusive = this.endDateExclusive(params?.endDate);
    const $query = params?.query?.trim() || null;
    const $year = params?.year?.trim() || null;
    const $sourceCommittee = params?.sourceCommittee?.trim() || null;
    const stmt = this.db.prepare<
      { committee_name: string; count: number },
      {
        $query: string | null;
        $year: string | null;
        $sourceCommittee: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.committeeReportRecipientCommittees);
    const data = stmt.all({
      $query,
      $year,
      $sourceCommittee,
      $startDate: params?.startDate || null,
      $endDateExclusive: endDateExclusive,
    });
    stmt.finalize();
    return data;
  }

  // ─── Legislative initiative queries ───

  public async fetchLegislativeInitiatives(params: {
    query?: string;
    year?: string;
    subject?: string;
    initiativeTypeCode?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const endDateExclusive = this.endDateExclusive(params.endDate);
    const $query = params.query?.trim() || null;
    const $year = params.year || null;
    const $subject = params.subject?.trim() || null;
    const $typeCode = params.initiativeTypeCode?.trim().toUpperCase() || null;

    const countStmt = this.db.prepare<
      { count: number },
      {
        $query: string | null;
        $year: string | null;
        $subject: string | null;
        $typeCode: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(queries.legislativeInitiativesCount);
    const countResult = countStmt.get({
      $query,
      $year,
      $subject,
      $typeCode,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusive,
    });
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
        $subject: string | null;
        $typeCode: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
        $offset: number;
      }
    >(queries.legislativeInitiativesList);
    const rows = stmt.all({
      $query,
      $year,
      $subject,
      $typeCode,
      $startDate: params.startDate || null,
      $endDateExclusive: endDateExclusive,
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
    const sessions = sessionsStmt.all({
      $identifier: detail.parliament_identifier,
    });
    sessionsStmt.finalize();

    return { ...detail, signers, stages, subjects, sessions };
  }

  public async fetchLegislativeInitiativeByIdentifier(params: {
    identifier: string;
  }) {
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
    >(queries.legislativeInitiativeYears);
    const data = stmt.all({ $typeCode });
    stmt.finalize();
    return data;
  }

  public async fetchLegislativeInitiativesSubjects() {
    const stmt = this.db.prepare<{ subject_text: string; count: number }, []>(
      queries.legislativeInitiativesSubjectsList,
    );
    const data = stmt.all();
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
