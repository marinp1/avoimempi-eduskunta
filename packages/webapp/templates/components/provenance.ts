import { esc } from "../helpers";

/** Tagged template helper for building HTML strings with safe interleaving. */
function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce<string>(
    (result, str, i) =>
      result + str + (i < values.length ? String(values[i] ?? "") : ""),
    "",
  );
}

/** Metadata attached to a citable inline value for the provenance trace popover. */
export interface CiteData {
  value?: string;
  caption?: string;
  set?: string;
  table?: string;
  endpoint?: string;
  record?: string;
  jakso?: string;
  fetched?: string;
  chain?: string;
  url?: string;
  orig?: string;
  mark?: "off";
  markText?: string;
}

/**
 * Wraps an inline value in a `<span class="cite">` with data attributes for
 * the provenance trace popover. Converts camelCase keys to kebab-case data attributes.
 */
export function cite(inner: string, data: CiteData): string {
  const attrs = Object.entries(data)
    .filter(([, v]) => v != null)
    .map(
      ([k, v]) =>
        ` data-${k.replace(/([A-Z])/g, "-$1").toLowerCase()}="${esc(v as string)}"`,
    )
    .join("");
  return html`<span class="cite" ${attrs}>${inner}</span>`;
}

/** Options for rendering a section-level source attribution note. */
export interface SourceNoteOptions {
  dataset?: string;
  fetchedAt?: string;
  extra?: string;
}

/**
 * Renders a section-level source attribution ("Lähde: … haettu …").
 */
export function sourceNote({
  dataset,
  fetchedAt,
  extra,
}: SourceNoteOptions): string {
  return html`<div class="source-note">
    <span>Lähde:</span>
    ${dataset ? html`<span class="dset">${esc(dataset)}</span>` : ""}
    ${dataset && fetchedAt ? `<span>·</span>` : ""}
    ${fetchedAt
      ? html`<span class="fresh">haettu ${esc(fetchedAt)}</span>`
      : ""}
    ${extra ? `<span>·</span><span>${extra}</span>` : ""}
  </div>`;
}
