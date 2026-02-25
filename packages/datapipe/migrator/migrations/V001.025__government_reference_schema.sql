DROP VIEW IF EXISTS InferredGovernmentCoalition;

DROP VIEW IF EXISTS CurrentGovernmentCoalition;

DROP TABLE IF EXISTS GovernmentMembership;

DROP TABLE IF EXISTS Government;

CREATE TABLE Government (
  id INTEGER PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE
);

CREATE TABLE GovernmentMembership (
  id INTEGER PRIMARY KEY,
  person_id INTEGER,
  name VARCHAR(255),
  ministry VARCHAR(255),
  government VARCHAR(255),
  government_id INTEGER NOT NULL,
  start_date DATE,
  end_date DATE,
  FOREIGN KEY (person_id) REFERENCES Representative(person_id),
  FOREIGN KEY (government_id) REFERENCES Government(id)
);

CREATE VIEW InferredGovernmentCoalition AS
SELECT DISTINCT
  g.name AS government,
  g.start_date AS start_date,
  COALESCE(g.end_date, DATE('9999-12-31')) AS end_date,
  r.party
FROM GovernmentMembership gm
JOIN Government g ON g.id = gm.government_id
JOIN Representative r ON gm.person_id = r.person_id
WHERE r.party IS NOT NULL
GROUP BY g.id, r.party
ORDER BY start_date DESC, r.party;

CREATE VIEW CurrentGovernmentCoalition AS
SELECT DISTINCT
  g.name AS government,
  g.start_date AS start_date,
  r.party
FROM GovernmentMembership gm
JOIN Government g ON g.id = gm.government_id
JOIN Representative r ON gm.person_id = r.person_id
WHERE r.party IS NOT NULL
  AND (g.end_date IS NULL OR g.end_date >= DATE('now'))
GROUP BY g.id, r.party
ORDER BY r.party;

CREATE INDEX idx_government_name ON Government(name);

CREATE INDEX idx_government_dates ON Government(start_date, end_date);

CREATE INDEX idx_gm_government ON GovernmentMembership(government_id);

CREATE INDEX idx_gm_person_government ON GovernmentMembership(person_id, government_id);

CREATE INDEX idx_gm_dates ON GovernmentMembership(start_date, end_date);
