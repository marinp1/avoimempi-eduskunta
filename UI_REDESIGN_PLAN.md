# Avoimempi Eduskunta - UI Redesign Plan

## Context

The current application has 6 pages (Sessions, Composition, Votings, Insights, Status, Admin) with a government-style navy blue theme. While functional, the UI lacks information density, has placeholder analytics sections, underutilizes available data (speeches, documents, committees, education/work history), and needs a more professional, Nordic-minimal aesthetic. The goal is to transform this into a compelling parliamentary transparency platform that serves both citizens and researchers.

## Design Principles

- **Nordic minimal**: Clean, spacious, flat design. Subtle borders over shadows. No glass-morphism or gradients in chrome.
- **Information density**: Show more data per screen without clutter. Use compact tables, inline metrics, sparklines.
- **Mobile-first**: Bottom tab navigation on mobile, responsive cards/tables, touch-friendly targets (44px+).
- **Finnish-first**: All routes and UI text in Finnish via i18n.

## New Information Architecture

```
/                  Etusivu (Dashboard - NEW)
/edustajat         Edustajat (Representatives - enhanced)
/puolueet          Puolueet (Party Profiles - NEW)
/istunnot          Istunnot (Sessions - enhanced)
/aanestykset       Aanestykset (Votings - enhanced)
/asiakirjat        Asiakirjat (Documents - NEW)
/analytiikka       Analytiikka (Analytics - enhanced)
/tila              Tila (Status - dev only)
/admin             Yllapito (Admin - dev only)
```

---

## Phase 1: Design System + Navigation (Foundation)

**Goal**: New Nordic minimal theme, restructured navigation, placeholder pages for new routes.

### Theme Overhaul
**Modify `packages/client/theme/index.ts`:**
- Colors: Primary `#1B2A4A` (dark slate), Secondary `#4A6FA5` (muted blue), Accent `#E8913A` (amber, sparingly)
- Backgrounds: `#FAFBFC` default, `#FFFFFF` paper, `#F3F5F7` subtle
- Text: `#1A1A2E` primary, `#5A5A72` secondary, `#9A9AB0` tertiary
- Border radius: increase to 8-12px for spacious Nordic feel
- Shadows: extremely subtle (`0 1px 2px rgba(0,0,0,0.05)`)
- Font: Inter (add Google Fonts link in `packages/server/public/index.html`)

**Modify `packages/client/theme/components.tsx`:**
- Replace `GlassCard` with `DataCard` (flat white, 1px border, no backdrop-filter)
- Add `PageHeader` (consistent title + subtitle + actions)
- Add `MetricCard` (number + label + optional trend)
- Add `VoteMarginBar` (horizontal stacked bar for yes/no/abstain)
- Remove gradient-heavy components

**Modify `packages/client/theme/ThemeContext.tsx`:** Update `useThemedColors` for new palette

### Navigation Restructure
**Modify `packages/client/Navigation.tsx`:**
- Desktop: flat dark header (`#1B2A4A`), horizontal nav centered, search icon right
- Mobile: bottom tab bar (5 items: Etusivu, Edustajat, Aanestykset, Istunnot, Lisaa)
- Remove gradient backgrounds

**Modify `packages/client/app.tsx`:** New routing for Finnish paths, default to `/`

**Modify `packages/client/pages/index.ts`:** Add Home, Parties, Documents routes

**Create placeholder pages:**
- `packages/client/pages/Home/index.tsx`
- `packages/client/pages/Parties/index.tsx`
- `packages/client/pages/Documents/index.tsx`

**Migrate existing pages** to new design system (replace GlassCard, use PageHeader, etc.)

**Update `packages/client/i18n/locales/fi.json`** with new navigation keys

### Verification
- App boots with new look and navigation
- All existing pages render correctly with new theme
- New routes show placeholder content
- Mobile navigation works

---

## Phase 2: Analytics Backend

**Goal**: Build all new SQL queries and API endpoints. No frontend changes.

