export const sql = String.raw;

// Export SQL files as raw text strings
export { default as currentComposition } from "./queries/CURRENT_COMPOSITION.sql";
export { default as votesByPerson } from "./queries/VOTES_BY_PERSON.sql";
export { default as representativeDetails } from "./queries/REPRESENTATIVE_DETAILS.sql";
export { default as representativeDistricts } from "./queries/REPRESENTATIVE_DISTRICTS.sql";
export { default as leavingParliamentRecords } from "./queries/LEAVING_PARLIAMENT.sql";
export { default as trustPositions } from "./queries/TRUST_POSITIONS.sql";
export { default as governmentMemberships } from "./queries/GOVERNMENT_MEMBERSHIPS.sql";
export { default as sessions } from "./queries/SESSIONS.sql";
export { default as sessionsPaginated } from "./queries/SESSIONS_PAGINATED.sql";
export { default as sessionSections } from "./queries/SESSION_SECTIONS.sql";
export { default as sectionSpeeches } from "./queries/SECTION_SPEECHES.sql";
export { default as votingParticipation } from "./queries/VOTING_PARTICIPATION.sql";
export { default as votingParticipationByGovernment } from "./queries/VOTING_PARTICIPATION_BY_GOVERNMENT.sql";
export { default as genderDivisionOverTime } from "./queries/GENDER_DIVISION_OVER_TIME.sql";
export { default as ageDivisionOverTime } from "./queries/AGE_DIVISION_OVER_TIME.sql";
export { default as partyParticipationByGovernment } from "./queries/PARTY_PARTICIPATION_BY_GOVERNMENT.sql";
export { default as sessionByDate } from "./queries/SESSION_BY_DATE.sql";
export { default as speechesByDate } from "./queries/SPEECHES_BY_DATE.sql";
export { default as sessionDates } from "./queries/SESSION_DATES.sql";
