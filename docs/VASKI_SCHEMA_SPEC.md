# Vaski Full Normalization Schema Spec (Draft)

## Goals
- Store **all Finnish VaskiData fields** in a **meaningful, relational schema**.
- No raw JSON/XML blobs in the database.
- Every XML field is mapped to a clear table + column.
- Replace legacy `VaskiDocument`/`DocumentSubject`/`DocumentRelationship` and `ExcelSpeech` with the new schema.

## Core Principles
- **One Vaski entry = one `VaskiDocument` row** (no dedup in the base table).
- **Flatten first**: prefer meaningful columns on per-family tables rather than generic tables.
- **Only create new tables** when there is a clear, high-value reason (e.g., true 1:N relationships).
- All repeating XML structures become **child tables** with explicit FK and `ordinal`.
- Link to existing domain tables whenever possible (e.g., `person_id` -> `Representative.person_id`).

## Canonical Tables

### 1) Base Document
**`VaskiDocument`**
- `id` (PK, VaskiData.Id)
- `eduskunta_tunnus`
- `document_type_name`
- `document_type_code`
- `language_code`
- `publicity_code`
- `status`
- `created`
- `attachment_group_id`
- `version_text`
- `laadinta_pvm`
- `muu_tunnus`
- `paatehtava_koodi`
- `rakennemaarittely_nimi`
- `message_type` (SanomatyyppiNimi)
- `message_id` (SanomaTunnus)
- `message_created` (LuontiHetki)
- `transfer_code` (SiirtoKoodi)
- `meeting_id` (KokousViite.@_kokousTunnus)
- `meeting_org` (KokousViite.YhteisoTeksti)

### 2) Identification and Linking
**`VaskiIdentifier`**
- `document_id` (FK)
- `identifier_type` (e.g., `eduskunta_tunnus`, `eutori_tunnus`, `asiakirja_nro`, `valtiopaivavuosi`)
- `identifier_value`

**`VaskiRelationship`**
- `document_id` (FK)
- `relationship_type` (e.g., `vireilletulo`, `answer_to`, `source_proposal`)
- `target_eduskunta_tunnus`

### 3) Actors
**`VaskiDocumentActor`**
- `document_id` (FK)
- `role_code` (laatija, allekirjoittaja, lahettaja, vastaanottaja, etc.)
- `person_id` (FK -> `Representative.person_id`, if available)
- `first_name`, `last_name`
- `position_text`
- `organization_text`
- `extra_text`

### 4) Subjects
**`VaskiSubject`**
- `document_id` (FK)
- `subject_text`
- `yso_url`

### 5) Attachments
**`VaskiAttachment`**
- `document_id` (FK)
- `native_id`
- `use_type`
- `file_name`
- `file_path`
- `format_name`
- `format_version`
- `hash_algorithm`
- `hash_value`

### 6) Textual Content (Flattened)
Instead of generic text tables, store text content on the **per-family tables** as dedicated columns:
- `summary_text`
- `question_text`
- `answer_text`
- `justification_text`
- `proposal_text`
- `decision_text`
- `statement_text`
- `content_text`

Only create a new table if a structure is **truly repeating** (e.g., multiple statements or decisions).

### 7) Meetings / Agenda
**`VaskiMeeting`** (for meeting-based documents)
- `document_id` (FK)
- `meeting_start`
- `meeting_end`
- `meeting_title`

**`VaskiAgendaItem`**
- `document_id` (FK)
- `ordinal`
- `title`
- `note`
- `identifier`
- `processing_title`
- `related_document_tunnus`

### 8) Minutes / Speeches
**`VaskiMinutesSection`**
- `document_id` (FK)
- `agenda_item_identifier`
- `ordinal`
- `title`

**`VaskiMinutesSpeech`**
- `document_id` (FK)
- `section_ordinal`
- `ordinal`
- `person_id` (FK -> `Representative.person_id`, if available)
- `first_name`, `last_name`
- `party`
- `position`
- `speech_type`
- `start_time`, `end_time`
- `content`

