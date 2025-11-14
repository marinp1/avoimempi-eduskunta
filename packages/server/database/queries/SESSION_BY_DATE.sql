SELECT
    s.id,
    s.number,
    s.key,
    s.date,
    s.year,
    s.type,
    s.state,
    s.description,
    s.start_time_actual,
    s.start_time_reported,
    s.agenda_key,
    a.title as agenda_title,
    a.state as agenda_state
FROM
    Session s
LEFT JOIN
    Agenda a ON s.agenda_key = a.key
WHERE
    s.date = $date
ORDER BY s.number ASC
