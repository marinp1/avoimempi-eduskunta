import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getStorage, StorageKeyBuilder } from "#storage";

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

export type VaskiIndex = Record<
  string,
  {
    totalRecords: number;
    pages: Record<string, string[]>;
  }
>;

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

export async function readVaskiIndex(): Promise<VaskiIndex> {
  const indexPath = getVaskiIndexPath();
  const data = await readFile(indexPath, "utf-8");
  return JSON.parse(data) as VaskiIndex;
}

export async function listIndexedDocumentTypes(): Promise<string[]> {
  const index = await readVaskiIndex();
  return Object.keys(index).sort();
}

export async function* readVaskiRowsByDocumentType(
  documentType: string,
  indexInput?: VaskiIndex,
): AsyncGenerator<VaskiEntry> {
  const index = indexInput ?? (await readVaskiIndex());
  const entry = index[documentType];
  if (!entry) return;

  const storage = getStorage();
  const seenIds = new Set<string>();
  const pages = Object.keys(entry.pages)
    .map((page) => parseInt(page, 10))
    .filter((page) => !Number.isNaN(page))
    .sort((a, b) => a - b);

  for (const page of pages) {
    const idsInPage = new Set(entry.pages[String(page)] ?? []);
    if (idsInPage.size === 0) continue;

    const pageKey = StorageKeyBuilder.forPage("parsed", "VaskiData", page);
    const rawPage = await storage.get(pageKey);
    if (!rawPage) continue;

    const parsedPage = JSON.parse(rawPage) as { rowData?: Array<Record<string, any>> };
    const rows = Array.isArray(parsedPage.rowData) ? parsedPage.rowData : [];

    for (const row of rows) {
      if (!row || row._skip) continue;

      const rowIdValue = row.id ?? row.Id;
      if (rowIdValue === undefined || rowIdValue === null) continue;
      const rowId = String(rowIdValue);

      if (!idsInPage.has(rowId) || seenIds.has(rowId)) continue;

      const rowDocumentType = row["#avoimempieduskunta"]?.documentType;
      if (rowDocumentType !== documentType) continue;

      seenIds.add(rowId);
      yield {
        ...(row as VaskiEntry),
        _source: {
          page,
          parsedKey: pageKey,
          vaskiPath: `vaski-data/${documentType}/page_${page}.json`,
        },
      };
    }
  }
}
