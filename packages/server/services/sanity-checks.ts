import type { Database } from "bun:sqlite";
import {
  EXPECTED_SANITY_INDEXES,
  getAuxiliaryRepresentativeOrphanQuery,
  getParliamentOversizedDatesQuery,
  SALIDB_LINKAGE_CHECKS,
  sanityQueries,
} from "../database/sanity-queries";
import {
  buildKnownDataExceptions,
  getExceptionIdSetForCheck,
  getExceptionsForCheck,
  type KnownDataException,
} from "./known-data-exceptions";
import {
  getSanityConstraintDefinitionsByName,
  getSanityConstraintDefinitionSourcePath,
} from "./sanity-constraint-definitions";

export interface SanityCheck {
  category: string;
  name: string;
  description: string;
  passed: boolean;
  details?: string;
  errorMessage?: string;
  knownExceptions?: KnownDataException[];
  constraintId?: string;
  queryKeys?: string[];
  queryReferences?: string[];
  definitionSourcePath?: string;
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
  private constraintDefinitionsByName = getSanityConstraintDefinitionsByName();

  constructor(private db: Database) {
    this.knownExceptions = buildKnownDataExceptions(db);
  }

  async runAllChecks(): Promise<SanityCheckResult> {
    const checks: SanityCheck[] = [];

    // Run all check categories
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
    checks.push(...this.checkSaliDbLinkage());

    const checksWithDefinitions = checks.map((check) =>
      this.withConstraintDefinition(check),
    );

    const passedChecks = checksWithDefinitions.filter((c) => c.passed).length;
    const failedChecks = checksWithDefinitions.filter((c) => !c.passed).length;
    const knownExceptionCount = checksWithDefinitions.filter(
      (c) => c.knownExceptions && c.knownExceptions.length > 0,
    ).length;

    return {
      totalChecks: checks.length,
      passedChecks,
      failedChecks,
      knownExceptionCount,
      checks: checksWithDefinitions,
      lastRun: new Date().toISOString(),
    };
  }

  private withConstraintDefinition(check: SanityCheck): SanityCheck {
    const definition = this.constraintDefinitionsByName.get(check.name);
    if (!definition) return check;

    return {
      ...check,
      category: definition.category,
      description: definition.description,
      constraintId: definition.id,
      queryKeys: definition.queryKeys.length
        ? [...definition.queryKeys]
        : undefined,
      queryReferences: definition.queryRefs.length
        ? [...definition.queryRefs]
        : undefined,
      definitionSourcePath: getSanityConstraintDefinitionSourcePath(),
    };
  }

  private getConstraintNumberParam(
    checkName: string,
    paramName: string,
    fallback: number,
  ): number {
    const definition = this.constraintDefinitionsByName.get(checkName);
    const value = definition?.params?.[paramName];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    return fallback;
  }

