import type { Database } from "bun:sqlite";
import * as queries from "../queries";

export const queryVotings = (db: Database, searchQuery: string) => {
  const stmt = db.prepare<
    DatabaseQueries.VotingSearchResult,
    { $query: string }
  >(queries.votingsSearch);
  const data = stmt.all({ $query: searchQuery });
  stmt.finalize();
  return data;
};

export const fetchVotingById = (db: Database, votingId: number) => {
  const stmt = db.prepare<DatabaseQueries.VotingSearchResult, { $id: number }>(
    queries.votingById,
  );
  const data = stmt.get({ $id: votingId });
  stmt.finalize();
  return data ?? null;
};

export const fetchVotingInlineDetails = (db: Database, votingId: number) => {
  const voting = fetchVotingById(db, votingId);
  if (!voting) return null;

  const partyStmt = db.prepare<
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

  const memberStmt = db.prepare<
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

  const govStmt = db.prepare<
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

  const relatedStmt = db.prepare<
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
};

export const fetchVotingsByDocument = (db: Database, identifier: string) => {
  const stmt = db.prepare<
    DatabaseQueries.VotingSearchResult,
    { $identifier: string }
  >(queries.votingsByDocument);
  const data = stmt.all({ $identifier: identifier });
  stmt.finalize();
  return data;
};
