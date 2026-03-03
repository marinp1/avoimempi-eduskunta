import type { Database } from "bun:sqlite";
import { readAllVaskiRows, readVaskiIndex, type VaskiEntry } from "./reader";
import createAsiantuntijalausunnonLiite from "./submigrators/asiantuntijalausunnon_liite.ts";
import createAsiantuntijalausunto from "./submigrators/asiantuntijalausunto.ts";
import createAsiantuntijasuunnitelma from "./submigrators/asiantuntijasuunnitelma.ts";
import createHallituksenEsitys from "./submigrators/hallituksen_esitys.ts";
import createKansalaisaloite from "./submigrators/kansalaisaloite.ts";
import createKeskustelualoite from "./submigrators/keskustelualoite.ts";
import createKirjallinenKysymys from "./submigrators/kirjallinen_kysymys.ts";
import createLakialoite from "./submigrators/lakialoite.ts";
import createLisatalousarvioaloite from "./submigrators/lisätalousarvioaloite.ts";
import createNimenhuutoraportti from "./submigrators/nimenhuutoraportti.ts";
import createPoytakirja from "./submigrators/pöytäkirja.ts";
import createSuullinenKysymys from "./submigrators/suullinen_kysymys.ts";
import createTalousarvioaloite from "./submigrators/talousarvioaloite.ts";
import createToimenpidealoite from "./submigrators/toimenpidealoite.ts";
import createValiokunnanLausunto from "./submigrators/valiokunnan_lausunto.ts";
import createValiokunnanMietinto from "./submigrators/valiokunnan_mietintö.ts";
import createVastausKirjalliseenKysymykseen from "./submigrators/vastaus_kirjalliseen_kysymykseen.ts";
import createValikysymys from "./submigrators/välikysymys.ts";

const SUBMIGRATOR_FACTORIES: Record<string, VaskiSubMigratorFactory> = {
  asiantuntijalausunnon_liite: createAsiantuntijalausunnonLiite,
  asiantuntijalausunto: createAsiantuntijalausunto,
  asiantuntijasuunnitelma: createAsiantuntijasuunnitelma,
  hallituksen_esitys: createHallituksenEsitys,
  kansalaisaloite: createKansalaisaloite,
  keskustelualoite: createKeskustelualoite,
  kirjallinen_kysymys: createKirjallinenKysymys,
  lakialoite: createLakialoite,
  lisätalousarvioaloite: createLisatalousarvioaloite,
  nimenhuutoraportti: createNimenhuutoraportti,
  pöytäkirja: createPoytakirja,
  suullinen_kysymys: createSuullinenKysymys,
  talousarvioaloite: createTalousarvioaloite,
  toimenpidealoite: createToimenpidealoite,
  valiokunnan_lausunto: createValiokunnanLausunto,
  valiokunnan_mietintö: createValiokunnanMietinto,
  vastaus_kirjalliseen_kysymykseen: createVastausKirjalliseenKysymykseen,
  välikysymys: createValikysymys,
};

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
  onSourceRow?: (row: VaskiEntry) => void | Promise<void>;
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

export interface VaskiFlushContext {
  getRowsByDocumentType: (documentType: string) => readonly VaskiEntry[];
}

interface VaskiSubMigrator {
  migrateRow: (row: VaskiEntry) => void | Promise<void>;
  flush?: (context?: VaskiFlushContext) => Promise<void> | void;
}

type VaskiSubMigratorFactory = (db: Database) => VaskiSubMigrator;
type ActiveSubMigrator = {
  documentType: string;
  position: number;
  subMigrator: VaskiSubMigrator;
  rowsMigrated: number;
  started: boolean;
};

const FLUSH_DOCUMENT_DEPENDENCIES: Record<string, readonly string[]> = {
  kirjallinen_kysymys: ["vastaus_kirjalliseen_kysymykseen"],
};

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
    normalizeText(row._source?.vaskiPath) ??
    `vaski-data/${documentType}/unknown`;
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
    [
      id,
      documentType,
      extractEdkIdentifier(row),
      buildSourcePath(row, documentType, id),
    ],
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

function loadSubMigrator(
  db: Database,
  documentType: string,
): VaskiSubMigrator | null {
  const factory = SUBMIGRATOR_FACTORIES[documentType];
  return factory ? factory(db) : null;
}

/**
 * Main entrypoint for Vaski migration.
 * This migrates each indexed document type via its registered submigrator.
 */
