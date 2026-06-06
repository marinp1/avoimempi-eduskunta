/**
 * Compile-time half of the SQL↔type contract (the runtime half is in
 * sql-contract.test.ts). This file is never executed; it fails `bun run typecheck`
 * if a registered query-result type's keys diverge from its column contract in
 * TYPE_COLUMN_CONTRACTS.
 *
 * Chain of trust:
 *   keyof Type  ==(here, compile time)==  TYPE_COLUMN_CONTRACTS[Type]
 *   contract    ⊆(sql-contract.test.ts)=  actual SQL output columns
 *   ⇒ every key the type promises is really produced by the SQL.
 *
 * If a `SELECT` changes, regenerate snapshots; the runtime test then forces the
 * contract list to change; this file then forces the TS type to change. Drift in
 * any one of the three breaks the build.
 */
import type { RosterRow } from "#shared-types";
import { TYPE_COLUMN_CONTRACTS } from "../database/sql-type-registry";

type Cols<K extends keyof typeof TYPE_COLUMN_CONTRACTS> =
  (typeof TYPE_COLUMN_CONTRACTS)[K][number];

/**
 * Resolves to `true` only when the two string-literal unions are exactly equal.
 * On mismatch it resolves to an object type naming the offending columns, so the
 * `= true` assignment fails with a readable message.
 */
type AssertSameColumns<TKeys extends string, TCols extends string> = [
  Exclude<TKeys, TCols>,
] extends [never]
  ? [Exclude<TCols, TKeys>] extends [never]
    ? true
    : { type_is_missing_these_columns: Exclude<TCols, TKeys> }
  : { type_has_columns_the_query_does_not_produce: Exclude<TKeys, TCols> };

const _roster: AssertSameColumns<
  keyof RosterRow & string,
  Cols<"RosterRow">
> = true;

const _votingSearch: AssertSameColumns<
  keyof DatabaseQueries.VotingSearchResult & string,
  Cols<"DatabaseQueries.VotingSearchResult">
> = true;

const _votesByPerson: AssertSameColumns<
  keyof DatabaseQueries.VotesByPerson & string,
  Cols<"DatabaseQueries.VotesByPerson">
> = true;

// Reference the bindings so they are not flagged as unused.
void _roster;
void _votingSearch;
void _votesByPerson;
