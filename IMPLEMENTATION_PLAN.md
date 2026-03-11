# Implementation Plan

Recommended order for working through `PROJECT_ISSUES.md`. Issues are batched so each phase is internally coherent and leaves the codebase in a better state than before.

---

## Phase 1 — Make CI green

**Goal:** Get `bun test` fully green before touching anything else. A broken test suite makes every subsequent change harder to validate.

| # | Issue | Effort |
|---|-------|--------|
| 5 | Restore test suite alignment (datapipe) | S |

---

## Phase 2 — Security hardening (Group A)

**Goal:** Close production security gaps. Most of these are small, isolated changes with outsized impact.

Recommended order within the phase:

| # | Issue | Effort | Notes |
|---|-------|--------|-------|
| 2 | Stop exposing error details in 500 responses | XS | One-liner in `server/index.ts`; do this first |
| 15 | Add HTTP security headers | S | Central middleware, add one test |
| 1 | Constrain storage keys to base directory | S | Isolated to `local.ts` + tests |
| 17 | Standardise route param validation | M | Touches many route files; do after #15 so tests are in place |
| 14 | Add rate limiting on search endpoints | M | Can be deferred if traffic is low |

---

## Phase 3 — Backend correctness (Group B subset + Group C)

**Goal:** Fix runtime bugs and close the test gaps that let them go undetected.

| # | Issue | Effort | Notes |
|---|-------|--------|-------|
| 6 | SQL smoke tests reflect live schema | S | Unblocks reliable SQL regression detection |
| 16 | Fix N+1 in session day route | S | Isolated to `session-routes.ts` |
| 3 | Fix cache capacity eviction | S | Isolated to `response-cache.ts` |
| 18 | Expand backend test coverage | L | Broad but mechanical; write one route group at a time |

---

## Phase 4 — Frontend cleanup (Group B remainder)

**Goal:** Fix silent failures and stale-state bugs that hide problems from users.

| # | Issue | Effort | Notes |
|---|-------|--------|-------|
| 19 | Fix silent error swallowing | M | Most impactful; fixes ~10 sites across the app |
| 20 | Add AbortController to fetch effects | S | Mechanical; follow `VoteResults.tsx` as the reference pattern |
| 21 | Fix query param inheritance on navigation | XS | One-line change in `Navigation.tsx` |

---

## Phase 5 — Accessibility (Group D)

**Goal:** Make the app usable with a keyboard and screen reader. A single focused sweep across all pages.

| # | Issue | Effort | Notes |
|---|-------|--------|-------|
| 22 | Resolve accessibility gaps | M | Audit pages one by one; use Lighthouse as the scoreboard |

---

## Phase 6 — Technical debt (Group E)

**Goal:** Reduce maintenance drag. These have no user impact; schedule when you have bandwidth.

| # | Issue | Effort | Notes |
|---|-------|--------|-------|
| 4 | Reconcile docs with live repo | XS | Quick housekeeping pass |
| 7 | Refactor oversized modules | M | Start with `document-repository.ts` |
| 8 | Replace ad hoc client-side routing | L | Large refactor; do last in this phase |

---

## Phase 7 — Data pipeline expansion (Group F)

**Goal:** Surface already-migrated data with minimal risk. Each issue is independent; do them in this order of value.

| # | Issue | Effort | Notes |
|---|-------|--------|-------|
| 26 | Section → voting via SaliDBKohtaAanestys | M | Data already migrated; just needs API + UI wiring |
| 25 | RollCall attendance analytics | M | Data already migrated; add queries + Insights panel |
| 24 | SaliDBTiedote session notices | S | Data already migrated; add endpoint + Sessions UI |
| 23 | SeatingOfParliament | M | Needs investigation → migrator → API → UI |
| 27 | Attachment & AttachmentGroup pipeline | M | Needs investigation first; skip if data is sparse |

---

## Phase 8 — Product features (Group G)

**Goal:** Larger cross-cutting features. Each needs its own mini-planning session before starting.

| # | Issue | Effort | Notes |
|---|-------|--------|-------|
| 9 | Unified search | L | Backend aggregation endpoint + global UI entry point |
| 10 | Document journey & relationship views | L | Builds on Phase 7 work; do after #26 |
| 11 | Longitudinal analytics | L | Builds on #25 attendance data |
| 12 | Data quality monitoring surface | M | Backend-heavy; extend existing sanity machinery |
| 13 | Export / researcher data access | M | Add to existing filtered views; CSV first |

---

## Effort legend

| Label | Rough scope |
|-------|-------------|
| XS | < 1 hour, 1–5 lines |
| S | half a day, one file or small set |
| M | 1–2 days, multiple files |
| L | 3+ days, cross-cutting |
