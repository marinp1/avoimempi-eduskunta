WITH roll_call_totals AS (
    SELECT COUNT(*) AS total_roll_calls
    FROM RollCallReport rcr
    WHERE ($startDate IS NULL OR rcr.session_date >= $startDate)
      AND ($endDateExclusive IS NULL OR rcr.session_date < $endDateExclusive)
),
person_entries AS (
    SELECT
        rce.person_id,
        SUM(CASE WHEN rce.entry_type = 'absent' THEN 1 ELSE 0 END) AS absent_count,
        SUM(CASE WHEN rce.entry_type = 'late' THEN 1 ELSE 0 END) AS late_count
    FROM RollCallEntry rce
    JOIN RollCallReport rcr ON rcr.id = rce.roll_call_id
    WHERE rce.person_id IS NOT NULL
      AND ($startDate IS NULL OR rcr.session_date >= $startDate)
      AND ($endDateExclusive IS NULL OR rcr.session_date < $endDateExclusive)
    GROUP BY rce.person_id
)
SELECT
    r.person_id,
    r.first_name,
    r.last_name,
    r.sort_name,
    r.party,
    pe.absent_count,
    pe.late_count,
    rct.total_roll_calls,
    ROUND(
        CAST(pe.absent_count AS REAL) * 100.0 / NULLIF(rct.total_roll_calls, 0),
        2
    ) AS absence_rate
FROM person_entries pe
JOIN Representative r ON r.person_id = pe.person_id
CROSS JOIN roll_call_totals rct
ORDER BY pe.absent_count DESC, r.sort_name ASC
