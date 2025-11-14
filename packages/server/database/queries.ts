import { file } from "bun";
import { resolve } from "path";

export const sql = String.raw;

// Helper to read SQL file contents
const readSQL = (filename: string) => {
  const path = resolve(import.meta.dir, "queries", filename);
  return file(path).text();
};

// Export SQL files as raw text strings
export const currentComposition = await readSQL("CURRENT_COMPOSITION.sql");
export const votesByPerson = await readSQL("VOTES_BY_PERSON.sql");
export const representativeDetails = await readSQL(
  "REPRESENTATIVE_DETAILS.sql",
);
export const representativeDistricts = await readSQL(
  "REPRESENTATIVE_DISTRICTS.sql",
);
export const leavingParliamentRecords = await readSQL("LEAVING_PARLIAMENT.sql");
export const trustPositions = await readSQL("TRUST_POSITIONS.sql");
export const governmentMemberships = await readSQL(
  "GOVERNMENT_MEMBERSHIPS.sql",
);
export const sessions = await readSQL("SESSIONS.sql");
export const sessionsPaginated = await readSQL("SESSIONS_PAGINATED.sql");
export const sessionSections = await readSQL("SESSION_SECTIONS.sql");
export const sectionSpeeches = await readSQL("SECTION_SPEECHES.sql");
export const votingParticipation = await readSQL("VOTING_PARTICIPATION.sql");
export const votingParticipationByGovernment = await readSQL(
  "VOTING_PARTICIPATION_BY_GOVERNMENT.sql",
);
export const genderDivisionOverTime = await readSQL(
  "GENDER_DIVISION_OVER_TIME.sql",
);
export const ageDivisionOverTime = await readSQL("AGE_DIVISION_OVER_TIME.sql");
export const partyParticipationByGovernment = await readSQL(
  "PARTY_PARTICIPATION_BY_GOVERNMENT.sql",
);
