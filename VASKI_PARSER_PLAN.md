# Plan: Merge analyze-vaski-xml into VaskiData parser + flat vaski-data structure

## Context

Currently there are two separate tools:
1. **VaskiData parser** (`packages/datapipe/parser/fn/VaskiData.ts`) — parses XML, writes `data/parsed/VaskiData/page_*.json` (batched, 1-1 with scraped pages)
2. **analyze-vaski-xml.ts** (standalone script) — reads parsed pages, classifies by document type, writes individual `vaski-data/{yhteiso}/{kokous}/{doctype}/entry-*.json` files (322k files, 3-level hierarchy)

The goal is to merge #2's classification logic into #1, so the parser:
- Keeps writing `data/parsed/VaskiData/page_*.json` (1-1 with raw) with enriched metadata
- Creates `vaski-data/{documentType}/` with symlinks to the parsed pages (flat, by document type, for manual browsing)
- Writes `vaski-data/index.json` — a metadata index mapping each document type to its record IDs and page numbers (for efficient per-type migration)

## Data flow

```
data/raw/VaskiData/page_N.json     (scraped, ~100 rows per page, mixed document types)
        ↓ parser
data/parsed/VaskiData/page_N.json  (parsed, same pages, rows enriched with #avoimempieduskunta)
        ↓ symlinks + index
vaski-data/
├── index.json                     (metadata index: docType → {pageNum → [vaskiId, ...]})
├── nimenhuutoraportti/
│   ├── page_12.json → ../../data/parsed/VaskiData/page_12.json
│   └── page_578.json → ../../data/parsed/VaskiData/page_578.json
├── hallituksen_esitys/
│   ├── page_3.json → ../../data/parsed/VaskiData/page_3.json
│   └── ...
└── ...
```

### Page mixing reality (from analysis)

- 3230 parsed pages, 322990 total records, 82 document types
- Average **10 document types per page** — pages are heavily mixed
- nimenhuutoraportti appears in **1140 of 3230 pages** (35%)
- Without the index, migrating one type means reading most pages and discarding ~90% of records

### Index format (`vaski-data/index.json`)

```json
{
  "nimenhuutoraportti": {
    "totalRecords": 1518,
    "pages": {
      "12": ["20278", "20306", "20325"],
      "578": ["38851", "41203"]
    }
  },
  "hallituksen_esitys": {
    "totalRecords": 5067,
    "pages": {
      "3": ["1517", "1518", "1519"],
      "4": ["1520", "1521"]
    }
  }
}
```

Each migrator reads the index, loads only the listed pages, and cherry-picks records by ID. Benefits:
- **Independent**: re-run one migrator without touching others
- **Efficient**: no wasted reads, exact page + record targeting
- **Progress tracking**: total record count known upfront

## Changes

### 1. Enhance `packages/datapipe/parser/fn/VaskiData.ts`

Add the document-type classification logic from analyze-vaski-xml.ts. For each parsed record, compute and attach:

```ts
record["#avoimempieduskunta"] = {
  yhteiso: string,        // e.g. "Täysistunto", "no-yhteiso"
  kokous: string,         // e.g. "Täysistunto_100/2016_vp", "no-kokous"
  documentType: string,   // e.g. "nimenhuutoraportti", "hallituksen_esitys"
};
```

The classification logic comes from analyze-vaski-xml.ts:
- `yhteiso` = `KokousViite.YhteisoTeksti` or `"no-yhteiso"`
- `kokous` = `KokousViite.@_kokousTunnus` or `"no-kokous"` (sanitized)
- `documentType` = `@_asiakirjatyyppiNimi` from metadata (lowercased, sanitized), fallback to `"unknown"`

### 2. Modify `packages/datapipe/parser/parser.ts` — add post-parse hook

After writing each parsed page, the parser needs to create symlinks and build the index. Add a generic `onPageParsed` hook:

- Change `getParser` to return the full module (not just default export)
- After writing parsed page, check if the module exports `onPageParsed` and call it
- After all pages are processed, check if the module exports `onParsingComplete` and call it

```ts
// After storage.put(targetKey, ...)
if (typeof parseModule.onPageParsed === 'function') {
  await parseModule.onPageParsed(pageRef.page, parsedRows);
}

// After the page loop completes
if (typeof parseModule.onParsingComplete === 'function') {
  await parseModule.onParsingComplete();
}
```

### 3. Symlink creation + index building in VaskiData.ts

```ts
// Module-level accumulator for the index
const index: Record<string, { totalRecords: number; pages: Record<string, string[]> }> = {};

export async function onPageParsed(pageNumber: number, rows: ParsedRow[]): Promise<void> {
  // 1. Collect document types and record IDs for the index
  const docTypeRecords = new Map<string, string[]>();
  for (const row of rows) {
    const meta = row["#avoimempieduskunta"];
    if (!meta?.documentType) continue;
    const ids = docTypeRecords.get(meta.documentType) || [];
    ids.push(String(row.Id));
    docTypeRecords.set(meta.documentType, ids);
  }

  // 2. Update in-memory index
  for (const [docType, ids] of docTypeRecords) {
    if (!index[docType]) index[docType] = { totalRecords: 0, pages: {} };
    index[docType].pages[String(pageNumber)] = ids;
    index[docType].totalRecords += ids.length;
  }

  // 3. Create symlinks for manual browsing
  const repoRoot = findRepoRoot();
  const parsedFile = join(repoRoot, "data", "parsed", "VaskiData", `page_${pageNumber}.json`);

  for (const docType of docTypeRecords.keys()) {
    const symlinkDir = join(repoRoot, "vaski-data", docType);
    const symlinkPath = join(symlinkDir, `page_${pageNumber}.json`);
    await mkdir(symlinkDir, { recursive: true });

    const target = relative(symlinkDir, parsedFile);
    try {
      await symlink(target, symlinkPath);
    } catch (e: any) {
      if (e.code === 'EEXIST') { /* already exists, skip */ }
      else throw e;
    }
  }
}

export async function onParsingComplete(): Promise<void> {
  // Write the index file
  const repoRoot = findRepoRoot();
  const indexPath = join(repoRoot, "vaski-data", "index.json");
  await mkdir(join(repoRoot, "vaski-data"), { recursive: true });
  await writeFile(indexPath, JSON.stringify(index, null, 2));
}
```

### 4. No changes to analyze-vaski-xml.ts

Keep the standalone script as-is for now — it can be deprecated later.

## Files to modify

1. `packages/datapipe/parser/fn/VaskiData.ts` — add `#avoimempieduskunta` metadata + `onPageParsed` + `onParsingComplete` exports
2. `packages/datapipe/parser/parser.ts` — load full parser module, call hooks if present

## Verification

1. Delete `data/parsed/VaskiData/` and `vaski-data/`
2. Run `bun run parse VaskiData`
3. Verify:
   - `data/parsed/VaskiData/page_*.json` pages exist with records containing `#avoimempieduskunta`
   - `vaski-data/index.json` exists and has correct structure
   - `vaski-data/nimenhuutoraportti/` contains symlinks that resolve correctly
   - `vaski-data/hallituksen_esitys/` contains symlinks that resolve correctly
   - Index totals match actual record counts
   - A record in a symlinked page has `#avoimempieduskunta.documentType` matching the folder name
