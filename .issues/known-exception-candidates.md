# Known Exception Candidates

Generated: 2026-02-13T15:54:53.125Z  
Database: `/workspaces/avoimempi-eduskunta/avoimempi-eduskunta.db`

This report lists failing sanity checks with concrete candidate rows. It does not classify root cause.

## Section → Session links

- Category: Referential Integrity
- Description: All sections must reference existing sessions
- Current details: 15 orphaned sections

### Sections with missing Session

- Count: 15
- [0hyJPevKCCOfRvU] Section 0hyJPevKCCOfRvU viittaa puuttuvaan session_key=2026/5 (https://avoindata.eduskunta.fi)
- [2CwSeYE4gkE1JYj] Section 2CwSeYE4gkE1JYj viittaa puuttuvaan session_key=2026/5 (https://avoindata.eduskunta.fi)
- [8rd2Ohuefdhe0IB] Section 8rd2Ohuefdhe0IB viittaa puuttuvaan session_key=2026/5 (https://avoindata.eduskunta.fi)
- [DpPa4dqG9jZk6Ha] Section DpPa4dqG9jZk6Ha viittaa puuttuvaan session_key=2026/5 (https://avoindata.eduskunta.fi)
- [PO8hY1Wam52pP6r] Section PO8hY1Wam52pP6r viittaa puuttuvaan session_key=2026/5 (https://avoindata.eduskunta.fi)
- [RUHy7fu6JxKrddB] Section RUHy7fu6JxKrddB viittaa puuttuvaan session_key=2026/5 (https://avoindata.eduskunta.fi)
- [VLQNoHMupxYhlmY] Section VLQNoHMupxYhlmY viittaa puuttuvaan session_key=2026/5 (https://avoindata.eduskunta.fi)
- [YsojCfNLY6Rvsao] Section YsojCfNLY6Rvsao viittaa puuttuvaan session_key=2026/5 (https://avoindata.eduskunta.fi)
- [dDudyvEhcZhedJC] Section dDudyvEhcZhedJC viittaa puuttuvaan session_key=2026/5 (https://avoindata.eduskunta.fi)
- [g6WLczsG6S3Bi02] Section g6WLczsG6S3Bi02 viittaa puuttuvaan session_key=2026/5 (https://avoindata.eduskunta.fi)
- [i55vHCB4sfJZHj9] Section i55vHCB4sfJZHj9 viittaa puuttuvaan session_key=2026/5 (https://avoindata.eduskunta.fi)
- [kK9BA0vht6FOkLc] Section kK9BA0vht6FOkLc viittaa puuttuvaan session_key=2026/5 (https://avoindata.eduskunta.fi)
- [nl4FQ31jQhchwzc] Section nl4FQ31jQhchwzc viittaa puuttuvaan session_key=2026/5 (https://avoindata.eduskunta.fi)
- [qiuGHhvOuEKr1mB] Section qiuGHhvOuEKr1mB viittaa puuttuvaan session_key=2026/5 (https://avoindata.eduskunta.fi)
- [updxL9I2gLddyNm] Section updxL9I2gLddyNm viittaa puuttuvaan session_key=2026/5 (https://avoindata.eduskunta.fi)

## Parliament size limit

- Category: Business Logic
- Description: Active MPs should never exceed 200 on any date
- Current details: 21 dates with >200 MPs

### Session dates with active MPs > 200

- Count: 21
- [2019-05-02] Päivä 2019-05-02: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-05-03] Päivä 2019-05-03: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-05-07] Päivä 2019-05-07: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-05-10] Päivä 2019-05-10: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-05-14] Päivä 2019-05-14: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-05-17] Päivä 2019-05-17: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-05-21] Päivä 2019-05-21: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-05-28] Päivä 2019-05-28: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-06-04] Päivä 2019-06-04: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-06-06] Päivä 2019-06-06: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-06-07] Päivä 2019-06-07: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-06-11] Päivä 2019-06-11: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-06-12] Päivä 2019-06-12: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-06-13] Päivä 2019-06-13: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-06-14] Päivä 2019-06-14: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-06-18] Päivä 2019-06-18: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-06-19] Päivä 2019-06-19: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-06-25] Päivä 2019-06-25: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-06-26] Päivä 2019-06-26: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-06-27] Päivä 2019-06-27: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)
- [2019-06-28] Päivä 2019-06-28: aktiivisia edustajia 201 (https://avoindata.eduskunta.fi)

## Voting → Session links

- Category: Referential Integrity
- Description: All votings must reference existing sessions
- Current details: 11059 orphaned votings

### Votings with missing Session

- Count: 11059
- [13259] Äänestys 13259, session_key=1996/112 (/aanestystulos/1/112/1996)
- [13261] Äänestys 13261, session_key=1996/112 (/aanestystulos/2/112/1996)
- [13263] Äänestys 13263, session_key=1996/112 (/aanestystulos/3/112/1996)
- [13265] Äänestys 13265, session_key=1996/124 (/aanestystulos/1/124/1996)
- [13267] Äänestys 13267, session_key=1996/128 (/aanestystulos/1/128/1996)
- [13269] Äänestys 13269, session_key=1996/128 (/aanestystulos/10/128/1996)
- [13271] Äänestys 13271, session_key=1996/128 (/aanestystulos/11/128/1996)
- [13273] Äänestys 13273, session_key=1996/128 (/aanestystulos/2/128/1996)
- [13275] Äänestys 13275, session_key=1996/128 (/aanestystulos/3/128/1996)
- [13277] Äänestys 13277, session_key=1996/128 (/aanestystulos/4/128/1996)
- [13279] Äänestys 13279, session_key=1996/128 (/aanestystulos/5/128/1996)
- [13281] Äänestys 13281, session_key=1996/128 (/aanestystulos/6/128/1996)
- [13283] Äänestys 13283, session_key=1996/128 (/aanestystulos/7/128/1996)
- [13285] Äänestys 13285, session_key=1996/128 (/aanestystulos/8/128/1996)
- [13287] Äänestys 13287, session_key=1996/128 (/aanestystulos/9/128/1996)
- [13289] Äänestys 13289, session_key=1996/132 (/aanestystulos/1/132/1996)
- [13291] Äänestys 13291, session_key=1996/137 (/aanestystulos/1/137/1996)
- [13293] Äänestys 13293, session_key=1996/137 (/aanestystulos/10/137/1996)
- [13295] Äänestys 13295, session_key=1996/137 (/aanestystulos/2/137/1996)
- [13297] Äänestys 13297, session_key=1996/137 (/aanestystulos/3/137/1996)
- [13299] Äänestys 13299, session_key=1996/137 (/aanestystulos/4/137/1996)
- [13301] Äänestys 13301, session_key=1996/137 (/aanestystulos/5/137/1996)
- [13303] Äänestys 13303, session_key=1996/137 (/aanestystulos/6/137/1996)
- [13305] Äänestys 13305, session_key=1996/137 (/aanestystulos/7/137/1996)
- [13307] Äänestys 13307, session_key=1996/137 (/aanestystulos/8/137/1996)
- [13309] Äänestys 13309, session_key=1996/137 (/aanestystulos/9/137/1996)
- [13311] Äänestys 13311, session_key=1996/138 (/aanestystulos/1/138/1996)
- [13313] Äänestys 13313, session_key=1996/143 (/aanestystulos/1/143/1996)
- [13315] Äänestys 13315, session_key=1996/143 (/aanestystulos/10/143/1996)
- [13317] Äänestys 13317, session_key=1996/143 (/aanestystulos/11/143/1996)
- [13319] Äänestys 13319, session_key=1996/143 (/aanestystulos/12/143/1996)
- [13321] Äänestys 13321, session_key=1996/143 (/aanestystulos/13/143/1996)
- [13323] Äänestys 13323, session_key=1996/143 (/aanestystulos/14/143/1996)
- [13325] Äänestys 13325, session_key=1996/143 (/aanestystulos/15/143/1996)
- [13327] Äänestys 13327, session_key=1996/143 (/aanestystulos/2/143/1996)
- [13329] Äänestys 13329, session_key=1996/143 (/aanestystulos/3/143/1996)
- [13331] Äänestys 13331, session_key=1996/143 (/aanestystulos/4/143/1996)
- [13333] Äänestys 13333, session_key=1996/143 (/aanestystulos/5/143/1996)
- [13335] Äänestys 13335, session_key=1996/143 (/aanestystulos/6/143/1996)
- [13337] Äänestys 13337, session_key=1996/143 (/aanestystulos/7/143/1996)
- [13339] Äänestys 13339, session_key=1996/143 (/aanestystulos/8/143/1996)
- [13341] Äänestys 13341, session_key=1996/143 (/aanestystulos/9/143/1996)
- [13343] Äänestys 13343, session_key=1996/146 (/aanestystulos/1/146/1996)
- [13345] Äänestys 13345, session_key=1996/151 (/aanestystulos/1/151/1996)
- [13347] Äänestys 13347, session_key=1996/151 (/aanestystulos/2/151/1996)
- [13349] Äänestys 13349, session_key=1996/151 (/aanestystulos/3/151/1996)
- [13351] Äänestys 13351, session_key=1996/151 (/aanestystulos/4/151/1996)
- [13353] Äänestys 13353, session_key=1996/151 (/aanestystulos/5/151/1996)
- [13355] Äänestys 13355, session_key=1996/151 (/aanestystulos/6/151/1996)
- [13357] Äänestys 13357, session_key=1996/152 (/aanestystulos/1/152/1996)

## Valid vote values

- Category: Data Quality
- Description: Vote values must be Jaa, Ei, Tyhjää, or Poissa
- Current details: 25071 invalid vote values

### Vote rows with invalid vote value

- Count: 0
- Samples: none

## Speech metadata/content mismatches are exactly has_spoken=0

- Category: Speech Content Mapping
- Description: Rows without linked SpeechContent are allowed only when Speech.has_spoken = 0, and has_spoken = 0 rows should not have SpeechContent
- Current details: Metadata rows without content: 19232. Explained by has_spoken=0: 15750. Unexpected missing-content rows: 3482. has_spoken=0 rows with content: 240.

### Speech rows missing SpeechContent when has_spoken != 0

- Count: 3482
- [1] Speech #1: has_spoken=1, section=ivPpx05s5hadgIm (https://avoindata.eduskunta.fi)
- [2] Speech #2: has_spoken=1, section=ivPpx05s5hadgIm (https://avoindata.eduskunta.fi)
- [3] Speech #3: has_spoken=1, section=ivPpx05s5hadgIm (https://avoindata.eduskunta.fi)
- [4] Speech #4: has_spoken=1, section=ivPpx05s5hadgIm (https://avoindata.eduskunta.fi)
- [5] Speech #5: has_spoken=1, section=ivPpx05s5hadgIm (https://avoindata.eduskunta.fi)
- [7] Speech #7: has_spoken=1, section=dlUjlZfj7145FSe (https://avoindata.eduskunta.fi)
- [8] Speech #8: has_spoken=1, section=dlUjlZfj7145FSe (https://avoindata.eduskunta.fi)
- [9] Speech #9: has_spoken=1, section=dlUjlZfj7145FSe (https://avoindata.eduskunta.fi)
- [10] Speech #10: has_spoken=1, section=dlUjlZfj7145FSe (https://avoindata.eduskunta.fi)
- [12] Speech #12: has_spoken=1, section=ed9kGyMpGTd9VQr (https://avoindata.eduskunta.fi)
- [14] Speech #14: has_spoken=1, section=ed9kGyMpGTd9VQr (https://avoindata.eduskunta.fi)
- [15] Speech #15: has_spoken=1, section=ed9kGyMpGTd9VQr (https://avoindata.eduskunta.fi)
- [16] Speech #16: has_spoken=1, section=ed9kGyMpGTd9VQr (https://avoindata.eduskunta.fi)
- [25] Speech #25: has_spoken=1, section=vK35iT6i8YmoLCZ (https://avoindata.eduskunta.fi)
- [26] Speech #26: has_spoken=1, section=vK35iT6i8YmoLCZ (https://avoindata.eduskunta.fi)
- [27] Speech #27: has_spoken=1, section=vK35iT6i8YmoLCZ (https://avoindata.eduskunta.fi)
- [28] Speech #28: has_spoken=1, section=vK35iT6i8YmoLCZ (https://avoindata.eduskunta.fi)
- [29] Speech #29: has_spoken=1, section=d9WWhKpobeoE2eT (https://avoindata.eduskunta.fi)
- [30] Speech #30: has_spoken=1, section=d9WWhKpobeoE2eT (https://avoindata.eduskunta.fi)
- [31] Speech #31: has_spoken=1, section=d9WWhKpobeoE2eT (https://avoindata.eduskunta.fi)
- [32] Speech #32: has_spoken=1, section=d9WWhKpobeoE2eT (https://avoindata.eduskunta.fi)
- [33] Speech #33: has_spoken=1, section=vK35iT6i8YmoLCZ (https://avoindata.eduskunta.fi)
- [34] Speech #34: has_spoken=1, section=vK35iT6i8YmoLCZ (https://avoindata.eduskunta.fi)
- [35] Speech #35: has_spoken=1, section=vK35iT6i8YmoLCZ (https://avoindata.eduskunta.fi)
- [36] Speech #36: has_spoken=1, section=d9WWhKpobeoE2eT (https://avoindata.eduskunta.fi)
- [37] Speech #37: has_spoken=1, section=d9WWhKpobeoE2eT (https://avoindata.eduskunta.fi)
- [38] Speech #38: has_spoken=1, section=d9WWhKpobeoE2eT (https://avoindata.eduskunta.fi)
- [39] Speech #39: has_spoken=1, section=MVfwfeNfTSZiTiK (https://avoindata.eduskunta.fi)
- [40] Speech #40: has_spoken=1, section=MVfwfeNfTSZiTiK (https://avoindata.eduskunta.fi)
- [41] Speech #41: has_spoken=1, section=MVfwfeNfTSZiTiK (https://avoindata.eduskunta.fi)
- [42] Speech #42: has_spoken=1, section=MVfwfeNfTSZiTiK (https://avoindata.eduskunta.fi)
- [43] Speech #43: has_spoken=1, section=MVfwfeNfTSZiTiK (https://avoindata.eduskunta.fi)
- [44] Speech #44: has_spoken=1, section=MVfwfeNfTSZiTiK (https://avoindata.eduskunta.fi)
- [45] Speech #45: has_spoken=1, section=244Zw1g6rvhgpvJ (https://avoindata.eduskunta.fi)
- [46] Speech #46: has_spoken=1, section=244Zw1g6rvhgpvJ (https://avoindata.eduskunta.fi)
- [47] Speech #47: has_spoken=1, section=244Zw1g6rvhgpvJ (https://avoindata.eduskunta.fi)
- [48] Speech #48: has_spoken=1, section=244Zw1g6rvhgpvJ (https://avoindata.eduskunta.fi)
- [49] Speech #49: has_spoken=1, section=244Zw1g6rvhgpvJ (https://avoindata.eduskunta.fi)
- [50] Speech #50: has_spoken=1, section=244Zw1g6rvhgpvJ (https://avoindata.eduskunta.fi)
- [51] Speech #51: has_spoken=1, section=244Zw1g6rvhgpvJ (https://avoindata.eduskunta.fi)
- [52] Speech #52: has_spoken=1, section=244Zw1g6rvhgpvJ (https://avoindata.eduskunta.fi)
- [53] Speech #53: has_spoken=1, section=244Zw1g6rvhgpvJ (https://avoindata.eduskunta.fi)
- [54] Speech #54: has_spoken=1, section=244Zw1g6rvhgpvJ (https://avoindata.eduskunta.fi)
- [55] Speech #55: has_spoken=1, section=244Zw1g6rvhgpvJ (https://avoindata.eduskunta.fi)
- [56] Speech #56: has_spoken=1, section=244Zw1g6rvhgpvJ (https://avoindata.eduskunta.fi)
- [57] Speech #57: has_spoken=1, section=244Zw1g6rvhgpvJ (https://avoindata.eduskunta.fi)
- [58] Speech #58: has_spoken=1, section=244Zw1g6rvhgpvJ (https://avoindata.eduskunta.fi)
- [59] Speech #59: has_spoken=1, section=244Zw1g6rvhgpvJ (https://avoindata.eduskunta.fi)
- [60] Speech #60: has_spoken=1, section=244Zw1g6rvhgpvJ (https://avoindata.eduskunta.fi)
- [61] Speech #61: has_spoken=1, section=244Zw1g6rvhgpvJ (https://avoindata.eduskunta.fi)

### Speech rows with has_spoken=0 but SpeechContent exists

- Count: 240
- [392254] Speech #392254: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [612852] Speech #612852: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [613025] Speech #613025: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [613088] Speech #613088: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [619299] Speech #619299: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [680215] Speech #680215: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [710175] Speech #710175: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [710240] Speech #710240: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [714931] Speech #714931: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [1850046] Speech #1850046: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [2373138] Speech #2373138: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [2373196] Speech #2373196: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [2373198] Speech #2373198: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [2373201] Speech #2373201: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [2373202] Speech #2373202: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [2541626] Speech #2541626: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [2726948] Speech #2726948: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [2902739] Speech #2902739: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [3043092] Speech #3043092: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [3204195] Speech #3204195: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [3366486] Speech #3366486: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [3366487] Speech #3366487: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [3366488] Speech #3366488: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [3366489] Speech #3366489: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [3621975] Speech #3621975: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [3621977] Speech #3621977: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [3993022] Speech #3993022: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4143408] Speech #4143408: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4143409] Speech #4143409: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4143412] Speech #4143412: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4143416] Speech #4143416: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4143430] Speech #4143430: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4143434] Speech #4143434: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4151552] Speech #4151552: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4152864] Speech #4152864: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4155782] Speech #4155782: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4156006] Speech #4156006: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4158104] Speech #4158104: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4159340] Speech #4159340: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4167185] Speech #4167185: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4171362] Speech #4171362: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4174450] Speech #4174450: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4176599] Speech #4176599: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4177701] Speech #4177701: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4178073] Speech #4178073: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4178268] Speech #4178268: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4178270] Speech #4178270: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4178271] Speech #4178271: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4178272] Speech #4178272: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)
- [4178273] Speech #4178273: has_spoken=0 mutta content löytyy (https://avoindata.eduskunta.fi)

## SpeechContent speaker names match Speech metadata

- Category: Speech Content Mapping
- Description: Linked SpeechContent rows should have matching first_name and last_name with Speech
- Current details: Compared rows: 118977. Name mismatches: 195.

### SpeechContent rows where source name differs from Speech name

- Count: 195
- [392254] Speech #392254: source=Päivi Räsänen, speech=Teuvo Hakkarainen (https://avoindata.eduskunta.fi)
- [613025] Speech #613025: source=Kauko Juhantalo, speech=Li Andersson (https://avoindata.eduskunta.fi)
- [813520] Speech #813520: source=Eeva-Johanna Eloranta, speech=Li Andersson (https://avoindata.eduskunta.fi)
- [907782] Speech #907782: source=Susanna Koski, speech=Kimmo Tiilikainen (https://avoindata.eduskunta.fi)
- [1672609] Speech #1672609: source=Juha Rehul, speech=Juha Rehula (https://avoindata.eduskunta.fi)
- [2017913] Speech #2017913: source=Hanna Sarkkinen, speech=Kimmo Tiilikainen (https://avoindata.eduskunta.fi)
- [2043561] Speech #2043561: source=Sanni Grahn -Laasonen, speech=Sanni Grahn-Laasonen (https://avoindata.eduskunta.fi)
- [2100832] Speech #2100832: source=Antti Kaikkonen, speech=Anna-Maja Henriksson (https://avoindata.eduskunta.fi)
- [2347941] Speech #2347941: source=Risto Hiekkataipale, speech=Kauko Juhantalo (https://avoindata.eduskunta.fi)
- [2373196] Speech #2373196: source=Jari Myllykoski, speech=Krista Kiuru (https://avoindata.eduskunta.fi)
- [2541626] Speech #2541626: source=Seppo Kääriäinen, speech=Jukka Kopra (https://avoindata.eduskunta.fi)
- [2902739] Speech #2902739: source=Merja Mäkisalo-Ropponen, speech=Pia Viitanen (https://avoindata.eduskunta.fi)
- [3022755] Speech #3022755: source=Eero Heinäluoma, speech=Timo Kalli (https://avoindata.eduskunta.fi)
- [3043092] Speech #3043092: source=Olli-Poika Parviainen, speech=Ville Tavio (https://avoindata.eduskunta.fi)
- [3043160] Speech #3043160: source=Sami Savio, speech=Olli-Poika Parviainen (https://avoindata.eduskunta.fi)
- [3142293] Speech #3142293: source=Kalle Jokinen, speech=Jari Myllykoski (https://avoindata.eduskunta.fi)
- [3142332] Speech #3142332: source=Kimmo Tiilikainen, speech=Sirpa Paatero (https://avoindata.eduskunta.fi)
- [3142343] Speech #3142343: source=Silvia Modig, speech=Hannakaisa Heikkinen (https://avoindata.eduskunta.fi)
- [3142355] Speech #3142355: source=Jari Myllykoski, speech=Merja Mäkisalo-Ropponen (https://avoindata.eduskunta.fi)
- [3172561] Speech #3172561: source=Veera Ruoho, speech=Sinuhe Wallinheimo (https://avoindata.eduskunta.fi)
- [3365288] Speech #3365288: source=Hanna Sarkkinen, speech=Juha Sipilä (https://avoindata.eduskunta.fi)
- [3366487] Speech #3366487: source=Lea Mäkipää, speech=Kari Kulmala (https://avoindata.eduskunta.fi)
- [3428526] Speech #3428526: source=Arja Juvonen, speech=Johanna Ojala-Niemelä (https://avoindata.eduskunta.fi)
- [3621761] Speech #3621761: source=Seppo Kääriäinen, speech=Ben Zyskowicz (https://avoindata.eduskunta.fi)
- [3621762] Speech #3621762: source=Toimi Kankaanniemi, speech=Rami Lehto (https://avoindata.eduskunta.fi)
- [3621769] Speech #3621769: source=Jari Myllykoski, speech=Kaj Turunen (https://avoindata.eduskunta.fi)
- [3621772] Speech #3621772: source=Wille Rydman, speech=Kimmo Kivelä (https://avoindata.eduskunta.fi)
- [3621817] Speech #3621817: source=Markku Rossi, speech=Rami Lehto (https://avoindata.eduskunta.fi)
- [3621928] Speech #3621928: source=Anne Berner, speech=Sampo Terho (https://avoindata.eduskunta.fi)
- [3621937] Speech #3621937: source=Johanna Karimäki, speech=Pilvi Torsti (https://avoindata.eduskunta.fi)
- [3621939] Speech #3621939: source=Eeva-Maria Maijala, speech=Sinuhe Wallinheimo (https://avoindata.eduskunta.fi)
- [3621950] Speech #3621950: source=Hanna-Leena Mattila, speech=Matti Semi (https://avoindata.eduskunta.fi)
- [3621952] Speech #3621952: source=Antti Rantakangas, speech=Paavo Arhinmäki (https://avoindata.eduskunta.fi)
- [3621953] Speech #3621953: source=Mika Kari, speech=Maarit Feldt-Ranta (https://avoindata.eduskunta.fi)
- [3621975] Speech #3621975: source=Hanna-Leena Mattila, speech=Satu Hassi (https://avoindata.eduskunta.fi)
- [3621977] Speech #3621977: source=Antti Kurvinen, speech=Satu Hassi (https://avoindata.eduskunta.fi)
- [3692882] Speech #3692882: source=Jaana Laitinen-Pesola, speech=Pirkko Mattila (https://avoindata.eduskunta.fi)
- [3692885] Speech #3692885: source=Juho Eerola, speech=Simon Elo (https://avoindata.eduskunta.fi)
- [3692886] Speech #3692886: source=Ulla Parviainen, speech=Kristiina Salonen (https://avoindata.eduskunta.fi)
- [3692891] Speech #3692891: source=Silvia Modig, speech=Sari Tanus (https://avoindata.eduskunta.fi)
- [3692904] Speech #3692904: source=Sari Raassina, speech=Jari Myllykoski (https://avoindata.eduskunta.fi)
- [3692910] Speech #3692910: source=Juha Pylväs, speech=Timo Harakka (https://avoindata.eduskunta.fi)
- [3692931] Speech #3692931: source=Arja Juvonen, speech=Jari Myllykoski (https://avoindata.eduskunta.fi)
- [3692951] Speech #3692951: source=Sari Sarkomaa, speech=Timo Heinonen (https://avoindata.eduskunta.fi)
- [3759831] Speech #3759831: source=Antti Rinne, speech=Paavo Arhinmäki (https://avoindata.eduskunta.fi)
- [3759839] Speech #3759839: source=Ilmari Nurminen, speech=Eero Suutari (https://avoindata.eduskunta.fi)
- [3759852] Speech #3759852: source=Katja Hänninen, speech=Eero Heinäluoma (https://avoindata.eduskunta.fi)
- [3759853] Speech #3759853: source=Thomas Blomqvist, speech=Sinuhe Wallinheimo (https://avoindata.eduskunta.fi)
- [3759865] Speech #3759865: source=Olavi Ala-Nissilä, speech=Pia Viitanen (https://avoindata.eduskunta.fi)
- [3759875] Speech #3759875: source=Heli Järvinen, speech=Satu Hassi (https://avoindata.eduskunta.fi)

## Voting date within 1 day of session date

- Category: Business Logic
- Description: Voting start_time should be within 1 day of session date (sessions can span overnight)
- Current details: 351 votings with >1 day offset from session

### Voting rows with >1 day session date offset

- Count: 351
- [26447] Äänestys 26447: start=2014-04-25, session=2014-12-08 (/aanestystulos/1/44/2014)
- [26453] Äänestys 26453: start=2014-06-11, session=2015-01-13 (/aanestystulos/1/65/2014)
- [26455] Äänestys 26455: start=2014-03-26, session=2014-11-24 (/aanestystulos/1/31/2014)
- [26457] Äänestys 26457: start=2014-06-11, session=2015-01-13 (/aanestystulos/2/65/2014)
- [26459] Äänestys 26459: start=2014-02-14, session=2014-10-16 (/aanestystulos/1/9/2014)
- [26461] Äänestys 26461: start=2014-02-14, session=2014-10-16 (/aanestystulos/2/9/2014)
- [26463] Äänestys 26463: start=2014-04-30, session=2014-12-10 (/aanestystulos/1/46/2014)
- [26467] Äänestys 26467: start=2014-02-28, session=2014-11-03 (/aanestystulos/1/17/2014)
- [26477] Äänestys 26477: start=2014-05-16, session=2014-12-15 (/aanestystulos/1/53/2014)
- [26479] Äänestys 26479: start=2014-05-16, session=2014-12-15 (/aanestystulos/2/53/2014)
- [26481] Äänestys 26481: start=2014-03-05, session=2014-11-06 (/aanestystulos/1/19/2014)
- [26483] Äänestys 26483: start=2014-06-18, session=2015-01-15 (/aanestystulos/15/68/2014)
- [26485] Äänestys 26485: start=2014-06-18, session=2015-01-15 (/aanestystulos/16/68/2014)
- [26487] Äänestys 26487: start=2014-06-18, session=2015-01-15 (/aanestystulos/17/68/2014)
- [26489] Äänestys 26489: start=2014-06-18, session=2015-01-15 (/aanestystulos/18/68/2014)
- [26491] Äänestys 26491: start=2014-06-18, session=2015-01-15 (/aanestystulos/1/68/2014)
- [26493] Äänestys 26493: start=2014-06-18, session=2015-01-15 (/aanestystulos/3/68/2014)
- [26495] Äänestys 26495: start=2014-06-18, session=2015-01-15 (/aanestystulos/4/68/2014)
- [26497] Äänestys 26497: start=2014-06-18, session=2015-01-15 (/aanestystulos/5/68/2014)
- [26499] Äänestys 26499: start=2014-06-18, session=2015-01-15 (/aanestystulos/6/68/2014)
- [26501] Äänestys 26501: start=2014-06-18, session=2015-01-15 (/aanestystulos/7/68/2014)
- [26503] Äänestys 26503: start=2014-06-18, session=2015-01-15 (/aanestystulos/10/68/2014)
- [26505] Äänestys 26505: start=2014-06-18, session=2015-01-15 (/aanestystulos/8/68/2014)
- [26507] Äänestys 26507: start=2014-06-18, session=2015-01-15 (/aanestystulos/11/68/2014)
- [26509] Äänestys 26509: start=2014-06-18, session=2015-01-15 (/aanestystulos/9/68/2014)
- [26511] Äänestys 26511: start=2014-06-18, session=2015-01-15 (/aanestystulos/12/68/2014)
- [26513] Äänestys 26513: start=2014-06-18, session=2015-01-15 (/aanestystulos/13/68/2014)
- [26515] Äänestys 26515: start=2014-06-18, session=2015-01-15 (/aanestystulos/14/68/2014)
- [26517] Äänestys 26517: start=2014-06-18, session=2015-01-15 (/aanestystulos/26/68/2014)
- [26519] Äänestys 26519: start=2014-06-18, session=2015-01-15 (/aanestystulos/27/68/2014)
- [26521] Äänestys 26521: start=2014-06-18, session=2015-01-15 (/aanestystulos/28/68/2014)
- [26523] Äänestys 26523: start=2014-06-18, session=2015-01-15 (/aanestystulos/29/68/2014)
- [26525] Äänestys 26525: start=2014-06-18, session=2015-01-15 (/aanestystulos/19/68/2014)
- [26527] Äänestys 26527: start=2014-06-18, session=2015-01-15 (/aanestystulos/30/68/2014)
- [26529] Äänestys 26529: start=2014-06-18, session=2015-01-15 (/aanestystulos/20/68/2014)
- [26531] Äänestys 26531: start=2014-06-18, session=2015-01-15 (/aanestystulos/31/68/2014)
- [26533] Äänestys 26533: start=2014-06-18, session=2015-01-15 (/aanestystulos/32/68/2014)
- [26535] Äänestys 26535: start=2014-06-18, session=2015-01-15 (/aanestystulos/21/68/2014)
- [26537] Äänestys 26537: start=2014-06-18, session=2015-01-15 (/aanestystulos/33/68/2014)
- [26539] Äänestys 26539: start=2014-06-18, session=2015-01-15 (/aanestystulos/22/68/2014)
- [26541] Äänestys 26541: start=2014-06-18, session=2015-01-15 (/aanestystulos/34/68/2014)
- [26543] Äänestys 26543: start=2014-06-18, session=2015-01-15 (/aanestystulos/23/68/2014)
- [26545] Äänestys 26545: start=2014-06-18, session=2015-01-15 (/aanestystulos/35/68/2014)
- [26547] Äänestys 26547: start=2014-06-18, session=2015-01-15 (/aanestystulos/24/68/2014)
- [26549] Äänestys 26549: start=2014-06-18, session=2015-01-15 (/aanestystulos/25/68/2014)
- [26551] Äänestys 26551: start=2014-06-18, session=2015-01-15 (/aanestystulos/37/68/2014)
- [26553] Äänestys 26553: start=2014-06-18, session=2015-01-15 (/aanestystulos/48/68/2014)
- [26555] Äänestys 26555: start=2014-06-18, session=2015-01-15 (/aanestystulos/49/68/2014)
- [26557] Äänestys 26557: start=2014-06-18, session=2015-01-15 (/aanestystulos/38/68/2014)
- [26559] Äänestys 26559: start=2014-06-18, session=2015-01-15 (/aanestystulos/39/68/2014)

## Committee membership dates valid

- Category: Data Integrity
- Description: Committee membership start_date must be ≤ end_date
- Current details: 1 invalid committee membership dates

### CommitteeMembership rows with start_date > end_date

- Count: 1
- [14102] CommitteeMembership #14102: 1932-5-01 > 1932-1-01 (https://avoindata.eduskunta.fi)

## Active MPs have group membership

- Category: Business Logic
- Description: Every active MP should belong to a parliamentary group
- Current details: 22 active MP-date combinations without a group

### Active MPs missing group membership

- Count: 22
- [2019-04-24-175] Päivä 2019-04-24: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-05-02-175] Päivä 2019-05-02: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-05-03-175] Päivä 2019-05-03: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-05-07-175] Päivä 2019-05-07: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-05-10-175] Päivä 2019-05-10: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-05-14-175] Päivä 2019-05-14: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-05-17-175] Päivä 2019-05-17: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-05-21-175] Päivä 2019-05-21: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-05-28-175] Päivä 2019-05-28: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-06-04-175] Päivä 2019-06-04: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-06-06-175] Päivä 2019-06-06: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-06-07-175] Päivä 2019-06-07: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-06-11-175] Päivä 2019-06-11: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-06-12-175] Päivä 2019-06-12: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-06-13-175] Päivä 2019-06-13: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-06-14-175] Päivä 2019-06-14: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-06-18-175] Päivä 2019-06-18: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-06-19-175] Päivä 2019-06-19: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-06-25-175] Päivä 2019-06-25: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-06-26-175] Päivä 2019-06-26: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-06-27-175] Päivä 2019-06-27: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)
- [2019-06-28-175] Päivä 2019-06-28: person_id 175 ilman ryhmäjäsenyyttä (https://avoindata.eduskunta.fi)

## Group member count matches active MPs

- Category: Business Logic
- Description: Active group members count should equal active parliament members count per date
- Current details: 22 dates with mismatched counts

### Dates where active group-member count mismatches active MPs

- Count: 22
- [2019-04-24] Päivä 2019-04-24: term_count=200, group_count=199 (https://avoindata.eduskunta.fi)
- [2019-05-02] Päivä 2019-05-02: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-05-03] Päivä 2019-05-03: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-05-07] Päivä 2019-05-07: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-05-10] Päivä 2019-05-10: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-05-14] Päivä 2019-05-14: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-05-17] Päivä 2019-05-17: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-05-21] Päivä 2019-05-21: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-05-28] Päivä 2019-05-28: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-06-04] Päivä 2019-06-04: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-06-06] Päivä 2019-06-06: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-06-07] Päivä 2019-06-07: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-06-11] Päivä 2019-06-11: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-06-12] Päivä 2019-06-12: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-06-13] Päivä 2019-06-13: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-06-14] Päivä 2019-06-14: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-06-18] Päivä 2019-06-18: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-06-19] Päivä 2019-06-19: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-06-25] Päivä 2019-06-25: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-06-26] Päivä 2019-06-26: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-06-27] Päivä 2019-06-27: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)
- [2019-06-28] Päivä 2019-06-28: term_count=201, group_count=200 (https://avoindata.eduskunta.fi)

## SectionDocumentLink -> Section

- Category: SaliDB Linkage
- Description: All section document links should reference an existing section
- Current details: Orphans: 26

### SectionDocumentLink rows with missing Section

- Count: 26
- [7743] SectionDocumentLink #7743 -> section_key=h4tMqPFNdWPfjx8 (/valtiopaivaasiakirjat/HE+180/2017)
- [7744] SectionDocumentLink #7744 -> section_key=h4tMqPFNdWPfjx8 (/valtiopaivaasiakirjat/LA+24/2015+vp,+46/2017)
- [7745] SectionDocumentLink #7745 -> section_key=h4tMqPFNdWPfjx8 (/valtiopaivaasiakirjat/TPA+13,+32/2016)
- [7746] SectionDocumentLink #7746 -> section_key=h4tMqPFNdWPfjx8 (/valtiopaivaasiakirjat/LiVM+16/2018)
- [7747] SectionDocumentLink #7747 -> section_key=t99DrhDsuLuFejC (/valtiopaivaasiakirjat/HE+83/2018)
- [7748] SectionDocumentLink #7748 -> section_key=t99DrhDsuLuFejC (/valtiopaivaasiakirjat/MmVM+11/2018)
- [7749] SectionDocumentLink #7749 -> section_key=UVW4s5jhj5eDaAN (/valtiopaivaasiakirjat/HE+40/2018)
- [7750] SectionDocumentLink #7750 -> section_key=UVW4s5jhj5eDaAN (/valtiopaivaasiakirjat/LA+62/2017+vp,+16-17/2018)
- [7751] SectionDocumentLink #7751 -> section_key=UVW4s5jhj5eDaAN (/valtiopaivaasiakirjat/SiVM+5/2018)
- [7752] SectionDocumentLink #7752 -> section_key=gDflhmKjJHzZH4J (/valtiopaivaasiakirjat/HE+49/2018)
- [7753] SectionDocumentLink #7753 -> section_key=gDflhmKjJHzZH4J (/valtiopaivaasiakirjat/TaVM+11/2018)
- [7772] SectionDocumentLink #7772 -> section_key=xquHZzupd2i4YeX (/valtiopaivaasiakirjat/HE+90/2018)
- [11825] SectionDocumentLink #11825 -> section_key=vV47WABSSD8QkNm (/valtiopaivaasiakirjat/HE+36/2020)
- [11826] SectionDocumentLink #11826 -> section_key=vV47WABSSD8QkNm (/valtiopaivaasiakirjat/HaVM+5/2020)
- [11909] SectionDocumentLink #11909 -> section_key=UVOpjnfzaECglpZ (/valtiopaivaasiakirjat/HE+45/2020)
- [11910] SectionDocumentLink #11910 -> section_key=UVOpjnfzaECglpZ (/valtiopaivaasiakirjat/TaVM+8/2020)
- [11911] SectionDocumentLink #11911 -> section_key=0iLJ5WsIQ96NA2W (/valtiopaivaasiakirjat/HE+48/2020)
- [11912] SectionDocumentLink #11912 -> section_key=0iLJ5WsIQ96NA2W (/valtiopaivaasiakirjat/MmVM+4/2020)
- [11913] SectionDocumentLink #11913 -> section_key=USUe3eSA3a9yIbM (/valtiopaivaasiakirjat/HE+51/2020)
- [11914] SectionDocumentLink #11914 -> section_key=USUe3eSA3a9yIbM (/valtiopaivaasiakirjat/StVM+6/2020)
- [11976] SectionDocumentLink #11976 -> section_key=22RzI3VJzVnABhz (/valtiopaivaasiakirjat/HE+61/2020)
- [11977] SectionDocumentLink #11977 -> section_key=22RzI3VJzVnABhz (/valtiopaivaasiakirjat/StVM+7/2020)
- [12047] SectionDocumentLink #12047 -> section_key=tA09uTQrlpQtt3Q (/valtiopaivaasiakirjat/HE+72/2020)
- [13870] SectionDocumentLink #13870 -> section_key=pxNA1bZjhINJYfL (/valtiopaivaasiakirjat/VAA+1/2021)
- [13871] SectionDocumentLink #13871 -> section_key=JUKjzd4sq16k8G4 (/valtiopaivaasiakirjat/VAA+2/2021)
- [13872] SectionDocumentLink #13872 -> section_key=4nmKbEsIIO3DuBI (/valtiopaivaasiakirjat/VAA+3/2021)

## SessionNotice -> Session

- Category: SaliDB Linkage
- Description: All session notices should reference an existing session
- Current details: Orphans: 9

### SessionNotice rows with missing Session

- Count: 9
- [3578] SessionNotice #3578 -> session_key=2026/5 (https://avoindata.eduskunta.fi)
- [3579] SessionNotice #3579 -> session_key=2026/5 (https://avoindata.eduskunta.fi)
- [3580] SessionNotice #3580 -> session_key=2026/5 (https://avoindata.eduskunta.fi)
- [3581] SessionNotice #3581 -> session_key=2026/5 (https://avoindata.eduskunta.fi)
- [3582] SessionNotice #3582 -> session_key=2026/5 (https://avoindata.eduskunta.fi)
- [3583] SessionNotice #3583 -> session_key=2026/5 (https://avoindata.eduskunta.fi)
- [3584] SessionNotice #3584 -> session_key=2026/5 (https://avoindata.eduskunta.fi)
- [3585] SessionNotice #3585 -> session_key=2026/5 (https://avoindata.eduskunta.fi)
- [3586] SessionNotice #3586 -> session_key=2026/5 (https://avoindata.eduskunta.fi)

## SaliDBDocumentReference -> Section

- Category: SaliDB Linkage
- Description: Document references with section_key should reference an existing section
- Current details: Orphans: 29

### SaliDBDocumentReference rows with missing Section

- Count: 29
- [409894] DocRef #409894 -> section_key=h4tMqPFNdWPfjx8, tunnus=HE 180/2017 vp (/valtiopaivaasiakirjat/HE+180/2017)
- [409895] DocRef #409895 -> section_key=h4tMqPFNdWPfjx8, tunnus=LA 24/2015 vp (/valtiopaivaasiakirjat/LA+24/2015+vp,+46/2017)
- [409896] DocRef #409896 -> section_key=h4tMqPFNdWPfjx8, tunnus=LA 24/2015 vp (/valtiopaivaasiakirjat/LA+24/2015+vp,+46/2017)
- [409897] DocRef #409897 -> section_key=h4tMqPFNdWPfjx8, tunnus=TPA 13/2016 vp (/valtiopaivaasiakirjat/TPA+13,+32/2016)
- [409898] DocRef #409898 -> section_key=h4tMqPFNdWPfjx8, tunnus=TPA 32/2016 vp (/valtiopaivaasiakirjat/TPA+13,+32/2016)
- [409899] DocRef #409899 -> section_key=h4tMqPFNdWPfjx8, tunnus=LIVM 16/2018 vp (/valtiopaivaasiakirjat/LiVM+16/2018)
- [409900] DocRef #409900 -> section_key=t99DrhDsuLuFejC, tunnus=HE 83/2018 vp (/valtiopaivaasiakirjat/HE+83/2018)
- [409901] DocRef #409901 -> section_key=t99DrhDsuLuFejC, tunnus=MMVM 11/2018 vp (/valtiopaivaasiakirjat/MmVM+11/2018)
- [409902] DocRef #409902 -> section_key=UVW4s5jhj5eDaAN, tunnus=HE 40/2018 vp (/valtiopaivaasiakirjat/HE+40/2018)
- [409903] DocRef #409903 -> section_key=UVW4s5jhj5eDaAN, tunnus=LA 62/2017 vp (/valtiopaivaasiakirjat/LA+62/2017+vp,+16-17/2018)
- [409904] DocRef #409904 -> section_key=UVW4s5jhj5eDaAN, tunnus=LA 62/2017 vp (/valtiopaivaasiakirjat/LA+62/2017+vp,+16-17/2018)
- [409905] DocRef #409905 -> section_key=UVW4s5jhj5eDaAN, tunnus=SIVM 5/2018 vp (/valtiopaivaasiakirjat/SiVM+5/2018)
- [409906] DocRef #409906 -> section_key=gDflhmKjJHzZH4J, tunnus=HE 49/2018 vp (/valtiopaivaasiakirjat/HE+49/2018)
- [409907] DocRef #409907 -> section_key=gDflhmKjJHzZH4J, tunnus=TAVM 11/2018 vp (/valtiopaivaasiakirjat/TaVM+11/2018)
- [409928] DocRef #409928 -> section_key=xquHZzupd2i4YeX, tunnus=HE 90/2018 vp (/valtiopaivaasiakirjat/HE+90/2018)
- [413974] DocRef #413974 -> section_key=vV47WABSSD8QkNm, tunnus=HE 36/2020 vp (/valtiopaivaasiakirjat/HE+36/2020)
- [413975] DocRef #413975 -> section_key=vV47WABSSD8QkNm, tunnus=HAVM 5/2020 vp (/valtiopaivaasiakirjat/HaVM+5/2020)
- [414057] DocRef #414057 -> section_key=UVOpjnfzaECglpZ, tunnus=HE 45/2020 vp (/valtiopaivaasiakirjat/HE+45/2020)
- [414058] DocRef #414058 -> section_key=UVOpjnfzaECglpZ, tunnus=TAVM 8/2020 vp (/valtiopaivaasiakirjat/TaVM+8/2020)
- [414059] DocRef #414059 -> section_key=0iLJ5WsIQ96NA2W, tunnus=HE 48/2020 vp (/valtiopaivaasiakirjat/HE+48/2020)
- [414060] DocRef #414060 -> section_key=0iLJ5WsIQ96NA2W, tunnus=MMVM 4/2020 vp (/valtiopaivaasiakirjat/MmVM+4/2020)
- [414061] DocRef #414061 -> section_key=USUe3eSA3a9yIbM, tunnus=HE 51/2020 vp (/valtiopaivaasiakirjat/HE+51/2020)
- [414062] DocRef #414062 -> section_key=USUe3eSA3a9yIbM, tunnus=STVM 6/2020 vp (/valtiopaivaasiakirjat/StVM+6/2020)
- [414121] DocRef #414121 -> section_key=22RzI3VJzVnABhz, tunnus=HE 61/2020 vp (/valtiopaivaasiakirjat/HE+61/2020)
- [414122] DocRef #414122 -> section_key=22RzI3VJzVnABhz, tunnus=STVM 7/2020 vp (/valtiopaivaasiakirjat/StVM+7/2020)
- [414191] DocRef #414191 -> section_key=tA09uTQrlpQtt3Q, tunnus=HE 72/2020 vp (/valtiopaivaasiakirjat/HE+72/2020)
- [415997] DocRef #415997 -> section_key=pxNA1bZjhINJYfL, tunnus=VAA 1/2021 vp (/valtiopaivaasiakirjat/VAA+1/2021)
- [415998] DocRef #415998 -> section_key=JUKjzd4sq16k8G4, tunnus=VAA 2/2021 vp (/valtiopaivaasiakirjat/VAA+2/2021)
- [415999] DocRef #415999 -> section_key=4nmKbEsIIO3DuBI, tunnus=VAA 3/2021 vp (/valtiopaivaasiakirjat/VAA+3/2021)

