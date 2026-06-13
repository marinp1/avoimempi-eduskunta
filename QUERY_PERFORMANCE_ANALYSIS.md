# Query Performance Analysis

Generated: 2026-06-06

## Existing Test Coverage

The test suite is comprehensive for **correctness** but does not test performance under realistic data volumes.

| Test | What it covers | Performance gap |
|---|---|---|
| `sql-contract.test.ts` | Column shapes, types, nullability via 44 snapshots | Tiny seed (2-5 rows) — can't detect full scans |
| `all-sql-queries.test.ts` | Every `.sql` file executes without error | Same tiny seed |
| `queries.test.ts` | 29 queries with expected results | Correctness only |
| `query-sargability.test.ts` | Regex checks: no `DATE()`/`SUBSTR()` on join columns | 5 queries checked, regex ≠ actual `EXPLAIN QUERY PLAN` |
| `sql-statements.test.ts` | Migrator/pragma strings non-empty | Trivial |
| `runtime-sql-audit.test.ts` | Audit system finds all queries | No performance checks |
| `sql-contract.test-d.ts` | Compile-time TS type ↔ SQL column match | No performance checks |
| `benchmark-query-latency.ts` | Script: measures p50/p95/p99 latency, full scans, temp B-trees | **Script only (not `bun:test`), run manually** |
| `analyze-query-performance.ts` | Script: `EXPLAIN QUERY PLAN` analysis | **Script only, run manually** |

---

## Severity: HIGH

### 1. N+1 notices on home page

**File:** `packages/server/src/features/home/home.service.ts:171`

```typescript
sessions.map(session => ({
  notices: this.sessions.fetchSessionNotices({ sessionKey: session.key }),
  //                                     ^ one query per session
}))
```

**Impact:** With 5 sessions on the latest day, 5 separate SQL queries fire on every home page load. The home page is the most frequently accessed page.

**Pattern exists:** The `SessionRepository` already has a batch pattern using `json_each($sessionKeysJson)` for sections and voting counts. Notices are the only unbatched call.

**Recommendation:** Add a `fetchSessionNoticesBySessionKeys(sessionKeys: string[])` method that uses `json_each` to batch-fetch notices, and call it once from `enrichLatestDaySessions`.

---

### 2. Correlated EXISTS per vote row

**Files:**
- `packages/server/src/features/voting/sql/voting-member-votes.sql:13-23`
- `packages/server/src/features/voting/sql/voting-government-opposition.sql:10-20`

```sql
CASE
  WHEN EXISTS (
    SELECT 1 FROM GovernmentMembership gm
    JOIN Government g ON g.id = gm.government_id
    WHERE gm.person_id = v.person_id
      AND g.start_date <= vc.voting_date
      AND (g.end_date IS NULL OR g.end_date >= vc.voting_date)
      ...
  ) THEN 1 ELSE 0
END AS is_government
```

**Impact:** 200+ subquery executions per voting detail page load. Each subquery must execute a temporal range join to determine government/opposition status.

**Recommendation:** Pre-compute `is_government` in a `Vote` table column at import time. The government affiliation of each representative at the time of voting can be determined once during migration rather than on every page load.

---

### 3. Correlated GROUP_CONCAT subqueries (7 files)

**Files:**
- `GOV_PROPOSALS_LIST.sql:43-46`
- `WRITTEN_QUESTIONS_LIST.sql:57-60`
- `ORAL_QUESTIONS_LIST.sql:46-49`
- `LEGISLATIVE_INITIATIVES_LIST.sql:50-53`
- `INTERPELLATIONS_LIST.sql:45-48`
- `WRITTEN_QUESTION_RESPONSES_LIST.sql:44-46`
- `person-initiatives.sql:48-51`

```sql
WITH filtered AS (
  SELECT ... LIMIT $limit OFFSET $offset
)
SELECT
  ...,
  (SELECT GROUP_CONCAT(s.subject_text, '||')
   FROM ... WHERE s.proposal_id = f.id) AS subjects
FROM filtered f
```

**Impact:** For every row in the paginated result (e.g., 50 rows), a correlated subquery runs. Even indexed, this adds overhead.

