WITH input_ids AS (
  SELECT $idA AS id
  UNION
  SELECT $idB
  UNION
  SELECT $idC
),
same_section_relations AS (
  SELECT
    r2.document_identifier AS related_identifier,
    'same_section' AS relation_type,
    COUNT(*) AS evidence_count,
    MIN(sess.date) AS first_date,
    MAX(sess.date) AS last_date
  FROM SectionDocumentReference r1
  JOIN SectionDocumentReference r2
    ON r2.section_key = r1.section_key
   AND r2.document_identifier <> r1.document_identifier
  LEFT JOIN Section sec
    ON sec.key = r1.section_key
  LEFT JOIN Session sess
    ON sess.key = sec.session_key
  WHERE r1.document_identifier IN (SELECT id FROM input_ids)
  GROUP BY r2.document_identifier
),
written_answer_outgoing AS (
  SELECT
    wq.answer_parliament_identifier AS related_identifier,
    'written_question_answer' AS relation_type,
    COUNT(*) AS evidence_count,
    NULL AS first_date,
    NULL AS last_date
  FROM WrittenQuestion wq
  WHERE wq.parliament_identifier IN (SELECT id FROM input_ids)
    AND wq.answer_parliament_identifier IS NOT NULL
    AND TRIM(wq.answer_parliament_identifier) <> ''
  GROUP BY wq.answer_parliament_identifier
),
written_answer_incoming AS (
  SELECT
    wq.parliament_identifier AS related_identifier,
    'written_question_asks' AS relation_type,
    COUNT(*) AS evidence_count,
    NULL AS first_date,
    NULL AS last_date
  FROM WrittenQuestion wq
  WHERE wq.answer_parliament_identifier IN (SELECT id FROM input_ids)
  GROUP BY wq.parliament_identifier
),
committee_source_outgoing AS (
  SELECT
    cr.source_reference AS related_identifier,
    'committee_source_reference' AS relation_type,
    COUNT(*) AS evidence_count,
    NULL AS first_date,
    NULL AS last_date
  FROM CommitteeReport cr
  WHERE cr.parliament_identifier IN (SELECT id FROM input_ids)
    AND cr.source_reference IS NOT NULL
    AND TRIM(cr.source_reference) <> ''
  GROUP BY cr.source_reference
),
committee_source_incoming AS (
  SELECT
    cr.parliament_identifier AS related_identifier,
    'committee_report_for_source' AS relation_type,
    COUNT(*) AS evidence_count,
    NULL AS first_date,
    NULL AS last_date
  FROM CommitteeReport cr
  WHERE cr.source_reference IN (SELECT id FROM input_ids)
  GROUP BY cr.parliament_identifier
),
all_relations AS (
  SELECT * FROM same_section_relations
  UNION ALL
  SELECT * FROM written_answer_outgoing
  UNION ALL
  SELECT * FROM written_answer_incoming
  UNION ALL
  SELECT * FROM committee_source_outgoing
  UNION ALL
  SELECT * FROM committee_source_incoming
)
SELECT
  related_identifier,
  GROUP_CONCAT(relation_type, '||') AS relation_types,
  SUM(evidence_count) AS evidence_count,
  MIN(first_date) AS first_date,
  MAX(last_date) AS last_date
FROM all_relations
WHERE related_identifier IS NOT NULL
  AND TRIM(related_identifier) <> ''
  AND related_identifier NOT IN (SELECT id FROM input_ids)
GROUP BY related_identifier
ORDER BY evidence_count DESC, related_identifier ASC;
