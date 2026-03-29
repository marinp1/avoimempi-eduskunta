import { XMLParser } from "fast-xml-parser";
import type { ParserFunction } from "../parser";

const xmlParser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
});

/**
 * Use fast-xml-parser to parse stringified XML into a plain JS object.
 * Repeated sibling tags are automatically collapsed into arrays; single
 * occurrences remain scalars.  Empty / whitespace-only text values are
 * discarded so the output stays compact.
 */
const postProcessXml = (data: string): Record<string, unknown> | null => {
  const result: Record<string, unknown> = xmlParser.parse(data);
  if (Object.keys(result).length === 0) return null;
  if (!("Henkilo" in result)) {
    console.warn(result);
    throw new Error("Invalid root element");
  }
  return result;
};

/**
 * Custom parser for MemberOfParliament table.
 * Parses XML data and creates a more readable identifier.
 */
const parser: ParserFunction = async (row, primaryKey) => {
  const parsedXml = postProcessXml(row.XmlDataFi);

  const sortName =
    (parsedXml?.Henkilo as Record<string, unknown> | undefined)
      ?.LajitteluNimi?.toString()
      .replace(/\s+/g, "_") ?? "tuntematon";

  return [
    `${sortName}_${row[primaryKey]}`,
    {
      ...row,
      XmlDataFi: parsedXml,
      XmlData: undefined,
      XmlDataEn: undefined,
      XmlDataSv: undefined,
    },
  ];
};

export default parser;
