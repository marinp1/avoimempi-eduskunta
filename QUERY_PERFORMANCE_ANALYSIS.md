# Query Performance Analysis

Analyzed at: 2026-02-11T08:38:28.410Z
Database: /workspaces/avoimempi-eduskunta/avoimempi-eduskunta.db
Total queries analyzed: 81
Successful: 81
Failed: 0

## Potentially problematic queries

Heuristics: query plan contains unindexed table scan and/or temp B-tree usage.

| Domain | Query | Explain (ms) | Full scans | Temp B-tree | Note |
|---|---|---:|---:|---:|---|
| app | sessionSections | 0.244 | 10 | yes | Plan has scan |
| app | documentDetail | 0.096 | 6 | yes | Plan has scan |
| app | partySummary | 0.395 | 5 | yes | Plan has scan |
| sanity | activeGroupMemberMismatch | 0.135 | 5 | no | Plan has scan |
| app | partyDiscipline | 0.236 | 4 | yes | Plan has scan |
| app | partyParticipationByGovernment | 0.315 | 4 | yes | Plan has scan |
| app | ageDivisionOverTime | 1.344 | 3 | yes | Plan has scan |
| app | genderDivisionOverTime | 0.147 | 3 | yes | Plan has scan |
| app | sectionSpeeches | 0.134 | 2 | yes | Plan has scan |
| app | speechActivity | 0.174 | 2 | yes | Plan has scan |
| sanity | activeMpWithoutGroup | 0.108 | 2 | yes | Plan has scan |
| sanity | personIdDuplicates | 0.036 | 2 | no | Plan has scan |
| app | coalitionVsOpposition | 0.294 | 1 | yes | Plan has scan |
| app | currentComposition | 0.166 | 1 | yes | Plan has scan |
| app | dissentTracking | 0.428 | 1 | yes | Plan has scan |
| app | documentsByType | 0.034 | 1 | yes | Plan has scan |
| app | documentsSearch | 0.126 | 1 | yes | Plan has scan |
| app | leavingParliamentRecords | 0.017 | 1 | yes | Plan has scan |
| app | mpActivityRanking | 0.330 | 1 | yes | Plan has scan |
| app | partyMembers | 0.156 | 1 | yes | Plan has scan |
| app | personDissents | 0.360 | 1 | yes | Plan has scan |
| app | personSpeeches | 0.113 | 1 | yes | Plan has scan |
| app | representativeDistricts | 0.041 | 1 | yes | Plan has scan |
| app | sectionVotings | 0.036 | 1 | yes | Plan has scan |
| app | trustPositions | 0.020 | 1 | yes | Plan has scan |
| app | votingParticipation | 0.075 | 1 | yes | Plan has scan |
| app | votingParticipationByGovernment | 0.240 | 1 | yes | Plan has scan |
| sanity | tableNames | 0.025 | 1 | yes | Plan has scan |
| sanity | parliamentOversizedDates | 0.117 | 1 | yes | Plan has scan |
| sanity | votingDuplicateNumbers | 0.049 | 1 | yes | Plan has scan |
| sanity | schemaIndexes | 0.031 | 1 | yes | Plan has scan |
| app | representativesPaginated | 0.045 | 1 | no | Plan has scan |
| app | sectionSpeechCount | 0.015 | 1 | no | Plan has scan |
| app | sessionVotingCount | 0.061 | 1 | no | Plan has scan |
| sanity | representativeMissingNames | 0.023 | 1 | no | Plan has scan |
| sanity | votingTotalOver200 | 0.018 | 1 | no | Plan has scan |
| sanity | votingSumMismatch | 0.021 | 1 | no | Plan has scan |
| sanity | votingIndividualCountMismatch | 0.042 | 1 | no | Plan has scan |
| sanity | voteDuplicateByPerson | 0.028 | 1 | no | Plan has scan |
| sanity | speechSessionOrphans | 0.013 | 1 | no | Plan has scan |
| sanity | voteAggregationMismatch | 0.083 | 1 | no | Plan has scan |
| sanity | votingSessionDateMismatch | 0.041 | 1 | no | Plan has scan |
| sanity | votingSectionOrphans | 0.018 | 1 | no | Plan has scan |
| sanity | committeeMembershipInvalidDates | 0.011 | 1 | no | Plan has scan |
| sanity | representativeDistrictOverlaps | 0.048 | 1 | no | Plan has scan |
| app | committeeOverview | 0.075 | 0 | yes | Sort/group temp structure |
| app | federatedSearch | 0.165 | 0 | yes | Sort/group temp structure |
| app | governmentMemberships | 0.030 | 0 | yes | Sort/group temp structure |
| app | personCommittees | 0.052 | 0 | yes | Sort/group temp structure |
| app | recentActivity | 0.110 | 0 | yes | Sort/group temp structure |
| app | sessionByDate | 0.041 | 0 | yes | Sort/group temp structure |
| app | sessions | 0.061 | 0 | yes | Sort/group temp structure |
| app | sessionsPaginated | 0.091 | 0 | yes | Sort/group temp structure |
| app | speechesByDate | 0.072 | 0 | yes | Sort/group temp structure |
| app | votesByPerson | 0.077 | 0 | yes | Sort/group temp structure |

## Top 20 by scan risk

| Domain | Query | Explain (ms) | Full scans | Temp B-tree |
|---|---|---:|---:|---:|
| app | sessionSections | 0.244 | 10 | yes |
| app | documentDetail | 0.096 | 6 | yes |
| app | partySummary | 0.395 | 5 | yes |
| sanity | activeGroupMemberMismatch | 0.135 | 5 | no |
| app | partyDiscipline | 0.236 | 4 | yes |
| app | partyParticipationByGovernment | 0.315 | 4 | yes |
| app | ageDivisionOverTime | 1.344 | 3 | yes |
| app | genderDivisionOverTime | 0.147 | 3 | yes |
| app | sectionSpeeches | 0.134 | 2 | yes |
| app | speechActivity | 0.174 | 2 | yes |
| sanity | activeMpWithoutGroup | 0.108 | 2 | yes |
| sanity | personIdDuplicates | 0.036 | 2 | no |
| app | coalitionVsOpposition | 0.294 | 1 | yes |
| app | currentComposition | 0.166 | 1 | yes |
| app | dissentTracking | 0.428 | 1 | yes |
| app | documentsByType | 0.034 | 1 | yes |
| app | documentsSearch | 0.126 | 1 | yes |
| app | leavingParliamentRecords | 0.017 | 1 | yes |
| app | mpActivityRanking | 0.330 | 1 | yes |
| app | partyMembers | 0.156 | 1 | yes |

## Failed queries

None.

## Notes

- Full-scan count is derived from `EXPLAIN QUERY PLAN` detail rows containing `SCAN` without `USING INDEX`.
- This report is plan-based and does not execute full queries on data rows.
