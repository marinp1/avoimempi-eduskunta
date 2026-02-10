SELECT
  d.id,
  d.eduskunta_tunnus,
  d.document_type_code,
  d.document_type_name,
  d.document_number,
  d.parliamentary_year,
  d.title,
  d.created,
  d.status,
  d.language_code,
  d.publicity_code,
  d.summary_text,
  (SELECT target_eduskunta_tunnus FROM VaskiRelationship vr WHERE vr.document_id = d.id AND vr.relationship_type = 'vireilletulo' LIMIT 1) AS source_reference,
  (SELECT first_name FROM VaskiDocumentActor va WHERE va.document_id = d.id AND va.role_code = 'laatija' LIMIT 1) AS author_first_name,
  (SELECT last_name FROM VaskiDocumentActor va WHERE va.document_id = d.id AND va.role_code = 'laatija' LIMIT 1) AS author_last_name,
  (SELECT position_text FROM VaskiDocumentActor va WHERE va.document_id = d.id AND va.role_code = 'laatija' LIMIT 1) AS author_role,
  (SELECT organization_text FROM VaskiDocumentActor va WHERE va.document_id = d.id AND va.role_code = 'laatija' LIMIT 1) AS author_organization,
  GROUP_CONCAT(DISTINCT ds.subject_text) AS subjects
FROM VaskiDocument d
LEFT JOIN VaskiSubject ds ON d.id = ds.document_id
WHERE d.id = $id
GROUP BY d.id;
