import type { Database } from "bun:sqlite";
import documentRelationsByIdentifier from "../queries/DOCUMENT_RELATIONS_BY_IDENTIFIER.sql";
import votingById from "../queries/VOTING_BY_ID.sql";
import votingGovernmentOppositionById from "../queries/VOTING_GOVERNMENT_OPPOSITION_BY_ID.sql";
import votingMemberVotesById from "../queries/VOTING_MEMBER_VOTES_BY_ID.sql";
import votingPartyBreakdownById from "../queries/VOTING_PARTY_BREAKDOWN_BY_ID.sql";
import votingRelatedById from "../queries/VOTING_RELATED_BY_ID.sql";
import votingsBrowse from "../queries/VOTINGS_BROWSE.sql";
import votingsByDocument from "../queries/VOTINGS_BY_DOCUMENT.sql";
import votingsOverviewClose from "../queries/VOTINGS_OVERVIEW_CLOSE.sql";
import votingsOverviewMetrics from "../queries/VOTINGS_OVERVIEW_METRICS.sql";
import votingsOverviewPhases from "../queries/VOTINGS_OVERVIEW_PHASES.sql";
import votingsOverviewSessions from "../queries/VOTINGS_OVERVIEW_SESSIONS.sql";
import votingsOverviewTurnout from "../queries/VOTINGS_OVERVIEW_TURNOUT.sql";
import votingsRecent from "../queries/VOTINGS_RECENT.sql";
import votingsSearch from "../queries/VOTINGS_SEARCH.sql";
import {
  buildDocumentIdentifierVariants,
  buildSearchQuery,
  endDateExclusive,
} from "../query-helpers";

export class VotingRepository {
  constructor(private readonly db: Database) {}

  public fetchVotingOverview(params: { startDate?: string; endDate?: string }) {
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const listLimit = 6;
    const facetLimit = 8;
    const closeThreshold = 10;

    const metricsStmt = this.db.prepare<
      {
        total_votings: number;
        close_votings: number;
        latest_session_key: string | null;
        phase_count: number;
      },
      {
        $startDate: string | null;
        $endDateExclusive: string | null;
        $closeThreshold: number;
      }
    >(votingsOverviewMetrics);
    const metrics = metricsStmt.get({
      $startDate: params.startDate ?? null,
      $endDateExclusive: endDateExclusiveValue,
      $closeThreshold: closeThreshold,
    }) ?? {
      total_votings: 0,
      close_votings: 0,
      latest_session_key: null,
      phase_count: 0,
    };
    metricsStmt.finalize();

    const phasesStmt = this.db.prepare<
      { value: string; count: number },
      {
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
      }
    >(votingsOverviewPhases);
    const phases = phasesStmt.all({
      $startDate: params.startDate ?? null,
      $endDateExclusive: endDateExclusiveValue,
      $limit: facetLimit,
    });
    phasesStmt.finalize();

    const sessionsStmt = this.db.prepare<
      { value: string; count: number },
      {
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
      }
    >(votingsOverviewSessions);
    const sessions = sessionsStmt.all({
      $startDate: params.startDate ?? null,
      $endDateExclusive: endDateExclusiveValue,
      $limit: facetLimit,
    });
    sessionsStmt.finalize();

    const closeStmt = this.db.prepare<
      DatabaseQueries.VotingSearchResult,
      {
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
      }
    >(votingsOverviewClose);
    const close = closeStmt.all({
      $startDate: params.startDate ?? null,
      $endDateExclusive: endDateExclusiveValue,
      $limit: listLimit,
    });
    closeStmt.finalize();

    const turnoutStmt = this.db.prepare<
      DatabaseQueries.VotingSearchResult,
      {
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
      }
    >(votingsOverviewTurnout);
    const turnout = turnoutStmt.all({
      $startDate: params.startDate ?? null,
      $endDateExclusive: endDateExclusiveValue,
      $limit: listLimit,
    });
    turnoutStmt.finalize();

    return {
      metrics,
      facets: {
        phases,
        sessions,
      },
      sections: {
        recent: this.fetchRecentVotings(params).slice(0, listLimit),
        close,
        turnout,
      },
    };
  }

