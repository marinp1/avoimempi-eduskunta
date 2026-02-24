CREATE TABLE ImportSourceReference (
    id INTEGER PRIMARY KEY,
    source_table TEXT NOT NULL,
    source_page INTEGER,
    source_pk_name TEXT,
    source_pk_value TEXT,
    scraped_at TEXT,
    migrated_at TEXT NOT NULL
);

CREATE INDEX idx_import_source_reference_lookup ON ImportSourceReference(source_table, source_pk_name, source_pk_value);

CREATE INDEX idx_import_source_reference_scraped_at ON ImportSourceReference(scraped_at);
