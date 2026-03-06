# Frontend Development Memory

## Project Structure

### Key Locations
- **Frontend**: `packages/client/` - React 19 SPA with MUI and Emotion
- **Backend**: `packages/server/` - Bun HTTP server with type-safe routing
- **Shared Types**: `packages/shared/typings/SQLModel/` - Database table TypeScript types
- **SQL Queries**: `packages/server/database/queries/*.sql` - Named SQL query files

### Database Query Pattern
1. Create SQL file in `packages/server/database/queries/QUERY_NAME.sql`
2. Export in `packages/server/database/queries.ts`
3. Add method to `DatabaseConnection` class in `packages/server/database/db.ts`
4. Add API route in `packages/server/index.ts` using Bun's type-safe routing

### API Patterns
- Use `BunRequest<"/path/:param">` for typed route parameters
- Fetch methods return data directly, API routes wrap in Response with JSON
- Client-side fetches use standard `fetch()` API

## UI Patterns

### Color Scheme
- **Primary**: Purple/blue (`themedColors.primary`) - used for sessions, main actions
- **Success**: Green (`themedColors.success`) - used for passed votes, positive states
- **Error**: Red (`themedColors.error`) - used for failed votes, negative states

### Common Components
- Use `GlassCard` for hero sections
- Use `Chip` for badges, labels, counts
- Use `Collapse` for expandable content with `timeout="auto" unmountOnExit`
- Use `CircularProgress` for loading states
- `DocumentCard`, `RelatedVotings`, `extractDocumentIdentifiers` from `#client/components/DocumentCards`
- `VotingResultsTable` from `#client/components/VotingResultsTable`

### Responsive Design
- Mobile cards: Display at `xs` to `md` breakpoints with `display: { xs: "block", md: "none" }`
- Desktop tables: Display at `md+` with `display: { xs: "none", md: "block" }`
- Use MUI spacing system: `spacing.sm`, `spacing.md`, `spacing.lg`

### Data Fetching Pattern
1. Create state for data: `useState<Record<number, Type[]>>({})`
2. Create loading state: `useState<Set<number>>(new Set())`
3. Fetch on-demand when expanding (e.g., section expansion)
4. Check if already loaded before fetching
5. Display loading spinner while fetching
6. Handle empty states gracefully

## Sessions/Home Page Architecture

### Shared Section Rendering
Both Home (`packages/client/pages/Home/index.tsx`) and Sessions (`packages/client/pages/Sessions/index.tsx`) render the same session/section content. They share:
- Identical section expand logic fetching: speeches (paginated), votings, links, subsections, roll calls
- `renderVaskiInfo`, `renderMinutesInfo`, `renderSectionMinutesContent`, `renderSectionSubSections`
- `renderSessionNotices`, `renderSectionNotices`, `renderSessionMinutesOutline`, `renderSessionAttachments`
- `renderSectionLinks`, `renderSectionRollCall`, `renderSectionVotings` (uses `VotingResultsTable`)
- `DocumentCard` + `RelatedVotings` for sections with `extractSectionDocRefs`
- `getSectionOrderLabel` for section chip, `isRollCallSection` to detect nimenhuuto sections

### Sessions-only UI (not in Home)
- Date picker, view mode toggle (list/calendar/timeline), navigation controls
- Focused session/section highlighting, scroll-to-section
- "Open section" link from minutes outline items

### Section expand: what gets fetched
When a section expands: speeches (paginated), votings, links (`/api/sections/{key}/links`),
subsections (`/api/sections/{key}/subsections`), roll call if `isRollCallSection` (`/api/sections/{key}/roll-call`)

## SPA Navigation Pattern

Client-side navigation uses `window.history.pushState({}, "", href)` + `window.dispatchEvent(new PopStateEvent("popstate"))`. No React Router. The Documents page reads URL params on mount via `useEffect(fn, [])` to initialize state from `?type=...&q=...`.

## Documents Page Cross-Linking

- `refs.documents(type, q?)` in `packages/client/references.ts` builds `/asiakirjat?type=...&q=...`
- `inferDocumentType(identifier)` in `questions.tsx` maps bill identifier prefixes (HE, KK, LA, etc.) to document type strings
- Expert statement `bill_identifier` chip navigates to the referenced document type filtered by that identifier
- `GovernmentProposalCard` fetches `/api/expert-statements/by-bill?identifier=...` on expand and shows a count chip that navigates to expert-statements filtered by the proposal identifier

## Server Route Structure

Routes live in `packages/server/routes/documents/` split by domain:
- `question-family-routes.ts` - written questions, expert statements, oral questions
- `interpellation-government-routes.ts` - interpellations, government proposals
- `committee-legislative-routes.ts` - committee reports, legislative initiatives
- `document-routes.ts` - combines all routes + defines `DocumentRoutesDataAccess` interface (must be updated when adding new repo methods)

## Database Tables

### Voting
- Fields: id, number, title, n_yes, n_no, n_abstain, n_absent, n_total
- Foreign keys: section_key, session_key
- Result determined by: `n_yes > n_no`

### Section
- Fields: id, key, identifier, title, processing_title, resolution, ordinal
- Foreign keys: session_key, agenda_key

### Speech
- Joins with ExcelSpeech for content
- Fields: ordinal, person info, party, speech type
- Foreign key: section_key
