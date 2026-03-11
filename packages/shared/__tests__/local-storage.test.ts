import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { LocalStorageProvider } from "../storage/providers/local";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "storage-test-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("LocalStorageProvider path traversal protection", () => {
  test("rejects .. segments that escape the base directory", async () => {
    await withTempDir(async (dir) => {
      const storage = new LocalStorageProvider(dir);

      await expect(storage.put("../../etc/passwd", "evil")).rejects.toThrow(
        /escapes the storage base directory/,
      );
    });
  });

  test("rejects absolute path keys", async () => {
    await withTempDir(async (dir) => {
      const storage = new LocalStorageProvider(dir);

      await expect(storage.put("/etc/passwd", "evil")).rejects.toThrow(
        /escapes the storage base directory/,
      );
    });
  });

  test("rejects .. in nested path that escapes base", async () => {
    await withTempDir(async (dir) => {
      const storage = new LocalStorageProvider(dir);

      await expect(
        storage.put("subdir/../../etc/shadow", "evil"),
      ).rejects.toThrow(/escapes the storage base directory/);
    });
  });

  test("allows valid keys within base directory", async () => {
    await withTempDir(async (dir) => {
      const storage = new LocalStorageProvider(dir);

      await expect(
        storage.put("subdir/file.json", "data"),
      ).resolves.toBeUndefined();
      const result = await storage.get("subdir/file.json");
      expect(result).toBe("data");
    });
  });

  test("get rejects traversal keys", async () => {
    await withTempDir(async (dir) => {
      const storage = new LocalStorageProvider(dir);
      await expect(storage.get("../../etc/passwd")).rejects.toThrow(
        /escapes the storage base directory/,
      );
    });
  });

  test("delete rejects traversal keys", async () => {
    await withTempDir(async (dir) => {
      const storage = new LocalStorageProvider(dir);
      await expect(storage.delete("../../etc/passwd")).rejects.toThrow(
        /escapes the storage base directory/,
      );
    });
  });

  test("exists rejects traversal keys", async () => {
    await withTempDir(async (dir) => {
      const storage = new LocalStorageProvider(dir);
      await expect(storage.exists("../../etc/passwd")).rejects.toThrow(
        /escapes the storage base directory/,
      );
    });
  });

  test("metadata rejects traversal keys", async () => {
    await withTempDir(async (dir) => {
      const storage = new LocalStorageProvider(dir);
      await expect(storage.metadata("../../etc/passwd")).rejects.toThrow(
        /escapes the storage base directory/,
      );
    });
  });
});