### New SQL Queries (in `packages/server/database/queries/`)
| Query | Purpose | Key Tables |
|-------|---------|------------|
| `PARTY_DISCIPLINE.sql` | Party cohesion scores (% voting with party majority) | Vote, ParliamentaryGroupMembership |
| `CLOSE_VOTES.sql` | Votes where \|yes-no\| <= threshold | Voting |
| `MP_ACTIVITY_RANKING.sql` | Composite activity score per MP | Vote, ExcelSpeech, CommitteeMembership |
| `COALITION_VS_OPPOSITION.sql` | Vote splits by coalition/opposition | Vote, InferredGovernmentCoalition |
| `DISSENT_TRACKING.sql` | MPs voting against party majority | Vote, ParliamentaryGroupMembership |
| `SPEECH_ACTIVITY.sql` | Speech counts + word counts per MP | ExcelSpeech |
| `COMMITTEE_OVERVIEW.sql` | Committee listings with membership | Committee, CommitteeMembership |
| `RECENT_ACTIVITY.sql` | Dashboard feed: recent sessions + votes | Session, Voting |
| `PARTY_SUMMARY.sql` | Party stats: members, participation, demographics | Multiple |
| `DOCUMENTS_SEARCH.sql` | Full-text document search | VaskiDocument, DocumentSubject |
| `PERSON_SPEECHES.sql` | Speeches by a representative | ExcelSpeech |
| `PERSON_COMMITTEES.sql` | Committee memberships for a person | CommitteeMembership, Committee |
| `FEDERATED_SEARCH.sql` | Global search across MPs, votes, docs | Multiple |

### Performance Migration
**Create `packages/datapipe/migrator/migrations/V001.011__analytics_indexes.sql`:**
- Indexes on Vote(group_abbrviation), Vote(vote), ExcelSpeech(start_time), Session(date), etc.

### New API Endpoints
**Modify `packages/server/database/db.ts`** and **`packages/server/index.ts`:**

| Endpoint | Purpose |
|----------|---------|
| `GET /api/analytics/party-discipline` | Party cohesion scores |
| `GET /api/analytics/close-votes` | Close vote listings |
| `GET /api/analytics/mp-activity` | MP activity rankings |
| `GET /api/analytics/coalition-opposition` | Coalition vs opposition patterns |
| `GET /api/analytics/dissent` | Dissent tracking |
| `GET /api/analytics/speech-activity` | Speech metrics |
| `GET /api/analytics/committees` | Committee overview |
| `GET /api/analytics/recent-activity` | Dashboard feed |
| `GET /api/parties/summary` | All parties summary |
| `GET /api/parties/:code/members` | Party member listing |
| `GET /api/parties/:code/voting-history` | Party voting over time |
| `GET /api/documents/search` | Document search |
| `GET /api/documents/by-type` | Document type breakdown |
| `GET /api/documents/:id` | Document detail |
| `GET /api/person/:id/speeches` | Person's speeches |
| `GET /api/person/:id/committees` | Person's committees |
| `GET /api/person/:id/dissents` | Person's dissent votes |
| `GET /api/search?q=` | Federated search |

### Verification
- All endpoints return valid JSON (test with curl)
- Analytics queries execute in < 500ms

---

## Phase 3: Homepage Dashboard

**Goal**: Build the landing page with real-time parliamentary overview.

### Components
**Create `packages/client/pages/Home/index.tsx`:**
- Top row: 4 MetricCards (total MPs, sessions this year, votings this month, close votes)
- "Viimeaikainen toiminta" (Recent Activity): last 5 session days with vote counts
- "Tiukat aanestykset" (Close Votes): last 3 close votes with VoteMarginBar
- "Puoluekuri" (Party Discipline): horizontal bar chart (Recharts)
- "Aktiivisimmat edustajat" (Most Active MPs): top 5 list

**Create supporting components:**
- `packages/client/pages/Home/RecentActivity.tsx`
- `packages/client/pages/Home/CloseVotesHighlight.tsx`
- `packages/client/pages/Home/PartyDisciplineChart.tsx`
- `packages/client/pages/Home/TopActiveMPs.tsx`

### Verification
- Dashboard loads with real data from Phase 2 endpoints
- Responsive: stacks to single column on mobile

---

## Phase 4: Enhanced Representative Profiles

**Goal**: Rich tabbed MP profiles replacing current dialog.

