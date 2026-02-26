// validate.ts
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

interface ValidationResult {
  totalFiles: number;
  totalKeys: number;
  pkKey: string;
  pkIndex: number;
  duplicates: Map<string, string[]>;
  errors: string[];
  missingPk: string[];
}

async function validateDataset(
  datasetName: string,
  dataDir: "raw" | "parsed" = "raw",
): Promise<ValidationResult> {
  const datasetPath = join("data", dataDir, datasetName);

  const pkToFiles = new Map<string, string[]>();
  const errors: string[] = [];
  const missingPk: string[] = [];

  let pkKey: string | null = null;
  let pkIndex: number = -1;

  try {
    const files = await readdir(datasetPath);
    // Match page_{firstPk12}+{lastPk12}.json — lexicographic sort is correct since names are zero-padded
    const pageFiles = files
      .filter((f) => /^page_\d{12}\+\d{12}\.json$/.test(f))
      .sort();

    console.log(`\n${"=".repeat(60)}`);
    console.log(`Dataset: ${datasetName} (${dataDir})`);
    console.log(`Scanning ${pageFiles.length} files...`);

    for (const [fileIndex, filename] of pageFiles.entries()) {
      try {
        const content = await readFile(join(datasetPath, filename), "utf-8");
        const data = JSON.parse(content);

        // Get pkName from first valid file
        if (pkKey === null) {
          if (!data.pkName) {
            errors.push(`${filename}: Missing 'pkName' field`);
            continue;
          }
          if (!data.columnNames || !Array.isArray(data.columnNames)) {
            errors.push(`${filename}: Missing or invalid 'columnNames' field`);
            continue;
          }

          pkKey = data.pkName;
          pkIndex = data.columnNames.indexOf(pkKey);

          if (pkIndex === -1) {
            errors.push(
              `${filename}: pkName '${pkKey}' not found in columnNames`,
            );
            pkKey = null;
            continue;
          }

          console.log(`Primary key: ${pkKey} (column index: ${pkIndex})`);
          console.log(`Columns: ${data.columnNames.join(", ")}`);
        }

        // Validate structure
        if (!data.rowData || !Array.isArray(data.rowData)) {
          errors.push(`${filename}: Missing or invalid 'rowData' field`);
          continue;
        }

        const isLastPage = fileIndex === pageFiles.length - 1;
        if (!isLastPage && data.rowData.length !== 100) {
          errors.push(
            `${filename}: Expected exactly 100 entries for non-final page, found ${data.rowData.length}`,
          );
        }

        // Process each row
        for (let i = 0; i < data.rowData.length; i++) {
          const row = data.rowData[i];

          if (!Array.isArray(row)) {
            errors.push(`${filename}: Row ${i} is not an array`);
            continue;
          }

          if (row.length <= pkIndex) {
            missingPk.push(
              `${filename}: Row ${i} doesn't have enough columns (has ${row.length}, needs ${pkIndex + 1})`,
            );
            continue;
          }

          const pkValue = String(row[pkIndex]);

          if (!pkValue || pkValue === "null" || pkValue === "undefined") {
            missingPk.push(`${filename}: Row ${i} has null/empty pk value`);
            continue;
          }

          const existing = pkToFiles.get(pkValue) || [];
          existing.push(filename);
          pkToFiles.set(pkValue, existing);
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          errors.push(`${filename}: Invalid JSON - ${e.message}`);
        } else {
          errors.push(`${filename}: ${e}`);
        }
      }
    }

    if (!pkKey) {
      throw new Error("Could not determine pkKey - no valid files found");
    }

    // Find duplicates
    const duplicates = new Map(
      Array.from(pkToFiles.entries()).filter(([_, files]) => files.length > 1),
    );

    // Report
    console.log(`Total files: ${pageFiles.length}`);
    console.log(
      `Total rows processed: ${Array.from(pkToFiles.values()).flat().length}`,
    );
    console.log(`Unique keys: ${pkToFiles.size}`);
    console.log(`Duplicates: ${duplicates.size}`);

    if (duplicates.size > 0) {
      console.log(`\n=== DUPLICATE KEYS (showing first 10) ===`);
      let count = 0;
      for (const [pk, files] of duplicates) {
        if (count++ >= 10) break;
        console.log(
          `  ${pk}: appears in ${files.length} files - ${files.join(", ")}`,
        );
      }
      if (duplicates.size > 10) {
        console.log(`  ... and ${duplicates.size - 10} more`);
      }
    }

    if (missingPk.length > 0) {
      console.log(
        `\n=== MISSING/INVALID PRIMARY KEYS (${missingPk.length}) ===`,
      );
      missingPk.slice(0, 10).forEach((err) => console.log(`  ${err}`));
      if (missingPk.length > 10) {
        console.log(`  ... and ${missingPk.length - 10} more`);
      }
    }

    if (errors.length > 0) {
      console.log(`\n=== ERRORS (${errors.length}) ===`);
      errors.slice(0, 10).forEach((err) => console.log(`  ${err}`));
      if (errors.length > 10) {
        console.log(`  ... and ${errors.length - 10} more`);
      }
    }

    return {
      totalFiles: pageFiles.length,
      totalKeys: pkToFiles.size,
      pkKey,
      pkIndex,
      duplicates,
      errors,
      missingPk,
    };
  } catch (e) {
    console.error(`Failed to read dataset: ${e}`);
    throw e;
  }
}

