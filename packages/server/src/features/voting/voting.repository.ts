import type { Database } from "bun:sqlite";
import votingById from "./sql/voting-detail.sql";
import votingGovernmentOppositionById from "./sql/voting-government-opposition.sql";
import votingMemberVotesById from "./sql/voting-member-votes.sql";
import votingPartyBreakdownById from "./sql/voting-party-breakdown.sql";
import votingRelatedById from "./sql/voting-related.sql";
import votingStatementAnnex from "./sql/voting-statement-annex.sql";
import votingStatementProposals from "./sql/voting-statement-proposals.sql";
import votingStatementReport from "./sql/voting-statement-report.sql";
import votingStatementSigners from "./sql/voting-statement-signers.sql";
import votingsBrowse from "./sql/voting-list.sql";
import votingsCount from "./sql/voting-count.sql";
import {
  buildSearchQuery,
  endDateExclusive,
} from "../../database/query-helpers";
import type { StatementProposalRow, StatementSignerRow } from "./voting-title";

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
    return (
      this.db
        .query<DatabaseQueries.VotingSearchResult, { $id: number }>(votingById)
        .get({ $id: votingId }) ?? null
    );
  }

  public fetchVotingMemberVotes(params: { votingId: string }) {
    const votingId = Number.parseInt(params.votingId, 10);
    if (!Number.isFinite(votingId)) return null;
    return this.db
      .query<
        {
          person_id: number;
          first_name: string;
          last_name: string;
          party_code: string;
          vote: string;
          is_government: 0 | 1;
        },
        { $id: number }
      >(votingMemberVotesById)
      .all({ $id: votingId });
  }

  public fetchStatementProposalRows(params: { sourceReference: string }) {
    return this.db
      .query<StatementProposalRow, { $sourceReference: string }>(
        votingStatementProposals,
      )
      .all({ $sourceReference: params.sourceReference });
  }

  public fetchStatementSignerRows(params: { sourceReference: string }) {
    return this.db
      .query<StatementSignerRow, { $sourceReference: string }>(
        votingStatementSigners,
      )
      .all({ $sourceReference: params.sourceReference });
  }

  public fetchStatementReportRows(params: { sourceReference: string }) {
    return this.db
      .query<
        {
          id: number;
          parliament_identifier: string;
          decision_text: string | null;
        },
        { $sourceReference: string }
      >(votingStatementReport)
      .all({ $sourceReference: params.sourceReference });
  }

  public fetchStatementAnnex(params: {
    sourceReference: string;
    sessionKey: string;
  }) {
    return (
      this.db
        .query<
          { id: number; edk_identifier: string | null; title: string | null },
          { $sourceReference: string; $sessionKey: string }
        >(votingStatementAnnex)
        .get({
          $sourceReference: params.sourceReference,
          $sessionKey: params.sessionKey,
        }) ?? null
    );
  }

  public fetchVotingInlineDetails(params: { votingId: string }) {
    const votingId = Number.parseInt(params.votingId, 10);
    if (!Number.isFinite(votingId)) return null;
    const voting = this.fetchVotingById({ votingId: String(votingId) });
    if (!voting) return null;

    const partyBreakdown = this.db
      .query<
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
      >(votingPartyBreakdownById)
      .all({ $id: votingId });

    const memberVotes = this.db
      .query<
        {
          person_id: number;
          first_name: string;
          last_name: string;
          party_code: string;
          vote: string;
          is_government: 0 | 1;
        },
        { $id: number }
      >(votingMemberVotesById)
      .all({ $id: votingId });

    const governmentOpposition = this.db
      .query<
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
      >(votingGovernmentOppositionById)
      .get({ $id: votingId });

    const relatedVotings = this.db
      .query<
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
      >(votingRelatedById)
      .all({ $id: votingId });

    return {
      voting,
      partyBreakdown,
      memberVotes,
      governmentOpposition,
      relatedVotings,
    };
  }
}
