# V2 Schema Draft (Per-Type Tables, No `Vaski*`)

This draft follows your direction:
- no `Vaski*` tables
- explicit committee + committee session model
- existing plenary `Session` model stays
- one common `Document` hub table
- one table per document type (including small/rare ones for now)

## 1) Core Domain Tables

## 1.1 Committees
- `Committee`
  - `id` INTEGER PK
  - `slug` TEXT UNIQUE
  - `name_fi` TEXT
  - `kind` TEXT (`valiokunta`, `jaosto`, `other`)

- `CommitteeSession`
  - `id` INTEGER PK
  - `committee_id` INTEGER NOT NULL FK -> `Committee.id`
  - `session_key` TEXT UNIQUE
  - `label` TEXT
  - `number_text` TEXT
  - `parliamentary_year_text` TEXT
  - `start_time` TEXT
  - `end_time` TEXT
  - `source_path` TEXT

Cardinality:
- `Committee 1 -> N CommitteeSession`

## 1.2 Plenary Sessions (existing + appended from Täysistunto)
- Reuse existing `Session` table as canonical plenary session.
- Add FK-style document links:
  - `roll_call_document_id` INTEGER NULL FK -> `Document.id`
  - `agenda_document_id` INTEGER NULL FK -> `Document.id`
  - `minutes_document_id` INTEGER NULL FK -> `Document.id`

## 1.3 Minutes Items (merge Asiakohta + MuuAsiakohta)
- `SessionMinutesItem`
  - `id` INTEGER PK
  - `session_key` TEXT NOT NULL FK -> `Session.key`
  - `minutes_document_id` INTEGER NOT NULL FK -> `Document.id`
  - `item_type` TEXT NOT NULL (`asiakohta`, `muu_asiakohta`, `budjetin_alikohta`)
  - `ordinal` INTEGER
  - `title` TEXT
  - `identifier_text` TEXT
  - `processing_title` TEXT
  - `note` TEXT
  - `source_item_id` INTEGER NULL (`@_muuTunnus`)
  - `source_parent_item_id` INTEGER NULL (`@_paakohtaTunnus`)

Cardinality:
- `Session 1 -> N SessionMinutesItem`
- `Document 1 -> N SessionMinutesItem` (for minutes docs)

## 1.4 Minutes Attachments (Liite)
- `SessionMinutesAttachment`
  - `id` INTEGER PK
  - `session_key` TEXT NOT NULL FK -> `Session.key`
  - `minutes_document_id` INTEGER NOT NULL FK -> `Document.id`
  - `minutes_item_id` INTEGER NULL FK -> `SessionMinutesItem.id`
  - `title` TEXT
  - `related_document_tunnus` TEXT
  - `file_name` TEXT
  - `file_path` TEXT
  - `native_id` TEXT

## 1.5 Separate Speech Load Table (required)
- `SessionSectionSpeech`
  - `id` INTEGER PK
  - `session_key` TEXT NOT NULL FK -> `Session.key`
  - `section_key` TEXT NOT NULL FK -> `Section.key`
  - `minutes_item_id` INTEGER NULL FK -> `SessionMinutesItem.id`
  - `source_document_id` INTEGER NULL FK -> `Document.id`
  - `section_ordinal` INTEGER NULL
  - `speech_ordinal` INTEGER NULL
  - `person_id` INTEGER NULL FK -> `Representative.person_id`
  - `first_name` TEXT
  - `last_name` TEXT
  - `party` TEXT
  - `position` TEXT
  - `speech_type` TEXT
  - `start_time` TEXT
  - `end_time` TEXT
  - `content` TEXT
  - `link_key` TEXT
  - `source_item_id` INTEGER NULL
  - `source_path` TEXT

Notes:
- This table is loaded in a separate import step from other document content.
- Canonical query path for speech text becomes `SessionSectionSpeech`.
- Existing `Speech` can remain for compatibility, but should be progressively derived or deprecated.

