# Expert Statement AI Analysis Pipeline

## Overview

Decoupled pipeline for AI-powered analysis of expert statements (asiantuntijalausunnot) in the Avoimempi Eduskunta project. The pipeline generates structured summaries, stances, arguments, and topics from PDF-extracted text using an LLM.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│  1. ANALYSIS PHASE (any machine, any time)          │
│     bun run analyze expert-statements --provider X  │
│     Reads:   main DB (body_text)                    │
│     Writes:  analysis DB (same directory)            │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│  2. MERGE PHASE (automatic during bun run migrate)  │
│     Same as documentTextMap injection pattern       │
│     Reads:   analysis DB → injects _analysis        │
│     Writes:  ExpertStatement columns in main DB     │
└─────────────────────────────────────────────────────┘
```

## Schema

### Analysis DB (`avoimempi-eduskunta-analysis.db`)

```sql
CREATE TABLE ExpertStatementAnalysis (
  edk_identifier    TEXT PRIMARY KEY,
  summary           TEXT NOT NULL,
  stance_value      TEXT NOT NULL CHECK(stance_value IN ('supports','opposes','proposes_modification','neutral')),
  stance_description TEXT,
  arguments         TEXT NOT NULL,   -- JSON array
  topics            TEXT NOT NULL,   -- JSON array
  model             TEXT NOT NULL,
  prompt_version    TEXT NOT NULL DEFAULT 'v1',
  chunk_count       INTEGER DEFAULT 1,
  input_tokens      INTEGER,
  output_tokens     INTEGER,
  credits_used      REAL,
  analyzed_at       TEXT NOT NULL
);
```

### Main DB — new columns on `ExpertStatement` (`V001.042`)

```sql
ALTER TABLE ExpertStatement ADD COLUMN analysis_summary TEXT;
ALTER TABLE ExpertStatement ADD COLUMN analysis_stance TEXT;         -- JSON: { value, description }
ALTER TABLE ExpertStatement ADD COLUMN analysis_arguments TEXT;      -- JSON array
ALTER TABLE ExpertStatement ADD COLUMN analysis_topics TEXT;         -- JSON array
ALTER TABLE ExpertStatement ADD COLUMN analysis_model TEXT;
ALTER TABLE ExpertStatement ADD COLUMN analysis_at TEXT;
```

Stance stored as JSON object:

```json
{
  "value": "supports",
  "description": "Tukee esitystä sote-palveluiden integroinnin osalta, mutta esittää huolta rahoitusmallista"
}
```

## LLM Provider Interface

```typescript
interface StructuredAnalysis {
  summary: string;
  stance: {
    value: "supports" | "opposes" | "proposes_modification" | "neutral";
    description: string | null;
  };
  arguments: string[];
  topics: string[];
}

interface LLMProvider {
  analyze(prompt: string, text: string): Promise<StructuredAnalysis>;
  contextLimit: number;
}
```

Providers: OpenAI, Anthropic, Ollama (provider-agnostic).

## File Layout

```
packages/datapipe/
  llm/
    types.ts                            # LLMProvider, StructuredAnalysis
    providers/
      openai.ts
      anthropic.ts
      ollama.ts
    factory.ts                          # createLLM({ provider, apiKey, model? })
    chunker.ts                          # map-reduce for docs > context window
  analysis/
    db.ts                               # Analysis DB: schema init, CRUD, loadAnalysisMap()
    analyze-expert-statements.ts        # Pipeline: iterate rows → LLM → store
    cli.ts                              # bun run analyze expert-statements [--force] [--limit N]
    prompts/expert-statement.ts         # Finnish prompt + promptVersion constant
  migrator/
    migrate.ts                          # loadAnalysisMap(), hasAnalysisSince()
    post-import.ts                      # Index analysis_summary in FTS
    fn/VaskiData/
      migrator.ts                       # Inject _analysis alongside _documentText
      submigrators/
        _expert-statement.ts            # Insert analysis_* columns
```

## Automatic Merge (migrate.ts integration)

Same pattern as `documentTextMap`:

```typescript
// In migrate.ts, before migrateVaskiData():
const analysisMap = loadAnalysisMap(); // reads analysis DB, returns Map<edkId, row>

// Inside VaskiData migrator, wrappers inject:
row._analysis = analysisMap.get(edkIdentifier) ?? null;

// Inside _expert-statement.ts:
if (row._analysis) {
  upsert.add("analysis_summary", row._analysis.summary);
  upsert.add("analysis_stance", JSON.stringify(row._analysis.stance));
  upsert.add("analysis_arguments", row._analysis.arguments);
  upsert.add("analysis_topics", row._analysis.topics);
  upsert.add("analysis_model", row._analysis.model);
  upsert.add("analysis_at", row._analysis.analyzed_at);
}
```

Analysis DB is **optional** — if it doesn't exist, migration proceeds without analysis data (no error).

## CLI Commands

```bash
# Run against default DB paths
bun run analyze expert-statements --provider openai

# With explicit db paths
bun run analyze expert-statements \
  --provider ollama --model llama3.3 \
  --db-path ./avoimempi-eduskunta.db

# Re-analyze with new prompt (prompt_version auto-bumped)
bun run analyze expert-statements --force

# Limit for testing
bun run analyze expert-statements --limit 10

# Show progress
bun run analyze status
```

## Chunking Strategy (Map-Reduce)

For the 577K-character documents (e.g., ~150-page PDFs):

1. **Split** into overlapping chunks of ~60K chars with 2K overlap
2. **Map**: extract key points from each chunk (simpler prompt)
3. **Reduce**: feed all chunk summaries + original extraction prompt → final structured JSON

## Cost Estimate (56K documents, cloud APIs)

| Model                        | Est. Total Cost |
| ---------------------------- | --------------- |
| GPT-5.4-mini                 | ~$30–45         |
| Claude Haiku 4.5             | ~$42–70         |
| GPT-5.4                      | ~$100           |
| Claude Sonnet 4.6            | ~$126–210       |
| Ollama (local Llama/Mistral) | $0 (time only)  |

## Design Decisions

1. **Separate step from migration** — analysis runs independently on any machine, results stored in a portable analysis DB
2. **Automatic merge during migration** — `bun run migrate` automatically reads the analysis DB and injects results into the main DB (same pattern as PDF text injection)
3. **Finnish-language output** — all summaries, stances, arguments, and topics are generated in Finnish
4. **Provider-agnostic** — OpenAI, Anthropic, and Ollama supported; swap by changing `--provider` flag
5. **Resumable** — skips already-analyzed documents unless `--force` is used
6. **Stance with nuance** — in addition to the 4-value stance enum, a free-text `stance_description` captures granularity
