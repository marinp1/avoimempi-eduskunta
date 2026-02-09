import type { Database } from "bun:sqlite";
import {
  buildKnownDataExceptions,
  getExceptionsForCheck,
  type KnownDataException,
} from "./known-data-exceptions";

export interface SanityCheck {
  category: string;
  name: string;
  description: string;
  passed: boolean;
  details?: string;
  errorMessage?: string;
  knownExceptions?: KnownDataException[];
}

export interface SanityCheckResult {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  knownExceptionCount: number;
  checks: SanityCheck[];
  lastRun: string;
}

export class SanityCheckService {
  private knownExceptions: KnownDataException[];

  constructor(private db: Database) {
    this.knownExceptions = buildKnownDataExceptions(db);
  }

  async runAllChecks(): Promise<SanityCheckResult> {
    const checks: SanityCheck[] = [];

    // Run all check categories
    checks.push(...this.checkTableExistence());
    checks.push(...this.checkRowCounts());
    checks.push(...this.checkPersonUniqueness());
    checks.push(...this.checkSessionStructure());
    checks.push(...this.checkSectionStructure());
    checks.push(...this.checkParliamentSize());
    checks.push(...this.checkVotingCounts());
    checks.push(...this.checkVotingLinkage());
    checks.push(...this.checkVoteIntegrity());
    checks.push(...this.checkRepresentativeData());
    checks.push(...this.checkTermIntegrity());
    checks.push(...this.checkParliamentaryGroupIntegrity());
    checks.push(...this.checkSpeechIntegrity());
    checks.push(...this.checkReferentialIntegrity());
    checks.push(...this.checkSchemaIntegrity());
    checks.push(...this.checkVoteAggregation());
    checks.push(...this.checkVotingTemporalConsistency());
    checks.push(...this.checkVotingSectionLinkage());
    checks.push(...this.checkCommitteeMembershipDates());
    checks.push(...this.checkGovernmentMembershipIntegrity());
    checks.push(...this.checkDistrictIntegrity());
    checks.push(...this.checkAuxiliaryTableRefs());
    checks.push(...this.checkSessionDatePlausibility());
    checks.push(...this.checkMPGroupMembership());
    checks.push(...this.checkActiveGroupMembersCount());

    const passedChecks = checks.filter((c) => c.passed).length;
    const failedChecks = checks.filter((c) => !c.passed).length;
    const knownExceptionCount = checks.filter(
      (c) => c.knownExceptions && c.knownExceptions.length > 0,
    ).length;

    return {
      totalChecks: checks.length,
      passedChecks,
      failedChecks,
      knownExceptionCount,
      checks,
      lastRun: new Date().toISOString(),
    };
  }