  public queryVotings(params: {
    q: string;
    startDate?: string;
    endDate?: string;
  }) {
    const searchQuery = buildSearchQuery(params.q);
    if (!searchQuery) return [];
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const stmt = this.db.prepare<
      DatabaseQueries.VotingSearchResult,
      {
        $query: string;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(votingsSearch);
    const data = stmt.all({
      $query: searchQuery,
      $startDate: params.startDate ?? null,
      $endDateExclusive: endDateExclusiveValue,
    });
    stmt.finalize();
    return data;
  }

  public browseVotings(params: {
    q?: string;
    phase?: string;
    session?: string;
    sort?: "newest" | "oldest" | "closest" | "largest";
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const searchQuery = buildSearchQuery(params.q);
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const stmt = this.db.prepare<
      DatabaseQueries.VotingSearchResult,
      {
        $query: string | null;
        $phase: string | null;
        $session: string | null;
        $sort: string;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
      }
    >(votingsBrowse);
    const data = stmt.all({
      $query: searchQuery,
      $phase: params.phase ?? null,
      $session: params.session ?? null,
      $sort: params.sort ?? "newest",
      $startDate: params.startDate ?? null,
      $endDateExclusive: endDateExclusiveValue,
      $limit: params.limit ?? 200,
    });
    stmt.finalize();
    return data;
  }

  public fetchRecentVotings(params: { startDate?: string; endDate?: string }) {
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const stmt = this.db.prepare<
      DatabaseQueries.VotingSearchResult,
      { $startDate: string | null; $endDateExclusive: string | null }
    >(votingsRecent);
    const data = stmt.all({
      $startDate: params.startDate ?? null,
      $endDateExclusive: endDateExclusiveValue,
    });
    stmt.finalize();
    return data;
  }

  public fetchVotingById(params: { id: string }) {
    const votingId = Number.parseInt(params.id, 10);
    if (!Number.isFinite(votingId)) return null;
    const stmt = this.db.prepare<
      DatabaseQueries.VotingSearchResult,
      { $id: number }
    >(votingById);
    const data = stmt.get({ $id: votingId });
    stmt.finalize();
    return data ?? null;
  }

  public fetchVotingInlineDetails(params: { id: string }) {
    const votingId = Number.parseInt(params.id, 10);
    if (!Number.isFinite(votingId)) return null;
    const voting = this.fetchVotingById({ id: String(votingId) });
    if (!voting) return null;

    const partyStmt = this.db.prepare<
      {
        party_code: string;
        party_name: string;
        n_yes: number;
        n_no: number;
        n_abstain: number;
        n_absent: number;
        n_total: number;
      },
      { $id: number }
    >(votingPartyBreakdownById);
    const partyBreakdown = partyStmt.all({ $id: votingId });
    partyStmt.finalize();

    const memberStmt = this.db.prepare<
      {
        person_id: number;
        first_name: string;
        last_name: string;
        party_code: string;
        vote: string;
        is_government: 0 | 1;
      },
      { $id: number }
    >(votingMemberVotesById);
    const memberVotes = memberStmt.all({ $id: votingId });
    memberStmt.finalize();

    const govStmt = this.db.prepare<
      {
        government_yes: number;
        government_no: number;
        government_abstain: number;
        government_absent: number;
        government_total: number;
        opposition_yes: number;
        opposition_no: number;
        opposition_abstain: number;
        opposition_absent: number;
        opposition_total: number;
      },
      { $id: number }
    >(votingGovernmentOppositionById);
    const governmentOpposition = govStmt.get({ $id: votingId });
    govStmt.finalize();

    const relatedStmt = this.db.prepare<
      {
        id: number;
        number: number | null;
        start_time: string | null;
        context_title: string;
        n_yes: number;
        n_no: number;
        n_abstain: number;
        n_absent: number;
        n_total: number;
        session_key: string | null;
      },
      { $id: number }
    >(votingRelatedById);
    const relatedVotings = relatedStmt.all({ $id: votingId });
    relatedStmt.finalize();

    return {
      voting,
      partyBreakdown,
      memberVotes,
      governmentOpposition,
      relatedVotings,
    };
  }

  public fetchVotingsByDocument(params: { identifier: string }) {
    const stmt = this.db.prepare<
      DatabaseQueries.VotingSearchResult,
      { $identifier: string }
    >(votingsByDocument);
    const data = stmt.all({ $identifier: params.identifier });
    stmt.finalize();
    return data;
  }

  public fetchDocumentRelations(params: { identifier: string }) {
    const [idA, idB, idC] = buildDocumentIdentifierVariants(params.identifier);
    const stmt = this.db.prepare<
      {
        related_identifier: string;
        relation_types: string | null;
        evidence_count: number;
        first_date: string | null;
        last_date: string | null;
      },
      { $idA: string; $idB: string; $idC: string }
    >(documentRelationsByIdentifier);
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
}
