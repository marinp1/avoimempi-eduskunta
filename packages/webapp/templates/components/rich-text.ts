/** @jsxImportSource ../../src/jsx */
import {
  parseRichTextDocument,
  type RichTextBlock,
  type RichTextInline,
  type RichTextTextInline,
} from "../../../shared/typings/RichText";
import { esc } from "../helpers";

/** Renders a rich-text JSON string to safe HTML markup. Returns "" on any failure. */
export function richTextToHtml(
  richTextJson: string | null | undefined,
): string {
  if (!richTextJson) return "";
  const doc = parseRichTextDocument(richTextJson);
  if (!doc) return "";
  return doc.blocks.map(renderBlock).join("");
}

/** JSX component wrapper for richTextToHtml. */
export function RichText({ json }: { json: string | null | undefined }) {
  return richTextToHtml(json);
}

function renderBlock(block: RichTextBlock): string {
  switch (block.type) {
    case "paragraph":
      return `<p class="rt-p">${renderInlines(block.inlines)}</p>`;
    case "heading":
      return `<h3 class="rt-h">${renderInlines(block.inlines)}</h3>`;
    case "indented":
      return `<blockquote class="rt-indent">${renderInlines(block.inlines)}</blockquote>`;
    case "list":
      return block.ordered
        ? `<ol class="qlist">${block.items.map((item) => `<li>${renderInlines(item.inlines)}</li>`).join("")}</ol>`
        : `<ul class="rt-list">${block.items.map((item) => `<li>${renderInlines(item.inlines)}</li>`).join("")}</ul>`;
    case "table":
      return `<table class="rt-table">${block.rows
        .map(
          (row) =>
            `<tr>${row.cells
              .map((cell) => {
                const tag = cell.header ? "th" : "td";
                const col = cell.colSpan ? ` colspan="${cell.colSpan}"` : "";
                const rowspan = cell.rowSpan
                  ? ` rowspan="${cell.rowSpan}"`
                  : "";
                return `<${tag}${col}${rowspan}>${renderInlines(cell.inlines)}</${tag}>`;
              })
              .join("")}</tr>`,
        )
        .join("")}</table>`;
  }
}

const MARK_TAGS: Record<string, string> = {
  bold: "b",
  italic: "i",
  underline: "u",
  superscript: "sup",
  subscript: "sub",
};

function renderInlines(inlines: RichTextInline[]): string {
  let html = "";
  for (const inline of inlines) {
    if (inline.type === "line_break") {
      html += "<br/>";
      continue;
    }
    html += renderTextInline(inline);
  }
  return html;
}

function renderTextInline(inline: RichTextTextInline): string {
  let text = esc(inline.text);

  if (inline.reference) {
    const ref = inline.reference;
    const label = ref.label ?? ref.identifier;
    const query = encodeURIComponent(ref.identifier);
    text = `<a href="/asiakirjat?q=${query}" class="rt-ref" title="${esc(ref.source ?? ref.identifier)}">${esc(label)}</a>`;
    return text;
  }

  if (inline.marks && inline.marks.length > 0) {
    for (const mark of inline.marks) {
      const tag = MARK_TAGS[mark];
      if (tag) text = `<${tag}>${text}</${tag}>`;
    }
  }

  return text;
}
