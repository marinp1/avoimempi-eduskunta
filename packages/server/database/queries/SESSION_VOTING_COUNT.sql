SELECT COUNT(*) as voting_count
FROM Voting v
JOIN Section sec ON v.section_key = sec.key
WHERE sec.session_key = $sessionKey;
