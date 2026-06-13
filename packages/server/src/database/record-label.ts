/**
 * Shared human-label registry for source records.
 *
 * Keyed by raw API source table. `columns` are the (final-table) result columns
 * that form a label; `format(row)` builds the label from a result row. Used by:
 *   - passive trace capture, over a query's own result rows, and
 *   - the on-demand probe, which selects `columns` (intersected with the final
 *     table's real columns) so a label can always be built.
 * `format` returns `undefined` when its columns are absent/empty so the UI shows
 * a graceful empty cell.
 */

export interface LabelRule {
  columns: string[];
  format(row: Record<string, unknown>): string | undefined;
}

const str = (v: unknown): string => (v == null ? "" : String(v).trim());

const firstNonEmpty = (...vals: unknown[]): string | undefined => {
  for (const v of vals) {
    const t = str(v);
    if (t) return t;
  }
  return undefined;
};

export const RECORD_LABEL: Record<string, LabelRule> = {
  MemberOfParliament: {
    columns: ["first_name", "last_name", "party"],
    format: (r) => {
      const name = [str(r.first_name), str(r.last_name)]
        .filter(Boolean)
        .join(" ");
      return name || firstNonEmpty(r.party);
    },
  },
  SaliDBAanestys: {
    columns: ["context_title", "title", "number"],
    format: (r) => {
      const title = firstNonEmpty(r.context_title, r.title);
      if (title) return title;
      const n = str(r.number);
      return n ? `Äänestys ${n}` : undefined;
    },
  },
  SaliDBIstunto: {
    columns: ["title", "start_date", "session_key"],
    format: (r) => firstNonEmpty(r.title, r.start_date, r.session_key),
  },
  SaliDBKohta: {
    columns: ["title", "section_number"],
    format: (r) => firstNonEmpty(r.title, r.section_number),
  },
  SaliDBPuheenvuoro: {
    columns: ["speaker_name", "title"],
    format: (r) => firstNonEmpty(r.speaker_name, r.title),
  },
  VaskiData: {
    columns: ["title", "identifier", "document_tunnus"],
    format: (r) => firstNonEmpty(r.title, r.identifier, r.document_tunnus),
  },
};
