import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getParsedRowStore } from "#storage/row-store/factory";

export interface VaskiClassificationMeta {
  yhteiso: string;
  kokous: string;
  documentType: string;
}

export interface VaskiEntry {
  id: string;
  eduskuntaTunnus: string;
  status: string;
  created: string;
  attachmentGroupId: string | null;
  rootType?: string | null;
  _skip?: boolean;
  "#avoimempieduskunta"?: VaskiClassificationMeta;
  contents: {
    Siirto: {
      Sanomavalitys?: Record<string, any>;
      SiirtoMetatieto?: Record<string, any>;
      SiirtoAsiakirja?: Record<string, any>;
      SiirtoTiedosto?: Record<string, any>;
    };
  };
  _source?: {
    page: number;
    parsedKey: string;
    vaskiPath: string;
  };
}

export type VaskiIndex = Record<string, { totalRecords: number }>;

function findRepoRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, ".git"))) return dir;
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

function getVaskiIndexPath(): string {
  return join(findRepoRoot(), "vaski-data", "index.json");
}

async function buildIndexFromParsedRowStore(): Promise<VaskiIndex> {
  const parsedStore = getParsedRowStore();
  const index: VaskiIndex = {};

  for await (const row of parsedStore.list("VaskiData")) {
    const parsed = JSON.parse(row.data) as Record<string, any>;
    if (!parsed || parsed._skip) continue;

    const documentType = parsed["#avoimempieduskunta"]?.documentType;
    if (!documentType) continue;

    if (!index[documentType]) {
      index[documentType] = { totalRecords: 0 };
    }
    index[documentType].totalRecords++;
  }

  return index;
}

export async function readVaskiIndex(): Promise<VaskiIndex> {
  const indexPath = getVaskiIndexPath();
  if (existsSync(indexPath)) {
    try {
      const data = await readFile(indexPath, "utf-8");
      return JSON.parse(data) as VaskiIndex;
    } catch (error) {
      console.warn(
        `⚠️  Failed to read ${indexPath}, rebuilding index from parsed row store`,
        error,
      );
    }
  }

  return buildIndexFromParsedRowStore();
}

export async function listIndexedDocumentTypes(): Promise<string[]> {
  const index = await buildIndexFromParsedRowStore();
  return Object.keys(index).sort();
}

export async function* readVaskiRowsByDocumentType(
  documentType: string,
  indexInput?: VaskiIndex,
): AsyncGenerator<VaskiEntry> {
  if (indexInput && !indexInput[documentType]) {
    return;
  }

  const parsedStore = getParsedRowStore();

  for await (const row of parsedStore.list("VaskiData")) {
    const parsed = JSON.parse(row.data) as Record<string, any>;
    if (!parsed || parsed._skip) continue;

    const rowDocumentType = parsed["#avoimempieduskunta"]?.documentType;
    if (rowDocumentType !== documentType) continue;

    yield {
      ...(parsed as VaskiEntry),
      _source: {
        page: row.pk,
        parsedKey: `parsed/VaskiData/pk_${row.pk}`,
        vaskiPath: `vaski-data/${documentType}/${row.pk}`,
      },
    };
  }
}
