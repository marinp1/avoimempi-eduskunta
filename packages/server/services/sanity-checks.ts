import type { Database } from "bun:sqlite";

export interface SanityCheck {
  category: string;
  name: string;
  description: string;
  passed: boolean;
  details?: string;
  errorMessage?: string;
}

export interface SanityCheckResult {
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  checks: SanityCheck[];
  lastRun: string;
}

export class SanityCheckService {
  constructor(private db: Database) {}

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

    const passedChecks = checks.filter((c) => c.passed).length;
    const failedChecks = checks.filter((c) => !c.passed).length;

    return {
      totalChecks: checks.length,
      passedChecks,
      failedChecks,
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
      const countMismatch = this.db
        .query(
          `SELECT COUNT(*) as c FROM (
             SELECT v.id, v.n_total, COUNT(vo.id) as actual_votes
             FROM Voting v
             JOIN Vote vo ON v.id = vo.voting_id
             GROUP BY v.id
             HAVING actual_votes != v.n_total
           )`,
        )
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Individual vote count matches",
        description: "Individual vote records must match n_total",
        passed: countMismatch.c === 0,
        details: countMismatch.c === 0 ? "All vote counts match" : `${countMismatch.c} count mismatches`,
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
}
