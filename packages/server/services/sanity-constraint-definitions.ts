import { readFileSync } from "node:fs";
import { join } from "node:path";
import { sanityQueries } from "../database/sanity-queries";

const CONSTRAINT_FILE_PATH = join(
  import.meta.dirname,
  "../config/sanity-constraints.yaml",
);

interface RawConstraintDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  query_keys?: string[];
  query_refs?: string[];
  params?: Record<string, unknown>;
  notes?: string;
}

interface RawConstraintFile {
  version: number;
  constraints: RawConstraintDefinition[];
}

export interface SanityConstraintDefinition {
  id: string;
  name: string;
  category: string;
  description: string;
  queryKeys: string[];
  queryRefs: string[];
  params: Record<string, string | number | boolean>;
  notes?: string;
}

let cachedDefinitions: SanityConstraintDefinition[] | null = null;
let cachedDefinitionsByName: Map<string, SanityConstraintDefinition> | null =
  null;

function asStringArray(value: unknown, field: string, id: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new Error(
      `Invalid sanity constraint '${id}': field '${field}' must be an array`,
    );
  }

  for (const item of value) {
    if (typeof item !== "string" || item.trim().length === 0) {
      throw new Error(
        `Invalid sanity constraint '${id}': field '${field}' must contain non-empty strings`,
      );
    }
  }

  return value;
}

function asParamsObject(
  value: unknown,
  id: string,
): Record<string, string | number | boolean> {
  if (value === undefined || value === null) return {};
  if (typeof value !== "object" || Array.isArray(value)) {
    throw new Error(
      `Invalid sanity constraint '${id}': field 'params' must be an object`,
    );
  }

  const params: Record<string, string | number | boolean> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    if (
      typeof rawValue !== "string" &&
      typeof rawValue !== "number" &&
      typeof rawValue !== "boolean"
    ) {
      throw new Error(
        `Invalid sanity constraint '${id}': params.${key} must be string, number, or boolean`,
      );
    }
    params[key] = rawValue;
  }

  return params;
}

function loadRawDefinitions(): RawConstraintFile {
  const yaml = readFileSync(CONSTRAINT_FILE_PATH, "utf8");
  const parsed = Bun.YAML.parse(yaml) as RawConstraintFile;

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Invalid sanity constraint file: expected an object");
  }
  if (typeof parsed.version !== "number" || parsed.version <= 0) {
    throw new Error("Invalid sanity constraint file: missing valid version");
  }
  if (!Array.isArray(parsed.constraints)) {
    throw new Error(
      "Invalid sanity constraint file: constraints must be array",
    );
  }

  return parsed;
}

function validateAndNormalizeDefinitions(
  rawDefinitions: RawConstraintDefinition[],
): SanityConstraintDefinition[] {
  const ids = new Set<string>();
  const names = new Set<string>();
  const validQueryKeys = new Set(Object.keys(sanityQueries));

  const definitions: SanityConstraintDefinition[] = [];
  for (const raw of rawDefinitions) {
    if (!raw || typeof raw !== "object") {
      throw new Error(
        "Invalid sanity constraint file: constraint must be object",
      );
    }
    if (typeof raw.id !== "string" || raw.id.trim().length === 0) {
      throw new Error("Invalid sanity constraint: id must be non-empty string");
    }
    if (typeof raw.name !== "string" || raw.name.trim().length === 0) {
      throw new Error(
        `Invalid sanity constraint '${raw.id}': name must be non-empty string`,
      );
    }
    if (typeof raw.category !== "string" || raw.category.trim().length === 0) {
      throw new Error(
        `Invalid sanity constraint '${raw.id}': category must be non-empty string`,
      );
    }
    if (
      typeof raw.description !== "string" ||
      raw.description.trim().length === 0
    ) {
      throw new Error(
        `Invalid sanity constraint '${raw.id}': description must be non-empty string`,
      );
    }
    if (ids.has(raw.id)) {
      throw new Error(`Duplicate sanity constraint id '${raw.id}'`);
    }
    if (names.has(raw.name)) {
      throw new Error(`Duplicate sanity constraint name '${raw.name}'`);
    }

    const queryKeys = asStringArray(raw.query_keys, "query_keys", raw.id);
    for (const key of queryKeys) {
      if (!validQueryKeys.has(key)) {
        throw new Error(
          `Invalid sanity constraint '${raw.id}': unknown sanity query key '${key}'`,
        );
      }
    }

    const definition: SanityConstraintDefinition = {
      id: raw.id,
      name: raw.name,
      category: raw.category,
      description: raw.description,
      queryKeys,
      queryRefs: asStringArray(raw.query_refs, "query_refs", raw.id),
      params: asParamsObject(raw.params, raw.id),
      notes: raw.notes,
    };

    ids.add(definition.id);
    names.add(definition.name);
    definitions.push(definition);
  }

  return definitions;
}

export function getSanityConstraintDefinitions(): SanityConstraintDefinition[] {
  if (cachedDefinitions) return cachedDefinitions;
  const raw = loadRawDefinitions();
  const definitions = validateAndNormalizeDefinitions(raw.constraints);
  cachedDefinitions = definitions;
  return definitions;
}

export function getSanityConstraintDefinitionsByName(): Map<
  string,
  SanityConstraintDefinition
> {
  if (cachedDefinitionsByName) return cachedDefinitionsByName;

  const definitions = getSanityConstraintDefinitions();
  const byName = new Map<string, SanityConstraintDefinition>();
  for (const definition of definitions) {
    byName.set(definition.name, definition);
  }
  cachedDefinitionsByName = byName;
  return byName;
}

export function getSanityConstraintDefinitionSourcePath(): string {
  return CONSTRAINT_FILE_PATH;
}
