# Session Agenda Structure

## Finnish Parliamentary Terminology

### Primary Hierarchy

**Täysistunto (Session/Plenary Session)**
- The main plenary meeting of parliament
- Occurs on specific dates (e.g., "Maanantai 2.6.2014 klo 11.00")
- Database table: `Session`
- Key field: `key` (format: "YYYY/NNN" where NNN is session number)

**Asiakohta / Kohta (Section/Agenda Item)**
- Individual discussion items within a session
- Each section has a title, ordinal number, and resolution
- Database table: `Section`
- Ordered by `ordinal` field
- Common types:
  - "Nimenhuuto" (roll call)
  - "Suullinen kyselytunti" (oral question time)
  - Legislative proposals with full titles
  - "Seuraava täysistunto" (next session announcement)

**Puheenvuoro (Speech/Speaking Turn)**
- Individual speeches within a section
- Database table: `Speech`
- Links to Representative via `person_id`
- Contains: speaker name, party, ministry (if minister), timestamp
- Ordered by `ordinal` field (format: YYYYMMDDHHmmssN)
- Full speech text available in `ExcelSpeech` table

**Äänestys (Voting)**
- Votes that occur within sections
- Database table: `Voting`
- Not all sections have votes
- Contains: vote counts (yes/no/abstain/absent), result, title
- Links to individual votes via `Vote` table

### Database Relationships

```
Session (1) ──┬─> (many) Section ──┬─> (many) Speech
              │                     └─> (0-many) Voting ─> (many) Vote
              └─> (many) Speech (redundant link for performance)
```

**Key Fields:**
- Session.key = "YYYY/NNN" (e.g., "2014/257")
- Section.session_key → Session.key
- Section.ordinal = ordering within session (2, 3, 4...)
- Section.identifier = display number ("1", "2", "3"...)
- Section.title = Finnish title of agenda item
- Section.processing_title = additional processing context
- Section.resolution = outcome/decision text
- Section.vaski_id = link to VaskiDocument for legislative items
- Speech.section_key → Section.key
- Speech.session_key → Session.key (denormalized for queries)
- Speech.person_id → Representative.person_id
- Voting.section_key → Section.key
- Vote.voting_id → Voting.id
- Vote.person_id → Representative.person_id

## Data Patterns

### Session States
- "LOPETETTU" = completed session
- Sessions have date, year, session number
- Speaker (puhemies) tracked via `speaker_id`

### Section Structure
- Ordered by `ordinal` (monotonically increasing)
- `identifier` is human-readable number ("1", "2", "3")
- `title` is the main heading
- `processing_title` provides additional context for complex items
- `resolution` = "Päätös" (decision/outcome)
- `vaski_id` links to document database for bills/proposals

### Speech Metadata
- `speech_type`: "T" = normal speech
- `request_method`: "I" = requested via system
- `ordinal_number`: sequence within section
- `excel_key`: links to full text in ExcelSpeech table
- `has_spoken`: 1 = speech delivered, 0 = not delivered

### Voting Structure
- Most votings are on legislative items
- `section_processing_phase`: "Ensimmäinen käsittely" (first reading), "Ainoa käsittely" (single reading), etc.
- Vote totals: n_yes + n_no + n_abstain + n_absent = n_total (always 199 or 200)
- Individual votes tracked in `Vote` table with values "Jaa"/"Ei"/"Poissa"

## UX Considerations

### Session Detail View Structure

**Header:**
- Session date and number
- Session type and state
- Speaker (puhemies) name

**Agenda (Section List):**
- Numbered list of sections (using `identifier`)
- Each showing: title, processing_title (if present)
- Visual indicators for: has votings, has speeches
- Click to expand/navigate

**Section Detail:**
- Title and resolution
- Link to VaskiDocument if available (bills, proposals)
- Speeches list (ordered by ordinal)
  - Speaker name, party, ministry
  - Timestamp
  - Link to full text (via excel_key)
- Votings (if any)
  - Vote counts and result
  - Link to vote breakdown

### Query Patterns

**Get session agenda:**
```sql
SELECT * FROM Section
WHERE session_key = ?
ORDER BY ordinal
```

**Get speeches for section:**
```sql
SELECT s.*, r.party, r.district
FROM Speech s
LEFT JOIN Representative r ON s.person_id = r.person_id
WHERE s.section_key = ?
ORDER BY s.ordinal
```

**Get votings for section:**
```sql
SELECT * FROM Voting
WHERE section_key = ?
ORDER BY number
```

**Get full session with counts:**
```sql
SELECT
  ses.*,
  COUNT(DISTINCT sec.id) as section_count,
  COUNT(DISTINCT sp.id) as speech_count,
  COUNT(DISTINCT v.id) as voting_count
FROM Session ses
LEFT JOIN Section sec ON ses.key = sec.session_key
LEFT JOIN Speech sp ON ses.key = sp.session_key
LEFT JOIN Voting v ON ses.key = v.session_key
WHERE ses.key = ?
GROUP BY ses.id
```

## Performance Considerations

- Sessions have 100s of sections
- Sections can have 10s-100s of speeches
- 138,088 total speeches in database
- Use pagination for speech lists
- Consider lazy-loading section details
- Index on session_key, section_key for fast lookups