### 9) Statistics
**`VaskiStatistic`**
- `document_id` (FK)
- `title`
- `subtitle`
- `time_range`

**`VaskiStatisticGroup`**
- `stat_id` (FK)
- `group_title`

**`VaskiStatisticValue`**
- `group_id` (FK)
- `label`
- `value`

---

## Document Families and Expected Components

Each family gets a per-type table **only if it has unique fields beyond shared components**. Otherwise it uses the shared tables.

1. **HallituksenEsitys**
   - Flatten: `summary_text`, `justification_text`, `proposal_text`, `statute_text`, `signing_text`
2. **EduskuntaAloite** / **Lakialoite**
   - Flatten: `summary_text`, `justification_text`, `proposal_text`, `signing_text`
3. **Kysymys** / **EduskunnanVastaus**
   - Flatten: `question_text`, `answer_text`, `statement_text`
4. **Mietinto** / **Lausunto**
   - Flatten: `summary_text`, `decision_text`, `statement_text`, `justification_text`, `minority_opinion_text`
5. **Poytakirja** / **PoytakirjaAsiakohta**
   - Flatten for headers; keep `VaskiMinutesSection` + `VaskiMinutesSpeech` for repeated items.
6. **Paivajarjestys** / **Esityslista**
   - Flatten agenda metadata; `VaskiAgendaItem` for repeated items.
7. **KokousPoytakirja** / **KokousSuunnitelma**
   - Flatten meeting metadata; `VaskiMeetingParticipant` / `VaskiAgendaItem` for repeats.
8. **TalousarvioKirjelma** / **TalousarvioMietinto** / **SaadoskokoelmaTalousarvioKirjelma**
   - Flatten: `budget_justification_text`, `decision_text`, `statute_text`
   - Only create `VaskiBudgetTable` if table structures are repeated and meaningful.
9. **Tilasto**
   - Keep `VaskiStatisticGroup` / `VaskiStatisticValue` tables (true 1:N data).

---

## Mapping Rules (Strict)
- Every XML field must map to **one and only one** column.
- Prefer **flattening into the per-family table**.
- Create a new table **only** for true repeated structures or shared entities.
- Always link to existing domain tables where possible (e.g., `person_id` -> `Representative`).

A mapping registry will be maintained in code (`VaskiMapping.ts`) with full coverage checks.

---

## Sanity Checks
- Count parity: number of FI VaskiData entries = `COUNT(VaskiDocument)`.
- No orphan rows in child tables.
- Every document has at least one component row (or explicit empty markers).
- `VaskiMinutesSpeech` coverage vs `Speech` table (link ratio > threshold).

---

## Migration Strategy
1. Replace legacy `VaskiDocument`, `DocumentSubject`, `DocumentRelationship`, `ExcelSpeech` usage.
2. Create new Vaski schema tables.
3. Implement new Vaski migrator with full mapping coverage.
4. Add sanity checks.

---

## Next Implementation Steps
- Create detailed **field mapping registry** from `vaski-schema.json` for each family.
- Implement migrator to write into the new schema tables.
- Update server queries/UI to use the new schema.

---

## Example Mappings (Initial)

### Example 1: `HallituksenEsitys` (Government Proposal)

**Primary table:** `VaskiGovernmentProposal`

Columns (flattened, human-readable):
- `document_id` (FK -> `VaskiDocument.id`)
- `title` (from IdentifiointiOsa.Nimeke.NimekeTeksti)
- `alternative_title` (IdentifiointiOsa.Nimeke.@_vaihtoehtoinenNimekeTeksti)
- `document_number` (IdentifiointiOsa.EduskuntaTunniste.AsiakirjaNroTeksti)
- `parliamentary_year` (IdentifiointiOsa.EduskuntaTunniste.ValtiopaivavuosiTeksti)
- `summary_text` (SisaltoKuvaus.KappaleKooste)
- `justification_text` (PerusteluOsa.KappaleKooste)
- `proposal_text` (PonsiOsa.KappaleKooste)
- `statute_text` (SaadosOsa.KappaleKooste)
- `signing_text` (AllekirjoitusOsa.KappaleKooste)
- `attachment_note` (LiiteOsa.KappaleKooste)

