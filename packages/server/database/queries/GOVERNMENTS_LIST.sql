SELECT
  g.id,
  g.name,
  g.start_date,
  g.end_date,
  (
    SELECT COUNT(DISTINCT gm2.person_id)
    FROM GovernmentMembership gm2
    WHERE gm2.government_id = g.id
  ) AS member_count,
  (
    SELECT GROUP_CONCAT(igc.party, '|')
    FROM InferredGovernmentCoalition igc
    WHERE igc.government = g.name
    ORDER BY igc.party
  ) AS parties
FROM Government g
ORDER BY g.start_date DESC
