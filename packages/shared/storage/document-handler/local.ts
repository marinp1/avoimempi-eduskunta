import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import type { IDocumentHandler } from "./types";

export class LocalDocumentHandler implements IDocumentHandler {
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = path.resolve(dir);
  }

  private safePath(filename: string): string {
    const resolved = path.resolve(this.dir, path.basename(filename));
    if (!resolved.startsWith(this.dir + path.sep) && resolved !== this.dir) {
      throw new Error(`Unsafe document filename: "${filename}"`);
    }
    return resolved;
  }

  async put(filename: string, data: Buffer): Promise<void> {
    mkdirSync(this.dir, { recursive: true });
    writeFileSync(this.safePath(filename), data);
  }

  exists(filename: string): Promise<boolean> {
    return Promise.resolve(existsSync(this.safePath(filename)));
  }

  async metadata(filename: string): Promise<{ sizeBytes: number } | null> {
    try {
      const s = await stat(this.safePath(filename));
      return { sizeBytes: s.size };
    } catch {
      return null;
    }
  }

  async healthCheck(): Promise<void> {
    mkdirSync(this.dir, { recursive: true });
    accessSync(this.dir, constants.W_OK);
  }
}
