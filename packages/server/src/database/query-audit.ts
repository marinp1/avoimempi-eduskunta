import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { QUERY_REGISTRY } from "./sql-registry.generated";

type QueryCoverageKind = "behavior" | "execution" | "pattern";

type QueryUsage = {
  queryFile: string;
  filePath: string;
  runtimeImports: string[];
  testImports: string[];
  coverageKinds: QueryCoverageKind[];
};

export type QueryAuditRecord = QueryUsage & {
  isRuntimeUsed: boolean;
  isTestOnly: boolean;
  isUnimported: boolean;
  needsCoverage: boolean;
};

const DATABASE_DIR = import.meta.dirname;
const SRC_ROOT = join(DATABASE_DIR, "..");
const PACKAGE_ROOT = join(SRC_ROOT, "..");
const TEST_COVERAGE_BY_FILE: Record<string, QueryCoverageKind> = {
  "queries.test.ts": "behavior",
  "runtime-sql-audit.test.ts": "execution",
  "query-sargability.test.ts": "pattern",
};

function walkFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(fullPath) : [fullPath];
  });
}

/**
 * Enumerates every runtime SQL file. Backed by the generated registry
 * (`generate-sql-registry.ts`), which statically imports each
 * `features/<name>/sql/*.sql` file via the same `.sql` text loader the
 * repositories use — so this works identically in dev and in bundled prod
 * builds, with no filesystem access at runtime. Basenames are unique across
 * features, which keeps them usable as the audit/snapshot key.
 */
export function listQueryFiles(): {
  queryFile: string;
  filePath: string;
  sql: string;
}[] {
  return QUERY_REGISTRY.map(({ queryFile, filePath, sql }) => ({
    queryFile,
    filePath,
    sql,
  })).sort((a, b) => a.queryFile.localeCompare(b.queryFile));
}

function extractSqlImports(filePath: string): string[] {
  const source = readFileSync(filePath, "utf8");
  return [...source.matchAll(/from\s+["']([^"']+\.sql)["']/g)].map(
    (match) => match[1]!.split("/").at(-1)!,
  );
}

export function collectServerQueryAudit(): QueryAuditRecord[] {
  const queryFiles = listQueryFiles();

  const serverFiles = walkFiles(PACKAGE_ROOT).filter((filePath) =>
    /\.(ts|tsx)$/.test(filePath),
  );
  const hasGlobalExecutionAudit = serverFiles.some((filePath) =>
    relative(PACKAGE_ROOT, filePath).endsWith(
      "__tests__/runtime-sql-audit.test.ts",
    ),
  );

  const runtimeImports = new Map<string, string[]>();
  const testImports = new Map<string, string[]>();
  const coverageKinds = new Map<string, Set<QueryCoverageKind>>();

  for (const filePath of serverFiles) {
    const relPath = relative(PACKAGE_ROOT, filePath);
    const isTestFile = relPath.includes("__tests__");
    const isScriptFile =
      relPath.startsWith("scripts/") || relPath.includes("/scripts/");
    if (isScriptFile) continue;

    for (const queryFile of extractSqlImports(filePath)) {
      const target = isTestFile ? testImports : runtimeImports;
      const imports = target.get(queryFile) ?? [];
      imports.push(relPath);
      target.set(queryFile, imports);

      if (isTestFile) {
        const coverageKind = TEST_COVERAGE_BY_FILE[relPath.split("/").at(-1)!];
        if (coverageKind) {
          const kinds =
            coverageKinds.get(queryFile) ?? new Set<QueryCoverageKind>();
          kinds.add(coverageKind);
          coverageKinds.set(queryFile, kinds);
        }
      }
    }
  }

  return queryFiles.map(({ queryFile, filePath }) => {
    const runtime = runtimeImports.get(queryFile) ?? [];
    const tests = testImports.get(queryFile) ?? [];
    const kinds = new Set<QueryCoverageKind>(coverageKinds.get(queryFile));
    if (hasGlobalExecutionAudit && runtime.length > 0) {
      kinds.add("execution");
    }

    const coverageKindList = [...kinds].sort();

    return {
      queryFile,
      filePath,
      runtimeImports: runtime.sort(),
      testImports: tests.sort(),
      coverageKinds: coverageKindList,
      isRuntimeUsed: runtime.length > 0,
      isTestOnly: runtime.length === 0 && tests.length > 0,
      isUnimported: runtime.length === 0 && tests.length === 0,
      needsCoverage:
        runtime.length > 0 &&
        !coverageKindList.some(
          (kind) => kind === "behavior" || kind === "execution",
        ),
    };
  });
}

export function summarizeQueryAudit(records: QueryAuditRecord[]) {
  const testOnly = records.filter((record) => record.isTestOnly);
  const unimported = records.filter((record) => record.isUnimported);
  const needsCoverage = records.filter((record) => record.needsCoverage);

  return {
    totalQueries: records.length,
    runtimeQueries: records.filter((record) => record.isRuntimeUsed).length,
    testOnlyQueries: testOnly.map((record) => record.queryFile),
    unimportedQueries: unimported.map((record) => record.queryFile),
    runtimeQueriesNeedingCoverage: needsCoverage.map(
      (record) => record.queryFile,
    ),
  };
}
