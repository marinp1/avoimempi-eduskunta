# Vaski Migration Overplan

## Purpose

This document is the one reference for deciding what to migrate next from `VaskiData`.
Use this instead of re-investigating document types ad hoc.

Snapshot date: 2026-02-17

## Current Coverage Snapshot

Data source: `vaski-data/index.json` and current Vaski submigrators.

- Indexed Vaski document types: `83`
- Indexed Vaski records: `235,045`
- Fully migrated records (7 types): `43,503` (`18.5%`)

Fully migrated types:

- `hallituksen_esitys`
- `välikysymys`
- `kirjallinen_kysymys`
- `valiokunnan_mietintö`
- `valiokunnan_lausunto`
- `pöytäkirja`
- `nimenhuutoraportti`

Partially consumed as dependency:

- `vastaus_kirjalliseen_kysymykseen` is read inside `kirjallinen_kysymys` flush logic (answer linkage), but has no dedicated table/API surface.

## Prioritization Method

Score each candidate with these four signals:

1. Session-link impact
- Measured from `Section.minutes_related_document_identifier` prefix frequency.
- Higher means immediate UI/query value in session views.

2. Content value
- Whether type carries substantive text (`PerusteluOsa`, `PonsiOsa`, etc.) vs only process metadata.

3. Migration leverage
- Whether shape matches already migrated patterns (especially `KasittelytiedotValtiopaivaasia` dual-document merge pattern).

4. Delivery risk
- Identifier quality, schema clarity, and expected parse edge cases.

## Session Reference Pressure (Current DB)

Top identifier prefixes in section references:

| Prefix | Mentions | Distinct identifiers | Status |
|---|---:|---:|---|
| `HE` | 10,478 | 2,431 | migrated |
| `SKT` | 2,034 | 2,034 | not migrated |
| `LA` | 830 | 748 | not migrated |
| `VAA` | 783 | 783 | migrated (committee statement) |
| `VAP` | 690 | 689 | migrated (committee report) |
| `K` | 690 | 231 | mixed/unclear bucket |
| `KAA` | 199 | 78 | not migrated |
| `VK` | 144 | 48 | migrated |
| `KA` | 95 | 95 | not migrated |
| `TPA` | 12 | 12 | not migrated |

## Candidate Analysis

### Recommended Next Meaningful Type: `lakialoite`

Why this is the best next step:

- High real linkage pressure: `LA` appears 830 times in section references.
- Legislative substance: about half of rows are full-content initiative bodies.
- Proven merge pattern: split between full body + `KasittelytiedotValtiopaivaasia` mirrors migrated types.
- Manageable size: `1,595` records (smaller than `talousarvioaloite`, large enough to matter).

Observed structure for `lakialoite`:

- Root type split:
  - `Lakialoite`: `763`
  - `KasittelytiedotValtiopaivaasia`: `764`
  - `null/other`: `68`
- Identifier prefix: almost entirely `LA`.

### Why not pick `suullinen_kysymys` first

`suullinen_kysymys` is a strong quick win (`SKT` 2,034 references), but its records are essentially processing metadata only (`KasittelytiedotValtiopaivaasia`, no substantive body text). It should be the immediate follow-up after `lakialoite`.

### Why not pick high-volume expert material first

Types like `asiantuntijalausunto` are huge in volume, but have weak direct document-identifier linkage in section references and less immediate product impact.

## Overplan (Execution Order)

### Phase 1: `lakialoite` (next)

1. Add migration schema for a new initiative domain table set (`LegislativeInitiative*`) keyed by Vaski id and parliament identifier (`LA N/YYYY vp`).
2. Implement `packages/datapipe/migrator/VaskiData/submigrators/lakialoite.ts` with UPSERT merge of:
- full body variant (`Lakialoite`)
- processing variant (`KasittelytiedotValtiopaivaasia`)
3. Link to `VaskiDocument` and set `VaskiDocument.title` from parsed title when available.
4. Add server queries/endpoints and client list/detail surface (same UX level as current `HE/VK/KK/VAP/VAA` pages).
5. Add migrator tests following `kirjallinen_kysymys` / `välikysymys` patterns.

### Phase 2: initiative family expansion (shared parser utilities)

Use same schema/parser approach for:

- `talousarvioaloite` (`TAA`, 9,463 records)
- `toimenpidealoite` (`TPA`, 1,952)
- `keskustelualoite` (`KA`, 326)
- `kansalaisaloite` (`KAA`, 158)

Goal: one shared extraction utility module + thin per-type submigrators.

### Phase 3: `suullinen_kysymys`

- Add dedicated table/migrator for `SKT` documents (2,052 records, 2,034 session mentions).
- Focus on session linkage and lifecycle fields; no expectation of long content body.

### Phase 4: committee process/supporting materials

Defer until core legislative/session-linked types above are complete:

- `asiantuntijalausunto`
- `asiantuntijalausunnon_liite`
- `pöytäkirjan_asiakohta`
- `esityslista`

## Revalidation Checklist (when dataset refreshes)

Run these checks before changing priority:

1. Recompute type totals from `vaski-data/index.json`.
2. Recompute section reference prefix frequencies from `Section.minutes_related_document_identifier`.
3. Verify root-shape split for candidate types (`rootType` distribution).
4. If prefix pressure shifts materially, reorder phases.

If the above checks are stable, keep this order unchanged.

## Decision

Current decision: migrate `lakialoite` next.

Immediate next after that: `suullinen_kysymys`, then remaining initiative family.
