import { existsSync } from "node:fs";
import { mkdir, symlink, unlink, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { getStorage, getStorageConfig, StorageKeyBuilder } from "#storage";
import { XMLParser } from "fast-xml-parser";
import type { ParserFunction } from "../parser";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  ignoreDeclaration: true,
  removeNSPrefix: false,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
});

/**
 * Remove namespace prefixes from keys.
 * e.g. "ns11:Siirto" -> "Siirto", "@_met1:asiakirjatyyppiNimi" -> "@_asiakirjatyyppiNimi"
 */
function removePrefix(key: string): string {
  if (key.startsWith("@_")) {
    const match = key.match(/^@_[^:]+:(.+)$/);
    return match ? `@_${match[1]}` : key;
  }
  const colonIndex = key.indexOf(":");
  return colonIndex > 0 ? key.substring(colonIndex + 1) : key;
}

/**
 * Clean XML parser artifacts: remove xmlns declarations,
 * simplify #text-only nodes, and remove namespace prefixes from keys.
 */
function cleanParsedXml(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) return obj.map((item) => cleanParsedXml(item));
  if (typeof obj !== "object") return obj;

  // If object has only #text and xmlns attributes, return just the text
  if (obj["#text"] !== undefined && typeof obj["#text"] !== "object") {
    const keys = Object.keys(obj);
    const hasOnlyTextAndXmlns = keys.every(
      (k) => k === "#text" || k.startsWith("@_xmlns"),
    );
    if (hasOnlyTextAndXmlns) return obj["#text"];
  }

  const cleaned: any = {};
  for (const key in obj) {
    if (key.startsWith("@_xmlns")) continue;
    const cleanKey = removePrefix(key);
    cleaned[cleanKey] = cleanParsedXml(obj[key]);
  }
  return cleaned;
}

/**
 * Sanitize a string for use as a folder name.
 */
function sanitizeFolderName(name: string): string {
  return name
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, "_");
}

/**
 * Extract #avoimempieduskunta classification metadata from parsed contents.
 * Ported from analyze-vaski-xml.ts classification logic.
 */
function classifyDocument(contents: any): {
  yhteiso: string;
  kokous: string;
  documentType: string;
} {
  let metatieto =
    contents?.Siirto?.SiirtoMetatieto ?? contents?.Siirto?.JulkaisuMetatieto;
  if (metatieto?.JulkaisuMetatieto) {
    metatieto = metatieto.JulkaisuMetatieto;
  }

  // yhteiso from KokousViite.YhteisoTeksti
  const kokousViite = metatieto?.KokousViite;
  const yhteiso = sanitizeFolderName(kokousViite?.YhteisoTeksti || "no-yhteiso");

  // kokous from KokousViite.@_kokousTunnus
  const kokous = sanitizeFolderName(kokousViite?.["@_kokousTunnus"] || "no-kokous");

  // documentType from @_asiakirjatyyppiNimi
  let asiakirjatyyppiNimi = metatieto?.["@_asiakirjatyyppiNimi"];

  // Fallback: try alternative locations in SiirtoAsiakirja
  if (!asiakirjatyyppiNimi) {
    const rakenneAsiakirja =
      contents?.Siirto?.SiirtoAsiakirja?.RakenneAsiakirja;
    if (rakenneAsiakirja && typeof rakenneAsiakirja === "object") {
      const kasittelytiedot =
        rakenneAsiakirja.KasittelytiedotValtiopaivaasia ||
        rakenneAsiakirja.Kasittelytiedot ||
        rakenneAsiakirja.KasittelytiedotLausumaasia ||
        rakenneAsiakirja;
      asiakirjatyyppiNimi = kasittelytiedot?.["@_asiakirjatyyppiNimi"];
    }
  }

  const documentType = sanitizeFolderName(
    asiakirjatyyppiNimi || "unknown",
  ).toLowerCase();

  return { yhteiso, kokous, documentType };
}

/**
 * Find the repository root by walking up from cwd looking for .git.
 */
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

type ParsedRow = Record<string, any>;
type VaskiIndex = Record<
  string,
  { totalRecords: number; pages: Record<string, string[]> }
>;

function getParsedPageAbsolutePath(pageNumber: number): string {
  const storageConfig = getStorageConfig();
  if (storageConfig.provider === "local" && storageConfig.local) {
    return join(
      storageConfig.local.baseDir,
      "parsed",
      "VaskiData",
      `page_${pageNumber}.json`,
    );
  }

  // Non-local storage providers are not currently supported for symlink output.
  const repoRoot = findRepoRoot();
  return join(repoRoot, "data", "parsed", "VaskiData", `page_${pageNumber}.json`);
}

function collectDocumentTypeRows(rows: ParsedRow[]): Map<string, string[]> {
  const docTypeRecords = new Map<string, string[]>();

  for (const row of rows) {
    if (!row || row._skip) continue;

    const id = row.id ?? row.Id;
    const meta = row["#avoimempieduskunta"];
    const documentType = meta?.documentType;
    if (!documentType || id === undefined || id === null) continue;

    const ids = docTypeRecords.get(documentType) ?? [];
    ids.push(String(id));
    docTypeRecords.set(documentType, ids);
  }

  return docTypeRecords;
}