  private checkPersonUniqueness(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    try {
      const dupes = this.db
        .query(sanityQueries.personIdDuplicates)
        .get() as any;

      checks.push({
        category: "Data Quality",
        name: "Unique person IDs",
        description: "Each person should have a unique person_id",
        passed: dupes.dupes === 0,
        details:
          dupes.dupes === 0
            ? "All person IDs are unique"
            : `${dupes.dupes} duplicate person IDs found`,
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
        .query(sanityQueries.representativeNullPersonId)
        .get() as any;

      checks.push({
        category: "Data Quality",
        name: "No NULL person IDs",
        description: "All representatives must have a person_id",
        passed: nullIds.c === 0,
        details:
          nullIds.c === 0
            ? "All person IDs are present"
            : `${nullIds.c} NULL person IDs found`,
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
        .query(sanityQueries.representativeMissingNames)
        .get() as any;

      checks.push({
        category: "Data Quality",
        name: "Complete names",
        description: "All representatives must have first and last names",
        passed: missingNames.c === 0,
        details:
          missingNames.c === 0
            ? "All names are present"
            : `${missingNames.c} missing names`,
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
        .query(sanityQueries.sessionEmptyKeys)
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Session keys present",
        description: "All sessions must have a non-empty key",
        passed: emptyKeys.c === 0,
        details:
          emptyKeys.c === 0
            ? "All session keys present"
            : `${emptyKeys.c} empty session keys`,
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
        .query(sanityQueries.sessionEmptyDates)
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Session dates present",
        description: "All sessions must have a date",
        passed: emptyDates.c === 0,
        details:
          emptyDates.c === 0
            ? "All session dates present"
            : `${emptyDates.c} missing session dates`,
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
      const total = (
        this.db.query(sanityQueries.sessionTotalCount).get() as any
      ).total;
      const unique = (
        this.db.query(sanityQueries.sessionUniqueKeyCount).get() as any
      ).unique_count;

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
        .query(sanityQueries.sectionSessionOrphans)
        .get() as any;

      checks.push({
        category: "Referential Integrity",
        name: "Section → Session links",
        description: "All sections must reference existing sessions",
        passed: orphans.orphans === 0,
        details:
          orphans.orphans === 0
            ? "All sections properly linked"
            : `${orphans.orphans} orphaned sections`,
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
      const maxMembers = this.getConstraintNumberParam(
        "Parliament size limit",
        "max_members",
        200,
      );
      const checkExceptions = getExceptionsForCheck(
        this.knownExceptions,
        "Parliament size limit",
      );
      const oversized = this.db
        .query(getParliamentOversizedDatesQuery(maxMembers))
        .all() as any[];

      checks.push({
        category: "Business Logic",
        name: "Parliament size limit",
        description: "Active MPs should never exceed 200 on any date",
        passed: oversized.length === 0,
        details:
          oversized.length === 0
            ? `Parliament size always ≤${maxMembers}`
            : `${oversized.length} dates with >${maxMembers} MPs`,
        knownExceptions:
          checkExceptions.length > 0 ? checkExceptions : undefined,
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
      const maxTotal = this.getConstraintNumberParam(
        "Voting total ≤200",
        "max_total",
        200,
      );
      const oversized = this.db
        .query(`SELECT COUNT(*) as c FROM Voting WHERE n_total > ${maxTotal}`)
        .get() as any;

      checks.push({
        category: "Business Logic",
        name: "Voting total ≤200",
        description: "Vote totals should never exceed 200",
        passed: oversized.c === 0,
        details:
          oversized.c === 0
            ? `All vote totals ≤${maxTotal}`
            : `${oversized.c} votings with >${maxTotal} votes`,
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
        .query(sanityQueries.votingSumMismatch)
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Voting count sums",
        description: "Vote counts must sum to n_total",
        passed: sumMismatch.c === 0,
        details:
          sumMismatch.c === 0
            ? "All vote counts sum correctly"
            : `${sumMismatch.c} mismatched vote sums`,
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
        .query(sanityQueries.votingIndividualCountMismatch)
        .all() as { id: number; n_total: number; actual_votes: number }[];

      const checkExceptions = getExceptionsForCheck(
        this.knownExceptions,
        "Individual vote count matches",
      );
      const knownIds = getExceptionIdSetForCheck(
        this.knownExceptions,
        "Individual vote count matches",
      );
      const unexplained = mismatchedVotings.filter(
        (v) => !knownIds.has(String(v.id)),
      );
      const explained = mismatchedVotings.filter((v) =>
        knownIds.has(String(v.id)),
      );

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
        knownExceptions:
          checkExceptions.length > 0 ? checkExceptions : undefined,
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
        .query(sanityQueries.votingDuplicateNumbers)
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Unique voting numbers",
        description: "Voting numbers must be unique within sessions",
        passed: duplicateNumbers.dupes === 0,
        details:
          duplicateNumbers.dupes === 0
            ? "All voting numbers unique"
            : `${duplicateNumbers.dupes} duplicate voting numbers`,
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
        .query(sanityQueries.votingSessionOrphans)
        .get() as any;

      checks.push({
        category: "Referential Integrity",
        name: "Voting → Session links",
        description: "All votings must reference existing sessions",
        passed: orphans.orphans === 0,
        details:
          orphans.orphans === 0
            ? "All votings properly linked"
            : `${orphans.orphans} orphaned votings`,
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
        .query(sanityQueries.voteInvalidValues)
        .get() as any;

      checks.push({
        category: "Data Quality",
        name: "Valid vote values",
        description: "Vote values must be Jaa, Ei, Tyhjää, or Poissa",
        passed: invalidVotes.c === 0,
        details:
          invalidVotes.c === 0
            ? "All vote values valid"
            : `${invalidVotes.c} invalid vote values`,
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
        .query(sanityQueries.voteDuplicateByPerson)
        .get() as any;

      checks.push({
        category: "Data Quality",
        name: "No duplicate votes",
        description: "Each person can only vote once per voting",
        passed: duplicateVotes.dupes === 0,
        details:
          duplicateVotes.dupes === 0
            ? "No duplicate votes"
            : `${duplicateVotes.dupes} duplicate votes found`,
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
        .query(sanityQueries.representativeInvalidGender)
        .get() as any;

      checks.push({
        category: "Data Quality",
        name: "Valid gender values",
        description: "Gender must be 'Mies' or 'Nainen'",
        passed: invalidGender.c === 0,
        details:
          invalidGender.c === 0
            ? "All gender values valid"
            : `${invalidGender.c} invalid gender values`,
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
        .query(sanityQueries.representativeWithoutTerms)
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Representatives have terms",
        description: "All representatives must have at least one term",
        passed: noTerms.c === 0,
        details:
          noTerms.c === 0
            ? "All representatives have terms"
            : `${noTerms.c} representatives without terms`,
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
        .query(sanityQueries.termInvalidDates)
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Term dates valid",
        description: "Term start_date must be ≤ end_date",
        passed: invalidDates.c === 0,
        details:
          invalidDates.c === 0
            ? "All term dates valid"
            : `${invalidDates.c} invalid term dates`,
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
        .query(sanityQueries.groupMembershipInvalidDates)
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Group membership dates valid",
        description: "Membership start_date must be ≤ end_date",
        passed: invalidDates.c === 0,
        details:
          invalidDates.c === 0
            ? "All membership dates valid"
            : `${invalidDates.c} invalid dates`,
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
        .query(sanityQueries.speechSessionOrphans)
        .get() as any;

      checks.push({
        category: "Referential Integrity",
        name: "Speech → Session links",
        description: "All speeches must reference existing sessions",
        passed: orphans.orphans === 0,
        details:
          orphans.orphans === 0
            ? "All speeches properly linked"
            : `${orphans.orphans} orphaned speeches`,
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

    try {
      const orphanedContent = this.db
        .query(sanityQueries.speechContentSpeechOrphans)
        .get() as any;
      const metadataWithoutContent = this.db
        .query(sanityQueries.speechMetadataWithoutContent)
        .get() as any;
      const contentCount = this.db
        .query(sanityQueries.speechContentCount)
        .get() as any;
      const comparedNameRows = this.db
        .query(sanityQueries.speechContentNameComparedCount)
        .get() as any;

      checks.push({
        category: "Speech Content Mapping",
        name: "SpeechContent → Speech links",
        description:
          "All speech content rows must map to existing Speech metadata rows",
        passed: orphanedContent.orphans === 0,
        details:
          `Orphaned content rows: ${orphanedContent.orphans}. ` +
          `Mapped content rows: ${contentCount.c}. ` +
          `Metadata rows without content: ${metadataWithoutContent.c}. ` +
          `Name-validated rows: ${comparedNameRows.c}.`,
      });
    } catch (error) {
      checks.push({
        category: "Speech Content Mapping",
        name: "SpeechContent → Speech links",
        description:
          "All speech content rows must map to existing Speech metadata rows",
        passed: false,
        errorMessage: String(error),
      });
    }

    try {
      const metadataWithoutContent = this.db
        .query(sanityQueries.speechMetadataWithoutContent)
        .get() as any;
      const metadataWithoutContentUnexpected = this.db
        .query(sanityQueries.speechMetadataWithoutContentUnexpected)
        .get() as any;
      const hasSpokenZeroWithContent = this.db
        .query(sanityQueries.speechHasSpokenZeroWithContent)
        .get() as any;
      const explainedByHasSpokenZero =
        metadataWithoutContent.c - metadataWithoutContentUnexpected.c;

      checks.push({
        category: "Speech Content Mapping",
        name: "Speech metadata/content mismatches are exactly has_spoken=0",
        description:
          "Rows without linked SpeechContent are allowed only when Speech.has_spoken = 0, and has_spoken = 0 rows should not have SpeechContent",
        passed:
          metadataWithoutContentUnexpected.c === 0 &&
          hasSpokenZeroWithContent.c === 0,
        details:
          `Metadata rows without content: ${metadataWithoutContent.c}. ` +
          `Explained by has_spoken=0: ${explainedByHasSpokenZero}. ` +
          `Unexpected missing-content rows: ${metadataWithoutContentUnexpected.c}. ` +
          `has_spoken=0 rows with content: ${hasSpokenZeroWithContent.c}.`,
      });
    } catch (error) {
      checks.push({
        category: "Speech Content Mapping",
        name: "Speech metadata/content mismatches are exactly has_spoken=0",
        description:
          "Rows without linked SpeechContent are allowed only when Speech.has_spoken = 0, and has_spoken = 0 rows should not have SpeechContent",
        passed: false,
        errorMessage: String(error),
      });
    }

    try {
      const comparedNameRows = this.db
        .query(sanityQueries.speechContentNameComparedCount)
        .get() as any;
      const nameMismatches = this.db
        .query(sanityQueries.speechContentNameMismatches)
        .get() as any;

      checks.push({
        category: "Speech Content Mapping",
        name: "SpeechContent speaker names match Speech metadata",
        description:
          "Linked SpeechContent rows should have matching first_name and last_name with Speech",
        passed: nameMismatches.c === 0,
        details:
          `Compared rows: ${comparedNameRows.c}. ` +
          `Name mismatches: ${nameMismatches.c}.`,
      });
    } catch (error) {
      checks.push({
        category: "Speech Content Mapping",
        name: "SpeechContent speaker names match Speech metadata",
        description:
          "Linked SpeechContent rows should have matching first_name and last_name with Speech",
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
        .query(sanityQueries.voteRepresentativeOrphans)
        .get() as any;

      checks.push({
        category: "Referential Integrity",
        name: "Vote → Representative links",
        description: "All votes must reference existing representatives",
        passed: orphans.c === 0,
        details:
          orphans.c === 0
            ? "All votes properly linked"
            : `${orphans.c} orphaned votes`,
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
      const indexes = this.db.query(sanityQueries.schemaIndexes).all() as {
        name: string;
      }[];
      const indexNames = indexes.map((i) => i.name);

      const missingIndexes = EXPECTED_SANITY_INDEXES.filter(
        (idx) => !indexNames.includes(idx),
      );

      checks.push({
        category: "Schema",
        name: "Performance indexes present",
        description: "Critical performance indexes must exist",
        passed: missingIndexes.length === 0,
        details:
          missingIndexes.length === 0
            ? `All ${EXPECTED_SANITY_INDEXES.length} indexes present`
            : `Missing: ${missingIndexes.join(", ")}`,
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
        .query(sanityQueries.voteAggregationMismatch)
        .all() as { id: number }[];

      const checkExceptions = getExceptionsForCheck(
        this.knownExceptions,
        "Vote aggregation per type",
      );
      const knownIds = getExceptionIdSetForCheck(
        this.knownExceptions,
        "Vote aggregation per type",
      );
      const unexplained = mismatchedVotings.filter(
        (v) => !knownIds.has(String(v.id)),
      );
      const explained = mismatchedVotings.filter((v) =>
        knownIds.has(String(v.id)),
      );

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
        knownExceptions:
          checkExceptions.length > 0 ? checkExceptions : undefined,
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
        .query(sanityQueries.votingSessionDateMismatch)
        .get() as any;

      checks.push({
        category: "Business Logic",
        name: "Voting date within 1 day of session date",
        description:
          "Voting start_time should be within 1 day of session date (sessions can span overnight)",
        passed: mismatches.c === 0,
        details:
          mismatches.c === 0
            ? "All voting dates within range"
            : `${mismatches.c} votings with >1 day offset from session`,
      });
    } catch (error) {
      checks.push({
        category: "Business Logic",
        name: "Voting date within 1 day of session date",
        description:
          "Voting start_time should be within 1 day of session date (sessions can span overnight)",
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
        .query(sanityQueries.votingSectionOrphans)
        .get() as any;

      checks.push({
        category: "Referential Integrity",
        name: "Voting → Section links",
        description:
          "Votings with section_key must reference existing sections",
        passed: orphans.c === 0,
        details:
          orphans.c === 0
            ? "All voting-section links valid"
            : `${orphans.c} orphaned voting-section links`,
      });
    } catch (error) {
      checks.push({
        category: "Referential Integrity",
        name: "Voting → Section links",
        description:
          "Votings with section_key must reference existing sections",
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
        .query(sanityQueries.committeeMembershipInvalidDates)
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Committee membership dates valid",
        description: "Committee membership start_date must be ≤ end_date",
        passed: invalid.c === 0,
        details:
          invalid.c === 0
            ? "All committee membership dates valid"
            : `${invalid.c} invalid committee membership dates`,
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
        .query(sanityQueries.governmentMembershipInvalidDates)
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "Government membership dates valid",
        description: "Government membership start_date must be ≤ end_date",
        passed: invalid.c === 0,
        details:
          invalid.c === 0
            ? "All government membership dates valid"
            : `${invalid.c} invalid government membership dates`,
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
        .query(sanityQueries.governmentMembershipEmptyGovernment)
        .get() as any;

      checks.push({
        category: "Data Quality",
        name: "Government name present",
        description: "All government memberships must have a government name",
        passed: empty.c === 0,
        details:
          empty.c === 0
            ? "All government names present"
            : `${empty.c} missing government names`,
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
      const { c } = this.db.query(sanityQueries.districtCount).get() as any;

      checks.push({
        category: "Business Logic",
        name: "District count plausible",
        description:
          "Finland has 13 current + historical electoral districts (expect 10-50)",
        passed: c >= 10 && c <= 50,
        details: `${c} districts found`,
      });
    } catch (error) {
      checks.push({
        category: "Business Logic",
        name: "District count plausible",
        description:
          "Finland has 13 current + historical electoral districts (expect 10-50)",
        passed: false,
        errorMessage: String(error),
      });
    }

    try {
      const overlaps = this.db
        .query(sanityQueries.representativeDistrictOverlaps)
        .get() as any;

      checks.push({
        category: "Data Integrity",
        name: "No overlapping district assignments",
        description:
          "Same representative should not have overlapping district assignments",
        passed: overlaps.c === 0,
        details:
          overlaps.c === 0
            ? "No overlapping districts"
            : `${overlaps.c} overlapping district assignments`,
      });
    } catch (error) {
      checks.push({
        category: "Data Integrity",
        name: "No overlapping district assignments",
        description:
          "Same representative should not have overlapping district assignments",
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
    ] as const;

    for (const { table, label } of tables) {
      try {
        const orphans = this.db
          .query(getAuxiliaryRepresentativeOrphanQuery(table))
          .get() as any;

        checks.push({
          category: "Referential Integrity",
          name: `${label} → Representative links`,
          description: `All ${label.toLowerCase()} records must reference existing representatives`,
          passed: orphans.c === 0,
          details:
            orphans.c === 0
              ? `All ${label.toLowerCase()} records properly linked`
              : `${orphans.c} orphaned ${label.toLowerCase()} records`,
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
      const minYear = this.getConstraintNumberParam(
        "Session dates after 1907",
        "min_year",
        1907,
      );
      const tooOld = this.db
        .query(
          `SELECT COUNT(*) as c FROM Session
           WHERE date IS NOT NULL AND date < '${Math.trunc(minYear)}-01-01'`,
        )
        .get() as any;

      checks.push({
        category: "Business Logic",
        name: "Session dates after 1907",
        description: "Finnish parliament founded in 1907, no earlier sessions",
        passed: tooOld.c === 0,
        details:
          tooOld.c === 0
            ? `All session dates after ${Math.trunc(minYear)}`
            : `${tooOld.c} sessions before ${Math.trunc(minYear)}`,
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
      const future = this.db.query(sanityQueries.sessionInFuture).get() as any;

      checks.push({
        category: "Business Logic",
        name: "No future session dates",
        description: "Session dates should not be in the future",
        passed: future.c === 0,
        details:
          future.c === 0
            ? "No future session dates"
            : `${future.c} future session dates`,
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
        .query(sanityQueries.activeMpWithoutGroup)
        .get() as any;
      const checkExceptions = getExceptionsForCheck(
        this.knownExceptions,
        "Active MPs have group membership",
      );

      checks.push({
        category: "Business Logic",
        name: "Active MPs have group membership",
        description: "Every active MP should belong to a parliamentary group",
        passed: mpsWithoutGroup.c === 0,
        details:
          mpsWithoutGroup.c === 0
            ? "All active MPs have group memberships"
            : `${mpsWithoutGroup.c} active MP-date combinations without a group`,
        knownExceptions:
          checkExceptions.length > 0 ? checkExceptions : undefined,
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
        .query(sanityQueries.activeGroupMemberMismatch)
        .get() as any;
      const checkExceptions = getExceptionsForCheck(
        this.knownExceptions,
        "Group member count matches active MPs",
      );

      checks.push({
        category: "Business Logic",
        name: "Group member count matches active MPs",
        description:
          "Active group members count should equal active parliament members count per date",
        passed: mismatches.c === 0,
        details:
          mismatches.c === 0
            ? "Counts match on all dates"
            : `${mismatches.c} dates with mismatched counts`,
        knownExceptions:
          checkExceptions.length > 0 ? checkExceptions : undefined,
      });
    } catch (error) {
      checks.push({
        category: "Business Logic",
        name: "Group member count matches active MPs",
        description:
          "Active group members count should equal active parliament members count per date",
        passed: false,
        errorMessage: String(error),
      });
    }

    return checks;
  }

  private checkSaliDbLinkage(): SanityCheck[] {
    const checks: SanityCheck[] = [];

    for (const check of SALIDB_LINKAGE_CHECKS) {
      try {
        const result = this.db.query(check.sql).get() as any;
        const count = result?.c ?? 0;
        checks.push({
          category: "SaliDB Linkage",
          name: check.name,
          description: check.description,
          passed: count === 0,
          details: `Orphans: ${count}`,
        });
      } catch (error) {
        checks.push({
          category: "SaliDB Linkage",
          name: check.name,
          description: check.description,
          passed: false,
          errorMessage: String(error),
        });
      }
    }

    return checks;
  }
}
