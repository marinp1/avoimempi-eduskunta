import { xml2json } from "xml-js";
import type { ParserFunction } from "../parser";
import type { XmlNode, XmlTree } from "../types";

/**
 * Parses XML contents.
 * Tries to simplify data structure as much as possible to keep the data
 * small and human-readable for verification.
 * @param element Element to parse.
 * @param removeNulls If empty elements should be omitted from response.
 * @param parent Name of parent element.
 */
const parseElement = (
  element: XmlNode,
  removeNulls: boolean,
  parent?: string,
): any => {
  switch (element.type) {
    // Handle element node
    case "element":
      // Return in object format. TODO: Any possibility that value could be overwritten by entry with same name?
      return {
        [element.name]: (() => {
          // Since XML is parsed with `alwaysArray: true` option, data should always be in array format.
          const data =
            element.elements?.map((e) =>
              parseElement(e, removeNulls, element.name),
            ) ?? [];
          // Return undefined if empty, this is then be removed during stringify
          if (!element.attributes && data.length === 0) return undefined;
          const entries: Array<[string, any]> = [];
          // FIXME: Entries are not used in any shape or form.
          if (element.attributes) {
            entries.push(["attributes", element.attributes]);
          }
          // Handle case where there is exactly one array element
          if (data.length === 1 && typeof data[0] === "string") {
            if (element.attributes) {
              if (element.name !== "Sotilasarvo") {
                console.warn(element.name, element.attributes);
              }
            }
            return data[0];
          }
          // Handle rest of entries, make some assumption of data structure
          const merged: Record<string, any> = {};
          for (const dataEntry of data) {
            if (Array.isArray(dataEntry)) throw new Error("Unknown array");
            if (typeof dataEntry !== "object") throw new Error("Invalid type");
            /** Get entries of object. */
            const entries = Object.entries(dataEntry);
            // Each object should have exactly one entry
            if (entries.length !== 1) throw new Error("Invalid length");
            const [key, value] = entries[0];
            // Omit undefined values from data
            if (removeNulls) {
              if (value === undefined) continue;
            }
            // Append value to object
            if (!(key in merged)) {
              merged[key] = [];
            }
            merged[key].push(value);
          }
          // Try to simplify data structure
          for (const [key, value] of Object.entries(merged)) {
            if (Array.isArray(value) && value.length === 1) {
              merged[key] = value[0];
            }
          }
          // Omit value if configured to do so
          if (removeNulls) {
            if (Object.keys(merged).length === 0) return undefined;
          }
          return merged;
        })(),
      };
    // Handle text node, make some assumptions
    case "text":
      if (element.elements?.length)
        throw new Error("Invalid text element (elements found)");
      if (element.attributes)
        throw new Error("Invalid text element (attributes found)");
      if (!parent) throw new Error("Invalid parent");
      return element.text;
    default:
      throw new Error("Invalid node type");
  }
};

/**
 * Use xml2json library to parse stringified XML
 * into JSON format. Try to make JSON output as
 * consistent as possible for easier parsing.
 * @param data xml data in string format.
 * @returns Parsed and post processed JSON object.
 */
const postProcessXml = (data: string) => {
  /** Parsed XML (as string) */
  const parsedXml = xml2json(data, {
    ignoreDeclaration: true,
    alwaysArray: true,
    alwaysChildren: true,
    trim: true,
  });
  const tree = JSON.parse(parsedXml) as XmlTree;
  if (Object.keys(tree).length === 0) return null;
  if (tree.elements.length !== 1)
    throw new Error("Unknown number of root elements");
  const root = tree.elements[0];
  // Make some assumptions about root structure
  if (root.type !== "element" || root.name !== "Henkilo") {
    console.warn(root);
    throw new Error("Invalid root element");
  }
  // Return post processed root element
  return parseElement(root, true);
};

/**
 * Custom parser for MemberOfParliament table
 * Parses XML data and creates a more readable identifier
 */
const parser: ParserFunction = async (row, primaryKey) => {
  // Parse XML data (will throw on error, matching original behavior)
  const parsedXml = postProcessXml(row.XmlDataFi);

  // Create a readable sort name for the file
  const sortName =
    parsedXml?.Henkilo?.LajitteluNimi?.replace(/\s+/g, "_") ?? "tuntematon";

  // Return parsed data with XML converted and unused fields removed
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
