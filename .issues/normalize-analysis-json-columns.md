# Normalization Plan: ExpertStatement Analysis JSON Columns

## Problem

Three `ExpertStatement` columns store JSON that should be in normalized relational form.
Additionally, two `ParliamentAnswer` rich_text columns lack `json_valid` checks that all
other rich_text columns have.

### ExpertStatement — 3 JSON columns (V001.042)

| Column               | Stored JSON                                    | Actual Structure                                     |
| -------------------- | ---------------------------------------------- | ---------------------------------------------------- |
| `analysis_stance`    | `{"value":"supports","description":"tekstiä"}` | Fixed 2-field object — `value` has 4 possible values |
| `analysis_arguments` | `["arg1","arg2",...]`                          | Flat string array (3-8 items)                        |
| `analysis_topics`    | `["topic1","topic2",...]`                      | Flat string array (3-8 items)                        |

### ParliamentAnswer — missing constraints (V001.034)

| Column                  | Issue                                                            |
| ----------------------- | ---------------------------------------------------------------- |
| `decision_rich_text`    | Contains JSON (RichTextDocument) but no `CHECK(json_valid(...))` |
| `legislation_rich_text` | Contains JSON (RichTextDocument) but no `CHECK(json_valid(...))` |

---

## Target Schema

### ExpertStatement — add normalized columns, drop JSON columns

```sql
-- stance: split into two plain columns
ALTER TABLE ExpertStatement ADD COLUMN stance_value TEXT
  CHECK(stance_value IN ('supports','opposes','proposes_modification','neutral'));
ALTER TABLE ExpertStatement ADD COLUMN stance_description TEXT;

-- arguments: one-to-many child table
CREATE TABLE ExpertStatementArgument (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expert_statement_id INTEGER NOT NULL REFERENCES ExpertStatement(id),
  position INTEGER NOT NULL,
  argument TEXT NOT NULL
);
CREATE INDEX idx_esa_expert_statement ON ExpertStatementArgument(expert_statement_id);

-- topics: one-to-many child table
CREATE TABLE ExpertStatementTopic (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expert_statement_id INTEGER NOT NULL REFERENCES ExpertStatement(id),
  topic TEXT NOT NULL
);
CREATE INDEX idx_est_expert_statement ON ExpertStatementTopic(expert_statement_id);

-- drop old JSON columns (after data migration)
ALTER TABLE ExpertStatement DROP COLUMN analysis_stance;
ALTER TABLE ExpertStatement DROP COLUMN analysis_arguments;
ALTER TABLE ExpertStatement DROP COLUMN analysis_topics;
```

### ParliamentAnswer — add json_valid checks

```sql
-- Recreate columns with constraint (SQLite doesn't support ALTER COLUMN ADD CHECK)
-- Since these are the only rich_text columns without the check, we add it:
-- (SQLite limitation: cannot alter column constraints in-place)
-- Use a rebuild approach or add a CHECK constraint on the table level

-- Option A: add table-level CHECK (works on existing column)
-- This verifies the column IS JSON when non-null
-- Note: SQLite CHECK on individual columns via ALTER is not supported.
-- We use a table-level constraint that references the column.
```

**SQLite constraint**: You cannot `ALTER TABLE ADD CHECK` that references a single column
in a way that differs from table-level. The idiomatic approach is to create a new table
with the constraint, copy data, drop old, rename. However, since `ParliamentAnswer` has
FK references (`ParliamentAnswerSubject`, `VaskiDocument`), a simpler approach is to add
a **table-level CHECK constraint**:

```sql
-- SQLite allows adding table-level CHECK on ALTER (since 3.25.0)
-- But ALTER TABLE ADD CHECK only works via table rebuild in most versions.
-- Practical approach: validate at application level, document the constraint.
```

**Decision**: Since SQLite's `ALTER TABLE` cannot add column-level CHECK constraints,
and these columns already contain valid JSON (populated by `convertVaskiNodeToRichText()`),
we document this as a known gap and enforce it in the migrator code via a runtime validation
instead. A full table rebuild migration would be complex due to FK dependencies.

---

## Migration Version Plan

