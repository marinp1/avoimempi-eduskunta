import type { IStorageProvider, StorageMetadata } from "./types";

interface ListAllStorageKeysOptions {
  prefix?: string;
  pageSize?: number;
}

/**
 * List all keys under a prefix by following continuation tokens.
 */
export async function listAllStorageKeys(
  storage: Pick<IStorageProvider, "list">,
  options?: ListAllStorageKeysOptions,
): Promise<StorageMetadata[]> {
  const prefix = options?.prefix;
  const pageSize = options?.pageSize ?? 1000;
  const keys: StorageMetadata[] = [];
  let startAfter: string | undefined;

  while (true) {
    const page = await storage.list({
      prefix,
      maxKeys: pageSize,
      startAfter,
    });

    keys.push(...page.keys);

    if (!page.isTruncated || !page.nextContinuationToken) {
      break;
    }

    startAfter = page.nextContinuationToken;
  }

  return keys;
}
