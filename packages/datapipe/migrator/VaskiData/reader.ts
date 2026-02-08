import { readdir } from "node:fs/promises";
import { join } from "node:path";

export interface VaskiEntry {
  id: string;
  eduskuntaTunnus: string;
  status: string;
  created: string;
  attachmentGroupId: string | null;
  contents: {
    Siirto: {
      Sanomavalitys?: Record<string, any>;
      SiirtoMetatieto?: Record<string, any>;
      SiirtoAsiakirja?: Record<string, any>;
      SiirtoTiedosto?: Record<string, any>;
    };
  };
}

function getDocumentTypeName(entry: VaskiEntry): string | null {
  try {
    const meta = entry.contents?.Siirto?.SiirtoMetatieto;
    const julkaisu = meta?.JulkaisuMetatieto ?? meta?.SiirtoMetatieto;
    const ident = julkaisu?.IdentifiointiOsa;
    return ident?.AsiakirjatyyppiNimi ?? null;
  } catch {
    return null;
  }
}

/**
 * Score an entry by content richness. Higher = better.
 * Entries with actual RakenneAsiakirja content are preferred over metadata-only entries.
 */
function scoreEntry(entry: VaskiEntry): number {
  let score = 0;
  const ra = entry.contents?.Siirto?.SiirtoAsiakirja?.RakenneAsiakirja;
  if (ra && typeof ra === "object") {
    const contentKeys = Object.keys(ra).filter(k => !k.startsWith("@_"));
    score += contentKeys.length * 10;
  }
  // Entries with real author names score higher
  const meta = entry.contents?.Siirto?.SiirtoMetatieto;
  const julkaisu = meta?.JulkaisuMetatieto ?? meta?.SiirtoMetatieto;
  const henkilo = julkaisu?.IdentifiointiOsa?.Toimija?.Henkilo;
  if (henkilo?.SukuNimi && typeof henkilo.SukuNimi === "string") {
    score += 5;
  }
  return score;
}

async function* walkEntryFiles(dir: string): AsyncGenerator<string> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkEntryFiles(fullPath);
    } else if (entry.name.startsWith("entry-") && entry.name.endsWith(".json")) {
      yield fullPath;
    }
  }
}

/**
 * Read and deduplicate vaski files.
 * Multiple entries can exist for the same eduskuntaTunnus (e.g. content vs processing metadata).
 * We collect all matching entries, deduplicate by eduskuntaTunnus keeping the richest one,
 * then yield the results.
 */
export async function* readVaskiFiles(
  baseDir: string,
  documentTypeFilter?: Set<string>,
): AsyncGenerator<VaskiEntry> {
  let processed = 0;
  let matched = 0;

  // Collect best entry per eduskuntaTunnus
  const bestEntries = new Map<string, { entry: VaskiEntry; score: number }>();

  for await (const filePath of walkEntryFiles(baseDir)) {
    processed++;
    try {
      const file = Bun.file(filePath);
      const entry: VaskiEntry = await file.json();

      if (documentTypeFilter) {
        const typeName = getDocumentTypeName(entry);
        if (!typeName || !documentTypeFilter.has(typeName)) {
          continue;
        }
      }

      matched++;
      if (matched % 2000 === 0) {
        console.log(`  Vaski: ${matched} matched / ${processed} scanned`);
      }

      const key = entry.eduskuntaTunnus;
      const score = scoreEntry(entry);
      const existing = bestEntries.get(key);
      if (!existing || score > existing.score) {
        bestEntries.set(key, { entry, score });
      }
    } catch (err) {
      console.warn(`  Warning: Failed to parse ${filePath}: ${err}`);
    }
  }

  console.log(`  Vaski scan complete: ${matched} matched / ${processed} total files -> ${bestEntries.size} unique documents`);

  for (const { entry } of bestEntries.values()) {
    yield entry;
  }
}
