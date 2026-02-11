SELECT
  r.person_id,
  r.first_name,
  r.last_name,
  r.party,
  COALESCE(vote_stats.votes_cast, 0) AS votes_cast,
  COALESCE(vote_stats.total_votings, 0) AS total_votings,
  COALESCE(speech_stats.speech_count, 0) AS speech_count,
  COALESCE(committee_stats.committee_count, 0) AS committee_count,
  ROUND(
    COALESCE(vote_stats.participation_rate, 0) * 0.4
    + IIF(COALESCE(speech_stats.speech_count, 0) / 100.0 > 1.0, 1.0, COALESCE(speech_stats.speech_count, 0) / 100.0) * 100 * 0.3
    + IIF(COALESCE(committee_stats.committee_count, 0) / 5.0 > 1.0, 1.0, COALESCE(committee_stats.committee_count, 0) / 5.0) * 100 * 0.3,
    1
  ) AS activity_score
FROM Representative r
JOIN Term t ON r.person_id = t.person_id
  AND t.end_date IS NULL
LEFT JOIN (
  SELECT
    v.person_id,
    COUNT(CASE WHEN v.vote IN ('Jaa', 'Ei', 'Tyhjää') THEN 1 END) AS votes_cast,
    COUNT(*) AS total_votings,
    ROUND(100.0 * COUNT(CASE WHEN v.vote IN ('Jaa', 'Ei', 'Tyhjää') THEN 1 END) / COUNT(*), 1) AS participation_rate
  FROM Vote v
  JOIN Voting vt ON v.voting_id = vt.id
  WHERE vt.start_time >= DATE('now', '-1 year')
  GROUP BY v.person_id
) vote_stats ON r.person_id = vote_stats.person_id
LEFT JOIN (
  SELECT
    sp.person_id,
    COUNT(*) AS speech_count
  FROM Speech sp
  GROUP BY sp.person_id
) speech_stats ON r.person_id = speech_stats.person_id
LEFT JOIN (
  SELECT
    cm.person_id,
    COUNT(DISTINCT cm.committee_code) AS committee_count
  FROM CommitteeMembership cm
  WHERE cm.end_date IS NULL OR cm.end_date >= DATE('now')
  GROUP BY cm.person_id
) committee_stats ON r.person_id = committee_stats.person_id
ORDER BY activity_score DESC
LIMIT $limit;
