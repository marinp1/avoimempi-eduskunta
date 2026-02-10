# Sanity Test Failure Analysis (DB samples)

## Voting → Session orphans (top session_key counts)
- 2006/137: 448
- 2004/145: 367
- 2014/133: 262
- 2005/142: 258
- 2007/102: 246
- 2002/170: 237
- 2013/135: 235
- 2012/134: 228
- 2010/134: 224
- 2010/133: 220

Sample orphan Voting rows:
- id=29843 session_key=2014/175 number=11 start_time=2015-03-14T10:16:00.82
- id=29849 session_key=2014/175 number=10 start_time=2015-03-14T10:14:09.627
- id=29833 session_key=2014/175 number=9 start_time=2015-03-14T10:12:45.43
- id=29853 session_key=2014/175 number=8 start_time=2015-03-14T10:11:56.683
- id=29835 session_key=2014/175 number=7 start_time=2015-03-14T10:10:35.363

## VotingDocumentLink orphans (top voting_id counts)
- voting_id=25672: 1090
- voting_id=25674: 1090
- voting_id=25676: 1090
- voting_id=25680: 1090
- voting_id=25682: 1090
- voting_id=25686: 1090
- voting_id=25706: 1090
- voting_id=25708: 1090
- voting_id=25710: 1090
- voting_id=25712: 1090

## VotingDistribution orphans (top voting_id counts)
- voting_id=13260: 30
- voting_id=13262: 30
- voting_id=13264: 30
- voting_id=13266: 30
- voting_id=13268: 30
- voting_id=13270: 30
- voting_id=13272: 30
- voting_id=13274: 30
- voting_id=13276: 30
- voting_id=13278: 30

## Vote orphans (top voting_id counts)
- voting_id=55584: 199
- voting_id=55586: 199
- voting_id=55588: 199
- voting_id=55590: 199

## Sections missing title (sample)
- id=7346 key=ZkaereLfX5TYLrH session_key=2018/50 ordinal=15 title=
- id=11420 key=TWxnjYfMX2J133q session_key=2020/91 ordinal=15 title=

## Duplicate section ordinals (top)
- session_key=2018/69 ordinal=3 count=3
- session_key=2018/69 ordinal=4 count=3
- session_key=2018/70 ordinal=3 count=3
- session_key=2021/92 ordinal=12 count=3
- session_key=2017/126 ordinal=9 count=2
- session_key=2018/100 ordinal=15 count=2
- session_key=2018/101 ordinal=4 count=2
- session_key=2018/101 ordinal=6 count=2
- session_key=2018/105 ordinal=21 count=2
- session_key=2018/109 ordinal=5 count=2

## Voting temporal mismatches (sample)
- id=46987 session_key=2021/57 start_time=2021-05-14T12:19:49 session_date=2021-05-12
- id=27313 session_key=2014/132 start_time=2014-12-17T11:06:19.563 session_date=2015-03-03
- id=27311 session_key=2014/132 start_time=2014-12-17T11:06:02.01 session_date=2015-03-03
- id=27309 session_key=2014/132 start_time=2014-12-17T11:05:46.23 session_date=2015-03-03
- id=27307 session_key=2014/132 start_time=2014-12-17T11:05:29.41 session_date=2015-03-03

## Voting section_key missing Section (sample)
- id=55592 section_key=HqLSmhYKSs9BcNb session_key=2025/110
- id=55600 section_key=yrCKDo3rEp9yDFi session_key=2025/112
- id=55630 section_key=EP14f8IjiU3WOJp session_key=2025/114

## SectionDocumentLink orphans (top section_key counts)
- section_key=3GGnnoYJuIJm7GP: 3
- section_key=5g4jG9HmKXAk7Xo: 3
- section_key=82UcfvCqqRB1dTT: 3
- section_key=FhUWzUR4KuQcZqM: 3
- section_key=IUUek4n8BWdFI3I: 3
- section_key=WbqssQilyJnORuG: 3
- section_key=nr2vJ5KWQa9Y4mn: 3
- section_key=1FsKzAuHvQIDEKi: 2
- section_key=3xIogBzAp2jdNsL: 2
- section_key=4IQGI6TKztCjVxJ: 2

## SessionNotice.section_key orphans (top)
- section_key=3GGnnoYJuIJm7GP: 1
- section_key=NOVcKhyDftmQ0Vy: 1
- section_key=TAAfiTeXowxYPLH: 1
- section_key=jmCiJ0e42oSNRux: 1
- section_key=nkwRUmNpomKjepR: 1
- section_key=u8pe6eEfpDingHf: 1

