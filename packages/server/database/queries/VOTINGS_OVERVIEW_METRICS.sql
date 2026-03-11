SELECT
  COUNT(*) AS total_votings,
  COALESCE(
    SUM(
      CASE
        WHEN v.n_total > 0 AND ABS(v.n_yes - v.n_no) <= $closeThreshold THEN 1
        ELSE 0
      END
    ),
    0
  ) AS close_votings,
  (
    SELECT v_latest.session_key
    FROM Voting v_latest
    WHERE
      v_latest.annulled = 0
      AND ($startDate IS NULL OR v_latest.start_date >= $startDate)
      AND ($endDateExclusive IS NULL OR v_latest.start_date < $endDateExclusive)
    ORDER BY v_latest.start_time DESC, v_latest.id DESC
    LIMIT 1
  ) AS latest_session_key,
  COUNT(DISTINCT NULLIF(TRIM(v.section_processing_phase), '')) AS phase_count
FROM Voting v
WHERE
  v.annulled = 0
  AND ($startDate IS NULL OR v.start_date >= $startDate)
  AND ($endDateExclusive IS NULL OR v.start_date < $endDateExclusive)
