ALTER TABLE VaskiMinutesSection ADD COLUMN source_section_id INTEGER;

ALTER TABLE VaskiMinutesSection ADD COLUMN parent_section_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_vaski_minutes_section_source ON VaskiMinutesSection(source_section_id);

CREATE INDEX IF NOT EXISTS idx_vaski_minutes_section_parent ON VaskiMinutesSection(parent_section_id);
