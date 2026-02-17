SELECT
  g.id,
  g.parliament_identifier,
  g.document_number,
  g.parliamentary_year,
  g.title,
  g.submission_date,
  g.author,
  g.summary_text,
  g.summary_rich_text,
  g.justification_text,
  g.justification_rich_text,
  g.proposal_text,
  g.proposal_rich_text,
  g.appendix_text,
  g.appendix_rich_text,
  g.signature_date,
  g.decision_outcome,
  g.decision_outcome_code,
  g.law_decision_text,
  g.latest_stage_code,
  g.end_date
FROM GovernmentProposal g
WHERE g.id = $id
