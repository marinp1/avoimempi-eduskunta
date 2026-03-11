WITH window AS (
  SELECT
    COALESCE($startDate, $asOfDate) AS start_date,
    COALESCE(DATE($endDateExclusive, '-1 day'), $asOfDate) AS end_date
),
active_members AS (
  SELECT
    pgm.group_code,
    pgm.group_name,
    pgm.group_abbreviation,
    pgm.person_id,
    pgm.start_date,
    pgm.end_date
  FROM ParliamentaryGroupMembership pgm
  WHERE pgm.start_date <= $asOfDate
    AND (pgm.end_date IS NULL OR pgm.end_date >= $asOfDate)
    AND EXISTS (
      SELECT 1
      FROM Term t INDEXED BY idx_term_person_dates
      WHERE t.person_id = pgm.person_id
        AND t.start_date <= $asOfDate
        AND (t.end_date IS NULL OR t.end_date >= $asOfDate)
    )
  GROUP BY
    pgm.group_code,
    pgm.group_name,
    pgm.group_abbreviation,
    pgm.person_id,
    pgm.start_date,
    pgm.end_date
),
member_stats AS (
  SELECT
    am.group_code,
    am.group_name,
    MIN(am.group_abbreviation) AS group_abbreviation,
    COUNT(*) AS member_count
  FROM active_members am
  GROUP BY am.group_code, am.group_name
),
recent_votings AS (
  SELECT id, start_date
  FROM Voting
  WHERE start_date <= $asOfDate
    AND start_date >= COALESCE($startDate, DATE($asOfDate, '-6 months'))
    AND ($endDateExclusive IS NULL OR start_date < $endDateExclusive)
),
vote_stats AS (
  SELECT
    pgm.group_code,
    SUM(CASE WHEN v.vote IN ('Jaa', 'Ei', 'Tyhjää') THEN 1 ELSE 0 END) AS votes_cast,
    COUNT(*) AS total_votings,
    ROUND(
      100.0 * SUM(CASE WHEN v.vote IN ('Jaa', 'Ei', 'Tyhjää') THEN 1 ELSE 0 END) /
      NULLIF(COUNT(*), 0),
      1
    ) AS participation_rate
  FROM recent_votings rv
  JOIN Vote v INDEXED BY idx_vote_voting_group_vote ON v.voting_id = rv.id
  JOIN ParliamentaryGroupMembership pgm
    ON pgm.person_id = v.person_id
    AND pgm.start_date <= rv.start_date
    AND (pgm.end_date IS NULL OR pgm.end_date >= rv.start_date)
  GROUP BY pgm.group_code
),
display_code_candidates AS (
  SELECT
    am.group_code,
    v.group_abbreviation AS party_display_code,
    ROW_NUMBER() OVER (
      PARTITION BY am.group_code
      ORDER BY v.voting_id DESC
    ) AS row_num
  FROM active_members am
  JOIN Vote v ON v.person_id = am.person_id
  WHERE v.group_abbreviation IS NOT NULL
    AND TRIM(v.group_abbreviation) != ''
),
display_codes AS (
  SELECT
    group_code,
    party_display_code
  FROM display_code_candidates
  WHERE row_num = 1
),
gov_groups AS (
  SELECT
    pgm.group_code,
    MAX(CASE WHEN gm.id IS NOT NULL THEN 1 ELSE 0 END) AS is_in_government
  FROM GovernmentMembership gm
  JOIN Government g ON g.id = gm.government_id
  JOIN ParliamentaryGroupMembership pgm
    ON pgm.person_id = gm.person_id
    AND pgm.start_date <= COALESCE(gm.end_date, '9999-12-31')
    AND (pgm.end_date IS NULL OR pgm.end_date >= gm.start_date)
  CROSS JOIN window w
  WHERE gm.start_date <= w.end_date
    AND (gm.end_date IS NULL OR gm.end_date >= w.start_date)
    AND (
      $governmentName IS NULL OR (
        TRIM(g.name) = TRIM($governmentName)
        AND g.start_date = $governmentStartDate
      )
    )
  GROUP BY pgm.group_code
),
demo_stats AS (
  SELECT
    am.group_code,
    SUM(CASE WHEN r.gender = 'Nainen' THEN 1 ELSE 0 END) AS female_count,
    SUM(CASE WHEN r.gender = 'Mies' THEN 1 ELSE 0 END) AS male_count,
    AVG(
      CASE
        WHEN r.birth_date IS NOT NULL THEN (JULIANDAY($asOfDate) - JULIANDAY(r.birth_date)) / 365.25
        ELSE NULL
      END
    ) AS avg_age
  FROM active_members am
  JOIN Representative r ON r.person_id = am.person_id
  GROUP BY am.group_code
)
SELECT
  ms.group_code AS party_code,
  COALESCE(dc.party_display_code, ms.group_code) AS party_display_code,
  ms.group_name AS party_name,
  ms.member_count,
  COALESCE(gg.is_in_government, 0) AS is_in_government,
  COALESCE(vs.votes_cast, 0) AS votes_cast,
  COALESCE(vs.total_votings, 0) AS total_votings,
  COALESCE(vs.participation_rate, 0) AS participation_rate,
  COALESCE(ds.female_count, 0) AS female_count,
  COALESCE(ds.male_count, 0) AS male_count,
  ROUND(COALESCE(ds.avg_age, 0), 1) AS average_age
FROM member_stats ms
LEFT JOIN display_codes dc ON dc.group_code = ms.group_code
LEFT JOIN gov_groups gg ON gg.group_code = ms.group_code
LEFT JOIN demo_stats ds ON ds.group_code = ms.group_code
LEFT JOIN vote_stats vs ON vs.group_code = ms.group_code
ORDER BY ms.member_count DESC;
