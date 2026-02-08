import type { Database } from "bun:sqlite";

import { createBatchingInserter } from "../utils";
import {
  assignExcelIds,
  extractDocument,
  extractRelationships,
  extractSpeeches,
  extractSubjects,
} from "./extractors";
import type { VaskiEntry } from "./reader";

const TARGET_DOCUMENT_TYPES = new Set([
  "Hallituksen esitys",
  "Kirjallinen kysymys",
  "Vastaus kirjalliseen kysymykseen",
  "Valiokunnan mietintö",
  "Valiokunnan lausunto",
  "Lakialoite",
  "Talousarvioaloite",
]);

const SPEECH_DOCUMENT_TYPES = new Set(["Pöytäkirjan asiakohta"]);

/**
 * Get the document type name from a parsed VaskiEntry.
 */
function getDocumentTypeName(entry: VaskiEntry): string | null {
  try {
    const meta = entry.contents?.Siirto?.SiirtoMetatieto;
    const julkaisu = meta?.JulkaisuMetatieto ?? meta?.SiirtoMetatieto;
    const ident = julkaisu?.IdentifiointiOsa;
    return ident?.AsiakirjatyyppiNimi ?? null;
  } catch {
    return null;
  }
}

/**
 * Score an entry by content richness. Higher = better.
 * Used for deduplication: when multiple entries share the same eduskuntaTunnus,
 * the one with the highest score is kept.
 */
function scoreEntry(entry: VaskiEntry): number {
  let score = 0;
  const ra = entry.contents?.Siirto?.SiirtoAsiakirja?.RakenneAsiakirja;
  if (ra && typeof ra === "object") {
    const contentKeys = Object.keys(ra).filter((k) => !k.startsWith("@_"));
    score += contentKeys.length * 10;
  }
  const meta = entry.contents?.Siirto?.SiirtoMetatieto;
  const julkaisu = meta?.JulkaisuMetatieto ?? meta?.SiirtoMetatieto;
  const henkilo = julkaisu?.IdentifiointiOsa?.Toimija?.Henkilo;
  if (henkilo?.SukuNimi && typeof henkilo.SukuNimi === "string") {
    score += 5;
  }
  return score;
}

/**
 * Accumulated state for deduplication and speech ID generation.
 * VaskiData entries can have duplicates by eduskuntaTunnus;
 * we keep the richest entry per tunnus.
 */
let documentEntries: Map<string, { entry: VaskiEntry; score: number }>;
let speechEntries: VaskiEntry[];
let currentDb: Database | null;

function resetState() {
  documentEntries = new Map();
  speechEntries = [];
  currentDb = null;
}

resetState();

/**
 * Standard migrator pattern: receives one parsed row at a time.
 * Accumulates entries for deduplication, then flushVotes() writes to DB.
 */
export default (db: Database) => {
  resetState();
  currentDb = db;

  return async (row: any) => {
    // Skip entries flagged by the parser (e.g. Swedish language)
    if (row._skip) return;

    const entry: VaskiEntry = {
      id: row.id,
      eduskuntaTunnus: row.eduskuntaTunnus,
      status: row.status,
      created: row.created,
      attachmentGroupId: row.attachmentGroupId,
      contents: row.contents,
    };

    const typeName = getDocumentTypeName(entry);
    if (!typeName) return;

    // Collect document entries for deduplication
    if (TARGET_DOCUMENT_TYPES.has(typeName)) {
      const key = entry.eduskuntaTunnus;
      const score = scoreEntry(entry);
      const existing = documentEntries.get(key);
      if (!existing || score > existing.score) {
        documentEntries.set(key, { entry, score });
      }
    }

    // Collect speech entries
    if (SPEECH_DOCUMENT_TYPES.has(typeName)) {
      speechEntries.push(entry);
    }
  };
};

/**
 * Flush accumulated entries to the database.
 * Called by the migration controller after all rows have been processed.
 */
export function flushVotes() {
  if (!currentDb) return;
  const db = currentDb;

  // Write deduplicated documents
  const batcher = createBatchingInserter(db, 500);
  let docCount = 0;
  let subjectCount = 0;
  let relationshipCount = 0;

  for (const { entry } of documentEntries.values()) {
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

  console.log(`  Vaski document migration complete:`);
  console.log(`    Documents: ${docCount}`);
  console.log(`    Subjects: ${subjectCount}`);
  console.log(`    Relationships: ${relationshipCount}`);

  // Write speeches
  console.log(
    `\n  Extracting speeches from vaski Pöytäkirjan asiakohta entries...`,
  );

  const speechBatcher = createBatchingInserter(db, 500);
  const excelIdCounts = new Map<string, number>();
  let speechCount = 0;

  // Collect all speeches first, then sort chronologically so dedup counters
  // match the chronological ordering used by SaliDBPuheenvuoro
  const allRawSpeeches: any[] = [];
  for (const entry of speechEntries) {
    const rawSpeeches = extractSpeeches(entry);
    allRawSpeeches.push(...rawSpeeches);
  }
  allRawSpeeches.sort((a, b) => (a._startTime ?? "").localeCompare(b._startTime ?? ""));

  const speeches = assignExcelIds(allRawSpeeches, excelIdCounts);
  speechBatcher.insertRows("ExcelSpeech", speeches);
  speechCount = speeches.length;

  speechBatcher.flushAll();

  console.log(`  Vaski speech migration complete:`);
  console.log(`    Speeches: ${speechCount}`);

  resetState();
}
