WITH active_members AS (
  SELECT DISTINCT
    pgm.group_code,
    pgm.group_name,
    pgm.group_abbreviation,
    pgm.person_id
  FROM ParliamentaryGroupMembership pgm
  JOIN Term t ON t.person_id = pgm.person_id
  WHERE pgm.end_date IS NULL
    AND t.end_date IS NULL
),
active_groups AS (
  SELECT
    am.group_code,
    am.group_name,
    am.group_abbreviation AS group_abbreviation
  FROM active_members am
  GROUP BY am.group_code, am.group_name, am.group_abbreviation
),
member_stats AS (
  SELECT
    am.group_code,
    am.group_name,
    COUNT(*) AS member_count
  FROM active_members am
  GROUP BY am.group_code, am.group_name
),
recent_votings AS (
  SELECT id
  FROM Voting
  WHERE start_time >= DATE('now', '-6 months')
),
vote_stats AS (
  SELECT
    v.group_abbreviation AS party,
    ROUND(
      100.0 * SUM(CASE WHEN v.vote IN ('Jaa', 'Ei', 'Tyhjää') THEN 1 ELSE 0 END) /
      NULLIF(COUNT(*), 0),
      1
    ) AS participation_rate
  FROM recent_votings rv
  JOIN Vote v INDEXED BY idx_vote_voting_id ON v.voting_id = rv.id
  GROUP BY v.group_abbreviation
),
gov_groups AS (
  SELECT
    am.group_code,
    MAX(CASE WHEN gm.id IS NOT NULL THEN 1 ELSE 0 END) AS is_in_government
  FROM active_members am
  LEFT JOIN GovernmentMembership gm
    ON gm.person_id = am.person_id
    AND gm.end_date IS NULL
  GROUP BY am.group_code
),
demo_stats AS (
  SELECT
    am.group_code,
    SUM(CASE WHEN r.gender = 'Nainen' THEN 1 ELSE 0 END) AS female_count,
    SUM(CASE WHEN r.gender = 'Mies' THEN 1 ELSE 0 END) AS male_count,
    AVG(
      CASE
        WHEN r.birth_date IS NOT NULL THEN (JULIANDAY('now') - JULIANDAY(r.birth_date)) / 365.25
        ELSE NULL
      END
    ) AS avg_age
  FROM active_members am
  JOIN Representative r ON r.person_id = am.person_id
  GROUP BY am.group_code
)
SELECT
  ms.group_code AS party_code,
  ms.group_name AS party_name,
  ms.member_count,
  COALESCE(gg.is_in_government, 0) AS is_in_government,
  COALESCE(vs.participation_rate, 0) AS participation_rate,
  COALESCE(ds.female_count, 0) AS female_count,
  COALESCE(ds.male_count, 0) AS male_count,
  ROUND(COALESCE(ds.avg_age, 0), 1) AS average_age
FROM member_stats ms
JOIN active_groups ag ON ag.group_code = ms.group_code
LEFT JOIN gov_groups gg ON gg.group_code = ms.group_code
LEFT JOIN demo_stats ds ON ds.group_code = ms.group_code
LEFT JOIN vote_stats vs ON vs.party = ag.group_abbreviation
ORDER BY ms.member_count DESC;