async function ensureDocumentTypeSymlink(
  repoRoot: string,
  documentType: string,
  pageNumber: number,
): Promise<void> {
  const symlinkDir = join(repoRoot, "vaski-data", documentType);
  const symlinkPath = join(symlinkDir, `page_${pageNumber}.json`);

  await mkdir(symlinkDir, { recursive: true });

  const parsedFile = getParsedPageAbsolutePath(pageNumber);
  const target = relative(symlinkDir, parsedFile);

  try {
    await symlink(target, symlinkPath);
  } catch (e: any) {
    if (e.code !== "EEXIST") {
      throw e;
    }

    await unlink(symlinkPath);
    await symlink(target, symlinkPath);
  }
}

async function buildIndexFromParsedStorage(): Promise<VaskiIndex> {
  const storage = getStorage();
  const prefix = StorageKeyBuilder.listPrefixForTable("parsed", "VaskiData");
  const listResult = await storage.list({ prefix, maxKeys: 100000 });

  const sortedPages = listResult.keys
    .map((keyMeta) => ({
      key: keyMeta.key,
      parsed: StorageKeyBuilder.parseKey(keyMeta.key),
    }))
    .filter((item) => item.parsed !== null)
    .sort((a, b) => (a.parsed?.page || 0) - (b.parsed?.page || 0));

  const index: VaskiIndex = {};

  for (const pageInfo of sortedPages) {
    const rawPage = await storage.get(pageInfo.key);
    if (!rawPage) continue;

    const page = JSON.parse(rawPage) as { rowData?: ParsedRow[] };
    const rows = Array.isArray(page.rowData) ? page.rowData : [];
    const pageNumber = pageInfo.parsed!.page;
    const docTypeRows = collectDocumentTypeRows(rows);

    for (const [documentType, ids] of docTypeRows.entries()) {
      if (!index[documentType]) {
        index[documentType] = { totalRecords: 0, pages: {} };
      }

      index[documentType].pages[String(pageNumber)] = ids;
      index[documentType].totalRecords += ids.length;
    }
  }

  return index;
}

/**
 * Custom parser for VaskiData table.
 * Parses the XML in XmlData field to a clean JSON structure,
 * filters out Swedish-language entries, classifies by document type,
 * and attaches #avoimempieduskunta metadata.
 */
const parser: ParserFunction = async (row, primaryKey) => {
  const parsed = xmlParser.parse(row.XmlData);
  const contents = cleanParsedXml(parsed);
  const rootType =
    contents?.Siirto?.SiirtoAsiakirja?.RakenneAsiakirja &&
    typeof contents.Siirto.SiirtoAsiakirja.RakenneAsiakirja === "object"
      ? (Object.keys(contents.Siirto.SiirtoAsiakirja.RakenneAsiakirja)[0] ??
        null)
      : null;

  // Check for Swedish language - skip these entries
  let metatieto =
    contents?.Siirto?.SiirtoMetatieto ?? contents?.Siirto?.JulkaisuMetatieto;
  if (metatieto?.JulkaisuMetatieto) {
    metatieto = metatieto.JulkaisuMetatieto;
  }
  const languageCode = metatieto?.["@_kieliKoodi"];
  const sanomaName = contents?.Siirto?.Sanomavalitys?.SanomatyyppiNimi;

  if (languageCode === "sv" || sanomaName?.endsWith("_sv")) {
    return [`${row[primaryKey]}`, { ...row, XmlData: undefined, _skip: true }];
  }

  // Classify document type
  const classification = classifyDocument(contents);

  return [
    `${row[primaryKey]}`,
    {
      id: row.Id,
      eduskuntaTunnus: row.Eduskuntatunnus,
      status: row.Status,
      created: row.Created,
      attachmentGroupId: row.AttachmentGroupId,
      rootType,
      "#avoimempieduskunta": classification,
      contents,
    },
  ];
};

export default parser;

/**
 * Called after each parsed page is written to storage.
 * Creates per-documentType symlinks for quick local browsing.
 */
export async function onPageParsed(
  pageNumber: number,
  rows: ParsedRow[],
): Promise<void> {
  const repoRoot = findRepoRoot();
  const docTypeRows = collectDocumentTypeRows(rows);
  for (const documentType of docTypeRows.keys()) {
    await ensureDocumentTypeSymlink(repoRoot, documentType, pageNumber);
  }
}

/**
 * Called after all pages have been parsed.
 * Writes the vaski-data/index.json metadata index.
 */
export async function onParsingComplete(): Promise<void> {
  const index = await buildIndexFromParsedStorage();
  const repoRoot = findRepoRoot();
  const vaskiDir = join(repoRoot, "vaski-data");
  await mkdir(vaskiDir, { recursive: true });

  for (const [documentType, info] of Object.entries(index)) {
    const pages = Object.keys(info.pages);
    for (const page of pages) {
      await ensureDocumentTypeSymlink(repoRoot, documentType, +page);
    }
  }

  const indexPath = join(vaskiDir, "index.json");
  await writeFile(indexPath, JSON.stringify(index, null, 2));

  // Log summary
  const totalTypes = Object.keys(index).length;
  const totalRecords = Object.values(index).reduce(
    (sum, entry) => sum + entry.totalRecords,
    0,
  );
  console.log(
    `\n📋 Vaski index: ${totalTypes} document types, ${totalRecords.toLocaleString()} records`,
  );
  console.log(`📁 Written to ${indexPath}`);
}
