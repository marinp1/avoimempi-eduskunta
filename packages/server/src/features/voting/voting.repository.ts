import type { Database } from "bun:sqlite";
import votingById from "./sql/voting-detail.sql";
import votingGovernmentOppositionById from "./sql/voting-government-opposition.sql";
import votingMemberVotesById from "./sql/voting-member-votes.sql";
import votingPartyBreakdownById from "./sql/voting-party-breakdown.sql";
import votingRelatedById from "./sql/voting-related.sql";
import votingsBrowse from "./sql/voting-list.sql";
import votingsCount from "./sql/voting-count.sql";
import {
  buildSearchQuery,
  endDateExclusive,
} from "../../database/query-helpers";

export class VotingRepository {
  constructor(private readonly db: Database) {}

  public browseVotings(params: {
    q?: string;
    phase?: string;
    type?: string;
    session?: string;
    sort?: "newest" | "oldest" | "closest" | "largest";
    startDate?: string;
    endDate?: string;
    limit?: number;
  }) {
    const searchQuery = buildSearchQuery(params.q);
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const stmt = this.db.query<
      DatabaseQueries.VotingSearchResult,
      {
        $query: string | null;
        $phase: string | null;
        $type: string | null;
        $session: string | null;
        $sort: string;
        $startDate: string | null;
        $endDateExclusive: string | null;
        $limit: number;
      }
    >(votingsBrowse);
    return stmt.all({
      $query: searchQuery,
      $phase: params.phase ?? null,
      $type: params.type ?? null,
      $session: params.session ?? null,
      $sort: params.sort ?? "newest",
      $startDate: params.startDate ?? null,
      $endDateExclusive: endDateExclusiveValue,
      $limit: params.limit ?? 200,
    });
  }

  public countVotings(params: {
    q?: string;
    phase?: string;
    type?: string;
    session?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const searchQuery = buildSearchQuery(params.q);
    const endDateExclusiveValue = endDateExclusive(params.endDate);
    const stmt = this.db.query<
      { total: number },
      {
        $query: string | null;
        $phase: string | null;
        $type: string | null;
        $session: string | null;
        $startDate: string | null;
        $endDateExclusive: string | null;
      }
    >(votingsCount);
    return (
      stmt.get({
        $query: searchQuery,
        $phase: params.phase ?? null,
        $type: params.type ?? null,
        $session: params.session ?? null,
        $startDate: params.startDate ?? null,
        $endDateExclusive: endDateExclusiveValue,
      })?.total ?? 0
    );
  }

  public fetchVotingById(params: { votingId: string }) {
    const votingId = Number.parseInt(params.votingId, 10);
    if (!Number.isFinite(votingId)) return null;
    const stmt = this.db.prepare<
      DatabaseQueries.VotingSearchResult,
      { $id: number }
    >(votingById);
    const data = stmt.get({ $id: votingId });
    stmt.finalize();
    return data ?? null;
  }

  public fetchVotingMemberVotes(params: { votingId: string }) {
    const votingId = Number.parseInt(params.votingId, 10);
    if (!Number.isFinite(votingId)) return null;
    const stmt = this.db.prepare<
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
    const data = stmt.all({ $id: votingId });
    stmt.finalize();
    return data;
  }

  public fetchVotingInlineDetails(params: { votingId: string }) {
    const votingId = Number.parseInt(params.votingId, 10);
    if (!Number.isFinite(votingId)) return null;
    const voting = this.fetchVotingById({ votingId: String(votingId) });
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
        is_government_party: 0 | 1;
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
}