**Child tables (only when truly repeating):**
- `VaskiGovernmentProposalAttachment` (if LiiteOsa has multiple entries)
  - `document_id`, `ordinal`, `title`, `text`
- `VaskiGovernmentProposalSigner` (if multiple signers appear)
  - `document_id`, `ordinal`, `person_id` (FK -> `Representative`), `first_name`, `last_name`, `role`, `organization`

**Linking rules:**
- `person_id` from `Henkilo.@_muuTunnus` when present -> `Representative.person_id`
- `Vireilletulo.EduskuntaTunnus` -> `VaskiRelationship` with `relationship_type = 'vireilletulo'`

---

### Example 2: `PoytakirjaAsiakohta` (Minutes Section)

**Primary table:** `VaskiMinutesSection`

Columns (flattened):
- `document_id` (FK -> `VaskiDocument.id`)
- `agenda_item_identifier` (Asiakohta.Tunniste / KohtaTunniste if present)
- `section_ordinal` (Asiakohta.@_jarjestysNro or similar ordering field)
- `title` (Asiakohta.Otsikko or KohtaAsia.Nimeke)
- `processing_title` (Asiakohta.Kasittelyotsikko)
- `note` (Asiakohta.Huomautus)

**Child tables (necessary):**
- `VaskiMinutesSpeech`
  - `document_id`
  - `section_ordinal`
  - `ordinal` (PuheenvuoroJNro)
  - `person_id` (Henkilo.@_muuTunnus -> `Representative.person_id`)
  - `first_name`, `last_name`
  - `party`
  - `position`
  - `speech_type`
  - `start_time`, `end_time`
  - `content` (flattened KappaleKooste)

**Linking rules:**
- If `section_ordinal` or `agenda_item_identifier` matches `Section` (SaliDBKohta), link for cross-navigation.
- `person_id` must be linked to `Representative` when present.

---

These two examples will be used as templates to define the remaining 20 families.

---

## Cross-Table Link Notes (SaliDB* -> Vaski)

These are **observed from parsed data** in `data/parsed/<TableName>`.

### Confirmed direct link
- **`SaliDBKohta.VaskiID`** -> `VaskiDocument.id`

### Likely document tunnus links (string-based)
These fields contain document identifiers like `HE 218/2013 vp`, `MmVM 9/1996`.\n
They should be mapped to **`VaskiDocument.eduskunta_tunnus`** where possible.

- **`SaliDBAanestysAsiakirja`**
  - `Asiakirja` (e.g., `MmVM 9/1996`) -> `VaskiDocument.eduskunta_tunnus`
  - `AsiakirjaUrl` (path contains doc info) can be a fallback
- **`SaliDBKohtaAsiakirja`**
  - `LinkkiUrlFI` / `LinkkiUrlSV` contain document identifiers (e.g., `HE 218/2013 vp`)

### Session/section linkage (non‑Vaski but critical)
- **`SaliDBTiedote`**
  - Links to `SaliDBIstunto` via `IstuntoTekninenAvain`
  - Links to `SaliDBKohta` via `KohtaTekninenAvain` (optional)
- **`SaliDBKohtaAanestys`**
  - Links `SaliDBAanestys` -> `SaliDBKohta` using `KohtaTekninenAvain`

### Potential / to verify
- **`SaliDBAanestys`**
  - `AanestysValtiopaivaasia` and `AanestysValtiopaivaasiaUrl` may point to a Vaski document tunnus\n
  - `AanestysPoytakirja` could align with Vaski `Poytakirja` docs

These links should be validated during migration with lookup tables (by `eduskunta_tunnus`) and explicit sanity checks.

### Example 3: `Kysymys` (Written Question)

**Primary table:** `VaskiWrittenQuestion`

