import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import type { IDocumentHandler } from "./types";

const SHARD_DEPTH = 2;

export class LocalDocumentHandler implements IDocumentHandler {
  private readonly dir: string;

  constructor(dir: string) {
    this.dir = path.resolve(dir);
  }

  private safePath(key: string): string {
    const resolved = path.resolve(this.dir, key);
    if (!resolved.startsWith(this.dir + path.sep) && resolved !== this.dir) {
      throw new Error(`Unsafe document storage key: "${key}"`);
    }
    return resolved;
  }

  private flatPath(key: string): string {
    return path.resolve(this.dir, path.basename(key));
  }

  private isShardedKey(key: string): boolean {
    const dir = path.dirname(key);
    return (
      dir !== "." && dir.length === SHARD_DEPTH && /^[0-9A-F]{2}$/i.test(dir)
    );
  }

  async put(storageKey: string, data: Buffer): Promise<void> {
    const target = this.safePath(storageKey);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, data);
  }

  async exists(storageKey: string): Promise<boolean> {
    if (existsSync(this.safePath(storageKey))) {
      return true;
    }
    if (this.isShardedKey(storageKey)) {
      const flatTarget = this.flatPath(storageKey);
      if (existsSync(flatTarget)) {
        const shardTarget = this.safePath(storageKey);
        mkdirSync(path.dirname(shardTarget), { recursive: true });
        renameSync(flatTarget, shardTarget);
        return true;
      }
    }
    return false;
  }

  async metadata(storageKey: string): Promise<{ sizeBytes: number } | null> {
    try {
      const s = await stat(this.safePath(storageKey));
      return { sizeBytes: s.size };
    } catch {
      if (this.isShardedKey(storageKey)) {
        try {
          const s = await stat(this.flatPath(storageKey));
          const shardTarget = this.safePath(storageKey);
          mkdirSync(path.dirname(shardTarget), { recursive: true });
          renameSync(this.flatPath(storageKey), shardTarget);
          return { sizeBytes: s.size };
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  async healthCheck(): Promise<void> {
    mkdirSync(this.dir, { recursive: true });
    accessSync(this.dir, constants.W_OK);
  }
}
