DROP VIEW IF EXISTS InferredGovernmentCoalition;

DROP VIEW IF EXISTS CurrentGovernmentCoalition;

CREATE VIEW InferredGovernmentCoalition AS
SELECT DISTINCT
  g.name AS government,
  g.start_date AS start_date,
  COALESCE(g.end_date, DATE('9999-12-31')) AS end_date,
  COALESCE(UPPER(pgm.group_abbreviation), r.party) AS party
FROM GovernmentMembership gm
JOIN Government g ON g.id = gm.government_id
JOIN Representative r ON gm.person_id = r.person_id
LEFT JOIN ParliamentaryGroupMembership pgm
  ON pgm.person_id = gm.person_id
  AND pgm.start_date <= COALESCE(gm.end_date, DATE('now'))
  AND (pgm.end_date IS NULL OR pgm.end_date >= gm.start_date)
WHERE COALESCE(UPPER(pgm.group_abbreviation), r.party) IS NOT NULL
GROUP BY g.id, COALESCE(UPPER(pgm.group_abbreviation), r.party)
ORDER BY start_date DESC, party;

CREATE VIEW CurrentGovernmentCoalition AS
SELECT DISTINCT
  g.name AS government,
  g.start_date AS start_date,
  COALESCE(UPPER(pgm.group_abbreviation), r.party) AS party
FROM GovernmentMembership gm
JOIN Government g ON g.id = gm.government_id
JOIN Representative r ON gm.person_id = r.person_id
LEFT JOIN ParliamentaryGroupMembership pgm
  ON pgm.person_id = gm.person_id
  AND pgm.start_date <= DATE('now')
  AND (pgm.end_date IS NULL OR pgm.end_date >= gm.start_date)
WHERE COALESCE(UPPER(pgm.group_abbreviation), r.party) IS NOT NULL
  AND (g.end_date IS NULL OR g.end_date >= DATE('now'))
GROUP BY g.id, COALESCE(UPPER(pgm.group_abbreviation), r.party)
ORDER BY party;
