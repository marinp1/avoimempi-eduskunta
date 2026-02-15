SELECT v.*, v.section_title AS context_title
FROM Voting v
WHERE v.parliamentary_item LIKE '%' || $identifier || '%' COLLATE NOCASE
   OR v.section_title LIKE '%' || $identifier || '%' COLLATE NOCASE
   OR v.main_section_title LIKE '%' || $identifier || '%' COLLATE NOCASE
   OR v.agenda_title LIKE '%' || $identifier || '%' COLLATE NOCASE
ORDER BY v.start_time DESC
