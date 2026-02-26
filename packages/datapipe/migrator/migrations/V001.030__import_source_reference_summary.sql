CREATE TABLE IF NOT EXISTS ImportSourceReferenceSummary (
  source_table TEXT PRIMARY KEY,
  imported_rows INTEGER NOT NULL,
  distinct_pages INTEGER NOT NULL,
  first_scraped_at TEXT,
  last_scraped_at TEXT,
  first_migrated_at TEXT,
  last_migrated_at TEXT
) WITHOUT ROWID;
