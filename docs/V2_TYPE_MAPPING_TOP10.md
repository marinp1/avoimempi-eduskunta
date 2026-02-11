# V2 Mapping Matrix (Top 10 Types)

This is the first implementation batch for per-type loaders.

## 1) `poytakirjan_asiakohta`
- Source roots:
  - `RakenneAsiakirja.PoytakirjaAsiakohta`
- Targets:
  - `Document` (hub row)
  - `DocType_poytakirjan_asiakohta`
  - `SessionMinutesItem` (`item_type = 'asiakohta'`)
  - `SessionSectionSpeech` (from `KeskusteluToimenpide.PuheenvuoroToimenpide`)
- Key mapping:
  - item `@_muuTunnus` -> `SessionMinutesItem.source_item_id`
  - item `@_paakohtaTunnus` -> `SessionMinutesItem.source_parent_item_id`
  - speech times/content/person -> `SessionSectionSpeech.*`

## 2) `poytakirja`
- Source roots:
  - `RakenneAsiakirja.Poytakirja`
- Targets:
  - `Document`
  - `DocType_poytakirja`
  - `SessionDocumentMap` (`link_type = 'minutes'`)
  - `SessionMinutesItem` where subitems exist

## 3) `paivajarjestys`
- Source roots:
  - `RakenneAsiakirja.Paivajarjestys`
- Targets:
  - `Document`
  - `DocType_paivajarjestys`
  - `SessionDocumentMap` (`link_type = 'agenda'`)
  - `SessionMinutesItem` for listed items

## 4) `nimenhuutoraportti`
- Source roots:
  - commonly from minutes/plenary context
- Targets:
  - `Document`
  - `SessionDocumentMap` (`link_type = 'roll_call_report'`)
  - `Session.roll_call_document_id`

## 5) `hallituksen_esitys`
- Source roots:
  - `RakenneAsiakirja.HallituksenEsitys`
- Targets:
  - `Document`
  - `DocType_hallituksen_esitys`
  - `DocumentRelation` from `Vireilletulo` + references

## 6) `kirjallinen_kysymys`
- Source roots:
  - `RakenneAsiakirja.Kysymys`
- Targets:
  - `Document`
  - `DocType_kirjallinen_kysymys`
  - `DocumentActor` (signers/authors)

## 7) `vastaus_kirjalliseen_kysymykseen`
- Source roots:
  - `RakenneAsiakirja.EduskunnanVastaus`
- Targets:
  - `Document`
  - `DocType_vastaus_kirjalliseen_kysymykseen`
  - `DocumentRelation` (`relation_type = 'answer_to'` when deterministic)

## 8) `valiokunnan_mietinto`
- Source roots:
  - `RakenneAsiakirja.Mietinto`
- Targets:
  - `Document`
  - `DocType_valiokunnan_mietinto`
  - `CommitteeSessionDocumentMap` when committee session context is present

## 9) `valiokunnan_lausunto`
- Source roots:
  - `RakenneAsiakirja.Lausunto`
- Targets:
  - `Document`
  - `DocType_valiokunnan_lausunto`
  - `CommitteeSessionDocumentMap`

## 10) `kasittelytiedotvaltiopaivaasia` (source family)
- Source roots:
  - `RakenneAsiakirja.KasittelytiedotValtiopaivaasia`
- Targets:
  - `Document`
  - `DocumentSectionEvent` (timeline)
  - `DocumentRelation` (AsiakirjaViitteet)

## Cross-cutting mapping for all 10
- Metadata -> `Document` core columns
- `Aihe` -> `DocumentSubject`
- `Toimija` -> `DocumentActor` (with optional `Representative.person_id`)
- `SiirtoTiedosto.Document` -> `DocumentAttachment`
- non-resolvable references remain in `DocumentRelation` with `target_tunnus` only
