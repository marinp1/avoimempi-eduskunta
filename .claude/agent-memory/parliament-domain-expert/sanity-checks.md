# Sanity Checks for Finnish Parliament Data

## Existing Sanity Check Coverage (in `/packages/server/services/sanity-checks.ts`)

### Already Implemented ✓

**Schema Integrity:**
- All core tables exist
- Performance indexes present

**Data Volume:**
- Representative count >1000 (historical)
- Session count >100
- Voting count >1000
- Vote count >100,000
- Section count >1000
- Speech count >10,000
- Term count >1000

**Person/Representative Integrity:**
- Unique person IDs
- No NULL person IDs
- Complete first/last names
- Valid gender values (Mies/Nainen only)
- Birth dates plausible (after 1830, before today)
- All representatives have at least one term

**Session/Section Structure:**
- Session keys present and unique
- Session dates present
- Session count = Agenda count (1:1)
- All sections have session_key
- All sections reference existing sessions
- All sections have titles
- No duplicate section ordinals within sessions

**Voting Integrity:**
- n_total ≤ 200 (ISSUE: Should be ≤199 typically, 200 exceptional)
- n_yes + n_no + n_abstain + n_absent = n_total
- Individual vote count matches n_total
- All votings have non-empty session_key
- All votings reference existing sessions
- Unique voting numbers within sessions
- No NULL start_time

**Vote Records:**
- Valid vote values (Jaa, Ei, Tyhjää, Poissa)
- All votes reference existing votings
- All votes reference existing representatives
- No duplicate votes (same person voting twice)

**Term Integrity:**
- Term start_date ≤ end_date
- No overlapping terms for same person
- All terms reference existing representatives

**Parliamentary Group Integrity:**
- Group membership start_date ≤ end_date
- No overlapping memberships in different groups
- All memberships reference existing representatives and groups

**Speech Integrity:**
- All speeches have session_key
- All speeches reference existing sessions

**Referential Integrity:**
- Session → Agenda links
- Section → Session links
- Voting → Session links
- Vote → Voting links
- Vote → Representative links
- Speech → Session links
- GovernmentMembership → Representative
- CommitteeMembership → Representative
- RepresentativeDistrict → Representative and District

**Parliament Size:**
- Active MPs never exceed 200 on any session date

## Additional Recommended Sanity Checks

### Critical Data Integrity Checks (Not Yet Implemented)

#### 1. Vote Value - Swedish Abstain Handling
**Check:** Vote.vote should map Swedish "Avstår" to Finnish "Tyhjää"
```sql
SELECT COUNT(*) FROM Vote WHERE vote = 'Avstår'
-- Should be 0 (currently 15,701 rows have this issue)
```
**Why:** Swedish and Finnish data need consistent values for aggregation

#### 2. Voting Count - Speaker Vote Exception
**Check:** n_total should be ≤199 in >95% of cases, =200 should be rare (<5%)
```sql
-- Current check only validates ≤200, but doesn't flag 200 as exceptional
SELECT COUNT(*) FROM Voting WHERE n_total = 200
-- Should be small fraction of total votings
```
**Why:** The Speaker (puhemies) typically doesn't vote unless there's a tie

#### 3. Vote Distribution Sanity
**Check:** Most votes should be active (Jaa/Ei), not mostly absent/abstain
```sql
-- For each voting, check that >70% of votes are Jaa or Ei
SELECT COUNT(*) FROM Voting
WHERE n_total > 0
  AND (n_yes + n_no) < (n_total * 0.7)
-- Should be small number (low quorum votes or procedural matters)
```
**Why:** Unusually high abstain/absent rates may indicate data issues

#### 4. Vote Total Minimum Threshold
**Check:** Votings with very low turnout (<100 votes) should be rare
```sql
SELECT COUNT(*) FROM Voting WHERE n_total < 100
-- Should be <1% of all votings
```
**Why:** Parliament needs quorum; very low counts suggest data problems

#### 5. Parliamentary Group Membership Timeline
**Check:** Group memberships should align with parliamentary terms
```sql
SELECT COUNT(*) FROM ParliamentaryGroupMembership pgm
WHERE NOT EXISTS (
  SELECT 1 FROM Term t
  WHERE t.person_id = pgm.person_id
    AND pgm.start_date >= t.start_date
    AND (pgm.end_date IS NULL OR pgm.end_date <= COALESCE(t.end_date, '9999-12-31'))
)
-- Should be 0 or very small (<5%)
```
**Why:** Can't be in parliamentary group without being an MP