**Recommendation:** Use a `LEFT JOIN` with `GROUP BY` in the outer query instead of correlated subqueries.

---

### 4. Full-table-scan aggregate subqueries on session pages

**Files:**
- `session-detail.sql:32-34`
- `session-list.sql:24-28`
- `session-ticks.sql:7-8`

```sql
LEFT JOIN (SELECT session_key, COUNT(*) AS voting_count
           FROM Voting WHERE annulled = 0 GROUP BY session_key) vc ...
LEFT JOIN (SELECT session_key, COUNT(*) AS section_count
           FROM Section WHERE minutes_entry_kind = 'asiakohta' GROUP BY session_key) sc ...
LEFT JOIN (SELECT session_key, COUNT(*) AS speech_count
           FROM Speech WHERE COALESCE(has_spoken, 1) = 1 GROUP BY session_key) spc ...
```

**Missing indexes:**
- `Voting(annulled)` — no index for filtering `annulled = 0`
- `Section(minutes_entry_kind, session_key)` — no covering index
- `Speech(has_spoken)` — no index

**Impact:** Each subquery fully scans one of the largest tables (Voting 50K+, Section 100K+, Speech 200K+ rows) on every session detail/list page load.

**Recommendation:** Create `CREATE INDEX idx_voting_annulled_session ON Voting(annulled, session_key)` and `CREATE INDEX idx_section_kind_session ON Section(minutes_entry_kind, session_key)`. Consider denormalized aggregate counters on `Session` table.

---

### 5. Full-table-scan person metrics

**File:** `packages/server/src/features/person/sql/person-metrics.sql`

```sql
FROM Representative r  -- no WHERE clause
```

**Impact:** Person metrics query has no WHERE clause, causing full scan of Speech (200K+ rows), Vote (500K+ rows), and all document signer tables — even though only one person's metrics are needed.

**Recommendation:** Change `fetchPersonMetricsWithBaselines` to query metrics for the single person + their party + parliament averages in targeted queries instead of fetching ALL members' data and filtering in JS.

---

### 6. Sequential child queries in document detail pages

**File:** `packages/server/src/features/document/document.repository.ts`

Each `fetchById` method executes 4-6 sequential SQL queries:

```typescript
fetchGovernmentProposalById:   6 queries (detail, signatories, stages, subjects, laws, sessions)
fetchInterpellationById:       5 queries
fetchWrittenQuestionById:      6 queries
fetchOralQuestionById:         4 queries
fetchCommitteeReportById:      4 queries
fetchLegislativeInitiativeById:5 queries
```

**Impact:** Each document detail page makes 4-6 round-trips to SQLite. While cheap individually, the overhead adds up.

**Recommendation:** Use JOIN-based single queries or batch child queries. Share prepared statement instances rather than re-preparing on every call.

---

## Severity: MEDIUM

### 7. Missing `Session.type` index

**Files:**
- `session-list.sql:29`: `WHERE s.type = 'TAYSISTUN'`
- `session-ticks.sql:9`: `WHERE s.type = 'TAYSISTUN'`

**Recommendation:** `CREATE INDEX IF NOT EXISTS idx_session_type ON Session(type);`

---

### 8. LIKE '%...%' leading wildcard searches (12+ files)

**Files:** All list and count SQL files for document types use `LIKE '%' || $query || '%'`:
- `voting-list.sql:13-19`
- `GOV_PROPOSALS_LIST.sql:17-18`
- `COMMITTEE_REPORTS_LIST.sql:16-20`
- `WRITTEN_QUESTIONS_LIST.sql:24-25`
- `ORAL_QUESTIONS_LIST.sql:18-20`
- `LEGISLATIVE_INITIATIVES_LIST.sql:20-21`
- `INTERPELLATIONS_LIST.sql:18-19`
- `PARLIAMENT_ANSWERS_LIST.sql:17-19`
- `WRITTEN_QUESTION_RESPONSES_LIST.sql:19-21`
- `EXPERT_STATEMENTS_LIST.sql:15-17`
- `person-questions.sql:89-90`

**Impact:** Leading wildcards prevent B-tree index usage entirely. Every text search requires a full table scan. An FTS5 table (`FederatedSearchFts`) exists but is not used for these queries.

