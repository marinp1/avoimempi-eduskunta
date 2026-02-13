import type { Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";
import {
  listIndexedDocumentTypes,
  readVaskiRowsByDocumentType,
  type VaskiEntry,
} from "./reader";

/**
 * VaskiData migration options.
 */
export interface VaskiMigrationOptions {
  /**
   * Document types to migrate. If omitted, migrates all indexed document types.
   */
  documentTypes?: string[];
}

export interface VaskiMigrationSummary {
  requestedDocumentTypes: string[];
  migratedDocumentTypes: string[];
  skippedDocumentTypes: string[];
  rowsByDocumentType: Record<string, number>;
}

interface VaskiSubMigrator {
  migrateRow: (row: VaskiEntry) => Promise<void>;
  flush?: () => Promise<void> | void;
}

type VaskiSubMigratorFactory = (db: Database) => VaskiSubMigrator;

const getDocumentTypesFromEnv = (): string[] | undefined => {
  const configured = process.env.VASKI_DOCUMENT_TYPES;
  if (!configured) return undefined;

  const normalized = configured
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return normalized.length > 0 ? normalized : undefined;
};

const normalizeDocumentTypes = (documentTypes: string[]): string[] =>
  Array.from(
    new Set(
      documentTypes.map((value) => value.trim().toLowerCase()).filter(Boolean),
    ),
  );

const isSafeDocumentType = (documentType: string): boolean => {
  if (!documentType) return false;
  if (documentType.includes("/") || documentType.includes("\\")) return false;
  if (documentType.includes("..")) return false;
  return true;
};

async function loadSubMigrator(
  db: Database,
  documentType: string,
): Promise<VaskiSubMigrator | null> {
  if (!isSafeDocumentType(documentType)) {
    throw new Error(`Not valid documentType ${documentType}`);
  }

  const subMigratorDirectory = path.resolve(
    import.meta.dirname,
    "submigrators",
  );
  const subMigratorPath = path.resolve(
    subMigratorDirectory,
    `${documentType}.ts`,
  );

  if (!subMigratorPath.startsWith(`${subMigratorDirectory}${path.sep}`)) {
    return null;
  }

  if (!fs.existsSync(subMigratorPath)) {
    return null;
  }

  const subMigratorModule = (await import(subMigratorPath)) as {
    default?: VaskiSubMigratorFactory;
  };

  if (typeof subMigratorModule.default !== "function") {
    throw new Error(
      `Vaski submigrator '${documentType}' does not export a default factory function`,
    );
  }

  return subMigratorModule.default(db);
}

/**
 * New orchestration entrypoint for Vaski migration.
 * This migrates each indexed document type via its registered submigrator.
 */
export async function migrateVaskiData(
  db: Database,
  options?: VaskiMigrationOptions,
): Promise<VaskiMigrationSummary> {
  const indexedDocumentTypes = await listIndexedDocumentTypes();

  const requestedDocumentTypes = normalizeDocumentTypes(
    options?.documentTypes ?? getDocumentTypesFromEnv() ?? indexedDocumentTypes,
  );

  const migratedDocumentTypes: string[] = [];
  const skippedDocumentTypes: string[] = [];
  const rowsByDocumentType: Record<string, number> = {};

  for (const documentType of requestedDocumentTypes) {
    const subMigrator = await loadSubMigrator(db, documentType);
    const hasIndexedData = indexedDocumentTypes.includes(documentType);

    if (!subMigrator || !hasIndexedData) {
      skippedDocumentTypes.push(documentType);
      continue;
    }

    let rowsMigrated = 0;
    for await (const row of readVaskiRowsByDocumentType(documentType)) {
      await subMigrator.migrateRow(row);
      rowsMigrated++;
    }

    if (subMigrator.flush) {
      await subMigrator.flush();
    }

    rowsByDocumentType[documentType] = rowsMigrated;
    migratedDocumentTypes.push(documentType);
  }

  return {
    requestedDocumentTypes,
    migratedDocumentTypes,
    skippedDocumentTypes,
    rowsByDocumentType,
  };
}

/**
 * Legacy table migrator entrypoint.
 * Kept as no-op until MigratorController is wired to use `migrateVaskiData`.
 */
export default (_db: Database) => {
  return async (_row: any) => {
    // no-op by design
  };
};

export function flushVotes() {
  // no-op by design
}
