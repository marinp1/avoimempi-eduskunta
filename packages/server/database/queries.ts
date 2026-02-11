export const sql = String.raw;

// Future query ideas (not implemented yet):
// 1) Session-level document timeline (agenda -> minutes -> attachments by creation time)
// 2) Committee session feed with linked documents and participant stats
// 3) Speaker-level document references (which documents each speech explicitly discussed)
// 4) Document relation graph traversal (multi-hop links from HE -> committee docs -> votes)
// 5) Per-document full-text search over normalized document/event tables

export { default as ageDivisionOverTime } from "./queries/AGE_DIVISION_OVER_TIME.sql";
export { default as closeVotes } from "./queries/CLOSE_VOTES.sql";
export { default as coalitionVsOpposition } from "./queries/COALITION_VS_OPPOSITION.sql";
export { default as committeeOverview } from "./queries/COMMITTEE_OVERVIEW.sql";
export { default as currentComposition } from "./queries/CURRENT_COMPOSITION.sql";
export { default as dissentTracking } from "./queries/DISSENT_TRACKING.sql";
export { default as federatedSearch } from "./queries/FEDERATED_SEARCH.sql";
export { default as genderDivisionOverTime } from "./queries/GENDER_DIVISION_OVER_TIME.sql";
export { default as governmentMemberships } from "./queries/GOVERNMENT_MEMBERSHIPS.sql";
export { default as leavingParliamentRecords } from "./queries/LEAVING_PARLIAMENT.sql";
export { default as mpActivityRanking } from "./queries/MP_ACTIVITY_RANKING.sql";
export { default as partyDiscipline } from "./queries/PARTY_DISCIPLINE.sql";
export { default as partyMembers } from "./queries/PARTY_MEMBERS.sql";
export { default as partyParticipationByGovernment } from "./queries/PARTY_PARTICIPATION_BY_GOVERNMENT.sql";
export { default as partySummary } from "./queries/PARTY_SUMMARY.sql";
export { default as personCommittees } from "./queries/PERSON_COMMITTEES.sql";
export { default as personDissents } from "./queries/PERSON_DISSENTS.sql";
export { default as personGroupMemberships } from "./queries/PERSON_GROUP_MEMBERSHIPS.sql";
export { default as personSpeeches } from "./queries/PERSON_SPEECHES.sql";
export { default as personTerms } from "./queries/PERSON_TERMS.sql";
export { default as recentActivity } from "./queries/RECENT_ACTIVITY.sql";
export { default as representativeDetails } from "./queries/REPRESENTATIVE_DETAILS.sql";
export { default as representativeDistricts } from "./queries/REPRESENTATIVE_DISTRICTS.sql";
export { default as representativesPaginated } from "./queries/REPRESENTATIVES_PAGINATED.sql";
export { default as sectionDocumentLinks } from "./queries/SECTION_DOCUMENT_LINKS.sql";
export { default as sectionSpeechCount } from "./queries/SECTION_SPEECH_COUNT.sql";
export { default as sectionSpeeches } from "./queries/SECTION_SPEECHES.sql";
export { default as sectionVotings } from "./queries/SECTION_VOTINGS.sql";
export { default as sessionByDate } from "./queries/SESSION_BY_DATE.sql";
export { default as sessionCount } from "./queries/SESSION_COUNT.sql";
export { default as sessionDates } from "./queries/SESSION_DATES.sql";
export { default as sessionDocuments } from "./queries/SESSION_DOCUMENTS.sql";
export { default as sessionNotices } from "./queries/SESSION_NOTICES.sql";
export { default as sessionSections } from "./queries/SESSION_SECTIONS.sql";
export { default as sessionVotingCount } from "./queries/SESSION_VOTING_COUNT.sql";
export { default as sessions } from "./queries/SESSIONS.sql";
export { default as sessionsPaginated } from "./queries/SESSIONS_PAGINATED.sql";
export { default as speechActivity } from "./queries/SPEECH_ACTIVITY.sql";
export { default as speechesByDate } from "./queries/SPEECHES_BY_DATE.sql";
export { default as trustPositions } from "./queries/TRUST_POSITIONS.sql";
export { default as votesByPerson } from "./queries/VOTES_BY_PERSON.sql";
export { default as votingById } from "./queries/VOTING_BY_ID.sql";
export { default as votingParticipation } from "./queries/VOTING_PARTICIPATION.sql";
export { default as votingParticipationByGovernment } from "./queries/VOTING_PARTICIPATION_BY_GOVERNMENT.sql";
export { default as votingsSearch } from "./queries/VOTINGS_SEARCH.sql";