// Check for file size anomalies
async function findAnomalies(
  datasetName: string,
  dataDir: "raw" | "parsed" = "raw",
) {
  const datasetPath = join("data", dataDir, datasetName);
  const files = await readdir(datasetPath);
  const pageFiles = files.filter((f) => /^page_\d{12}\+\d{12}\.json$/.test(f));

  const sizes: [string, number][] = [];
  for (const filename of pageFiles) {
    const file = Bun.file(join(datasetPath, filename));
    sizes.push([filename, file.size]);
  }

  if (sizes.length === 0) return;

  const avgSize =
    sizes.reduce((sum, [_, size]) => sum + size, 0) / sizes.length;

  console.log(`\n=== FILE SIZE ANOMALIES ===`);
  console.log(`Average file size: ${(avgSize / 1024).toFixed(2)} KB`);

  const small = sizes
    .filter(([_, size]) => size < avgSize * 0.1)
    .sort((a, b) => a[1] - b[1]);
  if (small.length > 0) {
    console.log(`\nSuspiciously small (< 10% of average):`);
    small.slice(0, 10).forEach(([name, size]) => {
      console.log(`  ${name}: ${(size / 1024).toFixed(2)} KB`);
    });
  }

  const large = sizes
    .filter(([_, size]) => size > avgSize * 3)
    .sort((a, b) => b[1] - a[1]);
  if (large.length > 0) {
    console.log(`\nSuspiciously large (> 3x average):`);
    large.slice(0, 10).forEach(([name, size]) => {
      console.log(`  ${name}: ${(size / 1024).toFixed(2)} KB`);
    });
  }
}

// Auto-discover all datasets
async function discoverDatasets(
  dataDir: "raw" | "parsed" = "raw",
): Promise<string[]> {
  const basePath = join("data", dataDir);
  const entries = await readdir(basePath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

// Parse command line arguments
const args = process.argv.slice(2);
const dataDir: "raw" | "parsed" = args.includes("--parsed") ? "parsed" : "raw";
const requestedDatasets = args.filter((arg) => !arg.startsWith("--"));

// Main execution
let datasetsToValidate: string[];

if (requestedDatasets.length > 0) {
  // Validate specific datasets
  datasetsToValidate = requestedDatasets;
  console.log(`Validating datasets: ${datasetsToValidate.join(", ")}\n`);
} else {
  // Discover and validate all datasets
  datasetsToValidate = await discoverDatasets(dataDir);
  console.log(
    `Found ${datasetsToValidate.length} datasets: ${datasetsToValidate.join(", ")}\n`,
  );
}

const allResults: (ValidationResult & { dataset: string })[] = [];

for (const datasetName of datasetsToValidate) {
  try {
    const result = await validateDataset(datasetName, dataDir);
    allResults.push({ dataset: datasetName, ...result });
    await findAnomalies(datasetName, dataDir);
  } catch (e) {
    console.error(`Skipping ${datasetName}: ${e}`);
  }
}

// Summary
console.log(`\n${"=".repeat(60)}`);
console.log("SUMMARY");
console.log("=".repeat(60));
for (const result of allResults) {
  const status =
    result.duplicates.size === 0 && result.errors.length === 0 ? "✓" : "✗";
  console.log(
    `${status} ${result.dataset.padEnd(30)} | PK: ${result.pkKey.padEnd(15)} | ` +
      `Files: ${result.totalFiles.toString().padStart(5)} | ` +
      `Keys: ${result.totalKeys.toString().padStart(6)} | ` +
      `Dupes: ${result.duplicates.size.toString().padStart(4)} | ` +
      `Errors: ${result.errors.length}`,
  );
}

// Save detailed results
const outputFilename =
  requestedDatasets.length === 1
    ? `validation-${requestedDatasets[0]}.json`
    : "validation-results.json";

await Bun.write(
  outputFilename,
  JSON.stringify(
    allResults.map((r) => ({
      dataset: r.dataset,
      pkKey: r.pkKey,
      pkIndex: r.pkIndex,
      totalFiles: r.totalFiles,
      totalKeys: r.totalKeys,
      duplicateCount: r.duplicates.size,
      errorCount: r.errors.length,
      duplicates: Array.from(r.duplicates.entries()),
      errors: r.errors,
      missingPk: r.missingPk,
    })),
    null,
    2,
  ),
);

console.log(`\nDetailed results saved to ${outputFilename}`);
