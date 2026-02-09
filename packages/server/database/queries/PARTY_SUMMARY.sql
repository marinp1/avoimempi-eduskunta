SELECT
  pgm.group_code AS party_code,
  pgm.group_name AS party_name,
  COUNT(DISTINCT pgm.person_id) AS member_count,
  COALESCE(gov.is_in_government, 0) AS is_in_government,
  COALESCE(vote_stats.participation_rate, 0) AS participation_rate,
  COALESCE(gender_stats.female_count, 0) AS female_count,
  COALESCE(gender_stats.male_count, 0) AS male_count,
  ROUND(COALESCE(age_stats.avg_age, 0), 1) AS average_age
FROM ParliamentaryGroupMembership pgm
JOIN Term t ON pgm.person_id = t.person_id AND t.end_date IS NULL
LEFT JOIN (
  SELECT
    pgm2.group_code,
    MAX(CASE WHEN gm.id IS NOT NULL THEN 1 ELSE 0 END) AS is_in_government
  FROM ParliamentaryGroupMembership pgm2
  JOIN Term t2 ON pgm2.person_id = t2.person_id AND t2.end_date IS NULL
  LEFT JOIN GovernmentMembership gm
    ON pgm2.person_id = gm.person_id
    AND gm.end_date IS NULL
  WHERE pgm2.end_date IS NULL
  GROUP BY pgm2.group_code
) gov ON pgm.group_code = gov.group_code
LEFT JOIN (
  SELECT
    v.group_abbreviation AS party,
    ROUND(100.0 * COUNT(CASE WHEN v.vote IN ('Jaa', 'Ei', 'Tyhjää') THEN 1 END) / COUNT(*), 1) AS participation_rate
  FROM Vote v
  JOIN Voting vt ON v.voting_id = vt.id
  WHERE vt.start_time >= DATE('now', '-6 months')
  GROUP BY v.group_abbreviation
) vote_stats ON pgm.group_code LIKE vote_stats.party || '%'
LEFT JOIN (
  SELECT
    pgm3.group_code,
    SUM(CASE WHEN r.gender = 'Nainen' THEN 1 ELSE 0 END) AS female_count,
    SUM(CASE WHEN r.gender = 'Mies' THEN 1 ELSE 0 END) AS male_count
  FROM ParliamentaryGroupMembership pgm3
  JOIN Term t3 ON pgm3.person_id = t3.person_id AND t3.end_date IS NULL
  JOIN Representative r ON pgm3.person_id = r.person_id
  WHERE pgm3.end_date IS NULL
  GROUP BY pgm3.group_code
) gender_stats ON pgm.group_code = gender_stats.group_code
LEFT JOIN (
  SELECT
    pgm4.group_code,
    AVG((JULIANDAY('now') - JULIANDAY(r.birth_date)) / 365.25) AS avg_age
  FROM ParliamentaryGroupMembership pgm4
  JOIN Term t4 ON pgm4.person_id = t4.person_id AND t4.end_date IS NULL
  JOIN Representative r ON pgm4.person_id = r.person_id
  WHERE pgm4.end_date IS NULL AND r.birth_date IS NOT NULL
  GROUP BY pgm4.group_code
) age_stats ON pgm.group_code = age_stats.group_code
WHERE pgm.end_date IS NULL
GROUP BY pgm.group_code, pgm.group_name
ORDER BY member_count DESC;
