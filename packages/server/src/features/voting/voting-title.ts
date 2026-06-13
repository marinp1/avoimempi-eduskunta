/**
 * Parsing and resolution of statement proposal ("lausumaehdotus") references
 * embedded in voting titles, e.g.
 * "Mietintö JAA / Johannes Yrttiahon lausumaehdotus 4 (vl 4) EI".
 *
 * Only the modern title grammar is supported:
 *   - "{proposer} lausumaehdotus N (vl M)"   → vastalause, by dissent number
 *   - "{proposer} lausumaehdotus (vl M)"
 *   - "{proposer} lausumaehdotus N (vl)"
 *   - "{proposer} lausumaehdotus (vl)"
 *   - "{proposer} monistelausumaehdotus N"   → moniste annex
 *   - "{proposer} lausumaehdotus N (moniste)" → moniste annex
 *   - "{proposer} lausumaehdotus N"          → plain: vastalause located by
 *     proposer signer match, falling back to the moniste annex
 * Older formats (e.g. "Kannanotto, mietintö / Pia Viitanen (VL 1)") can be
 * added here later without touching the pipeline.
 */

export type StatementProposalRef =
  | {
      kind: "vastalause";
      proposer: string;
      statementNumber: number | null;
      dissentNumber: number | null;
    }
  | { kind: "moniste"; proposer: string; statementNumber: number | null }
  | { kind: "plain"; proposer: string; statementNumber: number | null };

// "monistelausumaehdotus" contains the word "lausumaehdotus"; the other
// patterns require whitespace before the word so they can never match inside
// the compound.
const MONISTE_PATTERN =
  /(?:^|\/)\s*([^/()]*?)\s*\bmonistelausumaehdotus(?:\s+(\d+))?\b/iu;

const VASTALAUSE_PATTERN =
  /(?:^|\/)\s*([^/()]*?)\s+lausumaehdotus(?:\s+(\d+))?\s*\(\s*vl(?:\s+(\d+))?\s*\)/iu;

const MONISTE_SUFFIX_PATTERN =
  /(?:^|\/)\s*([^/()]*?)\s+lausumaehdotus(?:\s+(\d+))?\s*\(\s*moniste\s*\)/iu;

const PLAIN_PATTERN =
  /(?:^|\/)\s*([^/()]*?)\s+lausumaehdotus(?:\s+(\d+))?\s*(?:EI\b|JAA\b|$)/iu;