#### 6. Electoral District Assignment
**Check:** All active MPs must have an electoral district (vaalipiiri)
```sql
SELECT COUNT(*) FROM Term t
WHERE NOT EXISTS (
  SELECT 1 FROM RepresentativeDistrict rd
  WHERE rd.person_id = t.person_id
    AND rd.start_date <= t.start_date
    AND (rd.end_date IS NULL OR rd.end_date >= COALESCE(t.end_date, DATE('now')))
)
-- Should be 0
```
**Why:** All MPs are elected from a district

#### 7. Electoral District Count
**Check:** Should have exactly 13 electoral districts (or 13-14 with Åland)
```sql
SELECT COUNT(*) FROM District
-- Should be 13 or 14
```
**Why:** Finland has fixed number of electoral districts

#### 8. No Overlapping District Assignments
**Check:** MPs can't represent multiple districts simultaneously
```sql
SELECT COUNT(*) FROM RepresentativeDistrict rd1
JOIN RepresentativeDistrict rd2
  ON rd1.person_id = rd2.person_id AND rd1.id < rd2.id
WHERE rd1.district_code != rd2.district_code
  AND rd1.start_date <= COALESCE(rd2.end_date, '9999-12-31')
  AND rd2.start_date <= COALESCE(rd1.end_date, '9999-12-31')
-- Should be 0
```

#### 9. Government Ministers Should Usually Be MPs
**Check:** >90% of ministers should also be MPs
```sql
SELECT
  (SELECT COUNT(*) FROM GovernmentMembership gm
   WHERE EXISTS (SELECT 1 FROM Term t
                 WHERE t.person_id = gm.person_id
                 AND gm.start_date >= t.start_date
                 AND (gm.end_date IS NULL OR gm.end_date <= COALESCE(t.end_date, '9999-12-31')))
  ) * 100.0 / COUNT(*) as mp_minister_pct
FROM GovernmentMembership
-- Should be >90%
```
**Why:** Ministers are usually MPs (exceptions exist but rare)

#### 10. Ministry Field Not Empty for Ministers
**Check:** Government memberships should have ministry field populated
```sql
SELECT COUNT(*) FROM GovernmentMembership
WHERE ministry IS NULL OR TRIM(ministry) = ''
-- Should be 0
```

#### 11. Temporal Vote Consistency
**Check:** Votes should only occur during active term
```sql
SELECT COUNT(*) FROM Vote v
JOIN Voting vt ON v.voting_id = vt.id
JOIN Session s ON vt.session_key = s.key
WHERE NOT EXISTS (
  SELECT 1 FROM Term t
  WHERE t.person_id = v.person_id
    AND s.date >= t.start_date
    AND (t.end_date IS NULL OR s.date <= t.end_date)
)
-- Should be 0 or very small (edge cases during transitions)
```

#### 12. Section → Voting Linkage
**Check:** All votings should reference existing sections
```sql
SELECT COUNT(*) FROM Voting v
WHERE v.section_key IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM Section s WHERE s.key = v.section_key)
-- Should be 0
```

#### 13. Section Ordinal Monotonicity
**Check:** Section ordinals should be monotonically increasing within session
```sql
SELECT COUNT(*) FROM Section s1
JOIN Section s2 ON s1.session_key = s2.session_key
WHERE s1.ordinal >= s2.ordinal AND s1.id < s2.id
-- Should be 0 (or allow small gaps but no reversals)
```

#### 14. Term Duration Plausibility
**Check:** Terms should typically be ~4 years (1000-1800 days)
```sql
SELECT COUNT(*) FROM Term
WHERE end_date IS NOT NULL
  AND julianday(end_date) - julianday(start_date) > 1800
-- Should be small number (only full 4-year terms + transitions)
```
**Why:** Electoral term is 4 years; much longer suggests data error

#### 15. Terms Without Group Membership
**Check:** Most MPs should have parliamentary group affiliation
```sql
SELECT COUNT(*) FROM Term t
WHERE NOT EXISTS (
  SELECT 1 FROM ParliamentaryGroupMembership pgm
  WHERE pgm.person_id = t.person_id
    AND pgm.start_date <= COALESCE(t.end_date, DATE('now'))
    AND (pgm.end_date IS NULL OR pgm.end_date >= t.start_date)
)
-- Should be <2% (independents are rare)
```

