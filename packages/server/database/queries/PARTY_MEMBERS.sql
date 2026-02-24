WITH window AS (
  SELECT
    COALESCE($startDate, $asOfDate) AS window_start_date,
    COALESCE(DATE($endDateExclusive, '-1 day'), $asOfDate) AS window_end_date
)
SELECT
  r.person_id,
  r.first_name,
  r.last_name,
  r.party,
  r.gender,
  r.birth_date,
  r.current_municipality,
  r.profession,
  COALESCE(gm_current.is_minister, 0) AS is_minister,
  gm_current.ministry
FROM Representative r
JOIN ParliamentaryGroupMembership pgm
  ON r.person_id = pgm.person_id
  AND pgm.group_code = $partyCode
  AND pgm.start_date <= $asOfDate
  AND (pgm.end_date IS NULL OR pgm.end_date >= $asOfDate)
JOIN Term t
  ON r.person_id = t.person_id
  AND t.start_date <= $asOfDate
  AND (t.end_date IS NULL OR t.end_date >= $asOfDate)
LEFT JOIN (
  SELECT
    gm.person_id,
    1 AS is_minister,
    gm.ministry
  FROM GovernmentMembership gm
  CROSS JOIN window w
  WHERE gm.start_date <= w.window_end_date
    AND (gm.end_date IS NULL OR gm.end_date >= w.window_start_date)
    AND (
      $governmentName IS NULL OR (
        TRIM(gm.government) = TRIM($governmentName)
        AND gm.start_date >= $governmentStartDate
      )
    )
) gm_current ON r.person_id = gm_current.person_id
ORDER BY r.last_name, r.first_name;