## SaliDBDocumentReference.section_key orphans (top)
- section_key=3GGnnoYJuIJm7GP: 3
- section_key=5g4jG9HmKXAk7Xo: 3
- section_key=82UcfvCqqRB1dTT: 3
- section_key=FhUWzUR4KuQcZqM: 3
- section_key=IUUek4n8BWdFI3I: 3
- section_key=WbqssQilyJnORuG: 3
- section_key=nr2vJ5KWQa9Y4mn: 3
- section_key=1FsKzAuHvQIDEKi: 2
- section_key=3xIogBzAp2jdNsL: 2
- section_key=4IQGI6TKztCjVxJ: 2

## Committee membership date invalid (sample)
- id=14102 person_id=911749 committee_code=pmt01 start_date=1932-5-01 end_date=1932-1-01

## Parliament size >200 (top dates)
- date=2019-05-02 mp_count=201
- date=2019-05-03 mp_count=201
- date=2019-05-07 mp_count=201
- date=2019-05-10 mp_count=201
- date=2019-05-14 mp_count=201
- date=2019-05-17 mp_count=201
- date=2019-05-21 mp_count=201
- date=2019-05-28 mp_count=201
- date=2019-06-04 mp_count=201
- date=2019-06-06 mp_count=201

## Missing ParliamentaryGroupMembership (sample)
- date=2019-06-28 person_id=175
- date=2019-06-27 person_id=175
- date=2019-06-26 person_id=175
- date=2019-06-25 person_id=175
- date=2019-06-25 person_id=175
- date=2019-06-19 person_id=175
- date=2019-06-18 person_id=175
- date=2019-06-14 person_id=175
- date=2019-06-13 person_id=175
- date=2019-06-12 person_id=175

## Voting n_total mismatch (sample)
- voting_id=34376 n_total=199 actual_votes=198
- voting_id=34384 n_total=199 actual_votes=198
- voting_id=34386 n_total=199 actual_votes=198
- voting_id=34388 n_total=199 actual_votes=198
- voting_id=34390 n_total=199 actual_votes=198
- voting_id=34392 n_total=199 actual_votes=198
- voting_id=34394 n_total=199 actual_votes=198
- voting_id=34396 n_total=199 actual_votes=198
- voting_id=34398 n_total=199 actual_votes=198
- voting_id=34400 n_total=199 actual_votes=198

## Voting per-type mismatch (sample)
- voting_id=34376 n_yes=107 actual_yes=107 n_no=63 actual_no=63 n_abstain=0 actual_abstain=0 n_absent=29 actual_absent=28
- voting_id=34384 n_yes=101 actual_yes=101 n_no=62 actual_no=62 n_abstain=0 actual_abstain=0 n_absent=36 actual_absent=35
- voting_id=34386 n_yes=101 actual_yes=101 n_no=62 actual_no=62 n_abstain=0 actual_abstain=0 n_absent=36 actual_absent=35
- voting_id=34388 n_yes=101 actual_yes=101 n_no=61 actual_no=61 n_abstain=0 actual_abstain=0 n_absent=37 actual_absent=36
- voting_id=34390 n_yes=101 actual_yes=101 n_no=47 actual_no=47 n_abstain=13 actual_abstain=13 n_absent=38 actual_absent=37
- voting_id=34392 n_yes=103 actual_yes=103 n_no=60 actual_no=60 n_abstain=0 actual_abstain=0 n_absent=36 actual_absent=35
- voting_id=34394 n_yes=100 actual_yes=100 n_no=62 actual_no=62 n_abstain=0 actual_abstain=0 n_absent=37 actual_absent=36
- voting_id=34396 n_yes=101 actual_yes=101 n_no=62 actual_no=62 n_abstain=0 actual_abstain=0 n_absent=36 actual_absent=35
- voting_id=34398 n_yes=101 actual_yes=101 n_no=62 actual_no=62 n_abstain=0 actual_abstain=0 n_absent=36 actual_absent=35
- voting_id=34400 n_yes=104 actual_yes=104 n_no=52 actual_no=52 n_abstain=4 actual_abstain=4 n_absent=39 actual_absent=38

