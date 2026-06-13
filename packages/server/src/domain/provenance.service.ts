import { fetchedAt, formatFiDateTime } from "#server/helpers";
import type { TraceRepository } from "#server/database/trace.repository";
import type {
  CiteProps,
  SourceNoteOptions,
} from "#server/components/provenance";
import { SOURCE_LINEAGE } from "#constants/SourceLineage";
import { querySourcesFor } from "#server/database/query-provenance";
import { TABLE_META, type ProvenanceInfo } from "./provenance";

function validIso(ts: string | null | undefined): string | null {
  if (!ts) return null;
  if (ts.startsWith("1970-01-01")) return null;
  return ts;
}

const API_BASE = "https://avoindata.eduskunta.fi/api/v1/tables";
const EDK_API_BASE = "https://api.eduskunta.fi/api/v1/asiakirjat/edktunnus";
const DATASET_PREFIX = "Eduskunnan avoin data";

/**
 * Combines several source datasets into one label without repeating the shared
 * "Eduskunnan avoin data ·" prefix — e.g. "Eduskunnan avoin data · Vote + MemberOfParliament".
 */
function combinedDataset(displayNames: string[]): string | undefined {
  if (!displayNames.length) return undefined;
  const suffixes = [
    ...new Set(
      displayNames.map((name) => {
        const idx = name.indexOf("·");
        return idx >= 0 ? name.slice(idx + 1).trim() : name.trim();
      }),
    ),
  ];
  return `${DATASET_PREFIX} · ${suffixes.join(" + ")}`;
}

/** Deep link to a single source record. */
function buildRecordUrl(
  sourceTable: string,
  pkName: string,
  pkValue: string | number,
): string {
  if (sourceTable === "edk-documents") {
    return `${EDK_API_BASE}/${String(pkValue)}/pdf`;
  }
  const params = new URLSearchParams({
    pkName,
    pkStartValue: String(pkValue),
    perPage: "1",
  });
  return `${API_BASE}/${sourceTable}/batch?${params.toString()}`;
}

/** Resolve the API host for a source table's provenance chain. */
function sourceHost(sourceTable: string): string {
  return sourceTable === "edk-documents"
    ? "api.eduskunta.fi"
    : "avoindata.eduskunta.fi";
}

/** Cite data without the `children` (inner HTML) field — storable in view models. */
export type CitePropData = Omit<CiteProps, "children">;

/** Options shared by the row- and query-level builders. */
interface CiteOpts {
  value?: string;
  caption?: string;
  markText?: string;
}

export class ProvenanceService {
  constructor(private readonly traceRepo: TraceRepository | null) {}

  /**
   * Row-level trace for a figure tied to a single final-DB record.
   *
   * `idValue` is the value of the registry's `sourcePkColumn` for that row —
   * the final PK for SaliDB tables (`voting.id`, `person_id`) or
   * `vaski_document_id` for documents. Resolves the source record's scrape
   * timestamp and a deep-link URL when the table is row-level traceable,
   * falling back to the dataset summary / render time otherwise.
   */
  forRow(
    finalTable: string,
    idValue: string | number | null | undefined,
    opts: CiteOpts & { label?: string; recordUrl?: string } = {},
  ): CitePropData {
    const rule = SOURCE_LINEAGE[finalTable];
    const meta = rule ? TABLE_META[rule.sourceTable] : undefined;

    let scrapedAt: string | null = null;
    let url = opts.recordUrl;

    if (rule?.sourcePkName && rule.sourcePkColumn && idValue != null) {
      if (!url)
        url = buildRecordUrl(rule.sourceTable, rule.sourcePkName, idValue);
      const rec = this.traceRepo?.getProvenance(
        rule.sourceTable,
        rule.sourcePkName,
        String(idValue),
      );
      scrapedAt = validIso(rec?.scrapedAt);
    }

    if (!scrapedAt && rule) {
      scrapedAt = validIso(
        this.traceRepo?.getSummary(rule.sourceTable)?.lastScrapedAt,
      );
    }

    return {
      value: opts.value,
      caption: opts.caption,
      set: meta?.displayName ?? rule?.sourceTable,
      table: rule?.sourceTable,
      endpoint: meta?.endpoint,
      record: opts.label,
      url,
      fetched: scrapedAt ? formatFiDateTime(scrapedAt) : fetchedAt(),
      chain: [sourceHost(rule?.sourceTable ?? ""), rule?.sourceTable]
        .filter(Boolean)
        .join(" > "),
      markText: opts.markText,
    };
  }