export async function migrateVaskiData(
  db: Database,
  options?: VaskiMigrationOptions,
): Promise<VaskiMigrationSummary> {
  const indexedDocumentTypes = Object.keys(await readVaskiIndex()).sort();
  const indexedDocumentTypeSet = new Set(indexedDocumentTypes);

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
  const activeSubMigrators = new Map<string, ActiveSubMigrator>();
  const dependencyDocumentTypes = new Set<string>();

  for (const [index, documentType] of requestedDocumentTypes.entries()) {
    const subMigrator = loadSubMigrator(db, documentType);
    if (!subMigrator) {
      skippedDocumentTypes.push(documentType);
      if (options?.onDocumentTypeSkipped) {
        await options.onDocumentTypeSkipped({
          documentType,
          index: index + 1,
          total: requestedDocumentTypes.length,
          reason: "no_submigrator",
        });
      }
      continue;
    }

    activeSubMigrators.set(documentType, {
      documentType,
      position: index + 1,
      subMigrator,
      rowsMigrated: 0,
      started: false,
    });

    const dependencies = FLUSH_DOCUMENT_DEPENDENCIES[documentType] ?? [];
    for (const dependencyDocumentType of dependencies) {
      dependencyDocumentTypes.add(dependencyDocumentType);
    }
  }

  const dependencyRowsByDocumentType = new Map<string, VaskiEntry[]>();
  for (const documentType of dependencyDocumentTypes) {
    dependencyRowsByDocumentType.set(documentType, []);
  }

  const startDocumentTypeIfNeeded = async (
    subMigrator: ActiveSubMigrator,
  ): Promise<void> => {
    if (subMigrator.started) return;
    subMigrator.started = true;
    if (options?.onDocumentTypeStart) {
      await options.onDocumentTypeStart({
        documentType: subMigrator.documentType,
        index: subMigrator.position,
        total: requestedDocumentTypes.length,
      });
    }
  };

  if (activeSubMigrators.size > 0) {
    for await (const { documentType, row } of readAllVaskiRows()) {
      if (options?.shouldStop?.()) {
        throw new Error("Migration stopped by user");
      }

      if (dependencyDocumentTypes.has(documentType)) {
        dependencyRowsByDocumentType.get(documentType)?.push(row);
      }

      const subMigrator = activeSubMigrators.get(documentType);
      if (!subMigrator) {
        continue;
      }

      await startDocumentTypeIfNeeded(subMigrator);

      if (options?.onSourceRow) {
        await options.onSourceRow(row);
      }
      upsertVaskiDocument(db, row, documentType);
      const result = subMigrator.subMigrator.migrateRow(row);
      if (isPromiseLike(result)) {
        await result;
      }
      subMigrator.rowsMigrated++;
      if (
        options?.onDocumentTypeProgress &&
        subMigrator.rowsMigrated % progressInterval === 0
      ) {
        await options.onDocumentTypeProgress({
          documentType,
          index: subMigrator.position,
          total: requestedDocumentTypes.length,
          rowsMigrated: subMigrator.rowsMigrated,
        });
      }
    }
  }

  const flushContext: VaskiFlushContext = {
    getRowsByDocumentType: (documentType) =>
      dependencyRowsByDocumentType.get(documentType) ?? [],
  };

  for (const [index, documentType] of requestedDocumentTypes.entries()) {
    const activeSubMigrator = activeSubMigrators.get(documentType);
    if (!activeSubMigrator) {
      continue;
    }

    if (
      activeSubMigrator.rowsMigrated === 0 &&
      !indexedDocumentTypeSet.has(documentType)
    ) {
      skippedDocumentTypes.push(documentType);
      if (options?.onDocumentTypeSkipped) {
        await options.onDocumentTypeSkipped({
          documentType,
          index: index + 1,
          total: requestedDocumentTypes.length,
          reason: "no_indexed_data",
        });
      }
      continue;
    }

    await startDocumentTypeIfNeeded(activeSubMigrator);

    if (activeSubMigrator.subMigrator.flush) {
      const flushResult = activeSubMigrator.subMigrator.flush(flushContext);
      if (isPromiseLike(flushResult)) {
        await flushResult;
      }
    }

    rowsByDocumentType[documentType] = activeSubMigrator.rowsMigrated;
    migratedDocumentTypes.push(documentType);

    if (options?.onDocumentTypeComplete) {
      await options.onDocumentTypeComplete({
        documentType,
        index: index + 1,
        total: requestedDocumentTypes.length,
        rowsMigrated: activeSubMigrator.rowsMigrated,
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