  private checkTableExistence(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const tables = this.db
        .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        .all() as { name: string }[];
      const tableNames = tables.map((t) => t.name);

      const expectedTables = [
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
        "ExcelSpeech",
        "VaskiDocument",
      ];

      const missingTables = expectedTables.filter(
        (t) => !tableNames.includes(t),
      );

      checks.push({
        category: "Schema",
        name: "Core tables exist",
        description: "All expected database tables are present",
        passed: missingTables.length === 0,
        details: missingTables.length > 0 ? `Missing: ${missingTables.join(", ")}` : `All ${expectedTables.length} core tables present`,
      });
    } catch (error) {
      checks.push({
        category: "Schema",
        name: "Core tables exist",
        description: "All expected database tables are present",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkRowCounts(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    const countTests = [
      {
        table: "Representative",
        name: "Representative count",
        description: "Should have >1000 MPs historically",
        minCount: 1000,
      },
      {
        table: "Session",
        name: "Session count",
        description: "Should have >100 sessions",
        minCount: 100,
      },
      {
        table: "Voting",
        name: "Voting count",
        description: "Should have >1000 votings",
        minCount: 1000,
      },
      {
        table: "Vote",
        name: "Vote count",
        description: "Should have >100,000 individual votes",
        minCount: 100000,
      },
      {
        table: "Section",
        name: "Section count",
        description: "Should have >1000 sections",
        minCount: 1000,
      },
      {
        table: "Speech",
        name: "Speech count",
        description: "Should have >10,000 speeches",
        minCount: 10000,
      },
      {
        table: "Term",
        name: "Term count",
        description: "Should have >1000 terms",
        minCount: 1000,
      },
    ];

    for (const test of countTests) {
      try {
        const result = this.db
          .query(`SELECT COUNT(*) as c FROM ${test.table}`)
          .get() as any;
        const count = result?.c ?? 0;
        const passed = count > test.minCount;

        checks.push({
          category: "Data Volume",
          name: test.name,
          description: test.description,
          passed,
          details: `Count: ${count.toLocaleString()}`,
        });
      } catch (error) {
        checks.push({
          category: "Data Volume",
          name: test.name,
          description: test.description,
          passed: false,
          errorMessage: String(error),
        });
      }
    }

    return checks;
  }

  private checkPersonUniqueness(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const dupes = this.db
        .query(
          `SELECT COUNT(*) as dupes FROM (
             SELECT person_id FROM Representative
             GROUP BY person_id HAVING COUNT(*) > 1
           )`,
        )
        .get() as any;

      checks.push({
        category: "Data Quality",
        name: "Unique person IDs",
        description: "Each person should have a unique person_id",
        passed: dupes.dupes === 0,
        details: dupes.dupes === 0 ? "All person IDs are unique" : `${dupes.dupes} duplicate person IDs found`,
      });
    } catch (error) {
      checks.push({
        category: "Data Quality",
        name: "Unique person IDs",
        description: "Each person should have a unique person_id",
        passed: false,
        errorMessage: String(error),
      });
    }

    try {
      const nullIds = this.db
        .query("SELECT COUNT(*) as c FROM Representative WHERE person_id IS NULL")
        .get() as any;

      checks.push({
        category: "Data Quality",
        name: "No NULL person IDs",
        description: "All representatives must have a person_id",
        passed: nullIds.c === 0,
        details: nullIds.c === 0 ? "All person IDs are present" : `${nullIds.c} NULL person IDs found`,
      });
    } catch (error) {
      checks.push({
        category: "Data Quality",
        name: "No NULL person IDs",
        description: "All representatives must have a person_id",
        passed: false,
        errorMessage: String(error),
      });
    }

    try {
      const missingNames = this.db
        .query(
          `SELECT COUNT(*) as c FROM Representative
           WHERE first_name IS NULL OR last_name IS NULL
              OR TRIM(first_name) = '' OR TRIM(last_name) = ''`,
        )
        .get() as any;

      checks.push({
        category: "Data Quality",
        name: "Complete names",
        description: "All representatives must have first and last names",
        passed: missingNames.c === 0,
        details: missingNames.c === 0 ? "All names are present" : `${missingNames.c} missing names`,
      });
    } catch (error) {
      checks.push({
        category: "Data Quality",
        name: "Complete names",
        description: "All representatives must have first and last names",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkSessionStructure(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const emptyKeys = this.db
        .query("SELECT COUNT(*) as c FROM Session WHERE key IS NULL OR key = ''")
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Session keys present",
        description: "All sessions must have a non-empty key",
        passed: emptyKeys.c === 0,
        details: emptyKeys.c === 0 ? "All session keys present" : `${emptyKeys.c} empty session keys`,
      });
    } catch (error) {
      checks.push({
        category: "Data Integrity",
        name: "Session keys present",
        description: "All sessions must have a non-empty key",
        passed: false,
        errorMessage: String(error),
      });
    }

    try {
      const emptyDates = this.db
        .query("SELECT COUNT(*) as c FROM Session WHERE date IS NULL OR date = ''")
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Session dates present",
        description: "All sessions must have a date",
        passed: emptyDates.c === 0,
        details: emptyDates.c === 0 ? "All session dates present" : `${emptyDates.c} missing session dates`,
      });
    } catch (error) {
      checks.push({
        category: "Data Integrity",
        name: "Session dates present",
        description: "All sessions must have a date",
        passed: false,
        errorMessage: String(error),
      });
    }

    try {
      const total = (this.db.query("SELECT COUNT(*) as total FROM Session").get() as any).total;
      const unique = (this.db.query("SELECT COUNT(DISTINCT key) as unique_count FROM Session").get() as any).unique_count;

      checks.push({
        category: "Data Integrity",
        name: "Unique session keys",
        description: "Session keys must be unique",
        passed: unique === total,
        details: `${unique} unique keys out of ${total} sessions`,
      });
    } catch (error) {
      checks.push({
        category: "Data Integrity",
        name: "Unique session keys",
        description: "Session keys must be unique",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkSectionStructure(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const orphans = this.db
        .query(
          `SELECT COUNT(*) as orphans FROM Section sec
           WHERE NOT EXISTS (SELECT 1 FROM Session s WHERE s.key = sec.session_key)`,
        )
        .get() as any;

      checks.push({
        category: "Referential Integrity",
        name: "Section → Session links",
        description: "All sections must reference existing sessions",
        passed: orphans.orphans === 0,
        details: orphans.orphans === 0 ? "All sections properly linked" : `${orphans.orphans} orphaned sections`,
      });
    } catch (error) {
      checks.push({
        category: "Referential Integrity",
        name: "Section → Session links",
        description: "All sections must reference existing sessions",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkParliamentSize(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const oversized = this.db
        .query(
          `SELECT s.date, COUNT(DISTINCT r.person_id) as mp_count
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
        )
        .all() as any[];

      checks.push({
        category: "Business Logic",
        name: "Parliament size limit",
        description: "Active MPs should never exceed 200 on any date",
        passed: oversized.length === 0,
        details: oversized.length === 0 ? "Parliament size always ≤200" : `${oversized.length} dates with >200 MPs`,
      });
    } catch (error) {
      checks.push({
        category: "Business Logic",
        name: "Parliament size limit",
        description: "Active MPs should never exceed 200 on any date",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkVotingCounts(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const oversized = this.db
        .query("SELECT COUNT(*) as c FROM Voting WHERE n_total > 200")
        .get() as any;

      checks.push({
        category: "Business Logic",
        name: "Voting total ≤200",
        description: "Vote totals should never exceed 200",
        passed: oversized.c === 0,
        details: oversized.c === 0 ? "All vote totals ≤200" : `${oversized.c} votings with >200 votes`,
      });
    } catch (error) {
      checks.push({
        category: "Business Logic",
        name: "Voting total ≤200",
        description: "Vote totals should never exceed 200",
        passed: false,
        errorMessage: String(error),
      });
    }

    try {
      const sumMismatch = this.db
        .query(
          `SELECT COUNT(*) as c FROM Voting
           WHERE n_total > 0
             AND n_yes + n_no + n_abstain + n_absent != n_total`,
        )
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Voting count sums",
        description: "Vote counts must sum to n_total",
        passed: sumMismatch.c === 0,
        details: sumMismatch.c === 0 ? "All vote counts sum correctly" : `${sumMismatch.c} mismatched vote sums`,
      });
    } catch (error) {
      checks.push({
        category: "Data Integrity",
        name: "Voting count sums",
        description: "Vote counts must sum to n_total",
        passed: false,
        errorMessage: String(error),
      });
    }

    try {
      const mismatchedVotings = this.db
        .query(
          `SELECT v.id, v.n_total, COUNT(vo.id) as actual_votes
           FROM Voting v
           JOIN Vote vo ON v.id = vo.voting_id
           GROUP BY v.id
           HAVING actual_votes != v.n_total`,
        )
        .all() as { id: number; n_total: number; actual_votes: number }[];

      const checkExceptions = getExceptionsForCheck(
        this.knownExceptions,
        "Individual vote count matches",
      );
      const knownIds = new Set(checkExceptions.flatMap((e) => e.affectedRows.map((r) => r.id)));
      const unexplained = mismatchedVotings.filter((v) => !knownIds.has(v.id));
      const explained = mismatchedVotings.filter((v) => knownIds.has(v.id));

      const allExplained = unexplained.length === 0 && explained.length > 0;

      checks.push({
        category: "Data Integrity",
        name: "Individual vote count matches",
        description: "Individual vote records must match n_total",
        passed: mismatchedVotings.length === 0 || allExplained,
        details:
          mismatchedVotings.length === 0
            ? "All vote counts match"
            : allExplained
              ? `${explained.length} tunnettu poikkeama (kaikki selitetty)`
              : `${unexplained.length} selittämätöntä, ${explained.length} tunnettua poikkeamaa`,
        knownExceptions: checkExceptions.length > 0 ? checkExceptions : undefined,
      });
    } catch (error) {
      checks.push({
        category: "Data Integrity",
        name: "Individual vote count matches",
        description: "Individual vote records must match n_total",
        passed: false,
        errorMessage: String(error),
      });
    }

    try {
      const duplicateNumbers = this.db
        .query(
          `SELECT COUNT(*) as dupes FROM (
             SELECT session_key, number, COUNT(*) as cnt
             FROM Voting
             WHERE session_key != ''
             GROUP BY session_key, number
             HAVING cnt > 1
           )`,
        )
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Unique voting numbers",
        description: "Voting numbers must be unique within sessions",
        passed: duplicateNumbers.dupes === 0,
        details: duplicateNumbers.dupes === 0 ? "All voting numbers unique" : `${duplicateNumbers.dupes} duplicate voting numbers`,
      });
    } catch (error) {
      checks.push({
        category: "Data Integrity",
        name: "Unique voting numbers",
        description: "Voting numbers must be unique within sessions",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkVotingLinkage(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const orphans = this.db
        .query(
          `SELECT COUNT(*) as orphans FROM Voting v
           WHERE NOT EXISTS (SELECT 1 FROM Session s WHERE s.key = v.session_key)`,
        )
        .get() as any;

      checks.push({
        category: "Referential Integrity",
        name: "Voting → Session links",
        description: "All votings must reference existing sessions",
        passed: orphans.orphans === 0,
        details: orphans.orphans === 0 ? "All votings properly linked" : `${orphans.orphans} orphaned votings`,
      });
    } catch (error) {
      checks.push({
        category: "Referential Integrity",
        name: "Voting → Session links",
        description: "All votings must reference existing sessions",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkVoteIntegrity(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const invalidVotes = this.db
        .query(
          `SELECT COUNT(*) as c FROM Vote
           WHERE vote NOT IN ('Jaa', 'Ei', 'Tyhjää', 'Poissa')`,
        )
        .get() as any;

      checks.push({
        category: "Data Quality",
        name: "Valid vote values",
        description: "Vote values must be Jaa, Ei, Tyhjää, or Poissa",
        passed: invalidVotes.c === 0,
        details: invalidVotes.c === 0 ? "All vote values valid" : `${invalidVotes.c} invalid vote values`,
      });
    } catch (error) {
      checks.push({
        category: "Data Quality",
        name: "Valid vote values",
        description: "Vote values must be Jaa, Ei, Tyhjää, or Poissa",
        passed: false,
        errorMessage: String(error),
      });
    }

    try {
      const duplicateVotes = this.db
        .query(
          `SELECT COUNT(*) as dupes FROM (
             SELECT voting_id, person_id, COUNT(*) as cnt
             FROM Vote
             GROUP BY voting_id, person_id
             HAVING cnt > 1
           )`,
        )
        .get() as any;

      checks.push({
        category: "Data Quality",
        name: "No duplicate votes",
        description: "Each person can only vote once per voting",
        passed: duplicateVotes.dupes === 0,
        details: duplicateVotes.dupes === 0 ? "No duplicate votes" : `${duplicateVotes.dupes} duplicate votes found`,
      });
    } catch (error) {
      checks.push({
        category: "Data Quality",
        name: "No duplicate votes",
        description: "Each person can only vote once per voting",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkRepresentativeData(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const invalidGender = this.db
        .query(
          `SELECT COUNT(*) as c FROM Representative
           WHERE gender IS NOT NULL AND gender NOT IN ('Mies', 'Nainen')`,
        )
        .get() as any;

      checks.push({
        category: "Data Quality",
        name: "Valid gender values",
        description: "Gender must be 'Mies' or 'Nainen'",
        passed: invalidGender.c === 0,
        details: invalidGender.c === 0 ? "All gender values valid" : `${invalidGender.c} invalid gender values`,
      });
    } catch (error) {
      checks.push({
        category: "Data Quality",
        name: "Valid gender values",
        description: "Gender must be 'Mies' or 'Nainen'",
        passed: false,
        errorMessage: String(error),
      });
    }

    try {
      const noTerms = this.db
        .query(
          `SELECT COUNT(*) as c FROM Representative r
           WHERE NOT EXISTS (SELECT 1 FROM Term t WHERE t.person_id = r.person_id)`,
        )
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Representatives have terms",
        description: "All representatives must have at least one term",
        passed: noTerms.c === 0,
        details: noTerms.c === 0 ? "All representatives have terms" : `${noTerms.c} representatives without terms`,
      });
    } catch (error) {
      checks.push({
        category: "Data Integrity",
        name: "Representatives have terms",
        description: "All representatives must have at least one term",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkTermIntegrity(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const invalidDates = this.db
        .query(
          `SELECT COUNT(*) as c FROM Term
           WHERE end_date IS NOT NULL AND start_date > end_date`,
        )
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Term dates valid",
        description: "Term start_date must be ≤ end_date",
        passed: invalidDates.c === 0,
        details: invalidDates.c === 0 ? "All term dates valid" : `${invalidDates.c} invalid term dates`,
      });
    } catch (error) {
      checks.push({
        category: "Data Integrity",
        name: "Term dates valid",
        description: "Term start_date must be ≤ end_date",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkParliamentaryGroupIntegrity(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const invalidDates = this.db
        .query(
          `SELECT COUNT(*) as c FROM ParliamentaryGroupMembership
           WHERE end_date IS NOT NULL AND start_date > end_date`,
        )
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Group membership dates valid",
        description: "Membership start_date must be ≤ end_date",
        passed: invalidDates.c === 0,
        details: invalidDates.c === 0 ? "All membership dates valid" : `${invalidDates.c} invalid dates`,
      });
    } catch (error) {
      checks.push({
        category: "Data Integrity",
        name: "Group membership dates valid",
        description: "Membership start_date must be ≤ end_date",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkSpeechIntegrity(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const orphans = this.db
        .query(
          `SELECT COUNT(*) as orphans FROM Speech sp
           WHERE NOT EXISTS (SELECT 1 FROM Session s WHERE s.key = sp.session_key)`,
        )
        .get() as any;

      checks.push({
        category: "Referential Integrity",
        name: "Speech → Session links",
        description: "All speeches must reference existing sessions",
        passed: orphans.orphans === 0,
        details: orphans.orphans === 0 ? "All speeches properly linked" : `${orphans.orphans} orphaned speeches`,
      });
    } catch (error) {
      checks.push({
        category: "Referential Integrity",
        name: "Speech → Session links",
        description: "All speeches must reference existing sessions",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkReferentialIntegrity(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const orphans = this.db
        .query(
          `SELECT COUNT(*) as c FROM Vote vo
           WHERE NOT EXISTS (SELECT 1 FROM Representative r WHERE r.person_id = vo.person_id)`,
        )
        .get() as any;

      checks.push({
        category: "Referential Integrity",
        name: "Vote → Representative links",
        description: "All votes must reference existing representatives",
        passed: orphans.c === 0,
        details: orphans.c === 0 ? "All votes properly linked" : `${orphans.c} orphaned votes`,
      });
    } catch (error) {
      checks.push({
        category: "Referential Integrity",
        name: "Vote → Representative links",
        description: "All votes must reference existing representatives",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkSchemaIntegrity(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const indexes = this.db
        .query(
          "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all() as { name: string }[];
      const indexNames = indexes.map((i) => i.name);

      const expectedIndexes = [
        "idx_voting_start_time",
        "idx_vote_person_voting",
        "idx_vote_voting_id",
        "idx_pgm_person_dates",
        "idx_gm_government",
        "idx_term_person_dates",
        "idx_representative_gender",
        "idx_representative_birth_date",
      ];

      const missingIndexes = expectedIndexes.filter(
        (idx) => !indexNames.includes(idx),
      );

      checks.push({
        category: "Schema",
        name: "Performance indexes present",
        description: "Critical performance indexes must exist",
        passed: missingIndexes.length === 0,
        details: missingIndexes.length === 0 ? `All ${expectedIndexes.length} indexes present` : `Missing: ${missingIndexes.join(", ")}`,
      });
    } catch (error) {
      checks.push({
        category: "Schema",
        name: "Performance indexes present",
        description: "Critical performance indexes must exist",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkVoteAggregation(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const mismatchedVotings = this.db
        .query(
          `SELECT v.id
           FROM Voting v
           JOIN Vote vo ON v.id = vo.voting_id
           GROUP BY v.id
           HAVING SUM(CASE WHEN vo.vote = 'Jaa' THEN 1 ELSE 0 END) != v.n_yes
              OR SUM(CASE WHEN vo.vote = 'Ei' THEN 1 ELSE 0 END) != v.n_no
              OR SUM(CASE WHEN vo.vote = 'Tyhjää' THEN 1 ELSE 0 END) != v.n_abstain
              OR SUM(CASE WHEN vo.vote = 'Poissa' THEN 1 ELSE 0 END) != v.n_absent`,
        )
        .all() as { id: number }[];

      const checkExceptions = getExceptionsForCheck(
        this.knownExceptions,
        "Vote aggregation per type",
      );
      const knownIds = new Set(checkExceptions.flatMap((e) => e.affectedRows.map((r) => r.id)));
      const unexplained = mismatchedVotings.filter((v) => !knownIds.has(v.id));
      const explained = mismatchedVotings.filter((v) => knownIds.has(v.id));

      const allExplained = unexplained.length === 0 && explained.length > 0;

      checks.push({
        category: "Data Integrity",
        name: "Vote aggregation per type",
        description: "Per-type vote counts must match individual vote records",
        passed: mismatchedVotings.length === 0 || allExplained,
        details:
          mismatchedVotings.length === 0
            ? "All per-type counts match"
            : allExplained
              ? `${explained.length} tunnettu poikkeama (kaikki selitetty)`
              : `${unexplained.length} selittämätöntä, ${explained.length} tunnettua poikkeamaa`,
        knownExceptions: checkExceptions.length > 0 ? checkExceptions : undefined,
      });
    } catch (error) {
      checks.push({
        category: "Data Integrity",
        name: "Vote aggregation per type",
        description: "Per-type vote counts must match individual vote records",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkVotingTemporalConsistency(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const mismatches = this.db
        .query(
          `SELECT COUNT(*) as c FROM Voting v
           JOIN Session s ON s.key = v.session_key
           WHERE v.start_time IS NOT NULL
             AND s.date IS NOT NULL
             AND ABS(JULIANDAY(SUBSTR(v.start_time, 1, 10)) - JULIANDAY(s.date)) > 1`,
        )
        .get() as any;

      checks.push({
        category: "Business Logic",
        name: "Voting date within 1 day of session date",
        description: "Voting start_time should be within 1 day of session date (sessions can span overnight)",
        passed: mismatches.c === 0,
        details: mismatches.c === 0 ? "All voting dates within range" : `${mismatches.c} votings with >1 day offset from session`,
      });
    } catch (error) {
      checks.push({
        category: "Business Logic",
        name: "Voting date within 1 day of session date",
        description: "Voting start_time should be within 1 day of session date (sessions can span overnight)",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkVotingSectionLinkage(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const orphans = this.db
        .query(
          `SELECT COUNT(*) as c FROM Voting v
           WHERE v.section_key IS NOT NULL AND v.section_key != ''
             AND NOT EXISTS (SELECT 1 FROM Section sec WHERE sec.key = v.section_key)`,
        )
        .get() as any;

      checks.push({
        category: "Referential Integrity",
        name: "Voting → Section links",
        description: "Votings with section_key must reference existing sections",
        passed: orphans.c === 0,
        details: orphans.c === 0 ? "All voting-section links valid" : `${orphans.c} orphaned voting-section links`,
      });
    } catch (error) {
      checks.push({
        category: "Referential Integrity",
        name: "Voting → Section links",
        description: "Votings with section_key must reference existing sections",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkCommitteeMembershipDates(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const invalid = this.db
        .query(
          `SELECT COUNT(*) as c FROM CommitteeMembership
           WHERE end_date IS NOT NULL AND start_date > end_date`,
        )
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Committee membership dates valid",
        description: "Committee membership start_date must be ≤ end_date",
        passed: invalid.c === 0,
        details: invalid.c === 0 ? "All committee membership dates valid" : `${invalid.c} invalid committee membership dates`,
      });
    } catch (error) {
      checks.push({
        category: "Data Integrity",
        name: "Committee membership dates valid",
        description: "Committee membership start_date must be ≤ end_date",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkGovernmentMembershipIntegrity(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const invalid = this.db
        .query(
          `SELECT COUNT(*) as c FROM GovernmentMembership
           WHERE end_date IS NOT NULL AND start_date > end_date`,
        )
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Government membership dates valid",
        description: "Government membership start_date must be ≤ end_date",
        passed: invalid.c === 0,
        details: invalid.c === 0 ? "All government membership dates valid" : `${invalid.c} invalid government membership dates`,
      });
    } catch (error) {
      checks.push({
        category: "Data Integrity",
        name: "Government membership dates valid",
        description: "Government membership start_date must be ≤ end_date",
        passed: false,
        errorMessage: String(error),
      });
    }

    try {
      const empty = this.db
        .query(
          `SELECT COUNT(*) as c FROM GovernmentMembership
           WHERE government IS NULL OR TRIM(government) = ''`,
        )
        .get() as any;

      checks.push({
        category: "Data Quality",
        name: "Government name present",
        description: "All government memberships must have a government name",
        passed: empty.c === 0,
        details: empty.c === 0 ? "All government names present" : `${empty.c} missing government names`,
      });
    } catch (error) {
      checks.push({
        category: "Data Quality",
        name: "Government name present",
        description: "All government memberships must have a government name",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkDistrictIntegrity(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const { c } = this.db
        .query("SELECT COUNT(*) as c FROM District")
        .get() as any;

      checks.push({
        category: "Business Logic",
        name: "District count plausible",
        description: "Finland has 13 current + historical electoral districts (expect 10-50)",
        passed: c >= 10 && c <= 50,
        details: `${c} districts found`,
      });
    } catch (error) {
      checks.push({
        category: "Business Logic",
        name: "District count plausible",
        description: "Finland has 13 current + historical electoral districts (expect 10-50)",
        passed: false,
        errorMessage: String(error),
      });
    }

    try {
      const overlaps = this.db
        .query(
          `SELECT COUNT(*) as c FROM RepresentativeDistrict rd1
           JOIN RepresentativeDistrict rd2
             ON rd1.person_id = rd2.person_id AND rd1.id < rd2.id
           WHERE rd1.district_code != rd2.district_code
             AND rd1.start_date <= COALESCE(rd2.end_date, '9999-12-31')
             AND rd2.start_date <= COALESCE(rd1.end_date, '9999-12-31')`,
        )
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "No overlapping district assignments",
        description: "Same representative should not have overlapping district assignments",
        passed: overlaps.c === 0,
        details: overlaps.c === 0 ? "No overlapping districts" : `${overlaps.c} overlapping district assignments`,
      });
    } catch (error) {
      checks.push({
        category: "Data Integrity",
        name: "No overlapping district assignments",
        description: "Same representative should not have overlapping district assignments",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkAuxiliaryTableRefs(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    const tables = [
      { table: "Education", label: "Education" },
      { table: "WorkHistory", label: "WorkHistory" },
      { table: "TrustPosition", label: "TrustPosition" },
    ];

    for (const { table, label } of tables) {
      try {
        const orphans = this.db
          .query(
            `SELECT COUNT(*) as c FROM ${table} t
             WHERE NOT EXISTS (SELECT 1 FROM Representative r WHERE r.person_id = t.person_id)`,
          )
          .get() as any;

        checks.push({
          category: "Referential Integrity",
          name: `${label} → Representative links`,
          description: `All ${label.toLowerCase()} records must reference existing representatives`,
          passed: orphans.c === 0,
          details: orphans.c === 0 ? `All ${label.toLowerCase()} records properly linked` : `${orphans.c} orphaned ${label.toLowerCase()} records`,
        });
      } catch (error) {
        checks.push({
          category: "Referential Integrity",
          name: `${label} → Representative links`,
          description: `All ${label.toLowerCase()} records must reference existing representatives`,
          passed: false,
          errorMessage: String(error),
        });
      }
    }

    return checks;
  }

  private checkSessionDatePlausibility(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const tooOld = this.db
        .query(
          `SELECT COUNT(*) as c FROM Session
           WHERE date IS NOT NULL AND date < '1907-01-01'`,
        )
        .get() as any;

      checks.push({
        category: "Business Logic",
        name: "Session dates after 1907",
        description: "Finnish parliament founded in 1907, no earlier sessions",
        passed: tooOld.c === 0,
        details: tooOld.c === 0 ? "All session dates after 1907" : `${tooOld.c} sessions before 1907`,
      });
    } catch (error) {
      checks.push({
        category: "Business Logic",
        name: "Session dates after 1907",
        description: "Finnish parliament founded in 1907, no earlier sessions",
        passed: false,
        errorMessage: String(error),
      });
    }

    try {
      const future = this.db
        .query(
          `SELECT COUNT(*) as c FROM Session
           WHERE date IS NOT NULL AND date > DATE('now')`,
        )
        .get() as any;

      checks.push({
        category: "Business Logic",
        name: "No future session dates",
        description: "Session dates should not be in the future",
        passed: future.c === 0,
        details: future.c === 0 ? "No future session dates" : `${future.c} future session dates`,
      });
    } catch (error) {
      checks.push({
        category: "Business Logic",
        name: "No future session dates",
        description: "Session dates should not be in the future",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkMPGroupMembership(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const mpsWithoutGroup = this.db
        .query(
          `SELECT COUNT(*) as c FROM (
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
        )
        .get() as any;

      checks.push({
        category: "Business Logic",
        name: "Active MPs have group membership",
        description: "Every active MP should belong to a parliamentary group",
        passed: mpsWithoutGroup.c === 0,
        details: mpsWithoutGroup.c === 0 ? "All active MPs have group memberships" : `${mpsWithoutGroup.c} active MP-date combinations without a group`,
      });
    } catch (error) {
      checks.push({
        category: "Business Logic",
        name: "Active MPs have group membership",
        description: "Every active MP should belong to a parliamentary group",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkActiveGroupMembersCount(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const mismatches = this.db
        .query(
          `SELECT COUNT(*) as c FROM (
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
        )
        .get() as any;

      checks.push({
        category: "Business Logic",
        name: "Group member count matches active MPs",
        description: "Active group members count should equal active parliament members count per date",
        passed: mismatches.c === 0,
        details: mismatches.c === 0 ? "Counts match on all dates" : `${mismatches.c} dates with mismatched counts`,
      });
    } catch (error) {
      checks.push({
        category: "Business Logic",
        name: "Group member count matches active MPs",
        description: "Active group members count should equal active parliament members count per date",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }
}
