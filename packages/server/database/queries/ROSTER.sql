WITH gov_members AS (
  SELECT DISTINCT gm.person_id
  FROM GovernmentMembership gm
  JOIN Government g ON g.id = gm.government_id
  WHERE g.end_date IS NULL
    AND (gm.end_date IS NULL OR gm.end_date >= date('now'))
),
best_district AS (
  SELECT rd.person_id, MIN(CASE WHEN rd.district_code != '' THEN rd.district_code END) AS district_code
  FROM RepresentativeDistrict rd
  WHERE rd.end_date IS NULL
  GROUP BY rd.person_id
),
participation AS (
  SELECT pvd.person_id,
    ROUND(SUM(pvd.votes_cast) * 100.0 / NULLIF(SUM(pvd.total_votings), 0), 1) AS participation_rate
  FROM PersonVotingDailyStats pvd
  GROUP BY pvd.person_id
),
current_group AS (
  SELECT DISTINCT pgm.person_id, pgm.group_abbreviation
  FROM ParliamentaryGroupMembership pgm
  WHERE pgm.end_date IS NULL
)
SELECT
  r.person_id,
  r.first_name,
  r.last_name,
  r.sort_name,
  r.birth_year,
  r.minister,
  cg.group_abbreviation,
  CASE WHEN gv.person_id IS NOT NULL THEN 1 ELSE 0 END AS is_in_government,
  d.name                                                  AS district_name,
  COALESCE(p.participation_rate, 0)                       AS participation_rate
FROM Representative r
LEFT JOIN current_group cg   ON cg.person_id = r.person_id
LEFT JOIN gov_members gv     ON gv.person_id = r.person_id
LEFT JOIN best_district bd   ON bd.person_id = r.person_id
LEFT JOIN District d         ON d.code = bd.district_code
LEFT JOIN participation p    ON p.person_id = r.person_id
WHERE r.term_end_date IS NULL
ORDER BY r.sort_name
