SELECT
  rce.roll_call_id,
  rce.entry_order,
  rce.person_id,
  rce.first_name,
  rce.last_name,
  rce.party,
  rce.entry_type,
  rce.absence_reason,
  rce.arrival_time
FROM RollCallEntry rce
WHERE rce.roll_call_id = $rollCallId
ORDER BY rce.entry_order ASC;