#### 16. Session Numbering Gaps
**Check:** Session numbers should be mostly sequential within year
```sql
-- Flag years with large gaps (>5) in session numbering
SELECT year, MAX(number) - MIN(number) + 1 - COUNT(*) as gaps
FROM Session
GROUP BY year
HAVING gaps > 5
-- Large gaps may indicate missing data
```

#### 17. Voting Start Time Within Session Date
**Check:** Voting timestamps should match session date
```sql
SELECT COUNT(*) FROM Voting v
JOIN Session s ON v.session_key = s.key
WHERE DATE(v.start_time) != s.date
-- Should be 0 or very small (midnight edge cases)
```

#### 18. Committee Member References
**Check:** Committee memberships reference valid committees
```sql
SELECT COUNT(*) FROM CommitteeMembership cm
WHERE NOT EXISTS (SELECT 1 FROM Committee c WHERE c.code = cm.committee_code)
-- Should be 0
```

#### 19. Orphaned Entity Threshold
**Check:** No table should have >1% orphaned records
```sql
-- Example for any child table:
SELECT
  (SELECT COUNT(*) FROM Vote WHERE person_id NOT IN (SELECT person_id FROM Representative)) * 100.0 /
  (SELECT COUNT(*) FROM Vote)
-- Should be <1%
```

#### 20. Vote Aggregation Matches Individual Votes
**Check:** Aggregate counts by vote type should match n_yes/n_no/n_abstain/n_absent
```sql
SELECT COUNT(*) FROM (
  SELECT
    v.id,
    SUM(CASE WHEN vo.vote = 'Jaa' THEN 1 ELSE 0 END) as calc_yes,
    SUM(CASE WHEN vo.vote = 'Ei' THEN 1 ELSE 0 END) as calc_no,
    SUM(CASE WHEN vo.vote IN ('Tyhjää', 'Avstår') THEN 1 ELSE 0 END) as calc_abstain,
    SUM(CASE WHEN vo.vote = 'Poissa' THEN 1 ELSE 0 END) as calc_absent
  FROM Voting v
  JOIN Vote vo ON v.id = vo.voting_id
  GROUP BY v.id
) calc
JOIN Voting v ON calc.id = v.id
WHERE calc.calc_yes != v.n_yes
   OR calc.calc_no != v.n_no
   OR calc.calc_abstain != v.n_abstain
   OR calc.calc_absent != v.n_absent
-- Should be 0
```

## Data Quality Issues (Currently Tracked in data-quality.test.ts)

These are known issues that should be fixed in migrators:

1. **Whitespace**: Vote.group_abbreviation has trailing spaces
2. **NULL vs empty string**: Inconsistent use across Speech, Section, Voting tables
3. **Capitalization**: Party/group codes should be lowercase
4. **OCR artifacts**: ExcelSpeech.speech_type has hyphenation errors
5. **Swedish values**: Vote.vote has "Avstår" (should be "Tyhjää")
6. **Numeric codes**: VaskiDocument.status uses numbers instead of text
7. **Formatting**: VaskiDocument.author_role has spacing inconsistencies
8. **Typo**: Vote.group_abbrviation should be group_abbreviation

## Severity Levels

### Zero Tolerance (Critical)
- Referential integrity violations (orphaned records)
- NULL person_id, session_key in core tables
- Invalid vote values (not in enum)
- n_total > 200 (violates parliament size)
- Overlapping terms/memberships for same person

### Warning Threshold (Should Be Small)
- Orphaned records: <1%
- MPs without terms: <5%
- Vote totals <100: <1%
- Vote totals = 200: <5% (speaker votes)
- Ministers who aren't MPs: <10%
- Terms without group membership: <2%

### Data Quality (Fix in Migrators)
- Trailing whitespace
- Empty string vs NULL inconsistency
- Capitalization inconsistency
- OCR/formatting artifacts
- Swedish values in Finnish-only fields

## Testing Strategy

1. **sanity.test.ts** - Zero-tolerance tests that MUST pass
2. **data-quality.test.ts** - Known issues to fix in migrators
3. **SanityCheckService** - Runtime checks (internal server service)
4. All tests skip if database doesn't exist (allow CI to pass)
