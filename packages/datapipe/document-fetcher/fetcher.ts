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

export async function resolveDocumentUrl(
  edkIdentifier: string,
): Promise<{ location: string | null; status: number }> {
  const response = await fetch(`${EDK_API_BASE}/${edkIdentifier}/pdf`, {
    redirect: "manual",
  });
  return {
    location: response.status === 302 ? response.headers.get("location") : null,
    status: response.status,
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

  if (!options.force && !options.dryRun) {
    const alreadyStored = await handler.exists(filename);
    if (alreadyStored) {
      const meta = await handler.metadata(filename);
      return {
        edkIdentifier,
        filename,
        httpStatus: 200,
        fileSizeBytes: meta?.sizeBytes ?? null,
        error: null,
        skipped: true,
        dryRun: false,
        rateLimited: false,
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
      filename,
      httpStatus: status,
      fileSizeBytes: null,
      error: null,
      skipped: true,
      dryRun: true,
      rateLimited: false,
    };
  }

  const { location: pdfUrl, status: resolveStatus } =
    await resolveDocumentUrl(edkIdentifier);

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
      filename,
      httpStatus: 429,
      fileSizeBytes: null,
      error: "Rate limited",
      skipped: false,
      dryRun: false,
      rateLimited: true,
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
      filename,
      httpStatus: resolveStatus,
      fileSizeBytes: null,
      error: "Not found",
      skipped: false,
      dryRun: false,
      rateLimited: false,
    };
  }

  const downloadResponse = await fetch(pdfUrl);

  if (downloadResponse.status === 429) {
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
      filename,
      httpStatus: 429,
      fileSizeBytes: null,
      error: "Rate limited",
      skipped: false,
      dryRun: false,
      rateLimited: true,
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
      filename,
      httpStatus: downloadResponse.status,
      fileSizeBytes: null,
      error: `HTTP ${downloadResponse.status}`,
      skipped: false,
      dryRun: false,
      rateLimited: false,
    };
  }

  const pdfBuffer = await downloadResponse.arrayBuffer();
  await handler.put(filename, Buffer.from(pdfBuffer));

  const fileSizeBytes = pdfBuffer.byteLength;

  upsertDocumentFile(docsDb, {
    edk_identifier: edkIdentifier,
    vaski_guid: vaskiGuid,
    storage_key: filename,
    fetched_at: new Date().toISOString(),
    file_size_bytes: fileSizeBytes,
    http_status: 200,
    error: null,
  });

  return {
    edkIdentifier,
    filename,
    httpStatus: 200,
    fileSizeBytes,
    error: null,
    skipped: false,
    dryRun: false,
    rateLimited: false,
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { RATE_LIMIT_MS };
