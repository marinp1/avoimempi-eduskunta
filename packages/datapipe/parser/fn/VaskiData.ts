import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { XMLParser } from "fast-xml-parser";
import { getParsedRowStore } from "#storage/row-store/factory";
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
  return name.replace(/[/\\?%*:|"<>]/g, "-").replace(/\s+/g, "_");
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
  const yhteiso = sanitizeFolderName(
    kokousViite?.YhteisoTeksti || "no-yhteiso",
  );

  // kokous from KokousViite.@_kokousTunnus
  const kokous = sanitizeFolderName(
    kokousViite?.["@_kokousTunnus"] || "no-kokous",
  );

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
type VaskiIndex = Record<string, { totalRecords: number }>;

async function buildIndexFromParsedStorage(): Promise<VaskiIndex> {
  const parsedStore = getParsedRowStore();
  const index: VaskiIndex = {};

  for await (const row of parsedStore.list("VaskiData")) {
    const parsed = JSON.parse(row.data) as ParsedRow;
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
 * Called after all rows have been parsed.
 * Writes the vaski-data/index.json metadata index.
 */
export async function onParsingComplete(): Promise<void> {
  const index = await buildIndexFromParsedStorage();
  const repoRoot = findRepoRoot();
  const vaskiDir = join(repoRoot, "vaski-data");
  await mkdir(vaskiDir, { recursive: true });

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
