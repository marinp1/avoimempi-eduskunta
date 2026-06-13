import { getDocumentHandler } from "#storage";
import type { Database } from "bun:sqlite";
import { upsertDocumentFile } from "./db.ts";

const EDK_API_BASE = "https://api.eduskunta.fi/api/v1/asiakirjat/edktunnus";
const RATE_LIMIT_MS = 50;

function stripGuidBraces(guid: string): string {
  return guid.replace(/^\{|\}$/g, "");
}

function buildFilename(
  edkIdentifier: string,
  vaskiGuid: string | null,
): string {
  if (vaskiGuid) {
    return `${stripGuidBraces(vaskiGuid)}.pdf`;
  }
  return `${edkIdentifier}.pdf`;
}

const SHARD_LENGTH = 2;

function shardStorageKey(filename: string): string {
  const dotIdx = filename.lastIndexOf(".");
  const stem = dotIdx === -1 ? filename : filename.slice(0, dotIdx);
  const prefix = stem.slice(0, SHARD_LENGTH).toUpperCase();
  if (prefix.length < SHARD_LENGTH) {
    return filename;
  }
  return `${prefix}/${filename}`;
}

const DEFAULT_RETRY_AFTER_SECONDS = 120;

function parseRetryAfter(value: string | null): number | null {
  if (!value) return null;
  const seconds = parseInt(value, 10);
  if (!Number.isNaN(seconds) && seconds > 0) return seconds;
  const date = Date.parse(value);
  if (!Number.isNaN(date)) {
    const delta = Math.ceil((date - Date.now()) / 1000);
    return delta > 0 ? delta : null;
  }
  return null;
}

export async function resolveDocumentUrl(edkIdentifier: string): Promise<{
  location: string | null;
  status: number;
  retryAfter: number | null;
}> {
  const response = await fetch(`${EDK_API_BASE}/${edkIdentifier}/pdf`, {
    redirect: "manual",
  });
  return {
    location: response.status === 302 ? response.headers.get("location") : null,
    status: response.status,
    retryAfter:
      response.status === 429
        ? parseRetryAfter(response.headers.get("retry-after"))
        : null,
  };
}

export interface FetchResult {
  edkIdentifier: string;
  filename: string;
  httpStatus: number;
  fileSizeBytes: number | null;
  error: string | null;
  skipped: boolean;
  dryRun: boolean;
  rateLimited: boolean;
  retryAfterSeconds: number | null;
}

export interface FetchOptions {
  force?: boolean;
  dryRun?: boolean;
}

export async function fetchAndStoreDocument(
  docsDb: Database,
  edkIdentifier: string,
  vaskiGuid: string | null,
  options: FetchOptions = {},
): Promise<FetchResult> {
  const handler = getDocumentHandler();
  const filename = buildFilename(edkIdentifier, vaskiGuid);
  const storageKey = shardStorageKey(filename);

  if (!options.force && !options.dryRun) {
    const alreadyStored = await handler.exists(storageKey);
    if (alreadyStored) {
      const meta = await handler.metadata(storageKey);
      return {
        edkIdentifier,
        filename: storageKey,
        httpStatus: 200,
        fileSizeBytes: meta?.sizeBytes ?? null,
        error: null,
        skipped: true,
        dryRun: false,
        rateLimited: false,
        retryAfterSeconds: null,
      };
    }
  }

  if (options.dryRun) {
    const { location, status } = await resolveDocumentUrl(edkIdentifier);
    console.log(
      `[dry-run] ${edkIdentifier} → ${location ?? "(not found)"} → ${filename}`,
    );
    return {
      edkIdentifier,
      filename: storageKey,
      httpStatus: status,
      fileSizeBytes: null,
      error: null,
      skipped: true,
      dryRun: true,
      rateLimited: false,
      retryAfterSeconds: null,
    };
  }

  const {
    location: pdfUrl,
    status: resolveStatus,
    retryAfter: resolveRetryAfter,
  } = await resolveDocumentUrl(edkIdentifier);

  if (resolveStatus === 429) {
    upsertDocumentFile(docsDb, {
      edk_identifier: edkIdentifier,
      vaski_guid: vaskiGuid,
      storage_key: "",
      fetched_at: new Date().toISOString(),
      file_size_bytes: null,
      http_status: 429,
      error: "rate_limited",
    });
    return {
      edkIdentifier,
      filename: storageKey,
      httpStatus: 429,
      fileSizeBytes: null,
      error: "Rate limited",
      skipped: false,
      dryRun: false,
      rateLimited: true,
      retryAfterSeconds: resolveRetryAfter,
    };
  }

  if (!pdfUrl) {
    upsertDocumentFile(docsDb, {
      edk_identifier: edkIdentifier,
      vaski_guid: vaskiGuid,
      storage_key: "",
      fetched_at: new Date().toISOString(),
      file_size_bytes: null,
      http_status: resolveStatus,
      error: "Not found",
    });
    return {
      edkIdentifier,
      filename: storageKey,
      httpStatus: resolveStatus,
      fileSizeBytes: null,
      error: "Not found",
      skipped: false,
      dryRun: false,
      rateLimited: false,
      retryAfterSeconds: null,
    };
  }

  const downloadResponse = await fetch(pdfUrl);

  if (downloadResponse.status === 429) {
    const downloadRetryAfter = parseRetryAfter(
      downloadResponse.headers.get("retry-after"),
    );
    upsertDocumentFile(docsDb, {
      edk_identifier: edkIdentifier,
      vaski_guid: vaskiGuid,
      storage_key: "",
      fetched_at: new Date().toISOString(),
      file_size_bytes: null,
      http_status: 429,
      error: "rate_limited",
    });
    return {
      edkIdentifier,
      filename: storageKey,
      httpStatus: 429,
      fileSizeBytes: null,
      error: "Rate limited",
      skipped: false,
      dryRun: false,
      rateLimited: true,
      retryAfterSeconds: downloadRetryAfter,
    };
  }

  if (!downloadResponse.ok) {
    upsertDocumentFile(docsDb, {
      edk_identifier: edkIdentifier,
      vaski_guid: vaskiGuid,
      storage_key: "",
      fetched_at: new Date().toISOString(),
      file_size_bytes: null,
      http_status: downloadResponse.status,
      error: `HTTP ${downloadResponse.status}`,
    });
    return {
      edkIdentifier,
      filename: storageKey,
      httpStatus: downloadResponse.status,
      fileSizeBytes: null,
      error: `HTTP ${downloadResponse.status}`,
      skipped: false,
      dryRun: false,
      rateLimited: false,
      retryAfterSeconds: null,
    };
  }

  const pdfBuffer = await downloadResponse.arrayBuffer();
  await handler.put(storageKey, Buffer.from(pdfBuffer));

  const fileSizeBytes = pdfBuffer.byteLength;

  upsertDocumentFile(docsDb, {
    edk_identifier: edkIdentifier,
    vaski_guid: vaskiGuid,
    storage_key: storageKey,
    fetched_at: new Date().toISOString(),
    file_size_bytes: fileSizeBytes,
    http_status: 200,
    error: null,
  });

  return {
    edkIdentifier,
    filename: storageKey,
    httpStatus: 200,
    fileSizeBytes,
    error: null,
    skipped: false,
    dryRun: false,
    rateLimited: false,
    retryAfterSeconds: null,
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { RATE_LIMIT_MS, DEFAULT_RETRY_AFTER_SECONDS };
