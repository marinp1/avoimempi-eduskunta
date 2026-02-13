ALTER TABLE Session ADD COLUMN minutes_edk_identifier TEXT;

ALTER TABLE Session ADD COLUMN minutes_status TEXT;

ALTER TABLE Session ADD COLUMN minutes_created_at TEXT;

ALTER TABLE Session ADD COLUMN minutes_source_path TEXT;

ALTER TABLE Session ADD COLUMN minutes_has_signature INTEGER CHECK(minutes_has_signature IN (0, 1));

ALTER TABLE Session ADD COLUMN minutes_agenda_item_count INTEGER;

ALTER TABLE Session ADD COLUMN minutes_other_item_count INTEGER;

ALTER TABLE Session ADD COLUMN minutes_start_time TEXT;

ALTER TABLE Session ADD COLUMN minutes_end_time TEXT;

ALTER TABLE Session ADD COLUMN minutes_title TEXT;

ALTER TABLE Section ADD COLUMN minutes_entry_kind TEXT CHECK(minutes_entry_kind IN ('asiakohta', 'muu_asiakohta'));

ALTER TABLE Section ADD COLUMN minutes_entry_order INTEGER;

ALTER TABLE Section ADD COLUMN minutes_item_identifier INTEGER;

ALTER TABLE Section ADD COLUMN minutes_parent_item_identifier TEXT;

ALTER TABLE Section ADD COLUMN minutes_item_number TEXT;

ALTER TABLE Section ADD COLUMN minutes_item_order INTEGER;

ALTER TABLE Section ADD COLUMN minutes_item_title TEXT;

ALTER TABLE Section ADD COLUMN minutes_related_document_identifier TEXT;

ALTER TABLE Section ADD COLUMN minutes_related_document_type TEXT;

ALTER TABLE Section ADD COLUMN minutes_processing_phase_code TEXT;

ALTER TABLE Section ADD COLUMN minutes_general_processing_phase_code TEXT;

ALTER TABLE Section ADD COLUMN minutes_content_text TEXT;

ALTER TABLE Section ADD COLUMN minutes_match_mode TEXT CHECK(minutes_match_mode IN ('direct', 'parent_fallback'));

CREATE INDEX idx_section_minutes_item_identifier ON Section(minutes_item_identifier);

CREATE INDEX idx_section_minutes_related_document_identifier ON Section(minutes_related_document_identifier);
