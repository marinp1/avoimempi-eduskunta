SELECT 'committee' AS source, c.name AS label, COUNT(*) AS weight
FROM CommitteeMembership cm
JOIN Committee c ON cm.committee_code = c.code
WHERE cm.person_id = $personId
GROUP BY c.name

UNION ALL

SELECT 'initiative_subject' AS source, lis.subject_text AS label, COUNT(*) AS weight
FROM LegislativeInitiativeSigner s
JOIN LegislativeInitiativeSubject lis ON lis.initiative_id = s.initiative_id
WHERE s.person_id = $personId
GROUP BY lis.subject_text

UNION ALL

SELECT 'initiative_subject' AS source, lis.subject_text AS label, COUNT(*) AS weight
FROM LegislativeInitiative li
JOIN LegislativeInitiativeSubject lis ON lis.initiative_id = li.id
WHERE li.first_signer_person_id = $personId
GROUP BY lis.subject_text

UNION ALL

SELECT 'interpellation_subject' AS source, isub.subject_text AS label, COUNT(*) AS weight
FROM Interpellation i
JOIN InterpellationSubject isub ON isub.interpellation_id = i.id
WHERE i.first_signer_person_id = $personId
GROUP BY isub.subject_text

UNION ALL

SELECT 'written_question_subject' AS source, wqs.subject_text AS label, COUNT(*) AS weight
FROM WrittenQuestion wq
JOIN WrittenQuestionSubject wqs ON wqs.question_id = wq.id
WHERE wq.first_signer_person_id = $personId
GROUP BY wqs.subject_text

UNION ALL

SELECT 'speech_section' AS source, s.title AS label, COUNT(*) AS weight
FROM Speech sp
JOIN Section s ON s.key = sp.section_key
WHERE sp.person_id = $personId
  AND s.title IS NOT NULL
GROUP BY s.title;
