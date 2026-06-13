export interface IDocumentHandler {
  put(storageKey: string, data: Buffer): Promise<void>;
  exists(storageKey: string): Promise<boolean>;
  metadata(storageKey: string): Promise<{ sizeBytes: number } | null>;
  healthCheck(): Promise<void>;
}
