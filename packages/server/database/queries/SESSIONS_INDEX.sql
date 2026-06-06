SELECT
    s.id,
    s.key,
    s.date,
    s.number,
    s.type,
    s.state,
    s.state_text_fi,
    s.description,
    s.start_time_actual,
    s.minutes_start_time,
    s.minutes_end_time,
    s.minutes_title,
    s.minutes_status,
    s.agenda_key,
    a.title AS agenda_title,
    COALESCE(vc.voting_count, 0) AS voting_count,
    COALESCE(sc.section_count, 0) AS section_count,
    COALESCE(spc.speech_count, 0) AS speech_count,
    COALESCE(st.section_titles, '') AS section_titles,
    COALESCE(vv.voting_titles, '') AS voting_titles
FROM Session s
LEFT JOIN Agenda a ON s.agenda_key = a.key
LEFT JOIN (SELECT session_key, COUNT(*) AS voting_count FROM Voting WHERE annulled = 0 GROUP BY session_key) vc ON vc.session_key = s.key
LEFT JOIN (SELECT session_key, COUNT(*) AS section_count FROM Section WHERE minutes_entry_kind = 'asiakohta' GROUP BY session_key) sc ON sc.session_key = s.key
LEFT JOIN (SELECT session_key, COUNT(*) AS speech_count FROM Speech WHERE COALESCE(has_spoken, 1) = 1 GROUP BY session_key) spc ON spc.session_key = s.key
LEFT JOIN (SELECT session_key, GROUP_CONCAT(title, '||') AS section_titles FROM Section WHERE minutes_entry_kind = 'asiakohta' GROUP BY session_key) st ON st.session_key = s.key
LEFT JOIN (SELECT session_key, GROUP_CONCAT(title, '||') AS voting_titles FROM Voting WHERE annulled = 0 GROUP BY session_key) vv ON vv.session_key = s.key
WHERE s.type = 'TAYSISTUN'
ORDER BY s.date DESC, s.number DESC
LIMIT $limit;
