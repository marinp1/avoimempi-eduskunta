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
 * Custom parser for VaskiData table.
 * Parses the XML in XmlData field to a clean JSON structure,
 * filters out Swedish-language entries, and produces a VaskiEntry-like object.
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
    // Return with a _skip flag so the migrator can skip it
    return [`${row[primaryKey]}`, { ...row, XmlData: undefined, _skip: true }];
  }

  return [
    `${row[primaryKey]}`,
    {
      id: row.Id,
      eduskuntaTunnus: row.Eduskuntatunnus,
      status: row.Status,
      created: row.Created,
      attachmentGroupId: row.AttachmentGroupId,
      rootType,
      contents,
    },
  ];
};

export default parser;