**Recommendation:** Transition text search to the existing FTS5 virtual table.

---

### 9. Non-equi temporal JOINs on date ranges

**Files:**
- `person-votes.sql:31-32`
- `session-party-seats.sql:7-22`
- `analytics-party-summary.sql:56-57,99-100`
- `analytics-party-members.sql:21-36`

```sql
JOIN Government g
  ON vs.start_date >= g.start_date
  AND (g.end_date IS NULL OR vs.start_date <= g.end_date)
```

**Impact:** Range-based temporal joins cannot use standard B-tree indexes efficiently. With 500K+ vote rows, this is very expensive.

**Recommendation:** Pre-compute government/party affiliation for each vote at import time.

---

### 10. OR condition in JOIN preventing index usage

**File:** `session-section-roll-call.sql:25-31`

```sql
JOIN RollCallReport rr
  ON (ts.minutes_related_document_identifier IS NOT NULL
    AND ts.minutes_related_document_identifier != ''
    AND (rr.edk_identifier = ts.minutes_related_document_identifier
      OR rr.parliament_identifier = ts.minutes_related_document_identifier))
```

**Impact:** The OR condition prevents efficient index use.

**Recommendation:** Split into two UNION queries or add a computed column unifying the two identifiers.

---

### 11. Missing `Voting.annulled` index

**Files:**
- `analytics-close-votes.sql:17` — `WHERE v.annulled = 0`
- `analytics-coalition-opposition.sql:4` — `WHERE annulled = 0`
- `voting-list.sql:12` — `WHERE v.annulled = 0`

**Recommendation:** `CREATE INDEX IF NOT EXISTS idx_voting_active ON Voting(annulled) WHERE annulled = 0;` (partial index)

---

### 12. Fuzzy text match on `asker_text`

**File:** `person-questions.sql:84-90`

```sql
FROM OralQuestion oq
WHERE
  lower(oq.asker_text) LIKE '%' || lower(rep.first_name) || '%'
  AND lower(oq.asker_text) LIKE '%' || lower(rep.last_name) || '%'
```

**Impact:** LIKE `%...%` requires full scan of OralQuestion table. No index can help.

**Recommendation:** Store `asker_person_id` as a foreign key at import time instead of fuzzy text matching.

---

### 13. COALESCE in WHERE (ParliamentAnswer)

**Files:**
- `PARLIAMENT_ANSWERS_LIST.sql:26-27`
- `PARLIAMENT_ANSWERS_COUNT.sql:14-15`

```sql
AND ($startDate IS NULL OR COALESCE(c.signature_date, c.submission_date) >= $startDate)
```

**Recommendation:** Add `CREATE INDEX IF NOT EXISTS idx_parliamentanswer_effective_date ON ParliamentAnswer(COALESCE(signature_date, submission_date) DESC, id DESC);`

---

## Severity: LOW

### 14. `SELECT *` patterns

**Files:**
- `voting-list.sql:2` — `SELECT v.*` (25 columns, only ~15 needed)
- `voting-detail.sql:2` — `SELECT v.*` (25 columns)
- `person-detail.sql:2` — `SELECT r.*` (small table, low impact)
- `person-group-memberships.sql:1` — `SELECT pgm.*` (small table)
- `person-terms.sql:1` — `SELECT t.*` (small table)

**Recommendation:** List columns explicitly for clarity.

---

### 15. `ABS()` in WHERE

**File:** `analytics-close-votes.sql:19`

```sql
WHERE ABS(v.n_yes - v.n_no) <= $threshold
```

**Impact:** Prevents index usage, but mitigated by `ORDER BY start_time DESC LIMIT 5` which allows early termination.

---

### 16. `CASE` in ORDER BY (dynamic sorting)

**File:** `voting-list.sql:25-32`

```sql
ORDER BY
  CASE WHEN $sort = 'largest' THEN v.n_total END DESC,
  CASE WHEN $sort = 'closest' THEN ABS(v.n_yes - v.n_no) END ASC
```

**Impact:** Prevents index usage, but unavoidable for dynamic sorting. Combined with `OFFSET`, expensive for deep pages.

---

### 17. OFFSET pagination

