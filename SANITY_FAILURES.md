# Sanity Test Failures (bun test sanity)

This file captures the current failures from `bun test sanity` and initial analysis hypotheses.
Run timestamp: 2026-02-11

## Summary
17 failing checks in `packages/server/__tests__/sanity.test.ts`.

## Failure List (from test output)
1. Section structure: every section has a title — **2 missing titles**
2. Section structure: sections are properly ordered within sessions — **447 duplicate ordinals**
3. Parliament size: active MPs never exceed 200 per session date — **21 dates exceed**
4. Voting counts: individual vote count matches n_total — **50 mismatches**
5. Voting → Session linkage: every voting references existing session — **11,059 orphans**
6. SaliDB linkage: VotingDocumentLink references existing Voting — **507,523 orphans**
7. SaliDB linkage: VotingDistribution references existing Voting — **6,790 orphans**
8. SaliDB linkage: SectionDocumentLink references existing Section — **148 orphans**
9. SaliDB linkage: SessionNotice.section_key references existing Section — **6 orphans**
10. SaliDB linkage: SaliDBDocumentReference.section_key references Section — **148 orphans**
11. Vote integrity: every vote references existing voting — **796 orphans**
12. Vote aggregation per type: counts match Vote rows — **50 mismatches**
13. Voting temporal consistency: voting start_time within 1 day of session date — **351 mismatches**
14. Voting → Section linkage: voting.section_key references Section — **3 orphans**
15. Committee membership integrity: start_date <= end_date — **1 invalid row**
16. Parliamentary group membership completeness: every active MP has group — **22 missing**
17. Parliamentary group membership completeness: active group members count equals active MPs per date — **22 mismatches**

## Initial Hypotheses (to validate)
### A. Orphaned Voting / Section references
- Many failures revolve around missing `Session`, `Voting`, and `Section` parents.
- Likely causes:
  - Import order / partial dataset (e.g., VotingDocumentLink or Vote loaded before Voting or Session data missing)
  - Parsing or migrator filters dropping rows (e.g., language filter) without cascading deletes on dependent tables
  - Session keys and Section keys mismatched between SaliDB and Vaski data formats

### B. Section duplicates and missing titles
- Duplicate ordinals within a session could be caused by:
  - Multiple Section rows with same `session_key`/`ordinal` due to re-runs or duplicate raw rows
  - Parsing or migrator not de-duplicating on `(session_key, ordinal)`
- Missing titles might be:
  - Source rows with empty Finnish title fields
  - Parser using Swedish fields incorrectly in some edge case

### C. Parliament size > 200
- Could be:
  - Term overlaps or missing TemporaryAbsence rows
  - Term end_date missing or incorrect leading to inflated active count

### D. Voting count mismatches (n_total and per-type aggregates)
- Possible causes:
  - Vote rows missing due to filtering (language filters or trimming issues)
  - Vote rows mapped to wrong voting_id
  - Duplicate or missing vote rows for some votings

### E. Voting temporal consistency
- Voting start_time from SaliDB might be in different timezone or date derivation logic incorrect
- Some sessions might be missing or have dates incorrect vs voting timestamps

### F. Committee membership date invalid
- Likely a single bad source row; may need normalization or correction in migrator

### G. Parliamentary group membership completeness
- Likely missing group membership rows for some MPs or overlapping date logic issues

## Next Steps (Proposed)
1. For each failure, query the real DB for example rows (small sample) to identify source keys.
2. Trace those keys back to parsed data (`data/parsed/...`) and migrator logic.
3. Decide per case whether:
   - Fix in migrator/parser (normalization, filtering, de-dup)
   - Accept as source exception (documented exception list)
4. Apply fixes iteratively, re-run migrator, re-run `bun test sanity`.