| Version  | Description                                                                                             |
| -------- | ------------------------------------------------------------------------------------------------------- |
| V001.043 | Add `stance_value`, `stance_description` to ExpertStatement; migrate data from `analysis_stance`        |
| V001.044 | Create `ExpertStatementArgument`; migrate data from `analysis_arguments`                                |
| V001.045 | Create `ExpertStatementTopic`; migrate data from `analysis_topics`                                      |
| V001.046 | Drop old JSON columns (`analysis_stance`, `analysis_arguments`, `analysis_topics`) from ExpertStatement |
| V001.047 | Validate ParliamentAnswer rich_text columns (runtime check in post-import)                              |

---

## Code Changes

### 1. Migration SQL files (new)

#### `V001.043__expert_statement_stance_normalized.sql`

```sql
ALTER TABLE ExpertStatement ADD COLUMN stance_value TEXT;

ALTER TABLE ExpertStatement ADD COLUMN stance_description TEXT;

UPDATE ExpertStatement SET
  stance_value = json_extract(analysis_stance, '$.value'),
  stance_description = NULLIF(json_extract(analysis_stance, '$.description'), 'null')
WHERE analysis_stance IS NOT NULL;
```

#### `V001.044__expert_statement_argument_table.sql`

```sql
CREATE TABLE ExpertStatementArgument (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expert_statement_id INTEGER NOT NULL REFERENCES ExpertStatement(id),
  position INTEGER NOT NULL,
  argument TEXT NOT NULL
);

CREATE INDEX idx_esa_expert_statement ON ExpertStatementArgument(expert_statement_id);

INSERT INTO ExpertStatementArgument (expert_statement_id, position, argument)
SELECT
  e.id,
  (je.key + 1),
  je.value
FROM ExpertStatement e, json_each(e.analysis_arguments) je
WHERE e.analysis_arguments IS NOT NULL
ORDER BY e.id, je.key;
```

#### `V001.045__expert_statement_topic_table.sql`

```sql
CREATE TABLE ExpertStatementTopic (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expert_statement_id INTEGER NOT NULL REFERENCES ExpertStatement(id),
  topic TEXT NOT NULL
);

CREATE INDEX idx_est_expert_statement ON ExpertStatementTopic(expert_statement_id);

INSERT INTO ExpertStatementTopic (expert_statement_id, topic)
SELECT
  e.id,
  je.value
FROM ExpertStatement e, json_each(e.analysis_topics) je
WHERE e.analysis_topics IS NOT NULL
ORDER BY e.id, je.key;
```

#### `V001.046__drop_expert_statement_json_columns.sql`

```sql
ALTER TABLE ExpertStatement DROP COLUMN analysis_stance;

ALTER TABLE ExpertStatement DROP COLUMN analysis_arguments;

ALTER TABLE ExpertStatement DROP COLUMN analysis_topics;
```

### 2. Submigrator: `_expert-statement.ts`

Replace the JSON construction with direct column writes:

```typescript
// BEFORE (lines 179-188):
const analysis = (row as any)._analysis as Record<string, any> | null;
const analysisSummary = normalizeText(analysis?.summary) || null;
const analysisStance = analysis
  ? JSON.stringify({
      value: analysis.stance_value,
      description: analysis.stance_description || null,
    })
  : null;
const analysisArguments = analysis?.arguments || null; // JSON string
const analysisTopics = analysis?.topics || null; // JSON string

// AFTER:
const analysis = (row as any)._analysis as Record<string, any> | null;
const analysisSummary = normalizeText(analysis?.summary) || null;
const stanceValue = analysis?.stance_value ?? null;
const stanceDescription = normalizeText(analysis?.stance_description) || null;

// Arguments and topics are still JSON strings from the analysis DB.
// Parse them here for the INSERT, but write to child tables after INSERT.
let rawArguments: string[] = [];
let rawTopics: string[] = [];
if (analysis?.arguments) {
  try {
    rawArguments = JSON.parse(analysis.arguments);
  } catch {
    /* skip */
  }
}
if (analysis?.topics) {
  try {
    rawTopics = JSON.parse(analysis.topics);
  } catch {
    /* skip */
  }
}
```

Update the INSERT statement to include `stance_value`, `stance_description` instead
of `analysis_stance`; drop `analysis_arguments` and `analysis_topics` from the INSERT.

After the INSERT, insert into child tables:

