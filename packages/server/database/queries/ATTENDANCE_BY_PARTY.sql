WITH roll_call_totals AS (
    SELECT COUNT(*) AS total_roll_calls
    FROM RollCallReport rcr
    WHERE ($startDate IS NULL OR rcr.session_date >= $startDate)
      AND ($endDateExclusive IS NULL OR rcr.session_date < $endDateExclusive)
),
party_entries AS (
    SELECT
        rce.party,
        COUNT(DISTINCT rce.person_id) AS absent_member_count,
        SUM(CASE WHEN rce.entry_type = 'absent' THEN 1 ELSE 0 END) AS total_absences,
        SUM(CASE WHEN rce.entry_type = 'late' THEN 1 ELSE 0 END) AS total_late
    FROM RollCallEntry rce
    JOIN RollCallReport rcr ON rcr.id = rce.roll_call_id
    WHERE rce.party IS NOT NULL
      AND ($startDate IS NULL OR rcr.session_date >= $startDate)
      AND ($endDateExclusive IS NULL OR rcr.session_date < $endDateExclusive)
    GROUP BY rce.party
)
SELECT
    pe.party,
    pe.absent_member_count,
    pe.total_absences,
    pe.total_late,
    rct.total_roll_calls,
    ROUND(
        CAST(pe.total_absences AS REAL) * 100.0 /
        NULLIF(pe.absent_member_count * rct.total_roll_calls, 0),
        2
    ) AS avg_absence_rate
FROM party_entries pe
CROSS JOIN roll_call_totals rct
ORDER BY pe.total_absences DESC
