export interface SqlTypeEntry {
  typeName: string;
}

/**
 * Column contracts for purpose-built query-result types — the exact output column
 * set each type promises. Bound to the TS type at compile time by
 * `__tests__/sql-contract.test-d.ts` (keyof Type must equal this list) and to the
 * SQL at runtime by `sql-contract.test.ts` (every query mapped to the type must
 * produce these columns). Together that closes the SQL↔type seam: a SELECT that
 * drops a column fails the runtime test; a type that adds a phantom column fails
 * typecheck.
 *
 * Only query-result types (`DatabaseQueries.*`, `RosterRow`) are listed — they are
 * shaped to match one query exactly. Bare `DatabaseTables.*` types are intentionally
 * omitted: their queries project a subset/superset of the table (e.g. an added
 * joined `term_end_date`), so a strict key contract does not apply.
 */
export const TYPE_COLUMN_CONTRACTS = {
  RosterRow: [
    "birth_year",
    "district_name",
    "first_name",
    "group_abbreviation",
    "is_in_government",
    "last_name",
    "minister",
    "participation_rate",
    "person_id",
    "sort_name",
  ],
  "DatabaseQueries.VotingSearchResult": [
    "agenda_title",
    "annulled",
    "context_title",
    "end_time",
    "id",
    "imported_datetime",
    "language_id",
    "main_section_id",
    "main_section_note",
    "main_section_title",
    "modified_datetime",
    "n_absent",
    "n_abstain",
    "n_no",
    "n_total",
    "n_yes",
    "number",
    "parliamentary_item",
    "parliamentary_item_url",
    "proceedings_name",
    "proceedings_url",
    "result_url",
    "section_id",
    "section_key",
    "section_note",
    "section_order",
    "section_processing_phase",
    "section_processing_title",
    "section_title",
    "session_key",
    "start_date",
    "start_time",
    "sub_section_identifier",
    "title",
    "title_extra",
  ],
  "DatabaseQueries.VotesByPerson": [
    "agenda_title",
    "annulled",
    "end_time",
    "government_end_date",
    "government_name",
    "government_start_date",
    "group_abbreviation",
    "id",
    "imported_datetime",
    "is_coalition",
    "language_id",
    "main_section_id",
    "main_section_note",
    "main_section_title",
    "modified_datetime",
    "n_absent",
    "n_abstain",
    "n_no",
    "n_total",
    "n_yes",
    "number",
    "parliamentary_item",
    "parliamentary_item_url",
    "proceedings_name",
    "proceedings_url",
    "result_url",
    "section_id",
    "section_key",
    "section_note",
    "section_order",
    "section_processing_phase",
    "section_processing_title",
    "section_title",
    "session_key",
    "start_date",
    "start_time",
    "sub_section_identifier",
    "title",
    "title_extra",
    "vote",
  ],
} as const;

export type ContractTypeName = keyof typeof TYPE_COLUMN_CONTRACTS;

/**
 * Maps SQL filenames to their declared TypeScript row types from
 * DatabaseTables.* / DatabaseQueries.* namespaces.
 *
 * Only queries that use named shared types are registered here.
 * Queries with inline/ad-hoc types are tracked by the snapshot alone.
 */
export const SQL_TYPE_REGISTRY: Record<string, SqlTypeEntry> = {
  "REPRESENTATIVE_DETAILS.sql": {
    typeName: "DatabaseTables.Representative",
  },
  "PERSON_GROUP_MEMBERSHIPS.sql": {
    typeName: "DatabaseTables.ParliamentGroupMembership",
  },
  "PERSON_TERMS.sql": {
    typeName: "DatabaseTables.Term",
  },
  "VOTES_BY_PERSON.sql": {
    typeName: "DatabaseQueries.VotesByPerson",
  },
  "ROSTER.sql": {
    typeName: "RosterRow",
  },
  "SECTION_VOTINGS.sql": {
    typeName: "DatabaseTables.Voting",
  },
  "SESSION_NOTICES.sql": {
    typeName: "DatabaseTables.SessionNotice",
  },
  "VOTINGS_BROWSE.sql": {
    typeName: "DatabaseQueries.VotingSearchResult",
  },
  "VOTING_BY_ID.sql": {
    typeName: "DatabaseQueries.VotingSearchResult",
  },
};
