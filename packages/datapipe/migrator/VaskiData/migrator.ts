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
  onDocumentTypeStart?: (event: {
    documentType: string;
    index: number;
    total: number;
  }) => void | Promise<void>;
  onDocumentTypeComplete?: (event: {
    documentType: string;
    index: number;
    total: number;
    rowsMigrated: number;
  }) => void | Promise<void>;
  onDocumentTypeProgress?: (event: {
    documentType: string;
    index: number;
    total: number;
    rowsMigrated: number;
  }) => void | Promise<void>;
  onDocumentTypeSkipped?: (event: {
    documentType: string;
    index: number;
    total: number;
    reason: "no_submigrator" | "no_indexed_data";
  }) => void | Promise<void>;
  documentTypeProgressRowInterval?: number;
  shouldStop?: () => boolean;
}

export interface VaskiMigrationSummary {
  requestedDocumentTypes: string[];
  migratedDocumentTypes: string[];
  skippedDocumentTypes: string[];
  rowsByDocumentType: Record<string, number>;
}

interface VaskiSubMigrator {
  migrateRow: (row: VaskiEntry) => void | Promise<void>;
  flush?: () => Promise<void> | void;
}

type VaskiSubMigratorFactory = (db: Database) => VaskiSubMigrator;

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  !!value && typeof (value as { then?: unknown }).then === "function";

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

const parseNumericId = (value: unknown): number | null => {
  const normalized = normalizeText(value);
  if (!normalized || !/^\d+$/.test(normalized)) return null;
  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isSafeInteger(parsed)) return null;
  return parsed;
};

const extractEdkIdentifier = (row: VaskiEntry): string | null => {
  const meta = row.contents?.Siirto?.SiirtoMetatieto;
  const candidates = [
    meta?.JulkaisuMetatieto?.["@_muuTunnus"],
    meta?.["@_muuTunnus"],
    row.contents?.Siirto?.SiirtoAsiakirja?.RakenneAsiakirja?.Poytakirja?.[
      "@_muuTunnus"
    ],
    row.contents?.Siirto?.SiirtoAsiakirja?.RakenneAsiakirja?.PoytakirjaLiite?.[
      "@_muuTunnus"
    ],
  ];

  for (const candidate of candidates) {
    const normalized = normalizeText(candidate);
    if (normalized) return normalized;
  }
  return null;
};

const buildSourcePath = (row: VaskiEntry, documentType: string, id: number) => {
  const basePath =
    normalizeText(row._source?.vaskiPath) ?? `vaski-data/${documentType}/unknown`;
  return `${basePath}#id=${id}`;
};

const upsertVaskiDocument = (
  db: Database,
  row: VaskiEntry,
  documentType: string,
) => {
  const id = parseNumericId(row.id);
  if (id === null) return;

  db.run(
    `INSERT INTO VaskiDocument (id, document_type, edk_identifier, source_path)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       document_type = excluded.document_type,
       edk_identifier = COALESCE(excluded.edk_identifier, VaskiDocument.edk_identifier),
       source_path = excluded.source_path`,
    [id, documentType, extractEdkIdentifier(row), buildSourcePath(row, documentType, id)],
  );
};

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
  const progressInterval = Math.max(
    1,
    options?.documentTypeProgressRowInterval ?? 1000,
  );

  for (const [index, documentType] of requestedDocumentTypes.entries()) {
    const position = index + 1;
    const subMigrator = await loadSubMigrator(db, documentType);
    const hasIndexedData = indexedDocumentTypes.includes(documentType);

    if (!subMigrator) {
      skippedDocumentTypes.push(documentType);
      if (options?.onDocumentTypeSkipped) {
        await options.onDocumentTypeSkipped({
          documentType,
          index: position,
          total: requestedDocumentTypes.length,
          reason: "no_submigrator",
        });
      }
      continue;
    }

    if (!hasIndexedData) {
      skippedDocumentTypes.push(documentType);
      if (options?.onDocumentTypeSkipped) {
        await options.onDocumentTypeSkipped({
          documentType,
          index: position,
          total: requestedDocumentTypes.length,
          reason: "no_indexed_data",
        });
      }
      continue;
    }

    if (options?.onDocumentTypeStart) {
      await options.onDocumentTypeStart({
        documentType,
        index: position,
        total: requestedDocumentTypes.length,
      });
    }

    let rowsMigrated = 0;
    for await (const row of readVaskiRowsByDocumentType(documentType)) {
      if (options?.shouldStop?.()) {
        throw new Error("Migration stopped by user");
      }
      upsertVaskiDocument(db, row, documentType);
      const result = subMigrator.migrateRow(row);
      if (isPromiseLike(result)) {
        await result;
      }
      rowsMigrated++;
      if (
        options?.onDocumentTypeProgress &&
        rowsMigrated % progressInterval === 0
      ) {
        await options.onDocumentTypeProgress({
          documentType,
          index: position,
          total: requestedDocumentTypes.length,
          rowsMigrated,
        });
      }
    }

    if (subMigrator.flush) {
      const flushResult = subMigrator.flush();
      if (isPromiseLike(flushResult)) {
        await flushResult;
      }
    }

    rowsByDocumentType[documentType] = rowsMigrated;
    migratedDocumentTypes.push(documentType);

    if (options?.onDocumentTypeComplete) {
      await options.onDocumentTypeComplete({
        documentType,
        index: position,
        total: requestedDocumentTypes.length,
        rowsMigrated,
      });
    }
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
  return (_row: any) => {
    // no-op by design
  };
};

export function flushVotes() {
  // no-op by design
}
