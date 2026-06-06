import type { Database } from "bun:sqlite";
import votingById from "../queries/VOTING_BY_ID.sql";
import votingGovernmentOppositionById from "../queries/VOTING_GOVERNMENT_OPPOSITION_BY_ID.sql";
import votingMemberVotesById from "../queries/VOTING_MEMBER_VOTES_BY_ID.sql";
import votingPartyBreakdownById from "../queries/VOTING_PARTY_BREAKDOWN_BY_ID.sql";
import votingRelatedById from "../queries/VOTING_RELATED_BY_ID.sql";
import votingsBrowse from "../queries/VOTINGS_BROWSE.sql";
import { buildSearchQuery, endDateExclusive } from "../query-helpers";

export class VotingRepository {
  constructor(private readonly db: Database) {}

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
}