## Cross-checks
- Session key `2014/175` (example from orphaned Voting rows) does **not** exist in `Session` table.
- The same key was **not found** in `data/raw/SaliDBIstunto` or `data/parsed/SaliDBIstunto` (no matches for `2014/175`), suggesting missing source data for SaliDBIstunto or incomplete scraping.

## Raw/Parsed Lookup Findings
- `SaliDBAanestys` **does** contain rows for `IstuntoVPVuosi=2014` and `IstuntoNumero=175` (22 rows), including `AanestysId=29833` (the orphan Voting sample).
- `SaliDBIstunto` raw/parsed data has **zero** rows for `2014/175`. This explains the large `Voting → Session` orphan count and likely cascades to Vote/VotingDocumentLink/VotingDistribution.
- Parsed `SaliDBIstunto` for year 2014 includes unusual high session numbers (e.g., `2014/777` on 2015-01-28), but still **no** `2014/175`.
- Sections missing title come from `SaliDBKohta` rows where **Finnish title is empty but Swedish exists**:
  - `Id=7346` (`TekninenAvain=ZkaereLfX5TYLrH`): `OtsikkoFI=""`, `OtsikkoSV` present.
  - `Id=11420` (`TekninenAvain=TWxnjYfMX2J133q`): `OtsikkoFI=""`, `OtsikkoSV` present.
  => Migrator currently uses Finnish fields only, so title becomes empty.
- Duplicate section ordinals are present in **raw/parsed SaliDBKohta**:
  - `IstuntoTekninenAvain=2018/69` and `Jarjestysnumero=3` has **three** rows with distinct `TekninenAvain` and titles.
  => Source data itself has duplicate ordinals; we need a deterministic disambiguation strategy in migrator.
- Section keys that appear in `SectionDocumentLink`/`SessionNotice`/`SaliDBDocumentReference` orphans (e.g. `3GGnnoYJuIJm7GP`) do **not** exist in `data/parsed/SaliDBKohta`, indicating missing Section source data for those keys.
- Raw vs parsed mismatch for `SaliDBKohta` page 228:
  - `data/raw/SaliDBKohta/page_228.json` has **100 rows** (includes missing keys like `5g4jG9HmKXAk7Xo`).
  - `data/parsed/SaliDBKohta/page_228.json` has **5 rows**.
  => Parsed data is stale/partial; parser likely wasn’t re-run after raw updates. Re-parse with `--force` should restore missing Section keys and reduce orphan counts.

## SaliDBIstunto Cutoff (raw data boundary)
- Raw `SaliDBIstunto` contains 17 pages and ID range `1..1657`.
- Earliest record in full raw set:
  - `Id=1`, `TekninenAvain=2014/257`, `IstuntoPvm=2014-06-02 00:00:00`, `Created=2014-06-02 10:01:11.017` (`page_1.json`)
- Latest record in full raw set:
  - `Id=1657`, `TekninenAvain=2026/4`, `IstuntoPvm=2026-02-09 22:00:00`, `Created=2026-02-09 11:12:22` (`page_17.json`)
- `page_1.json` starts at `2014/257` and ends at `2014/95`.
- Conclusion: sessions older than the June 2014 cutoff are not present in raw SaliDBIstunto. Missing session keys like `2014/175` are below the captured lower bound for this table snapshot.

## Classification
### Source-cutoff / source-exception
- `Voting -> Session` orphans (`11059`): primarily caused by missing `SaliDBIstunto` sessions below cutoff.
- `VotingDocumentLink -> Voting` orphans (`507523`): mostly downstream of missing Voting parent set from same cutoff chain.
- `VotingDistribution -> Voting` orphans (`6790`): downstream of missing Voting parents.
- `Vote -> Voting` orphans (`796`): downstream of missing Voting parents.
- `Voting n_total mismatch` (`50`) and `per-type mismatch` (`50`): likely source anomalies in historic vote attendance counts (sample differs by one absent vote).
- `Voting temporal mismatch` (`351`): likely source-level session-date vs voting-time inconsistencies.
- `Parliament size >200` (`21`) and group-membership completeness (`22`/`22`): historical membership data gap for person `175` during 2019-04-16..2019-07-02.
- `CommitteeMembership start_date > end_date` (`1`): single malformed historical row (`id=14102`).

