DROP VIEW IF EXISTS CurrentGovernmentCoalition;
DROP VIEW IF EXISTS GovernmentCoalitionSummary;
DROP VIEW IF EXISTS InferredGovernmentCoalition;
DROP VIEW IF EXISTS GovernmentMinistersByParty;
DROP TABLE IF EXISTS GovernmentParty;
DROP TABLE IF EXISTS Government;
DROP INDEX IF EXISTS idx_government_dates;
DROP INDEX IF EXISTS idx_government_party_gov_id;
DROP INDEX IF EXISTS idx_government_party_party;

CREATE VIEW InferredGovernmentCoalition AS
SELECT DISTINCT
    gm.government,
    MIN(gm.start_date) as start_date,
    MAX(CASE WHEN gm.end_date IS NULL THEN DATE('9999-12-31') ELSE gm.end_date END) as end_date,
    r.party
FROM GovernmentMembership gm
JOIN Representative r ON gm.person_id = r.person_id
WHERE r.party IS NOT NULL
GROUP BY gm.government, r.party
ORDER BY start_date DESC, r.party;

CREATE VIEW CurrentGovernmentCoalition AS
SELECT DISTINCT
    gm.government,
    MIN(gm.start_date) as start_date,
    r.party
FROM GovernmentMembership gm
JOIN Representative r ON gm.person_id = r.person_id
WHERE r.party IS NOT NULL
  AND (gm.end_date IS NULL OR gm.end_date >= DATE('now'))
GROUP BY gm.government, r.party
ORDER BY r.party;
