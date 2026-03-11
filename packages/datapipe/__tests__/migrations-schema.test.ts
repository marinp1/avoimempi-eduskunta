import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createTestDb } from "./helpers/setup-db";

const MIGRATIONS_DIR = join(import.meta.dirname, "../migrator/migrations");

const getActiveMigrationFiles = () =>
  readdirSync(MIGRATIONS_DIR)
    .filter((file) => /^V001\.\d+__.+\.sql$/.test(file))
    .sort();

const getTableNames = (db: ReturnType<typeof createTestDb>) =>
  (
    db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as {
      name: string;
    }[]
  ).map((row) => row.name);

const getColumnNames = (
  db: ReturnType<typeof createTestDb>,
  tableName: string,
  useTableXInfo = false,
) =>
  (
    db
      .query(
        `PRAGMA ${useTableXInfo ? "table_xinfo" : "table_info"}(${tableName})`,
      )
      .all() as { name: string }[]
  ).map((row) => row.name);

const _getTableInfo = (
  db: ReturnType<typeof createTestDb>,
  tableName: string,
) =>
  db.query(`PRAGMA table_info(${tableName})`).all() as {
    name: string;
    notnull: number;
  }[];

describe("Migration schema", () => {
  test("uses expected active migration files", () => {
    expect(getActiveMigrationFiles()).toEqual([
      "V001.001__core_parliament_schema.sql",
      "V001.002__vaski_roll_call_schema.sql",
      "V001.003__vaski_plenary_minutes_schema.sql",
      "V001.004__vaski_minutes_session_section_columns.sql",
      "V001.005__drop_vaski_plenary_minutes_tables.sql",
      "V001.006__speech_content_schema.sql",
      "V001.007__speech_content_source_names.sql",
      "V001.008__subsection_schema.sql",
      "V001.009__vaski_document_registry.sql",
      "V001.010__vaski_interpellation_schema.sql",
      "V001.011__vaski_government_proposal_schema.sql",
      "V001.012__vaski_written_question_schema.sql",
      "V001.013__vaski_document_enrichment.sql",
      "V001.014__vaski_committee_report_schema.sql",
      "V001.015__vaski_committee_statement_schema.sql",
      "V001.016__vaski_legislative_initiative_schema.sql",
      "V001.017__vaski_oral_question_schema.sql",
      "V001.018__section_document_reference.sql",
      "V001.019__vaski_government_proposal_rich_text.sql",
      "V001.020__vaski_document_rich_text.sql",
      "V001.021__query_performance_indexes.sql",
      "V001.022__vaski_written_question_response_schema.sql",
      "V001.023__vaski_expert_statement_schema.sql",
      "V001.024__import_source_reference_schema.sql",
      "V001.025__government_reference_schema.sql",
      "V001.026__interpellation_submission_date_index.sql",
      "V001.027__search_index_and_query_indexes.sql",
      "V001.028__voting_party_stats.sql",
      "V001.029__analytics_aggregate_tables.sql",
      "V001.030__import_source_reference_summary.sql",
      "V001.031__database_size_reduction_indexes.sql",
      "V001.032__drop_import_source_tables.sql",
      "V001.033__votes_by_person_query_indexes.sql",
      "V001.034__parliament_answer_schema.sql",
      "V001.035__person_question_indexes.sql",
    ]);
  });

  test("bootstrap migration has no ALTER TABLE or DROP statements", () => {
    const sql = readFileSync(
      join(MIGRATIONS_DIR, "V001.001__core_parliament_schema.sql"),
      "utf-8",
    );

    expect(sql).not.toMatch(/\bALTER\s+TABLE\b/i);
    expect(sql).not.toMatch(/\bDROP\s+(TABLE|VIEW|INDEX|TRIGGER)\b/i);
  });

  test("creates expected tables and excludes removed document/vaski tables", () => {
    const db = createTestDb(20);
    try {
      const tableNames = getTableNames(db);

      expect(tableNames).toContain("Representative");
      expect(tableNames).toContain("Session");
      expect(tableNames).toContain("Section");
      expect(tableNames).toContain("Voting");
      expect(tableNames).toContain("Vote");
      expect(tableNames).toContain("Speech");
      expect(tableNames).toContain("SectionDocumentLink");
      expect(tableNames).toContain("SessionNotice");
      expect(tableNames).toContain("SaliDBDocumentReference");
      expect(tableNames).toContain("RollCallReport");
      expect(tableNames).toContain("RollCallEntry");
      expect(tableNames).toContain("SpeechContent");
      expect(tableNames).toContain("SubSection");
      expect(tableNames).toContain("Interpellation");
      expect(tableNames).toContain("GovernmentProposal");
      expect(tableNames).toContain("WrittenQuestion");
      expect(tableNames).toContain("CommitteeReport");
      expect(tableNames).toContain("LegislativeInitiative");
      expect(tableNames).toContain("OralQuestion");
      expect(tableNames).not.toContain("PlenarySessionMinutes");
      expect(tableNames).not.toContain("PlenarySessionMinutesItem");

      expect(tableNames).not.toContain("Document");
      expect(tableNames).not.toContain("DocumentActor");
      expect(tableNames).not.toContain("DocumentSubject");
      expect(tableNames).not.toContain("DocumentAttachment");
      expect(tableNames).not.toContain("DocumentRelation");
      expect(tableNames).not.toContain("SessionSectionSpeech");
      expect(tableNames).not.toContain("SessionMinutesItem");
      expect(tableNames).not.toContain("SessionMinutesAttachment");
      expect(tableNames).not.toContain("CommitteeSession");
      expect(tableNames.some((name) => name.startsWith("DocType_"))).toBe(
        false,
      );
      expect(tableNames.filter((name) => name.startsWith("Vaski"))).toEqual([
        "VaskiDocument",
      ]);
    } finally {
      db.close();
    }
  });

  test("inlines evolved columns directly into base tables", () => {
    const db = createTestDb(20);
    try {
      const representativeColumns = getColumnNames(db, "Representative", true);
      const pgmColumns = getColumnNames(
        db,
        "ParliamentaryGroupMembership",
        true,
      );
      const termColumns = getColumnNames(db, "Term");
      const sessionColumns = getColumnNames(db, "Session");
      const sectionColumns = getColumnNames(db, "Section");
      const votingColumns = getColumnNames(db, "Voting", true);
      const voteColumns = getColumnNames(db, "Vote");
      const speechColumns = getColumnNames(db, "Speech");
      const governmentProposalColumns = getColumnNames(
        db,
        "GovernmentProposal",
      );
      const interpellationColumns = getColumnNames(db, "Interpellation");
      const writtenQuestionColumns = getColumnNames(db, "WrittenQuestion");
      const committeeReportColumns = getColumnNames(db, "CommitteeReport");
      const legislativeInitiativeColumns = getColumnNames(
        db,
        "LegislativeInitiative",
      );

      expect(representativeColumns).toContain("birth_year");
      expect(pgmColumns).toContain("group_abbreviation");
      expect(termColumns).toContain("start_year");
      expect(termColumns).toContain("end_year");
      expect(sessionColumns).toContain("created_datetime");
      expect(sessionColumns).toContain("roll_call_document_id");
      expect(sectionColumns).toContain("default_speech_type");
      expect(sectionColumns).toContain("document_tunnus");
      expect(votingColumns).toContain("start_date");
      expect(votingColumns).toContain("agenda_title");
      expect(voteColumns).toContain("group_abbreviation");
      expect(voteColumns).not.toContain("group_abbrviation");
      expect(speechColumns).toContain("created_datetime");
      expect(speechColumns).toContain("order_raw");
      expect(governmentProposalColumns).toContain("summary_rich_text");
      expect(governmentProposalColumns).toContain("justification_rich_text");
      expect(governmentProposalColumns).toContain("proposal_rich_text");
      expect(governmentProposalColumns).toContain("appendix_rich_text");
      expect(interpellationColumns).toContain("question_rich_text");
      expect(interpellationColumns).toContain("resolution_rich_text");
      expect(writtenQuestionColumns).toContain("question_rich_text");
      expect(committeeReportColumns).toContain("summary_rich_text");
      expect(committeeReportColumns).toContain("general_reasoning_rich_text");
      expect(committeeReportColumns).toContain("detailed_reasoning_rich_text");
      expect(committeeReportColumns).toContain("decision_rich_text");
      expect(committeeReportColumns).toContain(
        "legislation_amendment_rich_text",
      );
      expect(committeeReportColumns).toContain("minority_opinion_rich_text");
      expect(committeeReportColumns).toContain("resolution_rich_text");
      expect(legislativeInitiativeColumns).toContain("justification_rich_text");
      expect(legislativeInitiativeColumns).toContain("proposal_rich_text");
      expect(legislativeInitiativeColumns).toContain("law_rich_text");

      const idxSessionDateCount = (
        db
          .query(
            "SELECT COUNT(*) as c FROM sqlite_master WHERE type='index' AND name='idx_session_date'",
          )
          .get() as { c: number }
      ).c;
      expect(idxSessionDateCount).toBe(1);
    } finally {
      db.close();
    }
  });

  test("adds vaski minutes columns directly to Session and Section", () => {
    const db = createTestDb(20);
    try {
      const sessionColumns = getColumnNames(db, "Session");
      const sectionColumns = getColumnNames(db, "Section");

      expect(sessionColumns).toContain("minutes_edk_identifier");
      expect(sessionColumns).toContain("minutes_status");
      expect(sessionColumns).toContain("minutes_created_at");
      expect(sessionColumns).toContain("minutes_source_path");
      expect(sessionColumns).toContain("minutes_has_signature");
      expect(sessionColumns).toContain("minutes_agenda_item_count");
      expect(sessionColumns).toContain("minutes_other_item_count");
      expect(sessionColumns).toContain("minutes_start_time");
      expect(sessionColumns).toContain("minutes_end_time");
      expect(sessionColumns).toContain("minutes_title");

      expect(sectionColumns).toContain("minutes_entry_kind");
      expect(sectionColumns).toContain("minutes_entry_order");
      expect(sectionColumns).toContain("minutes_item_identifier");
      expect(sectionColumns).toContain("minutes_parent_item_identifier");
      expect(sectionColumns).toContain("minutes_item_number");
      expect(sectionColumns).toContain("minutes_item_order");
      expect(sectionColumns).toContain("minutes_item_title");
      expect(sectionColumns).toContain("minutes_related_document_identifier");
      expect(sectionColumns).toContain("minutes_related_document_type");
      expect(sectionColumns).toContain("minutes_processing_phase_code");
      expect(sectionColumns).toContain("minutes_general_processing_phase_code");
      expect(sectionColumns).toContain("minutes_content_text");
      expect(sectionColumns).toContain("minutes_match_mode");
    } finally {
      db.close();
    }
  });

  test("has targeted performance indexes and no redundant voting start-date expression index", () => {
    const db = createTestDb(21);
    try {
      const indexNames = (
        db
          .query(
            "SELECT name FROM sqlite_master WHERE type='index' ORDER BY name",
          )
          .all() as Array<{ name: string }>
      ).map((row) => row.name);

      expect(indexNames).toContain("idx_voting_session_number");
      expect(indexNames).toContain("idx_representative_sort_name_person_id");
      expect(indexNames).toContain("idx_trust_position_person_period");
      expect(indexNames).toContain(
        "idx_people_leaving_parliament_person_end_date",
      );
      expect(indexNames).toContain("idx_rollcallreport_parliament_identifier");
      expect(indexNames).toContain("idx_section_session_vaski_modified_id");
      expect(indexNames).not.toContain("idx_voting_start_date_expr");
    } finally {
      db.close();
    }
  });

  test("creates import source reference table and indexes", () => {
    const db = createTestDb(24);
    try {
      const tableNames = getTableNames(db);
      expect(tableNames).toContain("ImportSourceReference");

      const columns = getColumnNames(db, "ImportSourceReference");
      expect(columns).toContain("source_table");
      expect(columns).toContain("source_page");
      expect(columns).toContain("source_pk_name");
      expect(columns).toContain("source_pk_value");
      expect(columns).toContain("scraped_at");
      expect(columns).toContain("migrated_at");

      const indexNames = (
        db
          .query(
            "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='ImportSourceReference' ORDER BY name",
          )
          .all() as Array<{ name: string }>
      ).map((row) => row.name);

      expect(indexNames).toContain("idx_import_source_reference_lookup");
      expect(indexNames).toContain("idx_import_source_reference_scraped_at");
    } finally {
      db.close();
    }
  });

  test("creates normalized government tables and references", () => {
    const db = createTestDb(25);
    try {
      const tableNames = getTableNames(db);
      expect(tableNames).toContain("Government");
      expect(tableNames).toContain("GovernmentMembership");

      const governmentColumns = getColumnNames(db, "Government");
      expect(governmentColumns).toContain("id");
      expect(governmentColumns).toContain("name");
      expect(governmentColumns).toContain("start_date");
      expect(governmentColumns).toContain("end_date");

      const gmColumns = getColumnNames(db, "GovernmentMembership");
      expect(gmColumns).toContain("government");
      expect(gmColumns).toContain("government_id");
    } finally {
      db.close();
    }
  });

  test("creates import source summary and analytics aggregate tables", () => {
    const db = createTestDb(30);
    try {
      const tableNames = getTableNames(db);
      expect(tableNames).toContain("ImportSourceReferenceSummary");
      expect(tableNames).toContain("VotingPartyStats");
      expect(tableNames).toContain("PersonVotingDailyStats");
      expect(tableNames).toContain("PersonSpeechDailyStats");

      const sourceSummaryColumns = getColumnNames(
        db,
        "ImportSourceReferenceSummary",
      );
      expect(sourceSummaryColumns).toContain("source_table");
      expect(sourceSummaryColumns).toContain("imported_rows");
      expect(sourceSummaryColumns).toContain("distinct_pages");

      const votingPartyStatsColumns = getColumnNames(db, "VotingPartyStats");
      expect(votingPartyStatsColumns).toContain("n_jaa");
      expect(votingPartyStatsColumns).toContain("n_ei");
      expect(votingPartyStatsColumns).toContain("n_tyhjaa");
      expect(votingPartyStatsColumns).toContain("n_poissa");
    } finally {
      db.close();
    }
  });

  test("drops redundant indexes to reduce database size", () => {
    const db = createTestDb(31);
    try {
      const indexNames = (
        db
          .query(
            "SELECT name FROM sqlite_master WHERE type='index' ORDER BY name",
          )
          .all() as Array<{ name: string }>
      ).map((row) => row.name);

      expect(indexNames).toContain("idx_import_source_reference_source_table");
      expect(indexNames).not.toContain("idx_import_source_reference_lookup");
      expect(indexNames).not.toContain(
        "idx_import_source_reference_scraped_at",
      );
      expect(indexNames).not.toContain("idx_govproposal_outcome");
      expect(indexNames).not.toContain("idx_committeereportmember_person");
      expect(indexNames).not.toContain("idx_speech_content_session");
      expect(indexNames).not.toContain("idx_speech_content_section");
      expect(indexNames).not.toContain("idx_speech_content_source_document");
    } finally {
      db.close();
    }
  });
});
