WITH speech_counts AS (
  SELECT person_id, COUNT(*) AS n
  FROM Speech
  WHERE person_id IS NOT NULL
    AND ($startDate IS NULL OR created_datetime >= $startDate)
    AND ($endDateExclusive IS NULL OR created_datetime < $endDateExclusive)
  GROUP BY person_id
),
initiative_counts AS (
  SELECT person_id, COUNT(*) AS n FROM (
    SELECT first_signer_person_id AS person_id FROM LegislativeInitiative WHERE first_signer_person_id IS NOT NULL
    UNION ALL
    SELECT person_id FROM LegislativeInitiativeSigner WHERE person_id IS NOT NULL AND COALESCE(is_first_signer, 0) = 0
  )
  GROUP BY person_id
),
interpellation_counts AS (
  SELECT person_id, COUNT(*) AS n FROM (
    SELECT first_signer_person_id AS person_id FROM Interpellation WHERE first_signer_person_id IS NOT NULL
    UNION ALL
    SELECT person_id FROM InterpellationSigner WHERE person_id IS NOT NULL AND COALESCE(is_first_signer, 0) = 0
  )
  GROUP BY person_id
),
written_question_counts AS (
  SELECT person_id, COUNT(*) AS n FROM (
    SELECT first_signer_person_id AS person_id FROM WrittenQuestion WHERE first_signer_person_id IS NOT NULL
    UNION ALL
    SELECT person_id FROM WrittenQuestionSigner WHERE person_id IS NOT NULL AND COALESCE(is_first_signer, 0) = 0
  )
  GROUP BY person_id
),
vote_counts AS (
  SELECT person_id,
    COUNT(*) AS total_votes,
    SUM(CASE WHEN vote IN ('Jaa','Ei','Tyhjää') THEN 1 ELSE 0 END) AS votes_cast
  FROM Vote
  WHERE person_id IS NOT NULL
  GROUP BY person_id
)
SELECT
  r.person_id,
  r.party,
  COALESCE(sc.n, 0) AS speech_count,
  COALESCE(ic.n, 0) AS initiative_count,
  COALESCE(intc.n, 0) AS interpellation_count,
  COALESCE(wqc.n, 0) AS written_question_count,
  COALESCE(vc.total_votes, 0) AS vote_total,
  COALESCE(vc.votes_cast, 0) AS vote_cast
FROM Representative r
LEFT JOIN speech_counts sc ON sc.person_id = r.person_id
LEFT JOIN initiative_counts ic ON ic.person_id = r.person_id
LEFT JOIN interpellation_counts intc ON intc.person_id = r.person_id
LEFT JOIN written_question_counts wqc ON wqc.person_id = r.person_id
LEFT JOIN vote_counts vc ON vc.person_id = r.person_id;