  /**
   * Dataset-level trace for a figure derived from a whole query/view. The
   * source datasets are parsed from the SQL (see query-provenance), so the
   * trace stays in sync with the query automatically.
   */
  forQuery(queryFile: string, opts: CiteOpts = {}): CitePropData {
    const sources = querySourcesFor(queryFile)?.sources ?? [];
    return this.citePropsForSources(sources, opts);
  }

  /** Footer source note for a query/view, derived from its parsed source set. */
  sourceNoteForQuery(queryFile: string): SourceNoteOptions {
    const sources = querySourcesFor(queryFile)?.sources ?? [];
    return this.sourceNoteForSources(sources);
  }

  /**
   * Builds CiteProps data (sans `children`) for a displayed figure.
   * Resolves a real scrape timestamp from the trace DB when possible,
   * falling back to the current render time.
   */
  citeProps(info: ProvenanceInfo): CitePropData {
    const tables = [...new Set(info.sources.map((s) => s.table))];
    const scrapedAt = this.resolveTimestamp(info.sources, tables);
    const record = info.sources
      .map((s) => s.label)
      .filter(Boolean)
      .join("; ");

    const base = this.citePropsForSources(tables, {
      value: info.value,
      caption: info.caption,
      markText: info.markText,
    });
    return {
      ...base,
      record: record || undefined,
      fetched: scrapedAt ? formatFiDateTime(scrapedAt) : base.fetched,
    };
  }

  /**
   * Builds SourceNoteOptions for a footer note referencing one or more source
   * tables. Uses the most-recent last_scraped_at across all named tables.
   */
  sourceNoteOpts(tables: string[]): SourceNoteOptions {
    return this.sourceNoteForSources(tables);
  }

  /**
   * Returns the formatted last-scraped timestamp for a table,
   * or the current render time when the trace DB has no record for it.
   */
  tableFetchedAt(table: string): string {
    if (!this.traceRepo) return fetchedAt();
    const ts = validIso(this.traceRepo.getSummary(table)?.lastScrapedAt);
    return ts ? formatFiDateTime(ts) : fetchedAt();
  }

  /** CiteProps for a set of source (raw API) tables — dataset-level. */
  private citePropsForSources(sources: string[], opts: CiteOpts): CitePropData {
    const metas = sources.map((t) => TABLE_META[t]).filter(Boolean);
    const displayNames = [...new Set(metas.map((m) => m.displayName))];
    const endpoints = metas.map((m) => m.endpoint);
    const scrapedAt = this.mostRecentScrape(sources);

    return {
      value: opts.value,
      caption: opts.caption,
      set: combinedDataset(displayNames),
      table: sources.length ? sources.join(", ") : undefined,
      endpoint: endpoints.length ? endpoints.join(", ") : undefined,
      fetched: scrapedAt ? formatFiDateTime(scrapedAt) : fetchedAt(),
      chain: [
        [...new Set(sources.map(sourceHost))].join(" · "),
        ...sources,
      ].join(" > "),
      markText: opts.markText,
    };
  }

  private sourceNoteForSources(sources: string[]): SourceNoteOptions {
    const metas = sources.map((t) => TABLE_META[t]).filter(Boolean);
    const displayNames = [...new Set(metas.map((m) => m.displayName))];
    const scrapedAt = this.mostRecentScrape(sources);
    return {
      dataset: combinedDataset(displayNames),
      fetchedAt: scrapedAt ? formatFiDateTime(scrapedAt) : fetchedAt(),
    };
  }

  /** Most-recent valid last_scraped_at across the given source tables. */
  private mostRecentScrape(sources: string[]): string | null {
    if (!this.traceRepo) return null;
    const timestamps = sources
      .map((t) => validIso(this.traceRepo!.getSummary(t)?.lastScrapedAt))
      .filter((ts): ts is string => !!ts)
      .sort();
    return timestamps.length ? timestamps[timestamps.length - 1]! : null;
  }

  private resolveTimestamp(
    sources: ProvenanceInfo["sources"],
    tables: string[],
  ): string | null {
    if (!this.traceRepo) return null;

    // Prefer row-level lookup when a single source has a PK
    if (
      sources.length === 1 &&
      sources[0].pkName &&
      sources[0].pkValue != null
    ) {
      const rec = this.traceRepo.getProvenance(
        sources[0].table,
        sources[0].pkName,
        String(sources[0].pkValue),
      );
      if (validIso(rec?.scrapedAt)) return rec!.scrapedAt!;
    }

    return this.mostRecentScrape(tables);
  }
}
