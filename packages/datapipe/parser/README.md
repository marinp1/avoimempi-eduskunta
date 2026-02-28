# Data Pipeline Parser

The parser stage transforms rows from `data/raw.db` into normalized rows in `data/parsed.db`.

## What it does

For each row in a table:

1. loads raw row payload from row store
2. resolves the row's column schema by hash
3. converts the raw value array into an object (`{ columnName: value }`)
4. applies optional custom parser logic (`fn/<TableName>.ts`)
5. stores parsed object to `parsed.db` with the same PK
6. preserves row hash so unchanged rows can be skipped on reruns

## Commands

From repository root:

```bash
# parse one table
bun run parse MemberOfParliament

# parse all known tables
bun run parse all

# force re-parse unchanged rows
bun run parse MemberOfParliament --force

# parse inclusive PK range
bun run parse MemberOfParliament --pk-start 82000 --pk-end 83000

# status
bun run parse status
```

Directly from `packages/datapipe`:

```bash
bun run parser/cli.ts MemberOfParliament
```

## Custom parsers

Custom parser file path:

- `packages/datapipe/parser/fn/<TableName>.ts`

Expected default export:

```typescript
import type { ParserFunction } from "../parser";

const parser: ParserFunction = async (row, primaryKey) => {
  return [
    `${row[primaryKey]}`,
    {
      ...row,
      // transform fields here
    },
  ];
};

export default parser;
```

`ParserFunction` signature:

```typescript
type ParserFunction = (
  row: Record<string, any>,
  primaryKey: string,
) => Promise<[identifier: string, data: Record<string, any>]>;
```

Notes:

- if no custom parser exists, parser falls back to default pass-through behavior
- parser modules may also export lifecycle hooks (for example `onParsingComplete`)

## Metadata added to parsed rows

Parser stores import metadata fields on each parsed row:

- `__sourceTable`
- `__sourcePage`
- `__sourceScrapedAt`
- `__sourcePrimaryKeyName`
- `__sourcePrimaryKeyValue`

These are used by migrator trace/source-reference reporting.

## Configuration

Relevant environment variables:

- `ROW_STORE_DIR` (preferred row-store directory override)
- `STORAGE_LOCAL_DIR` (fallback base directory when `ROW_STORE_DIR` is unset)

Row-store files in that directory:

- `raw.db`
- `parsed.db`

## Troubleshooting

No raw data found:

- scrape first: `bun run scrape <TableName>`
- inspect scraper status: `bun run scrape status`

Custom parser not loading:

- verify file path and table name match exactly: `fn/<TableName>.ts`
- ensure a default export exists

Rows not updating:

- parser skips unchanged rows by hash
- rerun with `--force` to reparse everything
