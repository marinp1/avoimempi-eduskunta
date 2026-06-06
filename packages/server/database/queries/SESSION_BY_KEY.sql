SELECT
    s.id,
    s.number,
    s.key,
    s.date,
    s.year,
    s.type,
    s.state,
    s.state_text_fi,
    s.description,
    s.start_time_actual,
    s.start_time_reported,
    s.end_time,
    s.agenda_key,
    s.minutes_title,
    s.minutes_status,
    s.minutes_start_time,
    s.minutes_end_time,
    s.minutes_agenda_item_count,
    s.minutes_other_item_count,
    s.roll_call_document_id,
    s.agenda_document_id,
    s.minutes_document_id,
    a.title AS agenda_title,
    a.state AS agenda_state,
    COALESCE(vc.voting_count, 0) AS voting_count,
    COALESCE(sc.section_count, 0) AS section_count,
    COALESCE(spc.speech_count, 0) AS speech_count,
    COALESCE(spc.speaker_count, 0) AS speaker_count
FROM Session s
LEFT JOIN Agenda a ON s.agenda_key = a.key
LEFT JOIN (SELECT session_key, COUNT(*) AS voting_count FROM Voting WHERE annulled = 0 GROUP BY session_key) vc ON vc.session_key = s.key
LEFT JOIN (SELECT session_key, COUNT(*) AS section_count FROM Section GROUP BY session_key) sc ON sc.session_key = s.key
LEFT JOIN (SELECT session_key, COUNT(*) AS speech_count, COUNT(DISTINCT person_id) AS speaker_count FROM Speech WHERE COALESCE(has_spoken, 1) = 1 GROUP BY session_key) spc ON spc.session_key = s.key
WHERE s.key = $key;
