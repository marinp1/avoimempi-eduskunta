SELECT
    s.date,
    s.key,
    COALESCE(vc.voting_count, 0) AS voting_count,
    COALESCE(spc.speech_count, 0) AS speech_count
FROM Session s
LEFT JOIN (SELECT session_key, COUNT(*) AS voting_count FROM Voting WHERE annulled = 0 GROUP BY session_key) vc ON vc.session_key = s.key
LEFT JOIN (SELECT session_key, COUNT(*) AS speech_count FROM Speech WHERE COALESCE(has_spoken, 1) = 1 GROUP BY session_key) spc ON spc.session_key = s.key
WHERE s.type = 'TAYSISTUN'
ORDER BY s.date ASC, s.number ASC;
