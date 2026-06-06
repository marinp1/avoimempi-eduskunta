SELECT COUNT(*) AS count
FROM Speech
WHERE section_key = $sectionKey
  AND COALESCE(has_spoken, 1) = 1;