```typescript
if (rawArguments.length > 0) {
  const insertArg = db.prepare(
    `INSERT INTO ExpertStatementArgument (expert_statement_id, position, argument)
     VALUES (?, ?, ?)`,
  );
  rawArguments.forEach((arg, idx) => insertArg.run(id, idx + 1, arg));
}

if (rawTopics.length > 0) {
  const insertTopic = db.prepare(
    `INSERT INTO ExpertStatementTopic (expert_statement_id, topic)
     VALUES (?, ?)`,
  );
  rawTopics.forEach((topic) => insertTopic.run(id, topic));
}
```

### 3. UPDATE clause on conflict

The `ON CONFLICT DO UPDATE` must replace the old JSON column references with the
new normalized columns:

```sql
stance_value = COALESCE(excluded.stance_value, ExpertStatement.stance_value),
stance_description = COALESCE(excluded.stance_description, ExpertStatement.stance_description),
```

Remove `analysis_stance`, `analysis_arguments`, `analysis_topics` from the UPDATE SET.

Child tables (arguments/topics) should be cleared and re-inserted on conflict:

```typescript
if (rawArguments.length > 0) {
  db.run(`DELETE FROM ExpertStatementArgument WHERE expert_statement_id = ?`, [
    id,
  ]);
  // ... re-insert
}
```

### 4. Post-import: `post-import.ts`

No changes needed for stance/arguments/topics — `normalizeImportedTextData()` only
touches `analysis_summary` (plain text), not the JSON columns.

Federated search body already only uses `analysis_summary`, not the JSON columns.

### 5. Server-side queries

No changes needed. The server currently does not select any `analysis_*` columns.
The `EXPERT_STATEMENT_BY_ID.sql` query does not reference them.

When the server eventually wants to display stance/arguments/topics, it will query:

- `ExpertStatement.stance_value`, `ExpertStatement.stance_description` — direct columns
- `ExpertStatementArgument` JOIN — for arguments list
- `ExpertStatementTopic` JOIN — for topics list

### 6. Analysis DB: `analysis/db.ts` (optional but recommended)

The analysis DB also stores `arguments` and `topics` as JSON strings. Normalizing
them there too would simplify the pipeline, but the analysis DB is primarily an
intermediate store. Keep the JSON in the analysis DB for now (changing it would
require re-running all LLM analyses). The main DB normalization already parses
the JSON at migration time.

### 7. Analysis runner: `analyze-expert-statements.ts`

No changes needed. The runner continues to `JSON.stringify(result.analysis.arguments)`
and `JSON.stringify(result.analysis.topics)` for the analysis DB. The parsing happens
in the migration step.

---

## Verification

After migration, verify with these queries:

```sql
-- 1. All stances have valid values
SELECT DISTINCT stance_value FROM ExpertStatement;
-- Expected: supports, opposes, proposes_modification, neutral, NULL

-- 2. Argument count matches original JSON array length
SELECT e.id, COUNT(ea.id)
FROM ExpertStatement e
LEFT JOIN ExpertStatementArgument ea ON ea.expert_statement_id = e.id
GROUP BY e.id
ORDER BY COUNT(ea.id) DESC
LIMIT 20;

-- 3. Topic count matches
SELECT e.id, COUNT(et.id)
FROM ExpertStatement e
LEFT JOIN ExpertStatementTopic et ON et.expert_statement_id = e.id
GROUP BY e.id
ORDER BY COUNT(et.id) DESC
LIMIT 20;

-- 4. Old JSON columns are gone
-- Should fail with "no such column"
SELECT analysis_stance FROM ExpertStatement LIMIT 1;

-- 5. ParliamentAnswer rich_text columns exist and have json_valid data
SELECT decision_rich_text, legislation_rich_text FROM ParliamentAnswer LIMIT 5;
```

Run typecheck + lint after all changes:

```bash
bun run typecheck
bun run lint
```

Then run a full data pipeline migration to verify end-to-end:

```bash
bun run migrate
```

---

## Rollback

SQLite does not support transactional DDL. If migration fails partway through,
restore from a pre-migration backup of `avoimempi-eduskunta.db`.

The migrations are designed to be additive (V001.043-V001.045 add new columns/tables)
with the destructive step (V001.046 — dropping old columns) coming last, so a partial
failure before V001.046 leaves the old columns intact.
