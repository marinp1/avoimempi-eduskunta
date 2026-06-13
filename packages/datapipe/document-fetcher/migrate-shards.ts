import { readdirSync, mkdirSync, renameSync, existsSync } from "node:fs";
import path from "node:path";
import { getDocumentsDatabasePath } from "#database";
import { Database } from "bun:sqlite";

const DOCUMENTS_DIR = path.resolve(
  import.meta.dirname,
  "../../../data/documents",
);
const SHARD_LENGTH = 2;

function shardPrefix(filename: string): string {
  const dotIdx = filename.lastIndexOf(".");
  const stem = dotIdx === -1 ? filename : filename.slice(0, dotIdx);
  return stem.slice(0, SHARD_LENGTH).toUpperCase();
}

function shardedKey(filename: string): string {
  const prefix = shardPrefix(filename);
  if (prefix.length < SHARD_LENGTH) return filename;
  return `${prefix}/${filename}`;
}

const entries = readdirSync(DOCUMENTS_DIR, { withFileTypes: true });
const files = entries.filter((e) => e.isFile()).map((e) => e.name);

console.log(`Found ${files.length} flat files in ${DOCUMENTS_DIR}`);

if (files.length === 0) {
  console.log("Nothing to migrate.");
  process.exit(0);
}

const db = new Database(getDocumentsDatabasePath());

const updateStmt = db.prepare(
  "UPDATE DocumentFile SET storage_key = ? WHERE storage_key = ?",
);

const fixDocsPrefixStmt = db.prepare(
  "UPDATE DocumentFile SET storage_key = ? WHERE storage_key = ?",
);

const fixDocsPrefix = db.transaction(() => {
  const rows = db
    .query<{ storage_key: string }, []>(
      "SELECT storage_key FROM DocumentFile WHERE storage_key LIKE 'documents/%'",
    )
    .all();

  for (const row of rows) {
    const oldKey = row.storage_key;
    const cleanName = path.basename(oldKey);
    const newKey = shardedKey(cleanName);
    const filePath = path.join(DOCUMENTS_DIR, cleanName);
    if (existsSync(filePath)) {
      const prefix = shardPrefix(cleanName);
      const shardDir = path.join(DOCUMENTS_DIR, prefix);
      mkdirSync(shardDir, { recursive: true });
      renameSync(filePath, path.join(shardDir, cleanName));
    }
    fixDocsPrefixStmt.run(newKey, oldKey);
    console.log(`  Fixed: ${oldKey} → ${newKey}`);
  }
});

let moved = 0;
let dbUpdated = 0;
let skipped = 0;

const txn = db.transaction(() => {
  for (const filename of files) {
    const prefix = shardPrefix(filename);
    const newKey = shardedKey(filename);

    const shardDir = path.join(DOCUMENTS_DIR, prefix);
    const oldPath = path.join(DOCUMENTS_DIR, filename);
    const newPath = path.join(shardDir, filename);

    mkdirSync(shardDir, { recursive: true });
    renameSync(oldPath, newPath);
    moved++;

    const result = updateStmt.run(newKey, filename);
    if (result.changes > 0) {
      dbUpdated++;
    } else {
      skipped++;
    }
  }
});

txn();
fixDocsPrefix();

console.log(`Moved: ${moved} files`);
console.log(
  `DB updated: ${dbUpdated}, skipped (no matching DB row): ${skipped}`,
);

db.close();
console.log("Done.");
