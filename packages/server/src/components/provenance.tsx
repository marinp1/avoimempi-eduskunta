/** @jsxImportSource ../../src/jsx */
import i18next from "i18next";

function attrs(data: Record<string, unknown>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v != null) {
      result[`data-${k.replace(/([A-Z])/g, "-$1").toLowerCase()}`] = String(v);
    }
  }
  return result;
}

export interface CiteProps {
  children: string;
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

export function Cite(props: CiteProps) {
  const { children, ...data } = props;
  return (
    <span class="cite" {...attrs(data as Record<string, unknown>)}>
      {children}
    </span>
  );
}

/** Wraps an inline value in a `<span class="cite">` with data attributes for
 *  the provenance trace popover. Converts camelCase keys to kebab-case data attributes. */
export function cite(inner: string, data: Omit<CiteProps, "children">): string {
  return Cite({ ...data, children: inner });
}

export interface SourceNoteOptions {
  dataset?: string;
  fetchedAt?: string;
  extra?: string;
}

export function SourceNote({ dataset, fetchedAt, extra }: SourceNoteOptions) {
  const showDot = (dataset && fetchedAt) || extra;
  return (
    <div class="source-note">
      <span>{i18next.t("common:source")}</span>
      {dataset ? <span class="dset">{dataset}</span> : null}
      {showDot ? <span>·</span> : null}
      {fetchedAt ? (
        <span class="fresh">
          {i18next.t("common:fetched", { timestamp: fetchedAt })}
        </span>
      ) : null}
      {extra ? <span>·</span> : null}
      {extra ? <span>{extra}</span> : null}
    </div>
  );
}

export function sourceNote(opts: SourceNoteOptions): string {
  return SourceNote(opts);
}
