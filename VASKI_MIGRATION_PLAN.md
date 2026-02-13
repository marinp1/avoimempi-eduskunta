# Vaski Document Migration Plan

## Overview

Migrate document types from `vaski-data/no-yhteiso/no-kokous/` JSON files into normalized SQLite tables. Each document type gets its own table(s) with purposeful columns (no JSON payloads).

Source data structure: Each document type folder contains `entry-*.json` files. Each JSON file wraps content in a `contents.Siirto` envelope with metadata (`SiirtoMetatieto`) and document body (`SiirtoAsiakirja`).

---

## 1. Nimenhuutoraportti (Roll Call Report)

### Sources (two directories, zero ID overlap, 1518 total entries)

| Source | Files | Date Range | Notes |
|---|---|---|---|
| `vaski-data/no-yhteiso/no-kokous/nimenhuutoraportti/` | 189 | 2015-10-20 to 2026-02-10 | Older format, sparse |
| `vaski-data/Täysistunto/*/nimenhuutoraportti/` | 1329 | 2015-05-05 to 2024-11-13 | Session-organized, denser |

Roll call reports record attendance at plenary sessions. Each report contains a list of absent MPs (with absence reason) and late arrivals (with arrival time).

### Data Analysis

The document body (`PoytakirjaLiite`) is identical across both sources. The difference is in the **metadata envelope**:

**Three metadata patterns** (across all 1518 entries):
1. `EduskuntaTunniste` only (10 entries) — old no-kokous format with `AsiakirjatyyppiKoodi`=PTK, `AsiakirjaNroTeksti`, `ValtiopaivavuosiTeksti`
2. `KokousViite` only (1329 entries) — all Täysistunto entries, with `@_kokousTunnus`="Täysistunto 100/2016 vp" and `@_kokousPvm`
3. Neither (179 entries) — no-kokous entries with EDK-style identifiers only

**Extracting session number and year:**
- From `EduskuntaTunniste`: direct fields `AsiakirjaNroTeksti` + `ValtiopaivavuosiTeksti`
- From `KokousViite.@_kokousTunnus`: parse "Täysistunto {N}/{YYYY} vp"
- From `eduskuntaTunnus` (top-level): parse "PTK {N}/{YYYY} vp" when available
- Fallback: NULL (for 179 entries with only EDK identifiers and no session info)

**Document body** (consistent across all sources):
- `SiirtoAsiakirja.RakenneAsiakirja.PoytakirjaLiite`:
  - Session times: `@_kokousAloitusHetki`, `@_kokousLopetusHetki`
  - `MuuAsiakohta.KohtaSisalto.OsallistujaOsa` — array of 2 elements:
    - `[0]` = absent members (each with first_name, last_name, party abbreviation, absence reason)
    - `[1]` = late arrivals (each with first_name, last_name, party abbreviation, arrival time)
- Absence reasons: `(e)` = parliamentary duties, `(s)` = sickness, `(p)` = family leave, empty = no reason given
- Member IDs available via `@_muuTunnus` (matches `person_id` in Representative table)

### Database Schema

```sql
-- Parent table: one row per roll call report
CREATE TABLE RollCallReport (
    id INTEGER PRIMARY KEY,
    parliament_identifier TEXT NOT NULL,
    session_number INTEGER,
    parliamentary_year INTEGER,
    session_date DATE NOT NULL,
    session_start_time TEXT,
    session_end_time TEXT,
    title TEXT,
    status TEXT,
    created_at TEXT,
    edk_identifier TEXT,
    source_path TEXT NOT NULL
);

-- Child table: one row per absent/late member per report
CREATE TABLE RollCallEntry (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    report_id INTEGER NOT NULL,
    person_id INTEGER,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    party TEXT,
    entry_type TEXT NOT NULL CHECK(entry_type IN ('absent', 'late')),
    absence_reason TEXT CHECK(absence_reason IN ('e', 's', 'p') OR absence_reason IS NULL),
    arrival_time TEXT,
    FOREIGN KEY (report_id) REFERENCES RollCallReport(id),
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE INDEX idx_rollcallentry_report ON RollCallEntry(report_id);
CREATE INDEX idx_rollcallentry_person ON RollCallEntry(person_id);
CREATE INDEX idx_rollcallreport_date ON RollCallReport(session_date);
CREATE INDEX idx_rollcallreport_session ON RollCallReport(session_number, parliamentary_year);
```

### Field Mapping

