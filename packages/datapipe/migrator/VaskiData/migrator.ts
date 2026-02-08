import type { Database } from "bun:sqlite";
import path from "node:path";

import { createBatchingInserter } from "../utils";
import { extractDocument, extractRelationships, extractSubjects } from "./extractors";
import { readVaskiFiles } from "./reader";

const TARGET_DOCUMENT_TYPES = new Set([
  "Hallituksen esitys",
  "Kirjallinen kysymys",
  "Vastaus kirjalliseen kysymykseen",
  "Valiokunnan mietintö",
  "Valiokunnan lausunto",
  "Lakialoite",
  "Talousarvioaloite",
]);

/**
 * Migrate high-value vaski documents from parsed JSON files on disk.
 *
 * Unlike other migrators that receive data row-by-row from the parsed storage pipeline,
 * this migrator reads directly from the vaski-data/ folder which contains pre-parsed
 * JSON files organized by committee/session/type.
 */
export async function migrateVaskiData(db: Database) {
  const baseDir = path.resolve(import.meta.dirname, "../../../../vaski-data");

  console.log(`  Reading vaski files from: ${baseDir}`);
  console.log(`  Target document types: ${[...TARGET_DOCUMENT_TYPES].join(", ")}`);

  const batcher = createBatchingInserter(db, 500);
  let docCount = 0;
  let subjectCount = 0;
  let relationshipCount = 0;

  for await (const entry of readVaskiFiles(baseDir, TARGET_DOCUMENT_TYPES)) {
    const doc = extractDocument(entry);
    batcher.insertRows("VaskiDocument", [doc]);
    docCount++;

    const subjects = extractSubjects(entry, doc.id);
    if (subjects.length > 0) {
      batcher.insertRows("DocumentSubject", subjects);
      subjectCount += subjects.length;
    }

    const relationships = extractRelationships(entry, doc.id);
    if (relationships.length > 0) {
      batcher.insertRows("DocumentRelationship", relationships);
      relationshipCount += relationships.length;
    }
  }

  batcher.flushAll();

  console.log(`  Vaski migration complete:`);
  console.log(`    Documents: ${docCount}`);
  console.log(`    Subjects: ${subjectCount}`);
  console.log(`    Relationships: ${relationshipCount}`);
}
