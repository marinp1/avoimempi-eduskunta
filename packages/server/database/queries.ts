export const sql = String.raw;

// Export SQL files as raw text strings
export { default as currentComposition } from "./queries/CURERNT_COMPOSITION.sql" with { type: "text" };
export { default as votesByPerson } from "./queries/VOTES_BY_PERSON.sql" with { type: "text" };
export { default as representativeDetails } from "./queries/REPRESENTATIVE_DETAILS.sql" with { type: "text" };
export { default as leavingParliamentRecords } from "./queries/LEAVING_PARLIAMENT.sql" with { type: "text" };
export { default as trustPositions } from "./queries/TRUST_POSITIONS.sql" with { type: "text" };
export { default as governmentMemberships } from "./queries/GOVERNMENT_MEMBERSHIPS.sql" with { type: "text" };
export { default as sessions } from "./queries/SESSIONS.sql" with { type: "text" };
export { default as sessionsPaginated } from "./queries/SESSIONS_PAGINATED.sql" with { type: "text" };
export { default as sessionSections } from "./queries/SESSION_SECTIONS.sql" with { type: "text" };
export { default as sectionSpeeches } from "./queries/SECTION_SPEECHES.sql" with { type: "text" };
export { default as votingParticipation } from "./queries/VOTING_PARTICIPATION.sql" with { type: "text" };
export { default as votingParticipationByGovernment } from "./queries/VOTING_PARTICIPATION_BY_GOVERNMENT.sql" with { type: "text" };
export { default as genderDivisionOverTime } from "./queries/GENDER_DIVISION_OVER_TIME.sql" with { type: "text" };
export { default as ageDivisionOverTime } from "./queries/AGE_DIVISION_OVER_TIME.sql" with { type: "text" };
export { default as partyParticipationByGovernment } from "./queries/PARTY_PARTICIPATION_BY_GOVERNMENT.sql" with { type: "text" };