| Source JSON Path | Target Column | Notes |
|---|---|---|
| `.id` | `RollCallReport.id` | |
| `.eduskuntaTunnus` | `RollCallReport.parliament_identifier` | |
| `.status` | `RollCallReport.status` | |
| `.created` | `RollCallReport.created_at` | |
| `EduskuntaTunniste.AsiakirjaNroTeksti` OR parsed from `KokousViite.@_kokousTunnus` OR parsed from `.eduskuntaTunnus` | `RollCallReport.session_number` | NULL if unparseable |
| `EduskuntaTunniste.ValtiopaivavuosiTeksti` OR parsed from `KokousViite.@_kokousTunnus` | `RollCallReport.parliamentary_year` | NULL if unparseable |
| `JulkaisuMetatieto.@_laadintaPvm` OR `KokousViite.@_kokousPvm` | `RollCallReport.session_date` | |
| `PoytakirjaLiite.@_kokousAloitusHetki` | `RollCallReport.session_start_time` | |
| `PoytakirjaLiite.@_kokousLopetusHetki` | `RollCallReport.session_end_time` | |
| `Nimeke.NimekeTeksti` | `RollCallReport.title` | |
| `JulkaisuMetatieto.@_muuTunnus` | `RollCallReport.edk_identifier` | |
| file path | `RollCallReport.source_path` | Tracks which source directory |
| `Henkilo.@_muuTunnus` | `RollCallEntry.person_id` | |
| `Henkilo.EtuNimi` | `RollCallEntry.first_name` | |
| `Henkilo.SukuNimi` | `RollCallEntry.last_name` | |
| `Henkilo.LisatietoTeksti[0]` | `RollCallEntry.party` | |
| `Henkilo.LisatietoTeksti[1]` | `RollCallEntry.absence_reason` or `arrival_time` | Parsed from parentheses |
| OsallistujaOsa index | `RollCallEntry.entry_type` | 0=absent, 1=late |

### Migrator Must Handle

- Read from **both** source directories
- Deduplicate by `id` (already confirmed zero overlap, but guard against it)
- Three metadata extraction strategies (EduskuntaTunniste, KokousViite, fallback)
- `Toimija` in OsallistujaOsa can be array or single object (when only 1 late arrival)
- Parse absence reason: strip parentheses from `(e)` → `e`, ignore empty strings
- Parse arrival time: strip parentheses from `(14:39)` → `14:39`

---

## 2. Hallituksen Esitys (Government Proposal)

**Source**: 5067 files in `vaski-data/no-yhteiso/no-kokous/hallituksen_esitys/`

Government proposals are the most common legislative document. The source data has two distinct document structures:

1. **Full proposals** (2388 files): Contain `HallituksenEsitys` with complete text content (summary, justifications, law proposals, signatures)
2. **Processing metadata** (2679 files): Contain `KasittelytiedotValtiopaivaasia` with parliamentary processing status and committee referrals

Both variants share the outer envelope (`id`, `eduskuntaTunnus`, `status`, `created`) and metadata (`SiirtoMetatieto.JulkaisuMetatieto`).

### Data Analysis — Full Proposals

Key fields present in 100% of full proposals:
- `IdentifiointiOsa`: document type code (HE), number, parliamentary year, author (minister), title
- `SisaltoKuvaus`: main content summary (array of paragraphs)
- `PerusteluOsa`: justification chapters (numbered, hierarchical)
- `AllekirjoitusOsa`: signatories (always PM + responsible minister)
- `SaadosOsa` (99%): proposed law text(s) — each has a title, lead-in clause, and sections/paragraphs
- `LiiteOsa` (17%): appendices
- Metadata: subjects/keywords with YSO URIs, author minister, document dates

Key insight: The full legislative text (`PerusteluOsa`, `SaadosOsa`) is deeply nested with variable structure (chapters, sections, paragraphs, tables, formulas). Storing this hierarchically in SQL would be extremely complex. **Strategy**: Store the full text as a single concatenated plain-text column for searchability, and store structured metadata in proper columns.

### Data Analysis — Processing Metadata

These entries track parliamentary processing (committee referrals, voting results, final decisions). They have:
- `EduskuntakasittelyPaatosKuvaus`: processing decision description
- `YleinenKasittelyvaihe`: processing stages with dates
- `Asiasanat`: keywords
- `@_viimeisinKasittelyvaiheKoodi`, `@_paattymisPvm`: latest processing stage and end date

### Database Schema