Columns (flattened):
- `document_id`
- `title` (IdentifiointiOsa.Nimeke.NimekeTeksti)
- `document_number` (EduskuntaTunniste.AsiakirjaNroTeksti)
- `parliamentary_year` (EduskuntaTunniste.ValtiopaivavuosiTeksti)
- `question_text` (KysymysOsa.KappaleKooste)
- `justification_text` (PerusteluOsa.KappaleKooste)
- `proposal_text` (PonsiOsa.KappaleKooste)
- `signing_text` (AllekirjoitusOsa.KappaleKooste)

**Child tables (only if repeating):**
- `VaskiWrittenQuestionSigner`

**Linking rules:**
- `person_id` from signers -> `Representative`

---

### Example 4: `EduskunnanVastaus` (Answer)

**Primary table:** `VaskiWrittenAnswer`

Columns (flattened):
- `document_id`
- `title`
- `document_number`
- `parliamentary_year`
- `answer_text` (PaatosOsa / LausumaKannanottoOsa / SisaltoKuvaus as applicable)
- `statement_text` (LausumaKannanottoOsa.KappaleKooste)
- `signing_text` (AllekirjoitusOsa.KappaleKooste)

**Linking rules:**
- `Vireilletulo.EduskuntaTunnus` -> `VaskiRelationship` (`answer_to`)

---

### Example 5: `Mietinto` (Committee Report)

**Primary table:** `VaskiCommitteeReport`

Columns (flattened):
- `document_id`
- `title`
- `document_number`
- `parliamentary_year`
- `summary_text` (SisaltoKuvaus)
- `decision_text` (PaatosOsa)
- `statement_text` (LausumaKannanottoOsa)
- `justification_text` (PerusteluOsa)
- `minority_opinion_text` (JasenMielipideOsa)

**Child tables (only if repeating):**
- `VaskiCommitteeReportMinorityOpinion` (if multiple opinions)

**Linking rules:**
- `Vireilletulo.EduskuntaTunnus` -> `VaskiRelationship` (`source_proposal`)

---

### Example 6: `Lausunto` (Committee Opinion)

**Primary table:** `VaskiCommitteeOpinion`

Columns (flattened):
- `document_id`
- `title`
- `document_number`
- `parliamentary_year`
- `summary_text` (SisaltoKuvaus)
- `decision_text` (PaatosOsa)
- `statement_text` (LausumaKannanottoOsa)
- `justification_text` (PerusteluOsa)
- `minority_opinion_text` (JasenMielipideOsa)

**Child tables (only if repeating):**
- `VaskiCommitteeOpinionMinorityOpinion`

**Linking rules:**
- `Vireilletulo.EduskuntaTunnus` -> `VaskiRelationship` (`source_proposal`)

---

### Example 7: `Lakialoite` (Legislative Initiative)

**Primary table:** `VaskiLegislativeInitiative`

Columns (flattened):
- `document_id`
- `title`
- `document_number`
- `parliamentary_year`
- `summary_text` (SisaltoKuvaus)
- `justification_text` (PerusteluOsa)
- `proposal_text` (PonsiOsa)
- `statute_text` (SaadosOsa)
- `signing_text` (AllekirjoitusOsa)

---

### Example 8: `EduskuntaAloite` (Parliament Initiative)

**Primary table:** `VaskiParliamentInitiative`

Columns (flattened):
- `document_id`
- `title`
- `document_number`
- `parliamentary_year`
- `summary_text`
- `justification_text`
- `proposal_text`
- `signing_text`

---

### Example 9: `Kirjelma` (Letter)

**Primary table:** `VaskiLetter`

Columns (flattened):
- `document_id`
- `title`
- `document_number`
- `parliamentary_year`
- `summary_text` (SisaltoKuvaus)
- `memo_text` (MuistioOsa)
- `signing_text` (AllekirjoitusOsa)

---

### Example 10: `Paivajarjestys` (Agenda)

**Primary table:** `VaskiAgenda`

