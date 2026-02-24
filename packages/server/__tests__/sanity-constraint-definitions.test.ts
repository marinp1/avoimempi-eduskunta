import type { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SanityCheckService } from "../services/sanity-checks";
import {
  getSanityConstraintDefinitionSourcePath,
  getSanityConstraintDefinitions,
} from "../services/sanity-constraint-definitions";
import { createTestDb, seedFullDataset } from "./helpers/setup-db";

let db: Database;

beforeAll(() => {
  db = createTestDb();
  seedFullDataset(db);
});

afterAll(() => {
  db.close();
});

describe("Sanity constraint definitions", () => {
  test("yaml declares schema and schema file is valid JSON", () => {
    const yamlPath = getSanityConstraintDefinitionSourcePath();
    const yamlText = readFileSync(yamlPath, "utf8");
    const firstLine = yamlText.split("\n")[0];

    expect(firstLine).toContain("yaml-language-server");
    expect(firstLine).toContain("sanity-constraints.schema.json");

    const schemaPath = join(
      import.meta.dirname,
      "../config/sanity-constraints.schema.json",
    );
    const parsedSchema = JSON.parse(readFileSync(schemaPath, "utf8")) as {
      type?: string;
      properties?: Record<string, unknown>;
    };

    expect(parsedSchema.type).toBe("object");
    expect(parsedSchema.properties).toBeDefined();
    expect(parsedSchema.properties?.constraints).toBeDefined();
  });

  test("loads definitions from YAML source file", () => {
    const definitions = getSanityConstraintDefinitions();
    const sourcePath = getSanityConstraintDefinitionSourcePath();

    expect(sourcePath.endsWith("sanity-constraints.yaml")).toBe(true);
    expect(definitions.length).toBeGreaterThan(0);
  });

  test("all emitted sanity checks are defined in YAML", async () => {
    const service = new SanityCheckService(db);
    const result = await service.runAllChecks();
    const definitions = getSanityConstraintDefinitions();
    const emittedNames = new Set(result.checks.map((check) => check.name));
    const definitionNames = new Set(
      definitions.map((definition) => definition.name),
    );

    const missingDefinition = result.checks.filter(
      (check) => !check.constraintId,
    );
    const unusedDefinitions = [...definitionNames].filter(
      (name) => !emittedNames.has(name),
    );

    expect(missingDefinition).toEqual([]);
    expect(unusedDefinitions).toEqual([]);
  });

  test("constraint params are loaded and reflected in check output", async () => {
    const definitions = getSanityConstraintDefinitions();
    const parliamentSizeDefinition = definitions.find(
      (definition) => definition.name === "Parliament size limit",
    );

    expect(parliamentSizeDefinition?.params.max_members).toBe(200);

    const service = new SanityCheckService(db);
    const result = await service.runAllChecks();
    const parliamentSizeCheck = result.checks.find(
      (check) => check.name === "Parliament size limit",
    );

    expect(parliamentSizeCheck?.details).toContain("200");
  });
});
