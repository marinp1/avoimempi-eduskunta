SELECT MAX(s.date) as date
FROM Session s
WHERE EXISTS (SELECT 1 FROM Speech sp WHERE sp.session_key = s.key)