function parsePositiveInt(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseStatementProposalRef(
  title: string | null,
): StatementProposalRef | null {
  if (!title) return null;

  const vastalause = title.match(VASTALAUSE_PATTERN);
  if (vastalause) {
    const proposer = vastalause[1]?.trim() ?? "";
    if (!proposer) return null;
    return {
      kind: "vastalause",
      proposer,
      statementNumber: parsePositiveInt(vastalause[2]),
      dissentNumber: parsePositiveInt(vastalause[3]),
    };
  }

  const monisteSuffix = title.match(MONISTE_SUFFIX_PATTERN);
  if (monisteSuffix) {
    const proposer = monisteSuffix[1]?.trim() ?? "";
    if (!proposer) return null;
    return {
      kind: "moniste",
      proposer,
      statementNumber: parsePositiveInt(monisteSuffix[2]),
    };
  }

  const moniste = title.match(MONISTE_PATTERN);
  if (moniste) {
    const proposer = moniste[1]?.trim() ?? "";
    if (!proposer) return null;
    return {
      kind: "moniste",
      proposer,
      statementNumber: parsePositiveInt(moniste[2]),
    };
  }

  const plain = title.match(PLAIN_PATTERN);
  if (plain) {
    const proposer = plain[1]?.trim() ?? "";
    if (!proposer) return null;
    return {
      kind: "plain",
      proposer,
      statementNumber: parsePositiveInt(plain[2]),
    };
  }

  return null;
}

/** Splits a "X JAA / Y EI" voting title into its two propositions. */
export function parseVotePropositions(
  title: string | null,
): { yes: string; no: string } | null {
  if (!title) return null;
  const match = title.match(/^(.*\S)\s+JAA\s*\/\s*(.*\S)\s+EI\s*$/u);
  if (!match) return null;
  return { yes: match[1]!.trim(), no: match[2]!.trim() };
}

export interface StatementProposalRow {
  report_id: number;
  parliament_identifier: string;
  dissent_order: number;
  dissent_number: number | null;
  heading: string | null;
  statement_order: number | null;
  statement_number: number | null;
  statement_text: string | null;
}

export interface StatementSignerRow {
  report_id: number;
  dissent_order: number;
  signer_order: number;
  first_name: string | null;
  last_name: string | null;
}

export interface DissentForResolution {
  dissentOrder: number;
  dissentNumber: number | null;
  heading: string | null;
  statements: Array<{
    statementOrder: number;
    statementNumber: number | null;
    statementText: string;
  }>;
  signers?: Array<{ firstName: string | null; lastName: string | null }>;
}

export interface GroupedDissents {
  reportId: number;
  reportIdentifier: string;
  dissents: DissentForResolution[];
}

/**
 * Groups flat dissent/statement join rows into per-dissent structures.
 * Returns null when the rows are empty or span multiple reports (a source
 * reference should map to exactly one mietintö — anything else is ambiguous).
 */
export function groupDissentRows(
  rows: StatementProposalRow[],
  signerRows: StatementSignerRow[] = [],
): GroupedDissents | null {
  if (rows.length === 0) return null;
  const reportId = rows[0]!.report_id;
  if (rows.some((row) => row.report_id !== reportId)) return null;

  const byOrder = new Map<number, DissentForResolution>();
  for (const row of rows) {
    let dissent = byOrder.get(row.dissent_order);
    if (!dissent) {
      dissent = {
        dissentOrder: row.dissent_order,
        dissentNumber: row.dissent_number,
        heading: row.heading,
        statements: [],
        signers: [],
      };
      byOrder.set(row.dissent_order, dissent);
    }
    if (row.statement_order !== null && row.statement_text !== null) {
      dissent.statements.push({
        statementOrder: row.statement_order,
        statementNumber: row.statement_number,
        statementText: row.statement_text,
      });
    }
  }

  for (const signer of signerRows) {
    if (signer.report_id !== reportId) continue;
    byOrder.get(signer.dissent_order)?.signers?.push({
      firstName: signer.first_name,
      lastName: signer.last_name,
    });
  }

  return {
    reportId,
    reportIdentifier: rows[0]!.parliament_identifier,
    dissents: [...byOrder.values()],
  };
}

export interface ResolvedStatement {
  statementText: string;
  statementNumber: number | null;
  dissentNumber: number | null;
  dissentHeading: string | null;
}

function findUnique<T>(items: T[], predicate: (item: T) => boolean): T | null {
  const matches = items.filter(predicate);
  return matches.length === 1 ? matches[0]! : null;
}

/**
 * Resolves the concrete lausumaehdotus a voting title points at. Returns null
 * on any ambiguity — the UI omits the section rather than risk showing the
 * wrong statement.
 */
export function resolveDissentStatement(
  ref: Extract<StatementProposalRef, { kind: "vastalause" }>,
  dissents: DissentForResolution[],
): ResolvedStatement | null {
  let dissent: DissentForResolution | null = null;
  if (ref.dissentNumber !== null) {
    dissent =
      findUnique(dissents, (d) => d.dissentNumber === ref.dissentNumber) ??
      findUnique(dissents, (d) => d.dissentOrder === ref.dissentNumber);
  } else if (dissents.length === 1) {
    dissent = dissents[0]!;
  } else {
    // "(vl)" without a number: only dissents that actually propose statements
    // are candidates — unambiguous when exactly one of them does.
    dissent = findUnique(dissents, (d) => d.statements.length > 0);
  }
  if (!dissent) return null;

  const statements = dissent.statements;
  let statement: DissentForResolution["statements"][number] | null = null;
  if (ref.statementNumber !== null) {
    statement =
      findUnique(
        statements,
        (s) => s.statementNumber === ref.statementNumber,
      ) ??
      findUnique(statements, (s) => s.statementOrder === ref.statementNumber);
  } else if (statements.length === 1) {
    statement = statements[0]!;
  }
  if (!statement) return null;

  return {
    statementText: statement.statementText,
    statementNumber: statement.statementNumber,
    dissentNumber: dissent.dissentNumber,
    dissentHeading: dissent.heading,
  };
}

/**
 * Checks whether a genitive surname from a voting title ("Mäkysen",
 * "Harjanteen") can refer to a nominative surname ("Mäkynen", "Harjanne").
 * Covers the regular -n genitive, -in for consonant-final names, the
 * nen→sen declension, and a conservative stem-prefix rule for the rest
 * (consonant gradation like Harjanne→Harjanteen).
 */
export function surnameMatchesGenitive(
  nominative: string,
  genitive: string,
): boolean {
  const nom = nominative.toLowerCase();
  const gen = genitive.toLowerCase();
  if (gen === `${nom}n` || gen === `${nom}in`) return true;
  if (nom.endsWith("nen") && gen === `${nom.slice(0, -3)}sen`) return true;
  const stemLength = nom.length - 2;
  return (
    stemLength >= 3 &&
    gen.length > stemLength &&
    gen.startsWith(nom.slice(0, stemLength))
  );
}

function signerMatchesProposer(
  signer: { firstName: string | null; lastName: string | null },
  proposer: string,
): boolean {
  const tokens = proposer.trim().split(/\s+/);
  if (tokens.length < 2) return false;
  const genitiveSurname = tokens[tokens.length - 1]!;
  const firstNames = tokens.slice(0, -1).join(" ");
  return (
    signer.firstName?.toLowerCase() === firstNames.toLowerCase() &&
    signer.lastName !== null &&
    surnameMatchesGenitive(signer.lastName, genitiveSurname)
  );
}

/**
 * Resolves a plain "{proposer} lausumaehdotus N" reference (no "(vl)" marker)
 * by locating the dissent the proposer signed. Returns null unless exactly
 * one dissent matches the proposer and the statement resolves within it.
 */
export function resolveDissentStatementByProposer(
  ref: Extract<StatementProposalRef, { kind: "plain" }>,
  dissents: DissentForResolution[],
): ResolvedStatement | null {
  const dissent = findUnique(dissents, (d) =>
    (d.signers ?? []).some((signer) => signerMatchesProposer(signer, ref.proposer)),
  );
  if (!dissent) return null;

  const statements = dissent.statements;
  let statement: DissentForResolution["statements"][number] | null = null;
  if (ref.statementNumber !== null) {
    statement =
      findUnique(
        statements,
        (s) => s.statementNumber === ref.statementNumber,
      ) ??
      findUnique(statements, (s) => s.statementOrder === ref.statementNumber);
  } else if (statements.length === 1) {
    statement = statements[0]!;
  }
  if (!statement) return null;

  return {
    statementText: statement.statementText,
    statementNumber: statement.statementNumber,
    dissentNumber: dissent.dissentNumber,
    dissentHeading: dissent.heading,
  };
}
