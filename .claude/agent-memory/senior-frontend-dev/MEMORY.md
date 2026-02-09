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
- **Admin UI**: Purple/blue (scraper), Pink/red (parser), Green/teal (migrator)

### Common Components
- Use `GlassCard` for hero sections
- Use `Chip` for badges, labels, counts
- Use `Collapse` for expandable content with `timeout="auto" unmountOnExit`
- Use `CircularProgress` for loading states

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

## Sessions Page Implementation

### Structure
- **Sessions**: Top-level entities with agenda information
- **Sections**: Expandable items within sessions (kohdat)
  - Each section can have 0+ speeches (puheenvuorot)
  - Each section can have 0+ votings (äänestykset)
- **On-demand loading**: Speeches and votings are fetched when section expands

### Section Metadata Display
- Show `processing_title` if different from `title`
- Show `resolution` if available
- Show `identifier` for reference
- Badge showing section ordinal number

### Voting Display
- Show vote number, title, and result (Hyväksytty/Hylätty)
- Visual indicators: green border for passed, red for failed
- Display vote counts: n_yes, n_no, n_abstain, n_absent, n_total
- Use `HowToVoteIcon` for visual consistency

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
