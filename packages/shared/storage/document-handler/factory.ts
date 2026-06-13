import { LocalDocumentHandler } from "./local";
import { getDocumentHandlerConfig, type DocumentHandlerConfig } from "./config";
import type { IDocumentHandler } from "./types";

let instance: IDocumentHandler | null = null;

export function getDocumentHandler(
  config?: DocumentHandlerConfig,
): IDocumentHandler {
  if (!instance) {
    instance = createDocumentHandler(config ?? getDocumentHandlerConfig());
  }
  return instance;
}

export function createDocumentHandler(
  config: DocumentHandlerConfig,
): IDocumentHandler {
  if (config.handler === "local") {
    return new LocalDocumentHandler(config.dir);
  }

  throw new Error("Unknown document handler");
}

export function resetDocumentHandler(): void {
  instance = null;
}
