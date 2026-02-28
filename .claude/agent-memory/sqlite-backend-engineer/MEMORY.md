# SQLite Backend Engineer Memory

## Database Overview
- Path: `avoimempi-eduskunta.db`
- 28 user tables + _migration_info + sqlite_sequence
- Largest tables: Vote (4.28M), DocumentSubject (139K), Speech (138K), ExcelSpeech (115K)
- See `data-quality.md` for comprehensive quality issues found 2026-02-09

## Schema Quick Reference
- `Representative` (2677 rows): person_id PK, names, party, demographics
- `Vote` (4.28M rows): voting_id FK, person_id FK, vote text, group_abbrviation (typo in column name)
- `Voting` (21448 rows): voting sessions with section linkage
- `Speech` (138K rows): speech records linked to sessions/sections
- `ExcelSpeech` (115K rows): separate speech data from Excel imports
- `Section` (23K rows): agenda sections linked to sessions
- `Session` (1647 rows): parliamentary sessions
- `VaskiDocument` (27K rows): parliamentary documents
- `CommitteeMembership` (14K rows): committee assignments
- `ParliamentaryGroupMembership` (3644 rows): party group memberships
- `Term` (3416 rows): parliamentary terms

## Key Issues Found
- Vote.group_abbrviation: column name typo, ALL 4.28M rows have trailing whitespace (padded to 10 chars)
- Representative.last_name: 413 rows have leading space
- CommitteeMembership.role: 6 pairs of case-inconsistent values (jäsen/Jäsen, varajäsen/Varajäsen, etc.)
- TrustPosition.position_type: typo "municapility" (5050 rows) should be "municipality"
- Vote.vote: bilingual values (Finnish + Swedish "Avstår")
- Gender encoding inconsistency: Representative uses "Mies"/"Nainen", Speech uses "M"/"N"
- Section.agenda_key uses numeric IDs but Agenda.key uses "YYYY/N" format - broken FK
- 16,497 orphaned Vote rows (voting_id not in Voting)
- Multiple NULL vs empty string mixing issues in Speech, Section, Voting
- CommitteeMembership dates: 140 rows with non-standard format (YYYY-M-DD instead of YYYY-MM-DD)
- VaskiDocument.status mixes text labels with numeric codes ("5", "8", "1234")
- ExcelSpeech.speech_type: many hyphenated/broken word variants from PDF extraction

## Row Store Architecture
- `IRowStore` interface in `packages/shared/storage/row-store/types.ts`
- SQLite provider: `packages/shared/storage/row-store/providers/sqlite.ts`
- Postgres provider: `packages/shared/storage/row-store/providers/postgres.ts`
- Factory switches on `ROW_STORE_PROVIDER=postgres` + `ROW_STORE_DATABASE_URL` env vars
- `TransactionSql` from postgres.js doesn't expose call signatures due to `Omit<Sql,...>` — cast to `postgres.Sql` inside `sql.begin` callback via `as unknown as postgres.Sql`
- Postgres COUNT() returns string — parse with `parseInt(rows[0]?.cnt ?? "0", 10)`
- Schema init is lazy: `this.initPromise = this.initSchema()` in constructor; every public method awaits it
- Upserts chunked at 500 rows; `list()` uses keyset pagination `pk > lastPk`, batch 1000

## Query Patterns & Gotchas
- **NEVER JOIN Voting → Section → Session**: 97.8% of votings have empty section_key ('')
- Use `Voting.session_key` directly for counting votings per session
- Empty string ('') is NOT the same as NULL - check both when filtering
- Fixed: SESSION_VOTING_COUNT.sql now uses direct session_key (2026-02-16)

## Migration Conventions
- Files in `packages/datapipe/migrator/migrations/V*.sql`
- No inline comments, semicolon-split execution
- Tables use snake_case column names mostly
