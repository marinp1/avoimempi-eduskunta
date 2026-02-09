SELECT
  d.id,
  d.eduskunta_tunnus,
  d.document_type_code,
  d.document_type_name,
  d.document_number,
  d.parliamentary_year,
  d.title,
  d.author_first_name,
  d.author_last_name,
  d.author_role,
  d.author_organization,
  d.creation_date,
  d.status,
  d.language_code,
  d.publicity_code,
  d.source_reference,
  d.summary,
  GROUP_CONCAT(DISTINCT ds.subject_text) AS subjects
FROM VaskiDocument d
LEFT JOIN DocumentSubject ds ON d.id = ds.document_id
WHERE d.id = $id
GROUP BY d.id;
