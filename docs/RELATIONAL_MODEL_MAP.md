# Relational Model Map (Vaski-Free Target)

This is the target model for ingesting `vaski-data/` **without any `Vaski*` tables**.

Scope:
- Use existing non-Vaski schema as the backbone (`Session`, `Section`, `Speech`, `Voting`, `Vote`, `Representative`, and existing extension tables).
- Add neutral document/proceedings tables and fields where needed.
- Keep every relationship explicit with cardinality and provenance.

## Evidence From `vaski-data/` Structure

Observed from local folder + payload inspection:
- Dataset layout is strongly taxonomy-based: `vaski-data/<organisation>/<meeting>/<root-family>/<doc-type>/entry-xxxxx.json`.
- Dominant families include: `PoytakirjaAsiakohta`, `Poytakirja`, `PoytakirjaLiite`, `Paivajarjestys`, `KokousPoytakirja`, `Esityslista`, `KasittelytiedotValtiopaivaasia`, `Kysymys`, `EduskunnanVastaus`, `HallituksenEsitys`, `Mietinto`, `Lausunto`, `EduskuntaAloite`.
- In sampled data, minutes-related entries dominate and contain section-level IDs (`@_muuTunnus`, `@_paakohtaTunnus`) plus discussion items.
- Metadata provides stable document identifiers (`@_eduskuntaTunnus`, `AsiakirjatyyppiKoodi`, number/year, `@_identifiointiTunnus`, `@_muuTunnus`) and relation hints (`Vireilletulo`, `AsiakirjaViitteet`).

## Design Principles

1. No `Vaski*` tables in target schema.
2. Existing parliament domain remains primary (`Session`, `Section`, `Speech`, `Voting`).
3. Add one neutral document hub (`Document`) instead of family-specific tables.
4. Keep repeating structures as child tables with clear FKs and ordinals.
5. Ambiguous source IDs are stored with context + provenance before they are used as hard links.

## A) Existing Non-Vaski Backbone (Keep)

### Confirmed existing cardinalities
- `Agenda.key 1 -> N Session.agenda_key`
- `Session.key 1 -> N Section.session_key`
- `Agenda.key 1 -> N Section.agenda_key`
- `Session.key 1 -> N Voting.session_key`
- `Section.key 1 -> N Voting.section_key`
- `Voting.id 1 -> N Vote.voting_id`
- `Representative.person_id 1 -> N Vote.person_id`
- `Session.key 1 -> N Speech.session_key`
- `Section.key 1 -> N Speech.section_key`
- `Representative.person_id 1 -> N Speech.person_id`

### Existing extension tables to keep and reuse
- `VotingDocumentLink`
- `SectionDocumentLink`
- `SessionNotice`
- `VotingDistribution`
- `SaliDBDocumentReference`

## B) New Neutral Document Layer (No Vaski Prefix)

### 1) `Document` (new hub)
Purpose: unify all Vaski-style documents (HE, KK, PTK entries, committee docs, attachments metadata).

Key fields:
- `id` INTEGER PK (source row id from vaski-data entry)
- `eduskunta_tunnus` TEXT
- `type_code` TEXT
- `type_name` TEXT
- `number_text` TEXT
- `parliamentary_year_text` TEXT
- `title` TEXT
- `alt_title` TEXT
- `language_code` TEXT
- `publicity_code` TEXT
- `status_text` TEXT
- `created_at` TEXT
- `laadinta_pvm` TEXT
- `source_identification_id` TEXT (`@_identifiointiTunnus`)
- `source_business_id` TEXT (`@_muuTunnus`)
- `primary_task_code` TEXT (`@_paatehtavaKoodi`)
- `structure_schema_name` TEXT (`@_rakennemaarittelyNimi`)
- `message_type` TEXT
- `message_id` TEXT
- `message_created_at` TEXT
- `transfer_code` TEXT
- `content_root_type` TEXT (`PoytakirjaAsiakohta`, `KasittelytiedotValtiopaivaasia`, etc.)
- `source_path` TEXT (relative file path in `vaski-data/`)

Cardinality:
- `Document 1 -> N DocumentIdentifier`
- `Document 1 -> N DocumentSubject`
- `Document 1 -> N DocumentActor`
- `Document 1 -> N DocumentAttachment`
- `Document 1 -> N DocumentRelation`

### 2) `DocumentIdentifier` (new)
- `document_id` FK -> `Document.id`
- `identifier_type` TEXT (`eduskunta_tunnus`, `eutori_tunnus`, `identifiointi_tunnus`, etc.)
- `identifier_value` TEXT

Cardinality:
- `Document 1 -> N DocumentIdentifier`

### 3) `DocumentSubject` (new)
- `document_id` FK
- `subject_text` TEXT
- `subject_uri` TEXT

### 4) `DocumentActor` (new)
- `document_id` FK
- `role_code` TEXT
- `person_id` INTEGER NULL FK -> `Representative.person_id`
- `first_name`, `last_name`, `position_text`, `organization_text`, `extra_text`

