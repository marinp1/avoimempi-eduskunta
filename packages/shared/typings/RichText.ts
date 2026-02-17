export const RICH_TEXT_VERSION = 1 as const;

export type RichTextMark =
  | "bold"
  | "italic"
  | "underline"
  | "superscript"
  | "subscript";

export type RichTextDocumentReference = {
  type: "document";
  identifier: string;
  label?: string | null;
  source?: string | null;
};

export type RichTextTextInline = {
  type: "text";
  text: string;
  marks?: RichTextMark[];
  reference?: RichTextDocumentReference | null;
};

export type RichTextLineBreakInline = {
  type: "line_break";
};

export type RichTextInline = RichTextTextInline | RichTextLineBreakInline;

export type RichTextParagraphBlock = {
  type: "paragraph";
  inlines: RichTextInline[];
};

export type RichTextHeadingBlock = {
  type: "heading";
  level: 1 | 2 | 3 | 4;
  inlines: RichTextInline[];
};

export type RichTextIndentedBlock = {
  type: "indented";
  inlines: RichTextInline[];
};

export type RichTextListItem = {
  inlines: RichTextInline[];
};

export type RichTextListBlock = {
  type: "list";
  ordered: boolean;
  items: RichTextListItem[];
};

export type RichTextTableCell = {
  inlines: RichTextInline[];
  header?: boolean;
  colSpan?: number;
  rowSpan?: number;
};

export type RichTextTableRow = {
  cells: RichTextTableCell[];
};

export type RichTextTableBlock = {
  type: "table";
  rows: RichTextTableRow[];
};

export type RichTextBlock =
  | RichTextParagraphBlock
  | RichTextHeadingBlock
  | RichTextIndentedBlock
  | RichTextListBlock
  | RichTextTableBlock;

export type RichTextDocument = {
  version: typeof RICH_TEXT_VERSION;
  blocks: RichTextBlock[];
};

const MARK_SET: Record<RichTextMark, true> = {
  bold: true,
  italic: true,
  underline: true,
  superscript: true,
  subscript: true,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRichTextMark(value: unknown): value is RichTextMark {
  return typeof value === "string" && value in MARK_SET;
}

function isRichTextReference(value: unknown): value is RichTextDocumentReference {
  if (!isRecord(value)) return false;
  return value.type === "document" && typeof value.identifier === "string";
}

function isRichTextInline(value: unknown): value is RichTextInline {
  if (!isRecord(value) || typeof value.type !== "string") return false;

  if (value.type === "line_break") return true;

  if (value.type !== "text" || typeof value.text !== "string") return false;

  if (value.marks !== undefined) {
    if (!Array.isArray(value.marks) || !value.marks.every((mark) => isRichTextMark(mark))) {
      return false;
    }
  }

  if (value.reference !== undefined && value.reference !== null && !isRichTextReference(value.reference)) {
    return false;
  }

  return true;
}

function hasInlines(value: unknown): value is { inlines: RichTextInline[] } {
  if (!isRecord(value) || !Array.isArray(value.inlines)) return false;
  return value.inlines.every((inline) => isRichTextInline(inline));
}

function isPositiveInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isRichTextTableCell(value: unknown): value is RichTextTableCell {
  if (!isRecord(value) || !hasInlines(value)) return false;

  const valueRecord = value as Record<string, unknown>;

  if (valueRecord.header !== undefined && typeof valueRecord.header !== "boolean") return false;
  if (valueRecord.colSpan !== undefined && !isPositiveInteger(valueRecord.colSpan)) return false;
  if (valueRecord.rowSpan !== undefined && !isPositiveInteger(valueRecord.rowSpan)) return false;

  return true;
}

function isRichTextBlock(value: unknown): value is RichTextBlock {
  if (!isRecord(value) || typeof value.type !== "string") return false;

  if (value.type === "paragraph" || value.type === "indented") {
    return hasInlines(value);
  }

  if (value.type === "heading") {
    if (!hasInlines(value)) return false;
    const level = (value as Record<string, unknown>).level;
    return level === 1 || level === 2 || level === 3 || level === 4;
  }

  if (value.type === "list") {
    if (typeof value.ordered !== "boolean" || !Array.isArray(value.items)) return false;
    return value.items.every((item) => hasInlines(item));
  }

  if (value.type === "table") {
    if (!Array.isArray(value.rows)) return false;
    return value.rows.every((row) =>
      isRecord(row) &&
      Array.isArray(row.cells) &&
      row.cells.every((cell) => isRichTextTableCell(cell))
    );
  }

  return false;
}

export function isRichTextDocument(value: unknown): value is RichTextDocument {
  if (!isRecord(value)) return false;
  if (value.version !== RICH_TEXT_VERSION) return false;
  if (!Array.isArray(value.blocks)) return false;
  return value.blocks.every((block) => isRichTextBlock(block));
}

export function parseRichTextDocument(value: unknown): RichTextDocument | null {
  let parsedValue: unknown = value;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    try {
      parsedValue = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }

  return isRichTextDocument(parsedValue) ? parsedValue : null;
}
