import fs from "fs";
import path from "path";
import { deepmerge } from "@fastify/deepmerge";
import jsonschema from "jsonschema";
import { projectRoot } from "#utils";

import type { TableName } from "#types/index.mts";

const tableName: TableName = "MemberOfParliament";

const dataDir = path.resolve(
  import.meta.dirname,
  `../parser/data/${tableName}`
);

if (!fs.existsSync(dataDir)) {
  throw new Error(`Data directory for ${tableName} not found, skipping...`);
}

/**
 * List of JSON filenames found in the data directory.
 */
const entriesToImport = fs
  .readdirSync(dataDir, { encoding: "utf8", withFileTypes: true })
  .filter((s) => s.name.endsWith(".json") && s.name !== "meta.json")
  .map((s) => s.name);

/**
 * Adjusted deepmerge function.
 */
const merge = deepmerge({
  all: true,
  /**
   * Try to merge all arrays together to reduce the amount of data.
   * We do not care about the values, only keys.
   */
  mergeArray: (opt) => (target, source) => {
    const [h, ...r] = [...target, ...source];
    return [r.reduce((acc, cur) => ({ ...acc, ...cur }), h)];
  },
});

/**
 * Merged object.
 */
let result: Record<string, any> = {};

for (const entry of entriesToImport) {
  const { default: data } = await import(path.resolve(dataDir, entry), {
    with: { type: "json" },
  });
  result = merge(result, data);
}

/**
 * Paths in JSON that can either be arrays of objects or single object.
 * The parser tries to simplify data structure as possible so these need
 * to be checked separately.
 */
const ARRAY_OR_OBJECT_KEYS = {
  "$.XmlDataFi.Henkilo.AiemmatToimielinjasenyydet.Toimielin": "Committee",
  "$.XmlDataFi.Henkilo.AiemmatToimielinjasenyydet.Toimielin.Jasenyys":
    "CommitteeMembership",
  "$.XmlDataFi.Henkilo.AiemmatToimielinjasenyydet.Toimielin.EntNimi":
    "EntinenNimi",
  "$.XmlDataFi.Henkilo.Arvonimet.Arvonimi": "Arvonimi",
  "$.XmlDataFi.Henkilo.Eduskuntaryhmat.EdellisetEduskuntaryhmat.Eduskuntaryhma":
    "ParliamentGroup",
  "$.XmlDataFi.Henkilo.Eduskuntaryhmat.EdellisetEduskuntaryhmat.Eduskuntaryhma.Jasenyys":
    "ParliamentGroupMembership",
  "$.XmlDataFi.Henkilo.Eduskuntaryhmat.TehtavatEduskuntaryhmassa.Eduskuntaryhma":
    "ParliamentGroup",
  "$.XmlDataFi.Henkilo.Eduskuntaryhmat.TehtavatEduskuntaryhmassa.Eduskuntaryhma.Tehtava":
    "ParliamentGroupAssignment",
  "$.XmlDataFi.Henkilo.Eduskuntaryhmat.TehtavatAiemmissaEduskuntaryhmissa.Eduskuntaryhma":
    "ParliamentGroup",
  "$.XmlDataFi.Henkilo.Eduskuntaryhmat.TehtavatAiemmissaEduskuntaryhmissa.Eduskuntaryhma.Tehtava":
    "ParliamentGroupAssignment",
  "$.XmlDataFi.Henkilo.Eduskuntaryhmat.TehtavatAiemmissaEduskuntaryhmissa.Eduskuntaryhma.Tehtava.Jasenyys":
    "ParliamentGroupMembership",
  "$.XmlDataFi.Henkilo.EdustajanJulkaisut.EdustajanJulkaisu":
    "EdustajanJulkaisu",
  "$.XmlDataFi.Henkilo.Edustajatoimet.Edustajatoimi": "Edustajatoimi",
  "$.XmlDataFi.Henkilo.EdustajatoimiKeskeytynyt.ToimenKeskeytys":
    "ToimenKeskeytys",
  "$.XmlDataFi.Henkilo.Kansanedustajana.Keskeytys": "Keskeytys",
  "$.XmlDataFi.Henkilo.KansanvalisetLuottamustehtavat.Tehtava":
    "Luottamustehtävä",
  "$.XmlDataFi.Henkilo.KirjallisuuttaEdustajasta.Julkaisu": "Julkaisu",
  "$.XmlDataFi.Henkilo.Koulutukset.Koulutus": "Koulutus",
  "$.XmlDataFi.Henkilo.KunnallisetLuottamustehtavat.Tehtava":
    "Luottamustehtävä",
  "$.XmlDataFi.Henkilo.MuutLuottamustehtavat.Tehtava": "Luottamustehtävä",
  "$.XmlDataFi.Henkilo.NykyisetToimielinjasenyydet.Toimielin": "Committee",
  "$.XmlDataFi.Henkilo.NykyisetToimielinjasenyydet.Toimielin.Jasenyys":
    "CommitteeMembership",
  "$.XmlDataFi.Henkilo.TyoUra.Tyo": "Työ",
  "$.XmlDataFi.Henkilo.Vaalipiirit.EdellisetVaalipiirit.VaaliPiiri":
    "Vaalipiiri",
  "$.XmlDataFi.Henkilo.ValtiollisetLuottamustehtavat.Tehtava":
    "Luottamustehtävä",
  "$.XmlDataFi.Henkilo.ValtioneuvostonJasenyydet.Jasenyys":
    "GovernmentMembership",
} satisfies Record<`$.${string}`, string> as Record<string, string>;

