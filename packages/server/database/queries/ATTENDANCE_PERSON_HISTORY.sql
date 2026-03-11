SELECT
    rcr.session_date,
    rce.entry_type,
    rce.absence_reason
FROM RollCallReport rcr
LEFT JOIN RollCallEntry rce ON rce.roll_call_id = rcr.id AND rce.person_id = $personId
WHERE ($startDate IS NULL OR rcr.session_date >= $startDate)
  AND ($endDateExclusive IS NULL OR rcr.session_date < $endDateExclusive)
ORDER BY rcr.session_date ASC
