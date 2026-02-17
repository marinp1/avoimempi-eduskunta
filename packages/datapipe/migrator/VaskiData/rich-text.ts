import {
  RICH_TEXT_VERSION,
  type RichTextBlock,
  type RichTextDocument,
  type RichTextDocumentReference,
  type RichTextInline,
  type RichTextMark,
} from "../../../shared/typings/RichText";

const INLINE_STYLE_ITALIC_KEYS = new Set(["KursiiviTeksti", "SaadosKursiiviKooste"]);
const INLINE_STYLE_BOLD_KEYS = new Set(["LihavaTeksti"]);
const HEADING_KEY = "LihavaKursiiviOtsikkoTeksti";
const INDENTED_KEY = "SisennettyKappaleKooste";
const REFERENCE_IDENTIFIER_KEY = "AsiakirjaViiteTunnus";
const REFERENCE_LABEL_KEY = "AsiakirjaViiteTeksti";
const REFERENCE_SOURCE_KEY = "AsiakirjaViiteNimi";

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isMetadataKey(key: string): boolean {
  return key.startsWith("@_");
}

function isReferenceKey(key: string): boolean {
  return key === REFERENCE_IDENTIFIER_KEY || key === REFERENCE_LABEL_KEY || key === REFERENCE_SOURCE_KEY;
}

function isParagraphContainerKey(key: string): boolean {
  if (key === "#text") return false;
  if (INLINE_STYLE_ITALIC_KEYS.has(key) || INLINE_STYLE_BOLD_KEYS.has(key)) return false;
  if (key === HEADING_KEY || key === INDENTED_KEY) return false;
  if (key === "KappaleKooste") return true;
  if (key.endsWith("KappaleKooste")) return true;
  if (key === "JohdantoTeksti") return true;
  if (key === "FraasiKappaleKooste") return true;
  if (key === "FraasiPaatosKappaleKooste") return true;
  if (key === "FraasiJohdantoKappaleKooste") return true;
  if (key.endsWith("Teksti")) return true;
  if (key.endsWith("Kooste")) return true;
  return false;
}

function dedupeMarks(marks: RichTextMark[]): RichTextMark[] | undefined {
  if (marks.length === 0) return undefined;
  const deduped = Array.from(new Set(marks));
  return deduped.length > 0 ? deduped : undefined;
}

function extractReference(
  node: Record<string, unknown>,
  inherited: RichTextDocumentReference | null,
): RichTextDocumentReference | null {
  const identifier = normalizeText(node[REFERENCE_IDENTIFIER_KEY]);
  if (!identifier) return inherited;

  return {
    type: "document",
    identifier,
    label: normalizeText(node[REFERENCE_LABEL_KEY]),
    source: normalizeText(node[REFERENCE_SOURCE_KEY]),
  };
}

function shouldInsertSpace(previous: string, current: string): boolean {
  const prevChar = previous[previous.length - 1];
  const nextChar = current[0];
  if (!prevChar || !nextChar) return false;
  if (/\s/.test(prevChar) || /\s/.test(nextChar)) return false;
  return /[0-9A-Za-z\u00c0-\u024f]/.test(prevChar) && /[0-9A-Za-z\u00c0-\u024f]/.test(nextChar);
}

function pushTextInline(
  inlines: RichTextInline[],
  value: unknown,
  marks: RichTextMark[],
  reference: RichTextDocumentReference | null,
): void {
  let text = normalizeText(value);
  if (!text) return;

  const previous = inlines[inlines.length - 1];
  if (previous?.type === "text" && shouldInsertSpace(previous.text, text)) {
    text = ` ${text}`;
  }

  inlines.push({
    type: "text",
    text,
    marks: dedupeMarks(marks),
    reference,
  });
}

