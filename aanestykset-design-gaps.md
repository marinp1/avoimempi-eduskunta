# Äänestykset — Implementation vs Design Gap Analysis

Comparison of the current `packages/server/src/features/voting/` implementation against
`design/Eduskuntapeili/Äänestykset.html`, `Äänestys.html`, `README.md`, and `COMPONENTS.md`.

---

## List Page (`/aanestykset`)

| # | Gap | File(s) | Severity |
|---|---|---|---|
| 1 | **Filter chips are non-functional** — they have no htmx behavior (`hx-get`), no server round-trip, no URL state. They should filter via query params like `?type=laki` and return a fragment | `list.page.tsx:60-76` | **High** |
| 2 | **Document chips (`ag-doc`) always empty** — `documents: []` and `references: []` are hardcoded. The `voting-list.sql` never joins on document/reference tables | `list.view-model.ts:99-100` | **High** |
| 3 | **Filter threshold mismatch** — Design says "Tiukat (alle 10 ä.)" but code uses `diff < 20` at `list.page.tsx:182` | `list.page.tsx:182` | Medium |
| 4 | **Outcome labels too generic** — Design uses descriptive labels ("mietintö", "luottamus", "Pekonen") based on the winning proposition. Implementation only uses "Hyväksytty"/"Hylätty" | `list.view-model.ts:109-112` | Medium |
| 5 | **Filter chips lack colored dots** — Design has colored `.pdot` indicators (blue Lait, green Selonteot, red Luottamus, orange Tiukat) | `list.page.tsx:60-76` | Low |
| 6 | **Missing page description / as-of note** — Design has a rich subtitle paragraph + `<p class="tl-asof-note">` showing data cutoff | `list.page.tsx:32-36` | Low |
| 7 | **Missing loading indicator element** — `hx-browser-indicator` is set but no visible `.htmx-indicator` element | `list.page.tsx:114` | Low |

## Detail Page (`/aanestys/:id`)

| # | Gap | File(s) | Severity |
|---|---|---|---|
| 8 | **Yes/No proposition text is always null** — `yesProposition: null, noProposition: null` hardcoded; the proposition section renders empty regardless of DB data | `detail.view-model.ts:287-288` | **High** |
| 9 | **Decision block lacks explanatory text** — Design shows a government-opposition split explanation. The `govOppBreakdown` data is fetched but never rendered in the UI | `detail.page.tsx:209-216` | **High** |
| 10 | **Seat map tooltip always says "tuntematon ääniarvo"** — Title attribute always appends this regardless of actual vote value (bug) | `map.fragment.tsx:49` | **High** |
| 11 | **Party breakdown not grouped by government/opposition** — Design groups government parties first, then opposition. SQL orders by `n_total DESC` without bloc awareness | `voting-party-breakdown.sql:35` | Medium |
| 12 | **Missing document references in sess-meta** — Design shows "HE 197/2025 vp · SIVM 3/2026 vp" in the metadata line | `detail.page.tsx:83-113` | Medium |
| 13 | **No per-section provenance source notes** — Design has `.source-note` with `.cite` trace links under each section (party breakdown, seat map, etc.) | `detail.page.tsx:241-363` | Medium |
| 14 | **Seat map not ordered by bloc** — Design clusters government blocs left, opposition right | `voting-member-votes.sql` | Medium |
| 15 | **Missing PDF link in toolbar** — Design has "Äänestystulos (PDF)" button | `detail.page.tsx:116-141` | Low |
| 16 | **Missing "show all 200 MP votes" link** — Design has a link at bottom of MP lookup | `map.fragment.tsx:95-127` | Low |
| 17 | **Missing MP lookup empty state** — No "Ei osumia" message when search yields no results | `map.fragment.tsx:95-127` | Low |
| 18 | **AI summary bar lacks margin info** — Design shows "enemmistö 7 yli rajan · 14 äänen ero" | `detail.page.tsx:219-239` | Low |
| 19 | **Related votes section layout differs** — Design shows a simpler inline text format; implementation renders a rich section with vote bars. Both acceptable but inconsistent with design | `detail.page.tsx:315-352` | Low |

## Cross-cutting / Architecture

| # | Gap | Severity |
|---|---|---|
| 20 | **No data provenance (cite) system** — The defining design principle: every official figure should carry traceable `data-*` attributes back to its source record. Implementation has none | **High** |
| 21 | **No government-opposition bloc visualization** — `govOppBreakdown` is fully fetched by the repository but never rendered anywhere on the detail page | **High** |
| 22 | **AI summary is placeholder only** — Expected, but the placeholder text and structure exist correctly (`detail.page.tsx:219-239`) | OK |
| 23 | **Timeline scrubber** — Implemented in `layouts/timeline.tsx` with htmx-driven server state | ✅ |
| 24 | **Masthead/nav/footer** — Implemented in `layouts/` | ✅ |
| 25 | **Period selector** — Implemented in `layouts/period-selector.tsx` | ✅ |

## What's Working Well

- Service/repository separation is clean
- View model pattern is consistent with the project architecture
- htmx SPA navigation (`hx-get`, `hx-push-url`, `hx-target`) is properly implemented
- Lazy-loaded seat map fragment (`/aanestys/:id/kartta`) works as designed
- Timeline scrubber is integrated into the shell
- Pagination (load-more cursor) functions correctly
- SQL queries are well-structured with prepared statements
- Proper 404 handling for missing votes
- i18next localization is fully wired

## Key Fixes Priority

1. Query `proposition` text from the DB and populate `yesProposition`/`noProposition`
2. Remove the hardcoded empty `documents`/`references` arrays and add proper SQL joins
3. Render `govOppBreakdown` in the decision block
4. Fix the seat map tooltip bug
5. Wire filter chips to htmx server round-trips
6. Add provenance `data-*` attributes to key figures
7. Group party breakdown and seat map by government/opposition
