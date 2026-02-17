# Vaski Document Migration Status

Tracks which document types from `vaski-data/no-yhteiso/no-kokous/` have been migrated into the SQLite database.

Source: 83 indexed document types in `vaski-data/index.json`.

## Migrated

| Document Type | Table(s) | File Count | Migration | Notes |
|---|---|---|---|---|
| `nimenhuutoraportti` | RollCallReport, RollCallEntry | 1518 | V002.001 | Roll call attendance data |
| `hallituksen_esitys` | GovernmentProposal + 4 child tables | 5067 | V002.002 | 2388 full content + 2679 processing metadata, UPSERT merge |
| `välikysymys` | Interpellation + 3 child tables | ~200 | V001.010 | Interpellation questions, UPSERT merge (Kysymys + Kasittelytiedot) |
| `kirjallinen_kysymys` | WrittenQuestion + 3 child tables | 13996 | V001.012 | Written questions, UPSERT merge (Kysymys + Kasittelytiedot + KKV answers from `vastaus_kirjalliseen_kysymykseen`) |
| `valiokunnan_mietintö` | CommitteeReport + 2 child tables | ~2684 | V001.014 | Committee reports with members and experts, single Mietinto body type |
| `valiokunnan_lausunto` | CommitteeReport + 2 child tables (shared) | ~3381 | V001.015 | Committee statements, reuses CommitteeReport with recipient_committee column |

## Planned (Next)

| Document Type | File Count | Priority | Notes |
|---|---|---|---|
| `lakialoite` | 1595 | P1 | Next meaningful type. High session linkage (`LA` references), meaningful legislative content, and compatible with existing dual-variant UPSERT migration pattern. See `VASKI_MIGRATION_OVERPLAN.md`. |
| `suullinen_kysymys` | 2052 | P2 | Highest unmigrated session-link pressure (`SKT` references). Mostly processing metadata; fast follow-up after `lakialoite`. |

## Not Yet Planned

<details>
<summary>All 84 document types</summary>

- asialista
- asiantuntijalausunnon_liite
- asiantuntijalausunto
- asiantuntijasuunnitelma
- asiat,_joiden_käsittely_on_päättynyt_valtiopäivillä_xxxx
- asiat_joiden_käsittely_on_päättynyt_valtiopäivillä_xxxx
- asioiden_määrä_vaalikausittain
- budjetin_alikohta
- eduskunnan_kirjelmä
- eduskunnan_vastaus
- eduskunnassa_vvvv_valtiopäivillä_käsittelyssä_olevat_asiat
- eduskuntatyön_järjestäminen
- erikoisvaliokunnissa_käsiteltävänä_olevat_eu-asiat
- erikoisvaliokunnissa_käsiteltävinä_olevat_täysistuntoasiat_ja_niiden_valmistumisarviot
- erikoisvaliokuntien_antamat_lausunnot_ja_kannanotot_u-,_e-_ja_utp-asioista_vaalikaudella
- erikoisvaliokuntien_antamat_lausunnot_ja_kannanotot_u-_e-_ja_utp-asioista_vaalikaudella
- esityslista
- eun-asiakirjaluonnos
- eun-raportti
- eurooppa-neuvoston_ja_eun_neuvostojen_kokoukset
- hakemisto
- hallituksen_esitys
- ilmoitus_asiantuntijalle
- istuntosuunnitelma
- kannanotto
- kansalaisaloite
- kertomus
- keskustelualoite
- kirjallinen_kysymys
- kirjelmä_säädöskokoelmaan
- kokoussuunnitelma
- lakialoite
- lausuma
- lepäämään_hyväksytty_lakiehdotus
- liiteasiakirja
- lisäselvitys
- lisätalousarvioaloite
- ministerien_sidonnaisuudet
- ministeriön_selvitys
- muu_asia
- muu_asiakirja
- nimenhuutoraportti
- pääministerin_ilmoitus
- päiväjärjestys
- peruuttamisilmoitus
- peruutuskirjelmä
- pöytäkirja
- pöytäkirjan_asiakohta
- pöytäkirjan_liite
- pöytäkirjan_muu_asiakohta
- puhemiesneuvoston_ehdotus
- suullinen_kysymys
- suv_asialista
- talousarvioaloite
- täysistunnon_pöytäkirjan_pääsivu
- täysistunnon_pöytäkirjat
- tilastotietoja_valiokunnista_valtiopäivillä_xxxx
- toimenpidealoite
- toissijaisuusasia
- toissijaisuusasioiden_lista
- unknown
- vaali
- vahvistamatta_jäänyt_laki
- välikysymys
- valiokunnan_lausunto
- valiokunnan_mietintö
- valiokunnan_oma_asia
- valiokunnissa_käsiteltävinä_olevat_täysistuntoasiat
- valiokuntien_pöytäkirjat
- valtioneuvostolta_saapuneet_u-asiat_ministeriöittäin_vaalikaudella_xxxx-yyyy
- valtioneuvoston_e-jatkokirjelmä
- valtioneuvoston_e-selvitys
- valtioneuvoston_kirjelmä
- valtioneuvoston_selonteko
- valtioneuvoston_tiedonanto
- valtioneuvoston_u-jatkokirjelmä
- valtioneuvoston_u-kirjelmä
- valtioneuvoston_utp-jatkokirjelmä
- valtioneuvoston_utp-selvitys
- vapautuspyyntö
- vastaus_kirjalliseen_kysymykseen
- vastaus_säädöskokoelmaan
- vastine
- viikkosuunnitelma

</details>
