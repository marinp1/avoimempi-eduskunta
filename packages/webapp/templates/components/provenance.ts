import { esc } from "../helpers";

function html(strings: TemplateStringsArray, ...values: unknown[]): string {
  return strings.reduce<string>(
    (result, str, i) =>
      result + str + (i < values.length ? String(values[i] ?? "") : ""),
    "",
  );
}

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

export interface SourceNoteOptions {
  dataset?: string;
  fetchedAt?: string;
  extra?: string;
}

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
