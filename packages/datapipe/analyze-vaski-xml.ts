#!/usr/bin/env bun
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { XMLParser } from "fast-xml-parser";

interface VaskiRecord {
  Id: string;
  XmlData: string;
  Status: string;
  Created: string;
  Eduskuntatunnus: string;
  AttachmentGroupId: string;
  Imported: string;
}

interface VaskiDataFile {
  columnNames: string[];
  pkName: string;
  pkLastValue: number;
  rowData: VaskiRecord[];
}

// Store parsed data in batches to avoid memory issues
const schemaFields = new Map<string, Set<string>>();
let totalRecordsProcessed = 0;
const documentTypeCounters = new Map<
  string,
  Map<string, Map<string, Map<string, number>>>
>(); // Counter per yhteisoTeksti -> kokousTunnus -> rakenneAsiakirja -> documentType
const documentTypeStats = new Map<string, Map<string, number>>(); // Track count per rakenneAsiakirja -> documentType
const rakenneAsiakirjaStats = new Map<string, number>(); // Track count per rakenneAsiakirja type

// Initialize XML parser
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  ignoreDeclaration: true,
  removeNSPrefix: false,
  parseAttributeValue: false,
  parseTagValue: false,
  trimValues: true,
});

// Track conflicts globally
const keyConflicts = new Map<
  string,
  Array<{ originalKeys: string[]; location: string }>
>();

// Remove namespace prefixes from keys (e.g., "ns11:Siirto" → "Siirto", "@_met1:asiakirjatyyppiNimi" → "@_asiakirjatyyppiNimi")
function removePrefix(key: string): string {
  // Handle attribute prefixes (@_ns:key → @_key)
  if (key.startsWith("@_")) {
    const match = key.match(/^@_[^:]+:(.+)$/);
    if (match) {
      return `@_${match[1]}`;
    }
    return key;
  }

  // Handle regular namespace prefixes (ns:key → key)
  const colonIndex = key.indexOf(":");
  if (colonIndex > 0) {
    return key.substring(colonIndex + 1);
  }

  return key;
}

// Clean XML parser artifacts and remove namespace prefixes
function cleanParsedXml(obj: any, path: string = "root"): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item, index) => cleanParsedXml(item, `${path}[${index}]`));
  }

  // Handle non-objects (primitives)
  if (typeof obj !== "object") {
    return obj;
  }

  // Handle objects with #text and @_xmlns:ns pattern
  if (obj["#text"] !== undefined && typeof obj["#text"] !== "object") {
    // If it only has #text and xmlns attributes, return just the text value
    const keys = Object.keys(obj);
    const hasOnlyTextAndXmlns = keys.every(
      (k) => k === "#text" || k.startsWith("@_xmlns"),
    );

    if (hasOnlyTextAndXmlns) {
      return obj["#text"];
    }
  }

  // Check for key conflicts after prefix removal
  const keyMapping = new Map<string, string[]>(); // cleanKey -> [originalKeys]

  for (const key in obj) {
    // Skip xmlns namespace declarations
    if (key.startsWith("@_xmlns")) {
      continue;
    }

    const cleanKey = removePrefix(key);
    if (!keyMapping.has(cleanKey)) {
      keyMapping.set(cleanKey, []);
    }
    keyMapping.get(cleanKey)?.push(key);
  }

  // Detect conflicts
  const conflicts: string[] = [];
  for (const [cleanKey, originalKeys] of keyMapping.entries()) {
    if (originalKeys.length > 1) {
      conflicts.push(cleanKey);

      // Track conflict globally
      if (!keyConflicts.has(path)) {
        keyConflicts.set(path, []);
      }
      keyConflicts.get(path)?.push({
        originalKeys: [...originalKeys],
        location: path,
      });
    }
  }

  // Recursively clean all properties
  const cleaned: any = {};
  for (const key in obj) {
    // Skip xmlns namespace declarations
    if (key.startsWith("@_xmlns")) {
      continue;
    }

    const cleanKey = removePrefix(key);

    // Handle #text specially - if there are other meaningful properties, keep it
    if (key === "#text") {
      const otherKeys = Object.keys(obj).filter(
        (k) => k !== "#text" && !k.startsWith("@_xmlns"),
      );

      // If there are other meaningful properties, keep #text as a property
      if (otherKeys.length > 0) {
        cleaned[cleanKey] = cleanParsedXml(obj[key], `${path}.${cleanKey}`);
      }
      // Otherwise, this case is handled above
    } else {
      // Check if this key is part of a conflict
      const originalKeys = keyMapping.get(cleanKey)!;
      if (originalKeys.length > 1) {
        // Handle conflict by keeping the first occurrence and merging or warning
        // For now, we'll keep the last value but this is where you'd handle conflicts
        // You might want to merge arrays, create nested objects, etc.
        console.warn(
          `⚠️  Key conflict at ${path}: ${originalKeys.join(", ")} → ${cleanKey}`,
        );
      }

      cleaned[cleanKey] = cleanParsedXml(obj[key], `${path}.${cleanKey}`);
    }
  }

  return cleaned;
}

