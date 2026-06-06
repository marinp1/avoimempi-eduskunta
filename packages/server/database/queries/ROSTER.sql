WITH gov_parties AS (
  SELECT DISTINCT pgm.group_abbreviation AS party
  FROM GovernmentMembership gm
  JOIN Government g ON g.id = gm.government_id
  JOIN ParliamentaryGroupMembership pgm
    ON pgm.person_id = gm.person_id
    AND pgm.start_date <= COALESCE(gm.end_date, DATE('now'))
    AND (pgm.end_date IS NULL OR pgm.end_date >= gm.start_date)
  WHERE g.end_date IS NULL
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
  WHERE pgm.start_date IS NOT NULL
    AND pgm.start_date <= DATE('now')
    AND (pgm.end_date IS NULL OR pgm.end_date >= DATE('now'))
)
SELECT
  r.person_id,
  r.first_name,
  r.last_name,
  r.sort_name,
  r.birth_year,
  r.minister,
  cg.group_abbreviation,
  CASE WHEN gp.party IS NOT NULL THEN 1 ELSE 0 END AS is_in_government,
  d.name                                                  AS district_name,
  COALESCE(p.participation_rate, 0)                       AS participation_rate
FROM Representative r
JOIN current_group cg        ON cg.person_id = r.person_id
LEFT JOIN gov_parties gp     ON gp.party = cg.group_abbreviation
LEFT JOIN best_district bd   ON bd.person_id = r.person_id
LEFT JOIN District d         ON d.code = bd.district_code
LEFT JOIN participation p    ON p.person_id = r.person_id
ORDER BY r.sort_name