Columns (flattened):
- `document_id`
- `meeting_start`
- `meeting_end`
- `agenda_state` (ennakkotietoTilaKoodi / tilaKoodi)

**Child tables:**
- `VaskiAgendaItem` (Asiakohta, MuuAsiakohta)
  - `document_id`, `ordinal`, `title`, `identifier`, `note`, `processing_title`, `related_document_tunnus`

---

### Example 11: `Esityslista` (Meeting Agenda)

**Primary table:** `VaskiMeetingAgenda`

Columns (flattened):
- `document_id`
- `meeting_start`
- `meeting_end`

**Child tables:**
- `VaskiAgendaItem`
- `VaskiMeetingParticipant` (OsallistujaOsa)

---

### Example 12: `KokousPoytakirja` (Meeting Minutes)

**Primary table:** `VaskiMeetingMinutes`

Columns (flattened):
- `document_id`
- `meeting_start`
- `meeting_end`
- `summary_text`

**Child tables:**
- `VaskiAgendaItem`
- `VaskiMeetingParticipant`
- `VaskiMinutesSpeech` (if speeches present)

---

### Example 13: `KokousSuunnitelma` (Meeting Plan)

**Primary table:** `VaskiMeetingPlan`

Columns (flattened):
- `document_id`
- `plan_text` (SuunnitelmaSisalto)

**Child tables:**
- `VaskiMeeting` (Kokous)
- `VaskiMeetingEvent` (Tapahtuma)

---

### Example 14: `Poytakirja` (Plenary Minutes)

**Primary table:** `VaskiPlenaryMinutes`

Columns (flattened):
- `document_id`
- `meeting_start`
- `meeting_end`
- `summary_text`

**Child tables:**
- `VaskiMinutesSection`
- `VaskiMinutesSpeech`

---

### Example 15: `PoytakirjaLiite` (Minutes Attachment)

**Primary table:** `VaskiMinutesAttachment`

Columns (flattened):
- `document_id`
- `title`
- `related_document_tunnus`

---

### Example 16: `KasittelytiedotValtiopaivaasia` (Processing Info)

**Primary table:** `VaskiProceedingInfo`

Columns (flattened):
- `document_id`
- `status_text`
- `end_date`
- `last_processing_phase`
- `last_general_phase`
- `decision_description`

---

### Example 17: `KasittelytiedotLausumaasia` (Statement Processing Info)

**Primary table:** `VaskiStatementProceedingInfo`

Columns (flattened):
- `document_id`
- `statement_text`
- `decision_text`

---

### Example 18: `TalousarvioKirjelma` (Budget Letter)

**Primary table:** `VaskiBudgetLetter`

Columns (flattened):
- `document_id`
- `summary_text`
- `budget_justification_text`
- `decision_text`
- `statute_text`

**Child tables (only if table structures appear):**
- `VaskiBudgetTable`

---

### Example 19: `TalousarvioMietinto` (Budget Report)

**Primary table:** `VaskiBudgetReport`

Columns (flattened):
- `document_id`
- `summary_text`
- `budget_justification_text`
- `decision_text`
- `minority_opinion_text`

**Child tables (only if multiple opinions):**
- `VaskiBudgetReportMinorityOpinion`

---

### Example 20: `SaadoskokoelmaEduskunnanVastaus`

**Primary table:** `VaskiStatuteCollectionAnswer`

Columns (flattened):
- `document_id`
- `statute_text`
- `signing_text`

---

### Example 21: `SaadoskokoelmaTalousarvioKirjelma`

**Primary table:** `VaskiStatuteCollectionBudgetLetter`

Columns (flattened):
- `document_id`
- `budget_justification_text`
- `statute_text`
- `decision_text`

---

### Example 22: `Tilasto` (Statistics)

**Primary table:** `VaskiStatistic`

Columns (flattened):
- `document_id`
- `title`
- `subtitle`
- `time_range`

**Child tables (necessary):**
- `VaskiStatisticGroup`
- `VaskiStatisticValue`
