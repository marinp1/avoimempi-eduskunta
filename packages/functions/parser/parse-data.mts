import path from "path";
import fs from "fs";
import { xml2json } from "xml-js";
import { TableNames } from "avoimempi-eduskunta-common/constants/TableNames.mts";
import type { XmlNode, XmlTree } from "./types/index.mts";

/**
 * Parses XML contents.
 * Tries to simplify data structure as much as possible to keep the data
 * small and human-redable for verification.
 * @param element Element to parse.
 * @param removeNulls If empty elements should be omitted from response.
 * @param parent Name of parent element.
 */
const parseElement = (
  element: XmlNode,
  removeNulls: boolean,
  parent?: string
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
              parseElement(e, removeNulls, element.name)
            ) ?? [];
          // Return undefined if empty, this is then be removed during stringify
          if (!element.attributes && data.length === 0) return undefined;
          const entries: Array<[string, any]> = [];
          // FIXME: Entries are not used in any shape or form.
          if (element.attributes) {
            entries.push(["attributes", element.attributes]);
          }
          // Handle case where there is examply one array element
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
            /** Get entreis of object. */
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
 * Object of table parser.
 * TODO: Modularise and move into separate files.
 */
const tableSpecificParsing: Partial<
  Record<
    Modules.Common.TableName,
    (
      data: Modules.Scraper.ApiResponse
    ) => Promise<Array<[primaryKey: string, data: object]>>
  >
> = {
  MemberOfParliament: async (data) => {
    const response: Array<[key: string, data: object]> = [];
    const columnNames = data.columnNames;
    const primaryKey = data.pkName;
    for (const dataRow of data.rowData) {
      const data = Object.fromEntries(
        columnNames.map((cn, ci) => [cn, (dataRow[ci] as any)?.trim()])
      ) as Record<string, any>;
      if (!(primaryKey in data)) {
        throw new Error("Sanity check error, primary key not found!");
      }
      const xmlKeys = columnNames.filter((n) => n.startsWith("XmlData"));
      for (const xmlKey of xmlKeys) {
        if (xmlKey !== "XmlDataFi") data[xmlKey] = null;
        else data[xmlKey] = postProcessXml(data[xmlKey]);
      }
      const sortName =
        data["XmlDataFi"]?.Henkilo?.LajitteluNimi?.replace(/\s+/g, "_") ??
        "tuntematon";
      const pk = `${sortName}_${data[primaryKey]}`;
      response.push([pk, data]);
    }
    return response;
  },
};

/**
 * Default parser to use if no specific handler is found.
 * @param data API response to parse.
 */
const defaultParser = async (
  data: Modules.Scraper.ApiResponse
): Promise<Array<[key: string, data: object]>> => {
  const response: Array<[key: string, data: object]> = [];
  const columnNames = data.columnNames;
  const primaryKey = data.pkName;
  for (const dataRow of data.rowData) {
    const data = Object.fromEntries(
      columnNames.map((cn, ci) => [cn, (dataRow[ci] as any)?.trim()])
    ) as Record<string, any>;
    if (!(primaryKey in data)) {
      throw new Error("Sanity check error, primary key not found!");
    }
    const pk = `${data[primaryKey]}`;
    response.push([pk, data]);
  }
  return response;
};

const parse = async <T extends Modules.Common.TableName>(tableName: T) => {
  console.time(`Parse ${tableName}`);

  const sourceFilesDir = path.resolve(
    import.meta.dirname,
    "../scraper",
    "data",
    tableName
  );

  if (!fs.existsSync(sourceFilesDir))
    throw new Error(`No data directory found for ${tableName}`);

  if (!(tableName in tableSpecificParsing)) {
    console.warn("Parsing not supported for table");
  }

  const distFolder = path.resolve(import.meta.dirname, "data", tableName);
  if (fs.existsSync(distFolder))
    fs.rmSync(distFolder, { force: true, recursive: true });
  if (!fs.existsSync(distFolder)) fs.mkdirSync(distFolder, { recursive: true });

  const sourceEntries = fs.readdirSync(sourceFilesDir, {
    withFileTypes: true,
    encoding: "utf-8",
  });

  const sourceFiles = sourceEntries
    .filter((e) => e.name.endsWith(".json") && e.name !== "meta.json")
    .map((e) => ({
      name: e.name,
      getContents: () =>
        JSON.parse(
          fs.readFileSync(path.join(e.parentPath, e.name), { encoding: "utf8" })
        ) as Modules.Scraper.ApiResponse,
    }));

  let totalParsed = 0;

  for (const { name, getContents } of sourceFiles) {
    console.log("Parsing table", tableName, "file", name);
    const rawData = getContents();
    const parsedEntries = await (tableSpecificParsing[tableName] ??
      defaultParser)!(rawData);
    for (const [key, data] of parsedEntries) {
      fs.writeFileSync(
        path.join(distFolder, key + ".json"),
        JSON.stringify(data, null, 2),
        { encoding: "utf8" }
      );
    }
    totalParsed += parsedEntries.length;
    console.log(`Found and parsed ${parsedEntries.length} entries.`);
  }

  console.log(
    "[DONE]",
    "Parsing done, detected in total",
    totalParsed,
    "entries"
  );

  console.timeEnd(`Parse ${tableName}`);
};

const [, , tableToUse] = process.argv;

if (!TableNames.includes(tableToUse as any)) {
  console.warn("Table name should be one of", TableNames);
  throw new Error("Invalid table name!");
}

await parse(tableToUse as Modules.Common.TableName);
