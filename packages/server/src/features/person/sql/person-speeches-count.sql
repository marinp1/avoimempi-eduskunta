SELECT COUNT(*) AS total
FROM Speech sp
WHERE sp.person_id = $personId
  AND COALESCE(sp.has_spoken, 1) = 1;