function collectInlines(
  node: unknown,
  inlines: RichTextInline[],
  marks: RichTextMark[],
  reference: RichTextDocumentReference | null,
): void {
  if (node === null || node === undefined) return;

  if (typeof node === "string") {
    pushTextInline(inlines, node, marks, reference);
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectInlines(item, inlines, marks, reference);
    }
    return;
  }

  if (!isRecord(node)) return;

  const localReference = extractReference(node, reference);
  for (const [key, value] of Object.entries(node)) {
    if (isMetadataKey(key) || isReferenceKey(key)) continue;

    if (key === HEADING_KEY) {
      collectInlines(value, inlines, [...marks, "bold", "italic"], localReference);
      continue;
    }

    if (INLINE_STYLE_ITALIC_KEYS.has(key)) {
      collectInlines(value, inlines, [...marks, "italic"], localReference);
      continue;
    }

    if (INLINE_STYLE_BOLD_KEYS.has(key)) {
      collectInlines(value, inlines, [...marks, "bold"], localReference);
      continue;
    }

    if (key === "#text") {
      collectInlines(value, inlines, marks, localReference);
      continue;
    }

    collectInlines(value, inlines, marks, localReference);
  }
}

function pushTextBlock(
  blocks: RichTextBlock[],
  type: "paragraph" | "indented" | "heading",
  value: unknown,
  marks: RichTextMark[],
  reference: RichTextDocumentReference | null,
): void {
  const inlines: RichTextInline[] = [];
  collectInlines(value, inlines, marks, reference);

  if (!inlines.some((inline) => inline.type === "text" && inline.text.trim() !== "")) return;

  if (type === "heading") {
    blocks.push({
      type: "heading",
      level: 3,
      inlines,
    });
    return;
  }

  if (type === "indented") {
    blocks.push({
      type: "indented",
      inlines,
    });
    return;
  }

  blocks.push({
    type: "paragraph",
    inlines,
  });
}

function collectBlocks(
  node: unknown,
  blocks: RichTextBlock[],
  defaultBlockType: "paragraph" | "indented",
  inheritedReference: RichTextDocumentReference | null,
): void {
  if (node === null || node === undefined) return;

  if (typeof node === "string") {
    pushTextBlock(blocks, defaultBlockType, node, [], inheritedReference);
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectBlocks(item, blocks, defaultBlockType, inheritedReference);
    }
    return;
  }

  if (!isRecord(node)) return;

  const localReference = extractReference(node, inheritedReference);
  const entries = Object.entries(node);
  const hasStructuredKeys = entries.some(([key]) =>
    key === HEADING_KEY ||
    key === INDENTED_KEY ||
    isParagraphContainerKey(key)
  );

  if (!hasStructuredKeys) {
    pushTextBlock(blocks, defaultBlockType, node, [], localReference);
    return;
  }

  for (const [key, value] of entries) {
    if (isMetadataKey(key) || isReferenceKey(key)) continue;

    if (key === HEADING_KEY) {
      pushTextBlock(blocks, "heading", value, ["bold", "italic"], localReference);
      continue;
    }

    if (key === INDENTED_KEY) {
      collectBlocks(value, blocks, "indented", localReference);
      continue;
    }

    if (isParagraphContainerKey(key)) {
      collectBlocks(value, blocks, defaultBlockType, localReference);
      continue;
    }

    collectBlocks(value, blocks, defaultBlockType, localReference);
  }
}

function renderInlineText(inline: RichTextInline): string {
  if (inline.type === "line_break") return "\n";
  return inline.text;
}

function renderBlockText(block: RichTextBlock): string {
  if (block.type === "list") {
    const lines: string[] = [];
    for (const [index, item] of block.items.entries()) {
      const text = item.inlines.map((inline) => renderInlineText(inline)).join("").trim();
      if (!text) continue;
      const prefix = block.ordered ? `${index + 1}. ` : "- ";
      lines.push(`${prefix}${text}`);
    }
    return lines.join("\n");
  }

  return block.inlines.map((inline) => renderInlineText(inline)).join("").trim();
}

export type RichTextConversionResult = {
  document: RichTextDocument | null;
  json: string | null;
  plainText: string | null;
};

export function convertVaskiNodeToRichText(node: unknown): RichTextConversionResult {
  const blocks: RichTextBlock[] = [];
  collectBlocks(node, blocks, "paragraph", null);

  if (blocks.length === 0) {
    return {
      document: null,
      json: null,
      plainText: null,
    };
  }

  const document: RichTextDocument = {
    version: RICH_TEXT_VERSION,
    blocks,
  };

  const blockTexts = blocks
    .map((block) => renderBlockText(block))
    .filter((text) => text !== "");
  const plainText = blockTexts.length > 0 ? blockTexts.join("\n\n") : null;

  return {
    document,
    json: JSON.stringify(document),
    plainText,
  };
}
