SELECT
  v.id,
  v.start_time,
  v.title,
  v.section_title,
  v.n_yes,
  v.n_no,
  v.n_abstain,
  v.n_absent,
  v.n_total,
  ABS(v.n_yes - v.n_no) AS margin,
  v.session_key,
  v.section_key,
  v.result_url,
  v.proceedings_url
FROM Voting v
WHERE v.annulled = 0
  AND v.n_total > 0
  AND ABS(v.n_yes - v.n_no) <= $threshold
ORDER BY v.start_time DESC
LIMIT $limit;
