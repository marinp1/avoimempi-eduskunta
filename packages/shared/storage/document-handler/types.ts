export interface IDocumentHandler {
  put(storageKey: string, data: Buffer): Promise<void>;
  get(storageKey: string): Promise<Buffer>;
  exists(storageKey: string): Promise<boolean>;
  metadata(storageKey: string): Promise<{ sizeBytes: number } | null>;
  healthCheck(): Promise<void>;
}
