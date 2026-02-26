import type { Database } from "bun:sqlite";
import * as queries from "../queries";
import {
  buildDocumentIdentifierVariants,
  buildSearchQuery,
  endDateExclusive,
} from "../query-helpers";

export class VotingRepository {
  constructor(private readonly db: Database) {}

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
    >(queries.votingsSearch);
    const data = stmt.all({
      $query: searchQuery,
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
    >(queries.votingById);
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
    >(queries.votingPartyBreakdownById);
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
    >(queries.votingMemberVotesById);
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
    >(queries.votingGovernmentOppositionById);
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
    >(queries.votingRelatedById);
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
    >(queries.votingsByDocument);
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
}
