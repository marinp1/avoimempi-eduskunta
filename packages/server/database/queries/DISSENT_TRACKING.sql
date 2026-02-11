WITH recent_votings AS (
  SELECT id, start_time, start_date, title, section_title
  FROM Voting
  WHERE annulled = 0
  ORDER BY start_time DESC
  LIMIT 500
),
party_majority AS (
  SELECT
    v.voting_id,
    v.group_abbreviation AS party,
    CASE
      WHEN SUM(CASE WHEN v.vote = 'Jaa' THEN 1 ELSE 0 END) >= SUM(CASE WHEN v.vote = 'Ei' THEN 1 ELSE 0 END)
        AND SUM(CASE WHEN v.vote = 'Jaa' THEN 1 ELSE 0 END) >= SUM(CASE WHEN v.vote = 'Tyhjää' THEN 1 ELSE 0 END)
      THEN 'Jaa'
      WHEN SUM(CASE WHEN v.vote = 'Ei' THEN 1 ELSE 0 END) >= SUM(CASE WHEN v.vote = 'Jaa' THEN 1 ELSE 0 END)
        AND SUM(CASE WHEN v.vote = 'Ei' THEN 1 ELSE 0 END) >= SUM(CASE WHEN v.vote = 'Tyhjää' THEN 1 ELSE 0 END)
      THEN 'Ei'
      ELSE 'Tyhjää'
    END AS majority_vote
  FROM Vote v
  JOIN recent_votings rv ON v.voting_id = rv.id
  WHERE v.vote IN ('Jaa', 'Ei', 'Tyhjää')
  GROUP BY v.voting_id, v.group_abbreviation
)
SELECT
  r.person_id,
  r.first_name,
  r.last_name,
  pgm.group_name AS party_name,
  pgm.group_code AS party_code,
  rv.id AS voting_id,
  rv.start_time,
  rv.title,
  rv.section_title,
  v.vote AS mp_vote,
  pm.majority_vote
FROM recent_votings rv
JOIN Vote v ON rv.id = v.voting_id
JOIN Representative r ON v.person_id = r.person_id
JOIN party_majority pm ON v.voting_id = pm.voting_id AND v.group_abbreviation = pm.party
LEFT JOIN ParliamentaryGroupMembership pgm
  ON v.person_id = pgm.person_id
  AND pgm.group_abbreviation = pm.party
  AND rv.start_date >= pgm.start_date
  AND (pgm.end_date IS NULL OR rv.start_date <= pgm.end_date)
WHERE v.vote IN ('Jaa', 'Ei', 'Tyhjää')
  AND v.vote != pm.majority_vote
  AND ($personId IS NULL OR r.person_id = $personId)
ORDER BY rv.start_time DESC
LIMIT $limit;