### Pipeline-fixable
- `Section title missing` (`2`): Finnish title empty while Swedish exists; add fallback in `SaliDBKohta` migrator.
- `Section duplicate ordinals` (`447`): source has duplicates; apply deterministic ordinal disambiguation strategy in `SaliDBKohta` migrator.
- `SectionDocumentLink / SessionNotice.section_key / SaliDBDocumentReference.section_key` orphans (`148` / `6` / `148`): tied to stale parsed `SaliDBKohta` page data; fix by re-parsing missing/partial pages.
- `Voting.section_key missing Section` (`3`): likely same `SaliDBKohta` gap.

## Parser Freshness Checks
- `SaliDBIstunto`: raw pages `17`, parsed pages `17`, row-count mismatches `0`.
- `SaliDBKohta`: raw pages `233`, parsed pages `233`, but row-count mismatch on `page_228`:
  - raw `100`, parsed `5` (missing `95` rows).
- `SaliDBAanestys`: raw pages `430`, parsed pages `430`, row-count mismatch on `page_423`:
  - raw `100`, parsed `93` (missing `7` rows).

## Recommended Order
1. Re-parse `SaliDBKohta` and `SaliDBAanestys` with `--force` (or at minimum pages `228` and `423`) and rebuild DB.
2. Re-run `bun test sanity` and re-measure counts.
3. Implement `SaliDBKohta` title fallback and ordinal disambiguation if failures remain.
4. Separate remaining failures into accepted source exceptions vs optional data-repair rules.

## Post-Rebuild Status (after forced parse + DB rebuild)
Current `bun test sanity`: **12 failures** (down from 17).

Resolved by rebuild:
- `SectionDocumentLink references existing Section` (was 148 orphans) -> now pass.
- `SessionNotice.section_key references existing Section` (was 6 orphans) -> now pass.
- `SaliDBDocumentReference.section_key references existing Section` (was 148 orphans) -> now pass.
- `Vote references existing Voting` (was 796 orphans) -> now pass.
- `Voting.section_key references existing Section` (was 3 orphans) -> now pass.

Still failing:
- `Section title missing` (2)
- `Section duplicate ordinals` (450)
- `Parliament size > 200` (21 dates)
- `Voting n_total mismatch` (50)
- `Voting -> Session orphans` (11059)
- `VotingDocumentLink -> Voting` orphans (507523)
- `VotingDistribution -> Voting` orphans (6790)
- `Voting per-type mismatch` (50)
- `Voting temporal mismatch` (351)
- `CommitteeMembership start_date > end_date` (1)
- `Parliamentary group completeness` (22)
- `Group count matches active MPs` (22)

## Duplicate Ordinal Investigation (source-level)
Inspected duplicate buckets directly from parsed `SaliDBKohta` rows:
- `2018/69`, ordinal `3` has three distinct items:
  - `Hallintovaliokunnan täydennysvaali` (`pj=vaa 71/2018 vp`)
  - `Ilmoituksia` (`pj=64097`)
  - `Hallituksen esitys ... metsästyslain muuttamisesta` (`pj=he 83/2018 vp`)
- `2018/70`, ordinal `3` has three distinct items:
  - `Eija Nivalan vapautuspyyntö ...` (`pj=vap 48/2018 vp`)
  - `Ilmoituksia` (`pj=64187`)
  - `Hallituksen esitykset` (`pj=64244`)
- `2021/92`, ordinal `12` has three distinct items with different titles and `PJKohtaTunnus` values.

Interpretation:
- These are not simple duplicate inserts of the same record. Source contains multiple distinct agenda items sharing the same `Jarjestysnumero` within one session.
- Enforcing uniqueness on `(session_key, ordinal)` would collapse real source entries.
- If strict ordering uniqueness is required by tests, we need a deterministic secondary order key in migrated data (e.g. keep source `ordinal` plus a computed tie-breaker/order column), not record deletion.

Concrete source-history example (same agenda item, changed order):
- `Id=7580` (raw page_75) and `Id=10296` (raw page_102) both represent the same item:
  - same `IstuntoTekninenAvain=2018/69`
  - same `VaskiID=64163`
  - same `Tunniste=19`
  - same `PJKohtaTunnus=he 180/2017 vp`
  - same title
- But `Jarjestysnumero` differs:
  - `7580 -> 22`
  - `10296 -> 2`
- DB timestamps show the second row is later:
  - `7580.created_datetime=2018-06-19T13:36:34`
  - `10296.created_datetime=2019-11-27T09:59:43`
- This supports the hypothesis that source republishes/updates session agenda ordering over time, while retaining old records.
