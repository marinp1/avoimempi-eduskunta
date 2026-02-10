SELECT
    sec.id,
    sec.key,
    sec.identifier,
    sec.title,
    sec.ordinal,
    sec.note,
    sec.processing_title,
    sec.resolution,
    sec.session_key,
    sec.agenda_key,
    sec.modified_datetime,
    sec.vaski_id,
    vd.document_type_name AS vaski_document_type_name,
    vd.document_type_code AS vaski_document_type_code,
    vd.eduskunta_tunnus AS vaski_eduskunta_tunnus,
    vd.document_number AS vaski_document_number,
    vd.parliamentary_year AS vaski_parliamentary_year,
    vd.title AS vaski_title,
    vd.summary_text AS vaski_summary,
    (SELECT first_name FROM VaskiDocumentActor va WHERE va.document_id = vd.id AND va.role_code = 'laatija' LIMIT 1) AS vaski_author_first_name,
    (SELECT last_name FROM VaskiDocumentActor va WHERE va.document_id = vd.id AND va.role_code = 'laatija' LIMIT 1) AS vaski_author_last_name,
    (SELECT position_text FROM VaskiDocumentActor va WHERE va.document_id = vd.id AND va.role_code = 'laatija' LIMIT 1) AS vaski_author_role,
    (SELECT organization_text FROM VaskiDocumentActor va WHERE va.document_id = vd.id AND va.role_code = 'laatija' LIMIT 1) AS vaski_author_organization,
    vd.created AS vaski_creation_date,
    vd.status AS vaski_status,
    (SELECT target_eduskunta_tunnus FROM VaskiRelationship vr WHERE vr.document_id = vd.id AND vr.relationship_type = 'vireilletulo' LIMIT 1) AS vaski_source_reference,
    (SELECT group_concat(subject_text, ' | ')
     FROM (
       SELECT DISTINCT ds.subject_text
       FROM VaskiSubject ds
       WHERE ds.document_id = vd.id
     )) AS vaski_subjects,
    (SELECT COUNT(*) FROM Voting v WHERE v.section_key = sec.key) AS voting_count,
    (SELECT COUNT(*) FROM Speech sp WHERE sp.section_key = sec.key) AS speech_count,
    (SELECT COUNT(DISTINCT sp.person_id) FROM Speech sp WHERE sp.section_key = sec.key) AS speaker_count,
    (SELECT COUNT(DISTINCT sp.party_abbreviation) FROM Speech sp WHERE sp.section_key = sec.key AND sp.party_abbreviation IS NOT NULL) AS party_count
FROM
    Section sec
    LEFT JOIN VaskiDocument vd ON vd.id = sec.vaski_id
WHERE
    sec.session_key = $sessionKey
ORDER BY sec.ordinal ASC
