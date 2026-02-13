import { sql } from "./queries";

export const EXPECTED_SANITY_TABLES = [
  "Representative",
  "Term",
  "ParliamentaryGroup",
  "ParliamentaryGroupMembership",
  "GovernmentMembership",
  "Committee",
  "CommitteeMembership",
  "District",
  "RepresentativeDistrict",
  "Education",
  "WorkHistory",
  "TrustPosition",
  "Agenda",
  "Session",
  "Section",
  "Voting",
  "Vote",
  "Speech",
  "SpeechContent",
  "SectionDocumentLink",
  "SessionNotice",
  "SaliDBDocumentReference",
] as const;

export const EXPECTED_SANITY_INDEXES = [
  "idx_voting_start_time",
  "idx_vote_person_voting",
  "idx_vote_voting_id",
  "idx_pgm_person_dates",
  "idx_gm_government",
  "idx_term_person_dates",
  "idx_representative_gender",
  "idx_representative_birth_date",
] as const;

export const ROW_COUNT_TABLES = [
  "Representative",
  "Session",
  "Voting",
  "Vote",
  "Section",
  "Speech",
  "Term",
] as const;

export type RowCountTable = (typeof ROW_COUNT_TABLES)[number];

export function getRowCountQuery(table: RowCountTable): string {
  return sql`SELECT COUNT(*) as c FROM ${table}`;
}

export const AUXILIARY_REF_TABLES = [
  "Education",
  "WorkHistory",
  "TrustPosition",
] as const;

export type AuxiliaryRefTable = (typeof AUXILIARY_REF_TABLES)[number];

export function getAuxiliaryRepresentativeOrphanQuery(
  table: AuxiliaryRefTable,
): string {
  return sql`SELECT COUNT(*) as c FROM ${table} t WHERE NOT EXISTS (SELECT 1 FROM Representative r WHERE r.person_id = t.person_id)`;
}

export const SALIDB_LINKAGE_CHECKS = [
  {
    name: "SectionDocumentLink -> Section",
    description:
      "All section document links should reference an existing section",
    sql: sql`SELECT COUNT(*) as c FROM SectionDocumentLink sdl LEFT JOIN Section s ON sdl.section_key = s.key WHERE s.key IS NULL`,
  },
  {
    name: "SessionNotice -> Session",
    description: "All session notices should reference an existing session",
    sql: sql`SELECT COUNT(*) as c FROM SessionNotice sn LEFT JOIN Session s ON sn.session_key = s.key WHERE s.key IS NULL`,
  },
  {
    name: "SessionNotice.section_key -> Section",
    description:
      "Session notices with a section key should reference an existing section",
    sql: sql`SELECT COUNT(*) as c FROM SessionNotice sn LEFT JOIN Section s ON sn.section_key = s.key WHERE sn.section_key IS NOT NULL AND s.key IS NULL`,
  },
  {
    name: "SaliDBDocumentReference -> Voting",
    description:
      "Document references with voting_id should reference an existing voting",
    sql: sql`SELECT COUNT(*) as c FROM SaliDBDocumentReference dr LEFT JOIN Voting v ON dr.voting_id = v.id WHERE dr.voting_id IS NOT NULL AND v.id IS NULL`,
  },
  {
    name: "SaliDBDocumentReference -> Section",
    description:
      "Document references with section_key should reference an existing section",
    sql: sql`SELECT COUNT(*) as c FROM SaliDBDocumentReference dr LEFT JOIN Section s ON dr.section_key = s.key WHERE dr.section_key IS NOT NULL AND s.key IS NULL`,
  },
  {
    name: "SaliDBDocumentReference tunnus format",
    description:
      "Document references should have a basic tunnus format (e.g., HE 1/2024 vp)",
    sql: sql`SELECT COUNT(*) as c FROM SaliDBDocumentReference WHERE document_tunnus NOT LIKE '%/%'`,
  },
] as const;

