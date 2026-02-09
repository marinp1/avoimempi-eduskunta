# Parliament Domain Expert Memory

## Session Agenda Structure
See `session-agenda-structure.md` for complete details on:
- Session → Section → Speech/Voting hierarchy
- Database table relationships and key fields
- Query patterns for session detail views
- Finnish terminology (täysistunto, asiakohta, puheenvuoro, äänestys)

## Vaski Document System

### Document Type Priorities
- **Tier 1 Critical**: HE (government proposals), Valiokunnan mietintö (committee reports), Lakialoite (member initiatives), Pöytäkirjan asiakohta (agenda items linking to votes)
- **Tier 2 Oversight**: Kirjallinen kysymys (written Q&A), Välikysymys (no-confidence motions)
- **Tier 3 Process**: Asiantuntijalausunto (expert statements), Pöytäkirja (minutes)

### Legislative Process Flow
```
HE/LA → Committee (+ expert hearings) → Mietintö → Plenary debate → Vote
```
- Questions must be answered within 21 days (kirjallinen kysymys)
- Interpellations (välikysymys) require min. 20 signatories, can topple government
- Most LA (member initiatives) never reach vote - government coalition controls agenda

### Key Metadata Fields from SiirtoMetatieto
- `Diaarinumero` = eduskunta_tunnus (primary identifier, e.g., "HE 1/2015 vp")
- `Asianumero` = case number (links related documents)
- `Valtiopaiva` = parliamentary session
- `Asiasanat` = subject keywords (critical for search/categorization)
- `Valiokunta` = committee name (needs normalization)

### Schema Design Pattern
Three-tier architecture recommended:
1. **VaskiDocument** - Generic registry for all document types (with JSON flexibility)
2. **Specialized tables** - LegislativeProposal, CommitteeDocument, ParliamentaryQuestion (structured data)
3. **Relationship tables** - DocumentRelationship, DocumentRepresentative (network analysis)

### Critical Relationships
- Section.vaski_id → VaskiDocument.id (already exists! Bidirectional link needed)
- LegislativeProposal → CommitteeDocument → Section → Voting (full legislative chain)
- ParliamentaryQuestion.question_vaski_id ↔ answer_vaski_id (Q&A pairing)

### Analytics Enabled by Vaski
- Bill lifecycle tracking (time-to-decision, success rates)
- Committee workload and expert participation analysis
- Minister accountability (question response times)
- Document citation networks
- Opposition coalition patterns (LA co-signatories)

## Vote Mechanics & Sanity Test Rules

### Valid Vote Values (Vote.vote field)
- Finnish: `Jaa` (yes), `Ei` (no), `Tyhjää` (abstain), `Poissa` (absent)
- Swedish: `Avstår` (alternative abstain value from Swedish API)
- Distribution: 70%+ should be active votes (Jaa/Ei)

### Vote Count Maximum (n_total in Voting table)
**Correct rule**: n_total should be **1-200**
- **Typical max: 199** (Speaker doesn't vote unless tie)
- **Valid exception: 200** (Speaker votes, special procedures) - should be <5% of votes
- **Normal range: 180-200** (high attendance expected)
- **Red flag: <100** (very rare, <1% tolerance)

Issue requirement "NEVER exceeds 199" is imprecise - means "typically 199, but 200 is valid exception".

### Vote Aggregation Rules
- `n_yes + n_no + n_abstain + n_absent = n_total` (must be exact)
- Individual Vote records must match Voting aggregates
- `Tyhjää` and `Avstår` both count toward `n_abstain`

## Parliamentary Structure

### Parliamentary Group Membership
- **One group at a time**: No overlapping memberships for same person
- **Group changes**: end_date should align with next start_date (±1 day)
- **Must be within Term**: Group membership only during active parliamentary service

### Session & Section Rules
- Sessions numbered sequentially within parliamentary year (some gaps OK)
- Sections have unique ordinal within session (monotonically increasing)
- Each Section belongs to exactly ONE Session (session_key NOT NULL)
- Each Voting belongs to exactly ONE Section (section_key NOT NULL)

### Terms (Parliamentary Service Periods)
- Standard duration: 4 years
- Start: typically March-May (post-election)
- Overlaps rare except for substitute members (varajäsen)
- Tracked via Term table + PeopleJoining/LeavingParliament

### Electoral Districts (Vaalipiiri)
- Finland has **13 electoral districts** (+ Åland separately = 13-14 total)
- No overlapping district assignments for same person
- All active MPs must have district during their term

## Government & Ministers

### Government Membership Rules
- Ministers are **usually** MPs (allow ~10% exceptions)
- Cannot hold multiple ministries simultaneously
- Ministry field should not be empty
- Government coalition parties identifiable via GovernmentMembership + Representative.party

### Views for Government Analysis
- `InferredGovernmentCoalition`: Party-government mapping by date
- `CurrentGovernmentCoalition`: Active government parties

## Data Quality Thresholds

### Zero Tolerance (Critical Errors)
- NULL person_id, session_key in core tables
- Vote values outside `['Jaa', 'Ei', 'Tyhjää', 'Poissa', 'Avstår']`
- n_total > 200 or < 1
- Individual vote counts (n_yes, etc.) > n_total
- Overlapping parliamentary group memberships

### Warning Thresholds (Acceptable Exceptions)
- Orphaned records (no parent reference): <1%
- MPs without terms: <5%
- Vote totals <100: <1%
- Vote totals = 200: <5%
- Terms without group membership: <2%

## See Also
- `session-agenda-structure.md` - Full documentation of session/section/speech data structure
- `sanity-checks.md` - Comprehensive data validation rules (40+ implemented, 20 recommended)
- `vaski-schema.md` - Detailed schema design notes (to be created)
