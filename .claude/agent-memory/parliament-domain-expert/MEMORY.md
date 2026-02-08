# Parliament Domain Expert Memory

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

## See Also
- `vaski-schema.md` - Detailed schema design notes (to be created)