export const KNOWN_EXCEPTION_QUERIES = {
  mismatchedVotings: sql`SELECT v.id, v.number, v.session_key, v.result_url
         FROM Voting v
         JOIN Vote vo ON v.id = vo.voting_id
         GROUP BY v.id
         HAVING COUNT(vo.id) = v.n_total - 1`,
} as const;

export const sanityQueries = {
  tableNames: sql`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name`,
  personIdDuplicates: sql`SELECT COUNT(*) as dupes FROM (
             SELECT person_id FROM Representative
             GROUP BY person_id HAVING COUNT(*) > 1
           )`,
  representativeNullPersonId: sql`SELECT COUNT(*) as c FROM Representative WHERE person_id IS NULL`,
  representativeMissingNames: sql`SELECT COUNT(*) as c FROM Representative
           WHERE first_name IS NULL OR last_name IS NULL
              OR TRIM(first_name) = '' OR TRIM(last_name) = ''`,
  sessionEmptyKeys: sql`SELECT COUNT(*) as c FROM Session WHERE key IS NULL OR key = ''`,
  sessionEmptyDates: sql`SELECT COUNT(*) as c FROM Session WHERE date IS NULL OR date = ''`,
  sessionTotalCount: sql`SELECT COUNT(*) as total FROM Session`,
  sessionUniqueKeyCount: sql`SELECT COUNT(DISTINCT key) as unique_count FROM Session`,
  sectionSessionOrphans: sql`SELECT COUNT(*) as orphans FROM Section sec
           WHERE NOT EXISTS (SELECT 1 FROM Session s WHERE s.key = sec.session_key)`,
  parliamentOversizedDates: sql`SELECT s.date, COUNT(DISTINCT r.person_id) as mp_count
           FROM Session s
           JOIN Term t ON t.start_date <= s.date AND (t.end_date IS NULL OR t.end_date >= s.date)
           JOIN Representative r ON r.person_id = t.person_id
           WHERE NOT EXISTS (
             SELECT 1 FROM TemporaryAbsence ta
             WHERE ta.person_id = r.person_id
               AND ta.start_date <= s.date
               AND (ta.end_date IS NULL OR ta.end_date >= s.date)
           )
           GROUP BY s.date
           HAVING mp_count > 200`,
  votingTotalOver200: sql`SELECT COUNT(*) as c FROM Voting WHERE n_total > 200`,
  votingSumMismatch: sql`SELECT COUNT(*) as c FROM Voting
           WHERE n_total > 0
             AND n_yes + n_no + n_abstain + n_absent != n_total`,
  votingIndividualCountMismatch: sql`SELECT v.id, v.n_total, COUNT(vo.id) as actual_votes
           FROM Voting v
           JOIN Vote vo ON v.id = vo.voting_id
           GROUP BY v.id
           HAVING actual_votes != v.n_total`,
  votingDuplicateNumbers: sql`SELECT COUNT(*) as dupes FROM (
             SELECT session_key, number, COUNT(*) as cnt
             FROM Voting
             WHERE session_key != ''
             GROUP BY session_key, number
             HAVING cnt > 1
           )`,
  votingSessionOrphans: sql`SELECT COUNT(*) as orphans FROM Voting v
           WHERE NOT EXISTS (SELECT 1 FROM Session s WHERE s.key = v.session_key)`,
  voteInvalidValues: sql`SELECT COUNT(*) as c FROM Vote
           WHERE vote NOT IN ('Jaa', 'Ei', 'Tyhjää', 'Poissa')`,
  voteDuplicateByPerson: sql`SELECT COUNT(*) as dupes FROM (
             SELECT voting_id, person_id, COUNT(*) as cnt
             FROM Vote
             GROUP BY voting_id, person_id
             HAVING cnt > 1
           )`,
  representativeInvalidGender: sql`SELECT COUNT(*) as c FROM Representative
           WHERE gender IS NOT NULL AND gender NOT IN ('Mies', 'Nainen')`,
  representativeWithoutTerms: sql`SELECT COUNT(*) as c FROM Representative r
           WHERE NOT EXISTS (SELECT 1 FROM Term t WHERE t.person_id = r.person_id)`,
  termInvalidDates: sql`SELECT COUNT(*) as c FROM Term
           WHERE end_date IS NOT NULL AND start_date > end_date`,
  groupMembershipInvalidDates: sql`SELECT COUNT(*) as c FROM ParliamentaryGroupMembership
           WHERE end_date IS NOT NULL AND start_date > end_date`,
  speechSessionOrphans: sql`SELECT COUNT(*) as orphans FROM Speech sp
           WHERE NOT EXISTS (SELECT 1 FROM Session s WHERE s.key = sp.session_key)`,
  speechContentSpeechOrphans: sql`SELECT COUNT(*) as orphans FROM SpeechContent sc
           WHERE NOT EXISTS (SELECT 1 FROM Speech sp WHERE sp.id = sc.speech_id)`,
  speechMetadataWithoutContent: sql`SELECT COUNT(*) as c FROM Speech sp
           WHERE NOT EXISTS (SELECT 1 FROM SpeechContent sc WHERE sc.speech_id = sp.id)`,
  speechMetadataWithoutContentUnexpected: sql`SELECT COUNT(*) as c FROM Speech sp
           WHERE NOT EXISTS (SELECT 1 FROM SpeechContent sc WHERE sc.speech_id = sp.id)
             AND COALESCE(sp.has_spoken, 1) != 0`,
  speechHasSpokenZeroWithContent: sql`SELECT COUNT(*) as c FROM Speech sp
           WHERE COALESCE(sp.has_spoken, 1) = 0
             AND EXISTS (SELECT 1 FROM SpeechContent sc WHERE sc.speech_id = sp.id)`,
  speechContentCount: sql`SELECT COUNT(*) as c FROM SpeechContent`,
  speechContentNameComparedCount: sql`SELECT COUNT(*) as c FROM SpeechContent sc
           JOIN Speech sp ON sp.id = sc.speech_id
           WHERE sc.source_first_name IS NOT NULL
             AND TRIM(sc.source_first_name) != ''
             AND sc.source_last_name IS NOT NULL
             AND TRIM(sc.source_last_name) != ''`,
  speechContentNameMismatches: sql`SELECT COUNT(*) as c FROM SpeechContent sc
           JOIN Speech sp ON sp.id = sc.speech_id
           WHERE sc.source_first_name IS NOT NULL
             AND TRIM(sc.source_first_name) != ''
             AND sc.source_last_name IS NOT NULL
             AND TRIM(sc.source_last_name) != ''
             AND (
               LOWER(TRIM(sc.source_first_name)) != LOWER(TRIM(sp.first_name))
               OR LOWER(TRIM(sc.source_last_name)) != LOWER(TRIM(sp.last_name))
             )`,
  voteRepresentativeOrphans: sql`SELECT COUNT(*) as c FROM Vote vo
           WHERE NOT EXISTS (SELECT 1 FROM Representative r WHERE r.person_id = vo.person_id)`,
  schemaIndexes: sql`SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
  voteAggregationMismatch: sql`SELECT v.id
           FROM Voting v
           JOIN Vote vo ON v.id = vo.voting_id
           GROUP BY v.id
           HAVING SUM(CASE WHEN vo.vote = 'Jaa' THEN 1 ELSE 0 END) != v.n_yes
              OR SUM(CASE WHEN vo.vote = 'Ei' THEN 1 ELSE 0 END) != v.n_no
              OR SUM(CASE WHEN vo.vote = 'Tyhjää' THEN 1 ELSE 0 END) != v.n_abstain
              OR SUM(CASE WHEN vo.vote = 'Poissa' THEN 1 ELSE 0 END) != v.n_absent`,
  votingSessionDateMismatch: sql`SELECT COUNT(*) as c FROM Voting v
           JOIN Session s ON s.key = v.session_key
           WHERE v.start_time IS NOT NULL
             AND s.date IS NOT NULL
             AND ABS(JULIANDAY(SUBSTR(v.start_time, 1, 10)) - JULIANDAY(s.date)) > 1`,
  votingSectionOrphans: sql`SELECT COUNT(*) as c FROM Voting v
           WHERE v.section_key IS NOT NULL AND v.section_key != ''
             AND NOT EXISTS (SELECT 1 FROM Section sec WHERE sec.key = v.section_key)`,
  committeeMembershipInvalidDates: sql`SELECT COUNT(*) as c FROM CommitteeMembership
           WHERE end_date IS NOT NULL AND start_date > end_date`,
  governmentMembershipInvalidDates: sql`SELECT COUNT(*) as c FROM GovernmentMembership
           WHERE end_date IS NOT NULL AND start_date > end_date`,
  governmentMembershipEmptyGovernment: sql`SELECT COUNT(*) as c FROM GovernmentMembership
           WHERE government IS NULL OR TRIM(government) = ''`,
  districtCount: sql`SELECT COUNT(*) as c FROM District`,
  representativeDistrictOverlaps: sql`SELECT COUNT(*) as c FROM RepresentativeDistrict rd1
           JOIN RepresentativeDistrict rd2
             ON rd1.person_id = rd2.person_id AND rd1.id < rd2.id
           WHERE rd1.district_code != rd2.district_code
             AND rd1.start_date <= COALESCE(rd2.end_date, '9999-12-31')
             AND rd2.start_date <= COALESCE(rd1.end_date, '9999-12-31')`,
  sessionTooOld: sql`SELECT COUNT(*) as c FROM Session
           WHERE date IS NOT NULL AND date < '1907-01-01'`,
  sessionInFuture: sql`SELECT COUNT(*) as c FROM Session
           WHERE date IS NOT NULL AND date > DATE('now')`,
  activeMpWithoutGroup: sql`SELECT COUNT(*) as c FROM (
             SELECT DISTINCT s.date, t.person_id
             FROM Session s
             JOIN Term t ON t.start_date <= s.date AND (t.end_date IS NULL OR t.end_date >= s.date)
             WHERE NOT EXISTS (
               SELECT 1 FROM TemporaryAbsence ta
               WHERE ta.person_id = t.person_id
                 AND ta.start_date <= s.date
                 AND (ta.end_date IS NULL OR ta.end_date >= s.date)
             )
             AND NOT EXISTS (
               SELECT 1 FROM ParliamentaryGroupMembership pgm
               WHERE pgm.person_id = t.person_id
                 AND pgm.start_date <= s.date
                 AND (pgm.end_date IS NULL OR pgm.end_date >= s.date)
             )
           )`,
  activeGroupMemberMismatch: sql`SELECT COUNT(*) as c FROM (
             SELECT s.date,
               (SELECT COUNT(DISTINCT t.person_id) FROM Term t
                WHERE t.start_date <= s.date AND (t.end_date IS NULL OR t.end_date >= s.date)
                AND NOT EXISTS (
                  SELECT 1 FROM TemporaryAbsence ta
                  WHERE ta.person_id = t.person_id
                    AND ta.start_date <= s.date
                    AND (ta.end_date IS NULL OR ta.end_date >= s.date)
                )) as term_count,
               (SELECT COUNT(DISTINCT pgm.person_id) FROM ParliamentaryGroupMembership pgm
                WHERE pgm.start_date <= s.date AND (pgm.end_date IS NULL OR pgm.end_date >= s.date)
                AND NOT EXISTS (
                  SELECT 1 FROM TemporaryAbsence ta
                  WHERE ta.person_id = pgm.person_id
                    AND ta.start_date <= s.date
                    AND (ta.end_date IS NULL OR ta.end_date >= s.date)
                )) as group_count
             FROM Session s
             WHERE s.date IS NOT NULL
             GROUP BY s.date
             HAVING term_count != group_count
           )`,
} as const;