## 2) Common Document Hub

- `Document`
  - `id` INTEGER PK (source id)
  - `type_slug` TEXT NOT NULL
  - `type_name_fi` TEXT
  - `root_family` TEXT
  - `eduskunta_tunnus` TEXT
  - `document_type_code` TEXT
  - `document_number_text` TEXT
  - `parliamentary_year_text` TEXT
  - `title` TEXT
  - `alternative_title` TEXT
  - `status_text` TEXT
  - `language_code` TEXT
  - `publicity_code` TEXT
  - `created_at` TEXT
  - `laadinta_pvm` TEXT
  - `source_identifiointi_tunnus` TEXT
  - `source_muu_tunnus` TEXT
  - `message_type` TEXT
  - `message_id` TEXT
  - `message_created_at` TEXT
  - `transfer_code` TEXT
  - `organization_slug` TEXT
  - `organization_name` TEXT
  - `meeting_slug` TEXT
  - `source_path` TEXT

Supporting tables:
- `DocumentActor(document_id, role_code, person_id, first_name, last_name, position_text, organization_text, extra_text)`
- `DocumentSubject(document_id, subject_text, subject_uri)`
- `DocumentAttachment(document_id, native_id, use_type, file_name, file_path, format_name, format_version, hash_algorithm, hash_value)`
- `DocumentRelation(document_id, relation_type, target_tunnus, target_system, source_field)`

## 3) Per-Type Tables (Draft Inventory)

Rule:
- one per-type table with `document_id` as PK/FK -> `Document.id`
- add extracted fields incrementally per type
- small tables can later be merged into `DocumentOther` if usage is low

Naming convention:
- `DocType_<slug>`

Initial per-type table list from current `no-yhteiso/no-kokous/*` taxonomy:

