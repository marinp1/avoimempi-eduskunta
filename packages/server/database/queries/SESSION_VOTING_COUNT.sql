SELECT COUNT(*) as voting_count
FROM Voting v
WHERE v.session_key = $sessionKey;