### 5) `DocumentAttachment` (new)
- `document_id` FK
- `native_id`, `use_type`, `file_name`, `file_path`, `format_name`, `format_version`, `hash_algorithm`, `hash_value`

### 6) `DocumentRelation` (new)
- `document_id` FK
- `relation_type` TEXT (`vireilletulo`, `answer_to`, `source_proposal`, `document_reference`, etc.)
- `target_document_tunnus` TEXT
- `target_system` TEXT (`Eduskunta`, `EUR-Lex`, etc.)
- `source_field` TEXT (provenance)

## C) Reusing Existing Session/Section/Speech/Voting Tables

## 1) `Session` additions
From vaski meeting metadata (`KokousViite`, meeting start/end, roll call context):
- `source_meeting_id` TEXT
- `source_meeting_org` TEXT
- `minutes_document_id` INTEGER NULL FK -> `Document.id`
- `agenda_document_id` INTEGER NULL FK -> `Document.id`

Cardinality:
- `Session 1 -> N Section` (existing)
- `Session 1 -> N DocumentSessionLink` (new bridge, below)

## 2) `Section` additions
From `PoytakirjaAsiakohta` / `Poytakirja` item-level metadata:
- `source_section_id` INTEGER NULL (from item-level `@_muuTunnus`)
- `source_parent_section_id` INTEGER NULL (from `@_paakohtaTunnus`)
- `document_id` INTEGER NULL FK -> `Document.id` (primary linked section document if deterministic)
- `document_tunnus` TEXT NULL (denormalized fast lookup)

Cardinality:
- `Section 1 -> N Speech` (existing)
- `Section 1 -> N Voting` (existing)
- `Section N <-> M Document` via `SectionDocumentMap` (new bridge)

## 3) `Speech` additions
From minutes discussion payload:
- `document_id` INTEGER NULL FK -> `Document.id`
- `document_section_ordinal` INTEGER NULL
- `speech_start_time_source` TEXT NULL
- `speech_end_time_source` TEXT NULL
- `speech_link_key` TEXT NULL
- `speech_content` TEXT NULL
- `speech_type_source` TEXT NULL

Note:
- Existing `Speech` row remains canonical for UI/API.
- Vaski minutes content becomes enrichment on the same row when deterministic match exists.

## 4) `Voting` additions
Even if many sampled files did not expose explicit `AanestysToimenpide`, model should support when present:
- `document_id` INTEGER NULL FK -> `Document.id`
- `document_section_ordinal` INTEGER NULL
- `decision_text` TEXT NULL
- `processing_phase_code` TEXT NULL

## D) New Bridge Tables Between Existing Domain and Document Hub

### 1) `SectionDocumentMap` (new)
Purpose: explicit section-to-document linking with provenance/confidence.

Fields:
- `id` PK
- `section_key` FK -> `Section.key`
- `document_id` FK -> `Document.id`
- `link_type` TEXT (`source_section_id_match`, `section_vaski_id_match`, `agenda_tunnus_match`, `manual`)
- `confidence` TEXT (`high`, `medium`, `low`)
- `source_field` TEXT
- `created_at` TEXT

Cardinality:
- `Section N <-> M Document`

### 2) `SessionDocumentMap` (new)
- `session_key` FK -> `Session.key`
- `document_id` FK -> `Document.id`
- `link_type` TEXT (`session_number_year_match`, `agenda_match`, `manual`)
- `confidence` TEXT
- `source_field` TEXT

Cardinality:
- `Session N <-> M Document`

### 3) `DocumentSectionEvent` (new)
Purpose: repeating action timeline under document/section context (`KasittelytiedotValtiopaivaasia` etc.).

- `document_id` FK
- `section_key` NULL FK
- `event_ordinal` INTEGER
- `event_date` TEXT
- `phase_code` TEXT
- `phase_title` TEXT
- `action_code` TEXT
- `action_text` TEXT
- `actor_summary` TEXT

Cardinality:
- `Document 1 -> N DocumentSectionEvent`
- `Section 0..1 -> N DocumentSectionEvent`

## E) How `vaski-data` Families Map to Non-Vaski Domain

### Minutes and agenda families
- `PoytakirjaAsiakohta`, `Poytakirja`, `Paivajarjestys`, `Esityslista`, `KokousPoytakirja`, `KokousSuunnitelma`
- Map primarily into:
  - `Session` (timing/state/meeting metadata)
  - `Section` (title/order/processing/note/source IDs)
  - `Speech` (content/time/type/person enrichment)
  - `SectionDocumentMap` / `SessionDocumentMap`

### Legislative / question / answer / report families
- `HallituksenEsitys`, `Kysymys`, `EduskunnanVastaus`, `Mietinto`, `Lausunto`, `Lakialoite`, `EduskuntaAloite`, `Kirjelma`, `Talousarvio*`
- Map primarily into:
  - `Document` + child tables (`DocumentActor`, `DocumentSubject`, `DocumentRelation`, `DocumentAttachment`)
  - `SaliDBDocumentReference` enrichment where references target known section/voting contexts

