import { extractText } from "unpdf";
import {
  openDocumentsDb,
  getAllDocumentTexts,
  upsertDocumentText,
} from "../document-fetcher/db";
import { getDocumentHandler } from "#storage/document-handler/factory";

export interface ExtractOptions {
  limit?: number;
  dryRun?: boolean;
  kind?: "expert" | "vastaus" | "all";
}

export interface ExtractResult {
  edk_identifier: string;
  document_type: string | null;
  storage_key: string;
  file_size_bytes: number | null;
  extracted: boolean;
  body_text?: string;
  text_length?: number;
  error?: string;
}

const KIND_FILTERS: Record<string, { clause: string; label: string }> = {
  expert: {
    clause: "AND d.document_type LIKE 'asiantuntija%'",
    label: "expert statements (asiantuntijalausunto etc.)",
  },
  vastaus: {
    clause: "AND d.document_type = 'vastaus_kirjalliseen_kysymykseen'",
    label: "written question responses (vastaus_kirjalliseen_kysymykseen)",
  },
};

export async function extractPdfText(
  options: ExtractOptions = {},
): Promise<ExtractResult[]> {
  const kind = options.kind ?? "all";
  const filter = KIND_FILTERS[kind];
  const results: ExtractResult[] = [];
  const handler = getDocumentHandler();
  const db = openDocumentsDb();

  const whereClause = filter
    ? `WHERE d.http_status = 200 AND d.file_size_bytes > 0 ${filter.clause}`
    : "WHERE d.http_status = 200 AND d.file_size_bytes > 0";

  const fileRecords = db
    .query<
      {
        edk_identifier: string;
        document_type: string | null;
        storage_key: string;
        file_size_bytes: number | null;
      },
      []
    >(
      `SELECT d.edk_identifier, d.document_type, d.storage_key, d.file_size_bytes
       FROM DocumentFile d
       ${whereClause}
       ORDER BY d.edk_identifier`,
    )
    .all();

  if (filter) {
    console.log(`🔍 Filtering by: ${filter.label}`);
  }

  const existingTexts = getAllDocumentTexts(db);

  let processed = 0;

  for (const record of fileRecords) {
    if (options.limit !== undefined && processed >= options.limit) break;

    const edk = record.edk_identifier;
    const result: ExtractResult = {
      edk_identifier: edk,
      document_type: record.document_type,
      storage_key: record.storage_key,
      file_size_bytes: record.file_size_bytes,
      extracted: false,
    };

    if (existingTexts.has(edk)) {
      result.extracted = true;
      result.body_text = existingTexts.get(edk);
      result.text_length = result.body_text?.length ?? 0;
      results.push(result);
      continue;
    }

    if (options.dryRun) {
      results.push(result);
      continue;
    }

    try {
      const pdfBuffer = await handler.get(record.storage_key);
      const extracted = await extractText(pdfBuffer, { mergePages: true });
      const bodyText = extracted.text.trim();

      if (bodyText) {
        upsertDocumentText(db, edk, bodyText, new Date().toISOString());
        result.extracted = true;
        result.body_text = bodyText;
        result.text_length = bodyText.length;
      }
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
    }

    results.push(result);
    processed++;
  }

  db.close();
  return results;
}