// Progress bar utilities
class ProgressBar {
  private current = 0;
  private readonly total: number;
  private readonly width = 40;
  private readonly label: string;
  private lastUpdateTime = Date.now();

  constructor(total: number, label: string) {
    this.total = total;
    this.label = label;
  }

  update(value: number) {
    this.current = value;
    const now = Date.now();
    // Update every 100ms to avoid excessive console writes
    if (now - this.lastUpdateTime < 100 && value < this.total) {
      return;
    }
    this.lastUpdateTime = now;
    this.render();
  }

  increment() {
    this.update(this.current + 1);
  }

  private render() {
    const percentage = Math.min(100, (this.current / this.total) * 100);
    const filled = Math.floor((this.width * this.current) / this.total);
    const empty = this.width - filled;
    const bar = "█".repeat(filled) + "░".repeat(empty);
    const line = `${this.label}: [${bar}] ${this.current}/${this.total} (${percentage.toFixed(1)}%)`;

    // Clear line and write progress
    process.stdout.write(`\r${" ".repeat(100)}\r`);
    process.stdout.write(line);

    if (this.current >= this.total) {
      process.stdout.write("\n");
    }
  }

  complete() {
    this.update(this.total);
  }
}

async function parseVaskiFile(
  filePath: string,
  outputDir: string,
  samplesData: any[],
  progressBar: ProgressBar,
  fieldOccurrences: Map<string, number>,
) {
  try {
    // Check file size first
    const stats = await stat(filePath);
    if (stats.size === 0) {
      console.log(`Skipping empty file: ${filePath}`);
      return;
    }

    const content = await readFile(filePath, "utf-8");
    const data: VaskiDataFile = JSON.parse(content);

    for (const record of data.rowData) {
      try {
        // Parse XML to JSON
        const parsed = parser.parse(record.XmlData);

        // Clean XML parser artifacts (remove @_xmlns:ns, convert #text)
        const cleanedParsed = cleanParsedXml(parsed);

        const contents = cleanedParsed;

        // All namespace prefixes are now removed, so we can access directly
        let metatieto =
          contents?.Siirto?.SiirtoMetatieto ??
          contents?.Siirto?.JulkaisuMetatieto;

        if (metatieto?.JulkaisuMetatieto) {
          metatieto = metatieto.JulkaisuMetatieto;
        }

        // Skip entries with Swedish language code (sv)
        const languageCode = metatieto?.["@_kieliKoodi"];
        if (languageCode === "sv") {
          progressBar.increment();
          continue;
        }

        const sanomaName = contents?.Siirto?.Sanomavalitys?.SanomatyyppiNimi;

        if (sanomaName?.endsWith("_sv")) {
          console.log("Skipping due to name", sanomaName);
          progressBar.increment();
          continue;
        }

        const parsedRecord = {
          id: record.Id,
          eduskuntaTunnus: record.Eduskuntatunnus,
          status: record.Status,
          created: record.Created,
          attachmentGroupId: record.AttachmentGroupId,
          contents: contents,
        };

        totalRecordsProcessed++;

        // Track all field paths for schema generation
        extractFields(contents, "");

        // Count field occurrences
        const occurrences = countFieldOccurrences(parsedRecord.contents);
        for (const [path, count] of occurrences) {
          fieldOccurrences.set(path, (fieldOccurrences.get(path) || 0) + count);
        }

        // Save to samples array (first 10 records only)
        if (samplesData.length < 10) {
          samplesData.push(parsedRecord);
        }

        // Extract YhteisoTeksti for first-level grouping
        // Path: Siirto.SiirtoMetatieto.JulkaisuMetatieto.KokousViite.YhteisoTeksti
        const kokousViite = metatieto?.KokousViite;
        let yhteisoTeksti = kokousViite?.YhteisoTeksti || "no-yhteiso";

        // Sanitize yhteisoTeksti for use as folder name
        yhteisoTeksti = yhteisoTeksti
          .replace(/[/\\?%*:|"<>]/g, "-")
          .replace(/\s+/g, "_");

        // Extract kokousTunnus for second-level grouping
        // Path: Siirto.SiirtoMetatieto.JulkaisuMetatieto.KokousViite.@_kokousTunnus
        let kokousTunnus = kokousViite?.["@_kokousTunnus"] || "no-kokous";

        // Sanitize kokousTunnus for use as folder name
        kokousTunnus = kokousTunnus
          .replace(/[/\\?%*:|"<>]/g, "-")
          .replace(/\s+/g, "_");

        // Extract AsiakirjatyyppiNimi for second-level grouping
        // Path: Siirto.SiirtoMetatieto.JulkaisuMetatieto.IdentifiointiOsa.AsiakirjatyyppiNimi
        const siirtoAsiakirja = contents?.Siirto?.SiirtoAsiakirja;
        const rakenneAsiakirjaRaw = siirtoAsiakirja?.RakenneAsiakirja;
        if (rakenneAsiakirjaRaw) {
          if (Object.keys(rakenneAsiakirjaRaw).length !== 1) {
            throw new Error("More than one key in RakenneAsiakirja");
          }
        }

        // Use AsiakirjatyyppiNimi as the secondary grouping, default to "Unknown"
        let rakenneAsiakirjaType =
          Object.keys(rakenneAsiakirjaRaw ?? {})[0] || "Unknown";

        // Sanitize folder name (remove/replace invalid characters)
        rakenneAsiakirjaType = rakenneAsiakirjaType
          .replace(/[/\\?%*:|"<>]/g, "-")
          .replace(/\s+/g, "_");

        // Track RakenneAsiakirja statistics
        rakenneAsiakirjaStats.set(
          rakenneAsiakirjaType,
          (rakenneAsiakirjaStats.get(rakenneAsiakirjaType) || 0) + 1,
        );

        // Extract document type for third-level subdivision
        let asiakirjatyyppiNimi = metatieto?.["@_asiakirjatyyppiNimi"];

        // If not found in metadata, try alternative location in SiirtoAsiakirja
        if (!asiakirjatyyppiNimi) {
          // Try different possible paths for the nested structure
          const kasittelytiedot =
            rakenneAsiakirjaRaw?.KasittelytiedotValtiopaivaasia ||
            rakenneAsiakirjaRaw?.Kasittelytiedot ||
            rakenneAsiakirjaRaw?.KasittelytiedotLausumaasia ||
            rakenneAsiakirjaRaw;
          asiakirjatyyppiNimi = kasittelytiedot?.["@_asiakirjatyyppiNimi"];
        }

        // Use document type as folder name, or "unknown" if not found
        let documentType = asiakirjatyyppiNimi || "unknown";

        // Sanitize folder name (remove/replace invalid characters)
        documentType = documentType
          .replace(/[/\\?%*:|"<>]/g, "-")
          .replace(/\s+/g, "_")
          .toLowerCase();

        // Track statistics per rakenneAsiakirja -> document type
        if (!documentTypeStats.has(rakenneAsiakirjaType)) {
          documentTypeStats.set(rakenneAsiakirjaType, new Map());
        }
        const docTypeMap = documentTypeStats.get(rakenneAsiakirjaType)!;
        docTypeMap.set(documentType, (docTypeMap.get(documentType) || 0) + 1);

        // Get or initialize counter for this yhteisoTeksti -> kokousTunnus -> rakenneAsiakirja -> document type
        if (!documentTypeCounters.has(yhteisoTeksti)) {
          documentTypeCounters.set(yhteisoTeksti, new Map());
        }
        const yhteisoCounters = documentTypeCounters.get(yhteisoTeksti)!;
        if (!yhteisoCounters.has(kokousTunnus)) {
          yhteisoCounters.set(kokousTunnus, new Map());
        }
        const kokousCounters = yhteisoCounters.get(kokousTunnus)!;
        if (!kokousCounters.has(rakenneAsiakirjaType)) {
          kokousCounters.set(rakenneAsiakirjaType, new Map());
        }
        const counterMap = kokousCounters.get(rakenneAsiakirjaType)!;
        const currentCounter = counterMap.get(documentType) || 0;
        counterMap.set(documentType, currentCounter + 1);

        // Write individual file to subdirectory: yhteisoTeksti/kokousTunnus/rakenneAsiakirjaType/documentType/
        const subdirPath = join(
          outputDir,
          yhteisoTeksti,
          kokousTunnus,
          rakenneAsiakirjaType,
          documentType,
        );

        if (!existsSync(subdirPath)) {
          await mkdir(subdirPath, { recursive: true });
        }

        const filename = `entry-${currentCounter.toString().padStart(5, "0")}.json`;
        const outputPath = join(subdirPath, filename);
        await writeFile(outputPath, JSON.stringify(parsedRecord, null, 2));

        if (totalRecordsProcessed % 100 === 0) {
          console.log(`\nWritten ${totalRecordsProcessed} entries`);
        }

        progressBar.increment();
      } catch (error) {
        console.error(`\nError parsing XML for record ${record.Id}:`, error);
      }
    }
  } catch (error) {
    console.error(`\nError reading file ${filePath}:`, error);
  }
}

// Recursively extract field paths
function extractFields(obj: any, prefix: string) {
  if (!obj || typeof obj !== "object") return;

  for (const key in obj) {
    const fullPath = prefix ? `${prefix}.${key}` : key;

    // Get type of value
    const value = obj[key];
    let type: string = typeof value;
    if (Array.isArray(value)) {
      type = "array";
    } else if (value === null) {
      type = "null";
    } else if (typeof value === "object") {
      type = "object";
    }

    if (!schemaFields.has(fullPath)) {
      schemaFields.set(fullPath, new Set());
    }
    schemaFields.get(fullPath)?.add(type);

    // Recurse into objects and arrays
    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((item) => extractFields(item, fullPath));
      } else {
        extractFields(value, fullPath);
      }
    }
  }
}

// Generate JSON Schema from analyzed fields
function generateSchema(fieldOccurrences: Map<string, number>) {
  const schema: any = {
    $schema: "http://json-schema.org/draft-07/schema#",
    title: "VaskiData XML Schema",
    description: "Generated schema from all VaskiData XML files",
    type: "object",
    totalRecords: totalRecordsProcessed,
    fields: {},
  };

  // Sort fields by path for readability
  const sortedFields = Array.from(schemaFields.entries()).sort(([a], [b]) =>
    a.localeCompare(b),
  );

  for (const [path, types] of sortedFields) {
    const occurrences = fieldOccurrences.get(path) || 0;

    schema.fields[path] = {
      types: Array.from(types).sort(),
      occurrences: occurrences,
      totalRecords: totalRecordsProcessed,
      percentage: `${((occurrences / totalRecordsProcessed) * 100).toFixed(2)}%`,
    };
  }

  return schema;
}

// Count field occurrences efficiently
function countFieldOccurrences(parsedData: any): Map<string, number> {
  const occurrences = new Map<string, number>();

  function traverse(obj: any, prefix: string) {
    if (!obj || typeof obj !== "object") return;

    for (const key in obj) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      occurrences.set(fullPath, (occurrences.get(fullPath) || 0) + 1);

      const value = obj[key];
      if (typeof value === "object" && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item) => traverse(item, fullPath));
        } else {
          traverse(value, fullPath);
        }
      }
    }
  }

  traverse(parsedData, "");
  return occurrences;
}

async function main() {
  const dataDir = join(process.cwd(), "data", "parsed", "VaskiData");
  console.log(`Reading VaskiData from: ${dataDir}\n`);

  const files = await readdir(dataDir);
  const jsonFiles = files
    .filter((f) => f.endsWith(".json"))
    .sort((a, b) => {
      const numA = parseInt(a.match(/page_(\d+)\.json/)?.[1] || "0", 10);
      const numB = parseInt(b.match(/page_(\d+)\.json/)?.[1] || "0", 10);
      return numA - numB;
    });

  console.log(`Found ${jsonFiles.length} files\n`);

  // Count total records first for progress bar
  console.log("Counting total records...");
  let totalRecords = 0;
  for (const file of jsonFiles) {
    try {
      const filePath = join(dataDir, file);
      const stats = await stat(filePath);
      if (stats.size > 0) {
        const content = await readFile(filePath, "utf-8");
        const data: VaskiDataFile = JSON.parse(content);
        totalRecords += data.rowData.length;
      }
    } catch (error) {
      console.error(`Error counting records in ${file}:`, error);
    }
  }
  console.log(`Total records to process: ${totalRecords}\n`);

  // Create output directories
  const outputDir = join(process.cwd(), "vaski-data");
  if (!existsSync(outputDir)) {
    await mkdir(outputDir, { recursive: true });
  }

  const samplesData: any[] = [];
  const fieldOccurrences = new Map<string, number>();

  const progressBar = new ProgressBar(totalRecords, "Processing records");

  // Process all files
  for (const file of jsonFiles) {
    await parseVaskiFile(
      join(dataDir, file),
      outputDir,
      samplesData,
      progressBar,
      fieldOccurrences,
    );
  }

  progressBar.complete();

  console.log(`\nProcessed ${totalRecordsProcessed} records total\n`);

  // Generate schema
  console.log("Generating schema...");
  const schema = generateSchema(fieldOccurrences);

  // Write schema to file
  const schemaPath = join(process.cwd(), "vaski-schema.json");
  await writeFile(schemaPath, JSON.stringify(schema, null, 2));
  console.log(`Schema written to: ${schemaPath}`);

  // Write samples to file
  const samplesPath = join(process.cwd(), "vaski-samples.json");
  await writeFile(samplesPath, JSON.stringify(samplesData, null, 2));
  console.log(`Sample data written to: ${samplesPath}`);

  console.log(`All parsed data written to: ${outputDir}/`);

  // Print summary
  console.log(`\n=== SUMMARY ===`);
  console.log(`Total records processed: ${totalRecordsProcessed}`);
  console.log(`Total unique field paths: ${schemaFields.size}`);

  console.log(
    `\nRakenneAsiakirja types found (${rakenneAsiakirjaStats.size}):`,
  );

  // Sort by count descending
  const sortedRakenneTypes = Array.from(rakenneAsiakirjaStats.entries()).sort(
    ([, a], [, b]) => b - a,
  );

  for (const [rakenneType, count] of sortedRakenneTypes) {
    const percentage = ((count / totalRecordsProcessed) * 100).toFixed(2);
    console.log(`\n  ${rakenneType}: ${count} (${percentage}%)`);

    // Show document types under this RakenneAsiakirja type
    const docTypes = documentTypeStats.get(rakenneType);
    if (docTypes) {
      const sortedDocTypes = Array.from(docTypes.entries()).sort(
        ([, a], [, b]) => b - a,
      );

      for (const [docType, docCount] of sortedDocTypes) {
        const docPercentage = ((docCount / count) * 100).toFixed(2);
        console.log(
          `    - ${docType}: ${docCount} (${docPercentage}% of ${rakenneType})`,
        );
      }
    }
  }

  console.log(`\nTop-level fields found:`);

  const topLevelFields = Array.from(schemaFields.keys())
    .filter((k) => !k.includes("."))
    .sort();

  for (const field of topLevelFields) {
    const types = schemaFields.get(field);
    console.log(`  - ${field}: ${Array.from(types!).join(", ")}`);
  }

  // Report key conflicts
  if (keyConflicts.size > 0) {
    console.log(`\n=== KEY CONFLICTS DETECTED ===`);
    console.log(`Total locations with conflicts: ${keyConflicts.size}\n`);

    // Collect all unique conflict patterns
    const conflictPatterns = new Map<string, number>();

    for (const [_location, conflicts] of keyConflicts.entries()) {
      for (const conflict of conflicts) {
        const pattern = conflict.originalKeys.sort().join(" + ");
        conflictPatterns.set(pattern, (conflictPatterns.get(pattern) || 0) + 1);
      }
    }

    console.log(`Unique conflict patterns (${conflictPatterns.size}):`);
    const sortedPatterns = Array.from(conflictPatterns.entries()).sort(
      ([, a], [, b]) => b - a,
    );

    for (const [pattern, count] of sortedPatterns) {
      console.log(`  - ${pattern}: ${count} occurrences`);
    }

    // Write detailed conflict report to file
    const conflictsPath = join(process.cwd(), "vaski-conflicts.json");
    const conflictReport = {
      summary: {
        totalLocations: keyConflicts.size,
        uniquePatterns: conflictPatterns.size,
        patterns: Object.fromEntries(sortedPatterns),
      },
      details: Object.fromEntries(
        Array.from(keyConflicts.entries()).map(([location, conflicts]) => [
          location,
          conflicts.map((c) => c.originalKeys),
        ]),
      ),
    };
    await writeFile(conflictsPath, JSON.stringify(conflictReport, null, 2));
    console.log(`\nDetailed conflict report written to: ${conflictsPath}`);
  } else {
    console.log(`\n✓ No key conflicts detected after prefix removal`);
  }
}

main().catch(console.error);