### Proceedings families
- `KasittelytiedotValtiopaivaasia`, `KasittelytiedotLausumaasia`
- Map primarily into:
  - `Document`
  - `DocumentSectionEvent`
  - `DocumentRelation`

### Statistical families
- `Tilasto`
- If needed add neutral:
  - `DocumentStatisticGroup(document_id, ordinal, title)`
  - `DocumentStatisticValue(group_id, ordinal, label, value)`

## F) Candidate New Columns by Existing Table

### `Session`
- `source_meeting_id`
- `source_meeting_org`
- `minutes_document_id`
- `agenda_document_id`

### `Section`
- `source_section_id`
- `source_parent_section_id`
- `document_id`
- `document_tunnus`

### `Speech`
- `document_id`
- `document_section_ordinal`
- `speech_link_key`
- `speech_content`
- `speech_type_source`
- `speech_start_time_source`
- `speech_end_time_source`

### `Voting`
- `document_id`
- `document_section_ordinal`
- `decision_text`
- `processing_phase_code`

### `SaliDBDocumentReference`
- add `document_id` FK -> `Document.id` after deterministic tunnus resolution pipeline exists.

## G) Cardinality Summary (Target)

- `Representative 1 -> N DocumentActor`
- `Document 1 -> N DocumentIdentifier`
- `Document 1 -> N DocumentSubject`
- `Document 1 -> N DocumentAttachment`
- `Document 1 -> N DocumentRelation`
- `Document 1 -> N DocumentSectionEvent`
- `Session N <-> M Document` via `SessionDocumentMap`
- `Section N <-> M Document` via `SectionDocumentMap`
- `Section 1 -> N Speech` (existing + enriched)
- `Section 1 -> N Voting` (existing + enriched)
- `Voting 1 -> N Vote` (existing)

## H) Migration Strategy (Next Step)

1. Drop all `Vaski*` tables and stop writing to them.
2. Create neutral tables: `Document`, `DocumentIdentifier`, `DocumentSubject`, `DocumentActor`, `DocumentAttachment`, `DocumentRelation`, `SectionDocumentMap`, `SessionDocumentMap`, `DocumentSectionEvent`.
3. Add proposed columns to `Session`, `Section`, `Speech`, `Voting`.
4. Implement deterministic link rules first (`high` confidence only), store weaker links with lower confidence and provenance.
5. Update server queries to read from `Document*` + map tables instead of any `Vaski*` tables.

## I) Open Mapping Constraints Before Implementation

- Define canonical `document_tunnus` normalizer (`HE 1/2015 vp` vs variants).
- Decide authoritative mapping precedence for section-document linking.
- Define conflict policy when multiple documents match same section/session.
- Define whether low-confidence links are exposed in API or only stored for auditing.

## J) Non-Vaski Table Utilization Matrix

This section explicitly maps every existing non-`Vaski*` table into the target architecture.

### Core plenary process tables
- `Agenda`: keep, enrich with agenda document linkage via `Session.agenda_document_id`.
- `Session`: keep, add source meeting/document linkage columns.
- `Section`: keep, add source section/document linkage columns.
- `Speech`: keep as canonical speech entity, enrich with parsed content/timing/type metadata.
- `Voting`: keep as canonical voting entity, enrich when voting-specific document events exist.
- `Vote`: keep unchanged (already normalized and linked to `Voting` + `Representative`).

### Existing extension/link tables
- `VotingDocumentLink`: keep; can be fed from `DocumentRelation` materialization for voting context.
- `SectionDocumentLink`: keep; optional denormalized surface of `SectionDocumentMap`.
- `SessionNotice`: keep; can receive notice-like events from document event stream where applicable.
- `VotingDistribution`: keep unchanged.
- `SaliDBDocumentReference`: keep; add deterministic `document_id` FK resolution step.

### Representative/person tables (all retained)
- `Representative`: keep unchanged; referenced by `Speech`, `Vote`, and new `DocumentActor`.
- `Term`: keep unchanged.
- `ParliamentaryGroup`: keep unchanged.
- `ParliamentaryGroupMembership`: keep unchanged.
- `ParliamentaryGroupAssignment`: keep unchanged.
- `GovernmentMembership`: keep unchanged.
- `Committee`: keep unchanged.
- `CommitteeMembership`: keep unchanged.
- `District`: keep unchanged.
- `RepresentativeDistrict`: keep unchanged.
- `Education`: keep unchanged.
- `WorkHistory`: keep unchanged.
- `TrustPosition`: keep unchanged.
- `Publications`: keep unchanged.
- `PeopleLeavingParliament`: keep unchanged.
- `PeopleJoiningParliament`: keep unchanged.
- `TemporaryAbsence`: keep unchanged.

### Legacy integration table
- `ExcelSpeech`: optional deprecation path.
  - If still needed for back-compat, keep as derived compatibility view/table from enriched `Speech`.
  - Otherwise replace with deterministic `Speech` matching pipeline and remove after transition.
