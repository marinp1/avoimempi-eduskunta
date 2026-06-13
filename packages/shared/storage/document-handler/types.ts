export interface IDocumentHandler {
  put(filename: string, data: Buffer): Promise<void>;
  exists(filename: string): Promise<boolean>;
  metadata(filename: string): Promise<{ sizeBytes: number } | null>;
  healthCheck(): Promise<void>;
}
