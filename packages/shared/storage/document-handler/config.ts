import path from "node:path";
import { getStorageConfig } from "../config";

export type DocumentHandlerConfig = { handler: "local"; dir: string };
// future: | { handler: "s3"; bucket: string; region: string }

export function getDocumentHandlerConfig(): DocumentHandlerConfig {
  const handler = process.env.DOCUMENT_HANDLER;
  if (!handler) {
    throw new Error("DOCUMENT_HANDLER environment variable is required");
  }

  if (handler === "local") {
    const storageBaseDir = getStorageConfig().local?.baseDir ?? process.cwd();
    const defaultDir = path.join(storageBaseDir, "documents");
    return {
      handler: "local",
      dir: process.env.DOCUMENT_STORAGE_DIR
        ? path.resolve(process.env.DOCUMENT_STORAGE_DIR)
        : defaultDir,
    };
  }

  throw new Error(`Unknown document handler: "${handler}"`);
}
