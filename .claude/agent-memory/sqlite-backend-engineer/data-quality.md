# Data Quality Report - 2026-02-09

Comprehensive analysis of `avoimempi-eduskunta.db`.

## Critical Issues

### 1. Vote.group_abbrviation - Trailing Whitespace (ALL 4.28M rows)
Every single row in the Vote table has group_abbrviation padded with trailing spaces to 10 characters.
Example: `"sd        "`, `"kesk      "`, `"kok       "`
Also: column name itself is a typo ("abbrviation" -> "abbreviation")

### 2. Representative.last_name - Leading Spaces (413 rows)
413 representatives have a leading space in last_name.
Examples: `" Aaltonen"`, `" Aho"`, `" Donner"`

### 3. Section.agenda_key FK Mismatch (23,099 rows - ALL rows)
Section.agenda_key stores numeric IDs like "12508" while Agenda.key uses format "2014/1".
This means NO Section rows can join to Agenda - complete referential integrity failure.

### 4. Orphaned Vote Records (16,497 rows)
16,497 Vote rows reference voting_id values not present in the Voting table.
Sample orphaned voting_ids: 25468, 25472, 25474, 25480...

### 5. TrustPosition.position_type Typo (5,050 rows)
"municapility" should be "municipality". Affects 5,050 of 23,945 rows.

## Major Issues

### 6. CommitteeMembership.role - Case Inconsistencies (6 pairs)
- "jäsen" (4216) vs "Jäsen" (3244)
- "varajäsen" (2584) vs "Varajäsen" (1793)
- "lisäjäsen" (87) vs "Lisäjäsen" (95)
- "ensimmäinen varajäsen" (46) vs "Ensimmäinen varajäsen" (9)
- "toinen varajäsen" (52) vs "Toinen varajäsen" (7)
- "ikäpuhemies" (1) vs "Ikäpuhemies" (33)

### 7. NULL vs Empty String Mixing
- Voting.title: 6 NULLs + 8 empty strings
- Speech.party_abbreviation: 25 NULLs + 754 empty strings
- Speech.ministry: 161 NULLs + 122,463 empty strings
- Section.note: 4,506 NULLs + 15,456 empty strings
- Section.processing_title: 674 NULLs + 1,567 empty strings
- Section.resolution: 170 NULLs + 14,313 empty strings

### 8. Gender Encoding Inconsistency
- Representative table: "Mies" / "Nainen" (Finnish full words)
- Speech table: "M" / "N" (single letter codes)

### 9. Vote.vote - Bilingual Values
- Finnish: "Jaa" (2.66M), "Ei" (954K), "Poissa" (626K), "Tyhjää" (25K)
- Swedish: "Avstår" (15,701) - only appears with Swedish group abbreviations
- Not necessarily a bug (reflects bilingual parliament), but may complicate analysis

### 10. VaskiDocument.status - Mixed Formats
- Text values: "Valmis" (15,999), "Hyväksytty" (387), "Käsitelty" (72), etc.
- Numeric codes: "5" (10,921), "8" (139), "1234" (2)
- Unclear mapping between numeric codes and text labels

## Minor Issues

### 11. CommitteeMembership Dates - Non-standard Format (140 start, 119 end)
Some dates use single-digit months: "1975-2-01" instead of "1975-02-01"
All appear to be historical (pre-1980) data.

### 12. ExcelSpeech.speech_type - Broken Word Variants
PDF extraction artifacts creating variants:
- "(vastauspuheenvuoro)" (53,410) - correct
- "(vastauspuheenvuo-ro)" (123) - line-break hyphen
- "(vastauspuheenvuo--ro)" (3)
- "(vastauspuheenvuo- ro)" (3)
- "(vastauspuheen-- vuoro)" (1)
- "(vastauspuheenvu-ro)" (1)
- "( vastauspuheenvuoro)" (1) - extra space
- "(esittelypuheenvuo-ro)" (8)
- "(esittelypuheenvuoro )" (1) - trailing space

### 13. Vote.group_abbrviation - Case Inconsistency
"AT" (uppercase) vs "at" (lowercase) both exist.

### 14. ExcelSpeech.party - Case Inconsistency
"TV" vs "tv" both exist.

### 15. Double Spaces in Text
- Voting.title: 756 rows
- Section.title: 299 rows

### 16. Representative.party - Mostly Empty
2,477 of 2,677 representatives have empty string for party. Party info exists in ParliamentaryGroupMembership instead.

### 17. VaskiDocument.author_role - Spacing Variant
"kunta- ja alueministeri" (36) vs "kunta-ja alueministeri" (4)

### 18. Orphaned Speech Records
78 Speech rows reference person_id values not in Representative table.
6 Speech rows reference session_key values not in Session table.

### 19. Speech.speech_type - Empty String Values
5,149 Speech rows have empty string for speech_type (not NULL).

### 20. ExcelSpeech.processing_phase - All NULL
All 115,915 rows have NULL for processing_phase (column appears unused).

### 21. Voting.section_key - Empty Strings Break JOIN (20,982 rows - 97.8%)
20,982 of 21,452 votings have `section_key = ''` (empty string) which doesn't match any Section records.
This means JOINing through Section to count votings per session loses 97.8% of data.
**Fix**: Use `Voting.session_key` directly instead of joining through Section.
- Discovered 2026-02-16 when investigating voting count bug on sessions page
- 377 sessions (22.8%) showed incorrect counts when using JOIN method
- All votings have valid session_key, so direct lookup is reliable
