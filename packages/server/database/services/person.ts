import type { Database } from "bun:sqlite";
import * as queries from "../queries";

export const fetchRepresentativePage = async (
  db: Database,
  params: { page: number; limit: number },
) => {
  const offset = (params.page - 1) * params.limit;
  const stmt = db.prepare<
    DatabaseTables.Representative,
    {
      $limit: number;
      $offset: number;
    }
  >(queries.representativesPaginated);
  const data = stmt.all({ $limit: params.limit, $offset: offset });
  stmt.finalize();
  return data;
};

export const fetchPersonGroupMemberships = (
  db: Database,
  params: { id: string },
) => {
  const stmt = db.prepare<
    DatabaseTables.ParliamentGroupMembership,
    { $personId: number }
  >(queries.personGroupMemberships);
  const data = stmt.all({ $personId: +params.id });
  stmt.finalize();
  return data;
};

export const fetchPersonTerms = (db: Database, params: { id: string }) => {
  const stmt = db.prepare<DatabaseTables.Term, { $personId: number }>(
    queries.personTerms,
  );
  const data = stmt.all({ $personId: +params.id });
  stmt.finalize();
  return data;
};

export const fetchPersonVotes = (db: Database, params: { id: string }) => {
  const stmt = db.prepare<DatabaseQueries.VotesByPerson, { $personId: number }>(
    queries.votesByPerson,
  );
  const data = stmt.all({ $personId: +params.id });
  stmt.finalize();
  return data;
};

export const fetchRepresentativeDetails = (
  db: Database,
  params: { id: string },
) => {
  const stmt = db.prepare<DatabaseTables.Representative, { $personId: number }>(
    queries.representativeDetails,
  );
  const data = stmt.get({ $personId: +params.id });
  stmt.finalize();
  return data;
};

export const fetchRepresentativeDistricts = (
  db: Database,
  params: { id: string },
) => {
  const stmt = db.prepare<
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
};

export const fetchLeavingParliamentRecords = (
  db: Database,
  params: { id: string },
) => {
  const stmt = db.prepare<
    DatabaseTables.PeopleLeavingParliament,
    { $personId: number }
  >(queries.leavingParliamentRecords);
  const data = stmt.all({ $personId: +params.id });
  stmt.finalize();
  return data;
};

export const fetchTrustPositions = (db: Database, params: { id: string }) => {
  const stmt = db.prepare<DatabaseTables.TrustPosition, { $personId: number }>(
    queries.trustPositions,
  );
  const data = stmt.all({ $personId: +params.id });
  stmt.finalize();
  return data;
};

export const fetchGovernmentMemberships = (
  db: Database,
  params: { id: string },
) => {
  const stmt = db.prepare<
    DatabaseTables.GovernmentMembership,
    { $personId: number }
  >(queries.governmentMemberships);
  const data = stmt.all({ $personId: +params.id });
  stmt.finalize();
  return data;
};