/**
 * Object of definitions constructred during model generation.
 */
const definitions: Record<string, any> = {};
const definitionMerge = deepmerge({ all: true });

/**
 * Create an `anyOf` JSON Schema entry where the value can either be the
 * definition parameter, or an array of definition paramters.
 * @param definition Type definition to use.
 * @param originalPath Original JSON path to the entry.
 * @see {definitions} As a side effect adds the definition to object.
 */
const createTypeWithDefinition = (definition: unknown, p: string) => {
  if (!(p in definitions)) {
    definitions[p] = definition;
  } else {
    Object.assign(definitions[p].properties, (definition as any)["properties"]);
  }
  return {
    anyOf: [
      {
        $ref: `#/$defs/${p}`,
      },
      {
        type: "array",
        items: {
          $ref: `#/$defs/${p}`,
        },
      },
    ],
  };
};

/**
 * Converts the merged JSON object into valid JSON schema.
 * @param cand Value to process.
 * @param p JSON path to entry.
 * @param root Is the node root node?
 */
const convertObjectIntoSchema = (cand: unknown, p = "", root = false): any => {
  if (cand === null) return { type: "null" };
  // Map array type
  if (Array.isArray(cand)) {
    const defType = cand.map((e) => convertObjectIntoSchema(e, `${p}`))[0];
    if (p in ARRAY_OR_OBJECT_KEYS) {
      return createTypeWithDefinition(defType, ARRAY_OR_OBJECT_KEYS[p]);
    }
    return {
      type: "array",
      items: defType,
    };
  }
  // Map object type
  if (typeof cand === "object") {
    const defType = {
      ...(root
        ? {
            $schema: "http://json-schema.org/draft/2020-12/schema#",
            id: "/representative",
          }
        : {}),
      type: "object",
      additionalProperties: false,
      properties: Object.fromEntries(
        Object.entries(cand as any).map(([k, v]) => [
          k,
          convertObjectIntoSchema(v, `${p}.${k}`),
        ])
      ),
      ...(root
        ? {
            $defs: definitions,
          }
        : {}),
    };
    if (p in ARRAY_OR_OBJECT_KEYS) {
      return createTypeWithDefinition(defType, ARRAY_OR_OBJECT_KEYS[p]);
    }
    return defType;
  }
  // Map string type
  if (typeof cand === "string") {
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(cand.trim())) {
      return {
        type: "string",
        // Date pattern be either in `dd.mm.YYYY`, `YYYY` or `YYYY <roman-numeral>` format.
        pattern: "^([0-9]{2}.[0-9]{2}.[0-9]{4})|([0-9]{4})|([0-9]{4} [iIvV]+)$",
      };
    }
    if (/^\d+$/.test(cand.trim())) {
      return {
        type: "string",
        format: "number",
      };
    }
    return {
      type: "string",
    };
  }

  // Throw error on unknown
  throw new Error("Unknown type");
};

// Create and write the schema file
const schema = convertObjectIntoSchema(result, "$", true);
const schemaFolder = path.resolve(projectRoot, "schemas");
const schemaPath = path.join(schemaFolder, "representative-model.json");
fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2), {
  encoding: "utf8",
});

// VALIDATE ALL FILES AGAINST SCHEMA

const validator = new jsonschema.Validator();

let firstInvalid: ReturnType<(typeof validator)["validate"]> | undefined;
let successsCount = 0;
let failureCount = 0;

const baseUrl = `file://${schemaFolder}`;

for (const entry of entriesToImport) {
  const { default: data } = await import(path.resolve(dataDir, entry), {
    with: { type: "json" },
  });
  validator.addSchema(schema, "/representative");
  const response = validator.validate(data, schema, {
    allowUnknownAttributes: true,
    required: true,
    base: baseUrl,
  });
  if (!response.valid && !firstInvalid) {
    firstInvalid = response;
  }
  if (response.valid) {
    successsCount++;
  } else {
    failureCount++;
  }
}

if (firstInvalid) {
  console.log(firstInvalid);
}

console.log(
  "Schema Validation:",
  successsCount,
  "/",
  successsCount + failureCount,
  "OK!"
);