```sql
-- Main government proposal table (one row per document)
CREATE TABLE GovernmentProposal (
    id INTEGER PRIMARY KEY,
    parliament_identifier TEXT NOT NULL,
    document_number INTEGER NOT NULL,
    parliamentary_year INTEGER NOT NULL,
    status TEXT,
    created_at TEXT,
    title TEXT NOT NULL,
    author_title TEXT,
    author_first_name TEXT,
    author_last_name TEXT,
    draft_date DATE,
    language TEXT DEFAULT 'fi',
    document_state TEXT,
    edk_identifier TEXT,
    publicity TEXT,
    summary_text TEXT,
    justification_text TEXT,
    proposal_text TEXT,
    appendix_text TEXT,
    signature_date TEXT,
    signature_location TEXT,
    UNIQUE(document_number, parliamentary_year)
);

-- Signatories of a proposal (PM + minister(s))
CREATE TABLE GovernmentProposalSignatory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER NOT NULL,
    person_title TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    signatory_role TEXT,
    FOREIGN KEY (proposal_id) REFERENCES GovernmentProposal(id)
);

-- Subject keywords/topics linked to proposals
CREATE TABLE GovernmentProposalSubject (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER NOT NULL,
    subject_text TEXT NOT NULL,
    yso_uri TEXT,
    FOREIGN KEY (proposal_id) REFERENCES GovernmentProposal(id)
);

-- Proposed laws within a proposal (a single HE can propose multiple law changes)
CREATE TABLE GovernmentProposalLaw (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    proposal_id INTEGER NOT NULL,
    law_number INTEGER,
    law_type TEXT,
    law_title TEXT NOT NULL,
    lead_clause TEXT,
    law_text TEXT,
    FOREIGN KEY (proposal_id) REFERENCES GovernmentProposal(id)
);

-- Parliamentary processing stages (from KasittelytiedotValtiopaivaasia entries)
CREATE TABLE GovernmentProposalProcessing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parliament_identifier TEXT NOT NULL,
    document_number INTEGER NOT NULL,
    parliamentary_year INTEGER NOT NULL,
    processing_stage TEXT,
    general_processing_stage TEXT,
    stage_date DATE,
    decision_description TEXT,
    latest_stage_code TEXT,
    end_date DATE
);

CREATE INDEX idx_govproposal_year ON GovernmentProposal(parliamentary_year);
CREATE INDEX idx_govproposal_date ON GovernmentProposal(draft_date);
CREATE INDEX idx_govproposalsubject_proposal ON GovernmentProposalSubject(proposal_id);
CREATE INDEX idx_govproposallaw_proposal ON GovernmentProposalLaw(proposal_id);
CREATE INDEX idx_govproposalsignatory_proposal ON GovernmentProposalSignatory(proposal_id);
CREATE INDEX idx_govproposalprocessing_ident ON GovernmentProposalProcessing(parliament_identifier);
```

### Field Mapping — Full Proposals

| Source JSON Path | Target Column |
|---|---|
| `.id` | `GovernmentProposal.id` |
| `.eduskuntaTunnus` | `GovernmentProposal.parliament_identifier` |
| `.status` | `GovernmentProposal.status` |
| `.created` | `GovernmentProposal.created_at` |
| `EduskuntaTunniste.AsiakirjaNroTeksti` | `GovernmentProposal.document_number` |
| `EduskuntaTunniste.ValtiopaivavuosiTeksti` | `GovernmentProposal.parliamentary_year` |
| `Nimeke.NimekeTeksti` | `GovernmentProposal.title` |
| `Toimija.Henkilo.AsemaTeksti` | `GovernmentProposal.author_title` |
| `Toimija.Henkilo.EtuNimi` | `GovernmentProposal.author_first_name` |
| `Toimija.Henkilo.SukuNimi` | `GovernmentProposal.author_last_name` |
| `JulkaisuMetatieto.@_laadintaPvm` | `GovernmentProposal.draft_date` |
| `JulkaisuMetatieto.@_tilaKoodi` | `GovernmentProposal.document_state` |
| `JulkaisuMetatieto.@_muuTunnus` | `GovernmentProposal.edk_identifier` |
| `JulkaisuMetatieto.@_julkisuusKoodi` | `GovernmentProposal.publicity` |
| `SisaltoKuvaus.KappaleKooste` | `GovernmentProposal.summary_text` (joined paragraphs) |
| `PerusteluOsa` | `GovernmentProposal.justification_text` (flattened to plain text) |
| `SaadosOsa` | `GovernmentProposal.proposal_text` (flattened to plain text) |
| `LiiteOsa` | `GovernmentProposal.appendix_text` (flattened to plain text) |
| `AllekirjoitusOsa.PaivaysKooste` | `GovernmentProposal.signature_date` |
| `AllekirjoitusOsa.Allekirjoittaja[]` | `GovernmentProposalSignatory` rows |
| `Aihe[]` | `GovernmentProposalSubject` rows |
| `SaadosOsa.Saados[]` | `GovernmentProposalLaw` rows |

### Text Flattening Strategy

For `justification_text`, `proposal_text`, and `appendix_text`: recursively walk the nested structure, extract all text content (`KappaleKooste`, `#text`, `OtsikkoTeksti`, `MomenttiKooste`, etc.), join with newlines, preserving chapter/section headers. This gives full-text searchability while keeping the schema flat.

---

## Implementation Steps

1. Create migration SQL file: `V002.001__vaski_nimenhuutoraportti.sql`
2. Create migration SQL file: `V002.002__vaski_hallituksen_esitys.sql`
3. Create migrator function: `packages/datapipe/migrator/vaski/nimenhuutoraportti.ts`
4. Create migrator function: `packages/datapipe/migrator/vaski/hallituksen_esitys.ts`
5. Write shared text-flattening utility: `packages/datapipe/migrator/vaski/flatten-text.ts`
6. Register new migrators in the import pipeline
7. Update `VASKI_MIGRATION_STATUS.md` as each type is completed

### Open Questions

- Should `GovernmentProposalProcessing` link to `GovernmentProposal` via FK or just by `parliament_identifier`? Some processing entries may not have a matching full proposal entry.
- Should we store the PDF attachment references (file name, hash)? Currently omitted as they're SFTP paths to internal Eduskunta servers.
