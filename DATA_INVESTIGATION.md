# Issue with document parsing

It looks like there is something funny going on with the välikysymys (and perhaps aother document parsing).

For example, the `fetch-docs:erros --document-type välikysymys` lists the following row

```text
EDK-2019-001882        välikysymys                            Välikysymys al-Holin leirillä olevie Not found         404 2026-06-06 07:56:45
```

If I lookup the title from DB (table `Interpellation`), I can find the row

|id|parliament_identifier|source_path|vaski_document_id|
|--|---------------------|-----------|-----------------|
|135599|VK 3/2019 vp|vaski-data/välikysymys/135600#id=135600|135600|

Looking up that ID (135599) from `VaskiData` returns

|id|document_type|edk_identifier|source_path|title|vaski_guid|
|--|-------------|--------------|-----------|-----|----------|
|135599|välikysymys|EDK-2019-001882|vaski-data/välikysymys/135599#id=135599|Välikysymys al-Holin leirillä olevien Suomen kansalaisten tai Suomesta sinne päätyneiden Isis-perheiden kotiuttamisesta ja toimien asianmukaisuudesta|{F4607BD8-18A9-C802-AB81-73CA38C00000}|

That edk_identifier `EDK-2019-001882` is the same as in not found documents.

However, note that the original SQL from Interpellation has vaski_document_id of `135600`.

Looking up that ID (135600) from `VaskiData` returns

|id|document_type|edk_identifier|source_path|title|vaski_guid|
|--|-------------|--------------|-----------|-----|----------|
|135600|välikysymys|EDK-2019-AK-279538|vaski-data/välikysymys/135600#id=135600|Välikysymys al-Holin leirillä olevien Suomen kansalaisten tai Suomesta sinne päätyneiden Isis-perheiden kotiuttamisesta ja toimien asianmukaisuudesta|{5C0FBA72-BD8A-C78E-A7E2-79322200000B}|

Which is the actual correct document (EDK-2019-AK-279538).

That is stored already in the documents it seems (/workspaces/avoimempi-eduskunta/data/documents/5C0FBA72-BD8A-C78E-A7E2-79322200000B.pdf).

## To DO

1. Identify why this happens and why there are duplicated values inside the database.

2. Construct a query to find and validate the DB entries

3. Figure out a best way to address this so duplicates are addressed properly.