- `DocType_asialista`
- `DocType_asiantuntijalausunnon_liite`
- `DocType_asiantuntijalausunto`
- `DocType_asiantuntijasuunnitelma`
- `DocType_asiat_joiden_kasittely_on_paattynyt_valtiopaivilla_xxxx`
- `DocType_asioiden_maara_vaalikausittain`
- `DocType_budjetin_alikohta`
- `DocType_eduskunnan_kirjelma`
- `DocType_eduskunnan_vastaus`
- `DocType_eduskunnassa_vvvv_valtiopaivilla_kasittelyssa_olevat_asiat`
- `DocType_eduskuntatyon_jarjestaminen`
- `DocType_erikoisvaliokunnissa_kasiteltavina_olevat_taysistuntoasiat_ja_niiden_valmistumisarviot`
- `DocType_erikoisvaliokunnissa_kasiteltavana_olevat_eu_asiat`
- `DocType_erikoisvaliokuntien_antamat_lausunnot_ja_kannanotot_u_e_ja_utp_asioista_vaalikaudella`
- `DocType_esityslista`
- `DocType_eun_asiakirjaluonnos`
- `DocType_eun_raportti`
- `DocType_eurooppa_neuvoston_ja_eun_neuvostojen_kokoukset`
- `DocType_hakemisto`
- `DocType_hallituksen_esitys`
- `DocType_ilmoitus_asiantuntijalle`
- `DocType_istuntosuunnitelma`
- `DocType_kannanotto`
- `DocType_kansalaisaloite`
- `DocType_kertomus`
- `DocType_keskustelualoite`
- `DocType_kirjallinen_kysymys`
- `DocType_kirjelma_saadoskokoelmaan`
- `DocType_kokoussuunnitelma`
- `DocType_lakialoite`
- `DocType_lausuma`
- `DocType_lepaamaan_hyvaksytty_lakiehdotus`
- `DocType_liiteasiakirja`
- `DocType_lisaselvitys`
- `DocType_lisatalousarvioaloite`
- `DocType_ministerien_sidonnaisuudet`
- `DocType_ministerion_selvitys`
- `DocType_muu_asia`
- `DocType_muu_asiakirja`
- `DocType_nimenhuutoraportti`
- `DocType_peruuttamisilmoitus`
- `DocType_peruutuskirjelma`
- `DocType_puhemiesneuvoston_ehdotus`
- `DocType_paivajarjestys`
- `DocType_paaministerin_ilmoitus`
- `DocType_poytakirja`
- `DocType_poytakirjan_asiakohta`
- `DocType_poytakirjan_liite`
- `DocType_poytakirjan_muu_asiakohta`
- `DocType_suullinen_kysymys`
- `DocType_suv_asialista`
- `DocType_talousarvioaloite`
- `DocType_tilastotietoja_valiokunnista_valtiopaivilla_xxxx`
- `DocType_toimenpidealoite`
- `DocType_toissijaisuusasia`
- `DocType_toissijaisuusasioiden_lista`
- `DocType_taysistunnon_poytakirjan_paasivu`
- `DocType_taysistunnon_poytakirjat`
- `DocType_unknown`
- `DocType_vaali`
- `DocType_vahvistamatta_jaanyt_laki`
- `DocType_valiokunnan_lausunto`
- `DocType_valiokunnan_mietinto`
- `DocType_valiokunnan_oma_asia`
- `DocType_valiokunnissa_kasiteltavina_olevat_taysistuntoasiat`
- `DocType_valiokuntien_poytakirjat`
- `DocType_valtioneuvostolta_saapuneet_u_asiat_ministerioittain_vaalikaudella_xxxx_yyyy`
- `DocType_valtioneuvoston_e_jatkokirjelma`
- `DocType_valtioneuvoston_e_selvitys`
- `DocType_valtioneuvoston_kirjelma`
- `DocType_valtioneuvoston_selonteko`
- `DocType_valtioneuvoston_tiedonanto`
- `DocType_valtioneuvoston_u_jatkokirjelma`
- `DocType_valtioneuvoston_u_kirjelma`
- `DocType_valtioneuvoston_utp_jatkokirjelma`
- `DocType_valtioneuvoston_utp_selvitys`
- `DocType_vapautuspyynto`
- `DocType_vastaus_kirjalliseen_kysymykseen`
- `DocType_vastaus_saadoskokoelmaan`
- `DocType_vastine`
- `DocType_viikkosuunnitelma`
- `DocType_valikysymys`

## 4) Required Cross-Links

- `SectionDocumentMap(section_key, document_id, link_type, confidence, source_field)`
- `SessionDocumentMap(session_key, document_id, link_type, confidence, source_field)`
- `CommitteeSessionDocumentMap(committee_session_id, document_id, role, confidence, source_field)`

Cardinality:
- `Section N <-> M Document`
- `Session N <-> M Document`
- `CommitteeSession N <-> M Document`

## 5) Migration Phases

1. Create new neutral schema (`Document*`, `CommitteeSession`, map tables, per-type tables).
2. Import `vaski-data` into `Document` + per-type tables first.
3. Populate link tables with deterministic rules (`high` confidence only).
4. Append/enrich existing `Session`, `Section`, `Speech`, `Voting` from linked docs.
5. Load `SessionSectionSpeech` in a dedicated phase after section linking.
6. Backfill lower-confidence links (kept queryable but flagged).

## 6) Open Decisions Before SQL

- Should `DocType_unknown` stay as dedicated table or be split by `root_family`?
- For very small types, keep one table each now, but define merge threshold (e.g. `< 500 rows`) for future consolidation.
- Define strict normalization for `eduskunta_tunnus` matching to avoid false joins.

## 7) Query Migration Note

Server SQL queries still target legacy `Vaski*` tables in multiple places.
After data migration is validated, queries must be updated to use:
- `Document` + `DocType_*`
- `SessionMinutesItem`
- `SessionSectionSpeech`
- `SectionDocumentMap` / `SessionDocumentMap` / `CommitteeSessionDocumentMap`