### Redesign `packages/client/pages/Composition/Details.tsx`
- Clean header (no gradients): name, party badge, constituency
- Tabs: Yleistiedot | Aanestykset | Puheenvuorot | Luottamustehtavat
  - **Yleistiedot**: two-column grid with education, work, districts, terms
  - **Aanestykset**: participation rate metric, recent votes list showing vote + party majority comparison
  - **Puheenvuorot**: speech count, recent speeches with date/topic
  - **Luottamustehtavat**: committees, trust positions, government memberships

### Update `packages/client/pages/Composition/index.tsx`
- Add quick-filter chips: party, government/opposition
- Use new PageHeader and DataCard components

### Verification
- Click any MP to see full tabbed profile
- All tabs load data correctly

---

## Phase 5: Party Profiles + Enhanced Analytics

**Goal**: New party profiles page and upgraded analytics section.

### Party Profiles
**Create `packages/client/pages/Parties/index.tsx`:**
- Grid of party cards: name, member count, gov/opp badge, participation rate, discipline score
- Click opens detail drawer

**Create `packages/client/pages/Parties/PartyDetail.tsx`:**
- Tabs: Jasenet (Members) | Aanestyskayttaytyminen (Voting) | Puoluekuri (Discipline)

### Enhanced Analytics
**Redesign `packages/client/pages/Insights/index.tsx`:**
- Replace card grid with analytics hub sections
- New analysis components:
  - `Insights/PartyDiscipline.tsx` - full discipline analysis with Recharts
  - `Insights/CloseVotes.tsx` - close votes browser
  - `Insights/CoalitionOpposition.tsx` - coalition vs opposition patterns
  - `Insights/SpeechActivity.tsx` - speech frequency analysis

### Verification
- Party profiles show real data for all parties
- All analytics sections render charts correctly

---

## Phase 6: Document Browser + Session/Voting Improvements

**Goal**: VaskiDocument browser and improved existing pages.

### Document Browser
**Create `packages/client/pages/Documents/index.tsx`:**
- Search bar + type filter + year filter
- Results: title, type badge, author, date, subject tags
- Detail view with summary, subjects, related documents

### Sessions Improvements (`packages/client/pages/Sessions/index.tsx`)
- Calendar month view option (grid with dots on session days)
- Inline vote result bars in section listings
- Speech preview on expand

### Votings Improvements (`packages/client/pages/Votings/`)
- Date range filter, "close votes only" toggle
- VoteMarginBar on each result
- "Tiukka aanestys" badge for close votes
- Expandable: coalition vs opposition breakdown

### Verification
- Document search returns results, detail view works
- Session calendar navigation works
- Voting filters work correctly

---

## Phase 7: Global Search + Polish

**Goal**: Federated search, mobile polish, loading states, performance.

### Global Search
**Create `packages/client/components/GlobalSearch.tsx`:**
- Modal triggered by search icon or Ctrl+K
- Searches MPs, votings, documents simultaneously
- Results grouped by type

### Mobile Polish
- Finalize bottom tab bar
- Review all pages for touch targets (44px+)
- Ensure card stacking works

### Performance
- `React.memo` on expensive list components
- Virtual scrolling for 200+ MP lists
- Debounced search inputs
- Cache headers on API responses

### Final i18n pass
- Move all remaining hardcoded strings to fi.json

### Verification
- Global search finds results across all types
- All pages work well on 375px viewport
- No janky scrolling or slow renders

---

## Phase Dependency Graph

```
Phase 1 (Design System + Nav)
    |
Phase 2 (Analytics Backend)
    |
    +---> Phase 3 (Dashboard)
    +---> Phase 4 (MP Profiles)
    +---> Phase 5 (Parties + Analytics)
    +---> Phase 6 (Documents + Sessions)
    |
Phase 7 (Search + Polish)
```

Phases 3-6 can be done in any order after Phase 2.

## Key Files Referenced

- `packages/client/theme/index.ts` - Design system core
- `packages/client/theme/components.tsx` - Reusable UI components
- `packages/client/Navigation.tsx` - App navigation
- `packages/client/app.tsx` - Routing
- `packages/client/pages/index.ts` - Route registry
- `packages/client/i18n/locales/fi.json` - Translations
- `packages/server/index.ts` - API routes
- `packages/server/database/db.ts` - Database methods
- `packages/server/database/queries.ts` - SQL query imports
- `packages/server/database/queries/` - SQL files directory