**Impact:** For deep pages (e.g., page 100), SQLite scans and discards 950 rows before returning 50.

**Recommendation:** Consider keyset pagination for deeply paginated lists.

---

### 18. Prepared statement re-preparation per call

**Pattern (all repository files):**
```typescript
const stmt = this.db.prepare<...>(someSql);
const data = stmt.all({ ... });
stmt.finalize();
```

**Impact:** SQLite compiles the SQL query on every `db.prepare()` call. For frequently called endpoints, this adds unnecessary CPU overhead.

**Recommendation:** Cache prepared statements as class properties. Since SQL files are imported as string constants, they can be compiled once and reused.

---

### 19. Dropped indexes (V031 — deliberate space trade-off)

| Dropped Index | Table | Risk |
|---|---|---|
| `idx_speech_content_session` | SpeechContent.session_key | Queries joining on session_key will scan |
| `idx_speech_content_section` | SpeechContent.section_key | Queries joining on section_key will scan |
| `idx_speech_content_source_document` | SpeechContent.source_document_id | Queries joining on source_document_id will scan |
| `idx_committeereportmember_person` | CommitteeReportMember.person_id | Queries filtering by person will scan |
| `idx_govproposal_outcome` | GovernmentProposal.decision_outcome_code | Queries filtering by outcome will scan |

---

## Summary

| # | Issue | Severity | Files affected |
|---|---|---|---|
| 1 | N+1 notices on home page | HIGH | `home.service.ts:171` |
| 2 | Correlated EXISTS per vote row | HIGH | `voting-member-votes.sql`, `voting-government-opposition.sql` |
| 3 | Correlated GROUP_CONCAT subqueries | HIGH | 7 list SQL files |
| 4 | Full-scan aggregate subqueries | HIGH | `session-detail.sql`, `session-list.sql`, `session-ticks.sql` |
| 5 | Full-scan person metrics | HIGH | `person-metrics.sql` |
| 6 | Sequential child queries (4-6/page) | HIGH | `document.repository.ts` all fetchById methods |
| 7 | Missing `Session.type` index | MEDIUM | `session-list.sql`, `session-ticks.sql` |
| 8 | LIKE `%...%` leading wildcard | MEDIUM | 12+ list/count SQL files |
| 9 | Non-equi temporal JOINs | MEDIUM | `person-votes.sql`, `analytics-*.sql`, `session-party-seats.sql` |
| 10 | OR condition in JOIN | MEDIUM | `session-section-roll-call.sql:25-31` |
| 11 | Missing `Voting.annulled` index | MEDIUM | `analytics-*.sql`, `voting-list.sql` |
| 12 | Fuzzy text match on `asker_text` | MEDIUM | `person-questions.sql:84-90` |
| 13 | COALESCE in WHERE (ParliamentAnswer) | MEDIUM | `PARLIAMENT_ANSWERS_LIST.sql`, `PARLIAMENT_ANSWERS_COUNT.sql` |
| 14 | SELECT * patterns | LOW | voting and person SQL files |
| 15 | ABS() in WHERE | LOW | `analytics-close-votes.sql` |
| 16 | CASE in ORDER BY | LOW | `voting-list.sql` |
| 17 | OFFSET pagination | LOW | All list SQL files |
| 18 | Prepared statement re-preparation | LOW | All repository files |
| 19 | Dropped indexes (V031) | LOW | `SpeechContent`, `CommitteeReportMember`, `GovernmentProposal` |

### Strengths
- WAL mode used universally
- 64MB cache + 30GB mmap for production reads
- Extensive index set (migrations V001.021, V001.027, V001.033, V001.035)
- Batch patterns via `json_each` for sections/voting counts
- `LIMIT` guardrails on unbounded queries
- SQL contract tests are comprehensive for correctness

### What needs attention
- The three largest tables (Vote, Voting, Speech, Section) are repeatedly fully scanned
- The temporal data model forces expensive range JOINs throughout analytics
- No materialized/denormalized tables for common patterns (session aggregates, gov/opposition classification)
- Text search relies entirely on `LIKE '%term%'` despite FTS5 being defined
- Benchmark scripts exist but are not wired into CI/test pipeline
