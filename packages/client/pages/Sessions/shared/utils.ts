import { extractDocumentIdentifiers } from "#client/components/DocumentCards";
import { toEduskuntaUrl } from "#client/utils/eduskunta-links";
import type {
  MinutesContentReference,
  Section,
  SessionMinutesItem,
  SubSection,
} from "./types";

export const extractSectionDocRefs = (section: {
  minutes_related_document_identifier?: string | null;
  title?: string | null;
  minutes_item_title?: string | null;
}) =>
  extractDocumentIdentifiers([
    section.minutes_related_document_identifier,
    section.title,
    section.minutes_item_title,
  ]);

export const parseVaskiSubjects = (subjects?: string | null) => {
  if (!subjects) return [];
  return subjects
    .split(" | ")
    .map((subject) => subject.trim())
    .filter(Boolean);
};

export const formatVaskiAuthor = (section: Section) => {
  const name = [section.vaski_author_first_name, section.vaski_author_last_name]
    .filter(Boolean)
    .join(" ");
  const parts = [
    name,
    section.vaski_author_role,
    section.vaski_author_organization,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" • ") : null;
};

export const getSectionOrderLabel = (section: Section) => {
  const identifier = section.identifier?.trim();
  if (identifier) return identifier;
  return String(section.ordinal);
};

export const buildValtiopaivaAsiakirjaUrl = (tunnus?: string | null) => {
  if (!tunnus || !tunnus.trim()) return null;
  const normalized = tunnus.trim();
  const match = normalized.match(
    /^([A-Za-zÅÄÖåäö_]+)\s+(\d+)\s*\/\s*(\d{4})(?:\s+vp)?$/i,
  );
  if (match) {
    const [, code, number, year] = match;
    const slug = `${code.toUpperCase()}_${Number.parseInt(number, 10)}+${year}`;
    return toEduskuntaUrl(
      `/FI/vaski/KasittelytiedotValtiopaivaasia/Sivut/${slug}.aspx`,
    );
  }
  return null;
};

export const isRollCallSection = (section?: Section) => {
  if (!section) return false;
  const documentType = (
    section.minutes_related_document_type || ""
  ).toLowerCase();
  const sectionTitle = (section.title || "").toLowerCase();
  const processingTitle = (section.processing_title || "").toLowerCase();
  return (
    documentType.includes("nimenhuuto") ||
    sectionTitle.includes("nimenhuuto") ||
    processingTitle.includes("nimenhuuto")
  );
};

export const splitPipeValues = (value?: string | null) =>
  value
    ? value
        .split(" | ")
        .map((part) => part.trim())
        .filter(Boolean)
    : [];

export const buildFallbackSubSections = (section: Section): SubSection[] => {
  const numbers = splitPipeValues(section.minutes_item_number);
  const titles = splitPipeValues(section.minutes_item_title);
  const documentIdentifiers = splitPipeValues(
    section.minutes_related_document_identifier,
  );
  const documentTypes = splitPipeValues(section.minutes_related_document_type);
  const maxLength = Math.max(
    numbers.length,
    titles.length,
    documentIdentifiers.length,
    0,
  );

  if (maxLength <= 1) return [];

  return Array.from({ length: maxLength }, (_, index) => ({
    id: -(index + 1),
    session_key: section.session_key || "",
    section_key: section.key,
    entry_order: index + 1,
    entry_kind: (section.minutes_entry_kind || "asiakohta") as
      | "asiakohta"
      | "muu_asiakohta",
    item_identifier: section.minutes_item_identifier || 0,
    parent_item_identifier: section.minutes_parent_item_identifier || null,
    item_number: numbers[index] || null,
    item_order:
      typeof section.minutes_item_order === "number"
        ? section.minutes_item_order + index
        : null,
    item_title: titles[index] || null,
    related_document_identifier: documentIdentifiers[index] || null,
    related_document_type:
      documentTypes[index] || section.minutes_related_document_type || null,
    processing_phase_code: section.minutes_processing_phase_code || null,
    general_processing_phase_code:
      section.minutes_general_processing_phase_code || null,
    content_text: null,
    match_mode:
      section.minutes_match_mode === "parent_fallback"
        ? "parent_fallback"
        : "direct",
    minutes_document_id: section.vaski_document_id || 0,
  }));
};

const isMinutesReferenceId = (value: string) => /^\d{5,}$/.test(value);

const isMinutesReferenceCode = (value: string) =>
  /^[A-ZÅÄÖ]{1,8}(?:_[A-ZÅÄÖ0-9]+)+$/i.test(value);

export const parseMinutesContent = (content?: string | null) => {
  const blocks = (content || "")
    .split(/\n\s*\n+/)
    .map((block) => block.trim())
    .filter(Boolean);

  const references: MinutesContentReference[] = [];
  const narrativeBlocks: string[] = [];

  for (let index = 0; index < blocks.length; index++) {
    const current = blocks[index];
    const next = blocks[index + 1];

    if (isMinutesReferenceId(current) && next && isMinutesReferenceCode(next)) {
      references.push({
        vaskiId: Number.parseInt(current, 10),
        code: next,
      });
      index += 1;
      continue;
    }

    if (isMinutesReferenceId(current)) {
      references.push({
        vaskiId: Number.parseInt(current, 10),
        code: null,
      });
      continue;
    }

    if (isMinutesReferenceCode(current)) {
      references.push({
        vaskiId: null,
        code: current,
      });
      continue;
    }

    narrativeBlocks.push(current);
  }

  const dedupedReferences: MinutesContentReference[] = [];
  const seenKeys = new Set<string>();
  for (const reference of references) {
    const key = `${reference.vaskiId ?? "null"}::${reference.code ?? "null"}`;
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    dedupedReferences.push(reference);
  }

  return {
    narrativeBlocks,
    references: dedupedReferences,
  };
};

export const parseIdentifierForSort = (
  identifier?: string | null,
): number[] | null => {
  if (!identifier) return null;
  const normalized = identifier.trim();
  if (!/^\d+(\.\d+)*$/.test(normalized)) return null;
  const parts = normalized
    .split(".")
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => !Number.isNaN(part));
  return parts.length > 0 ? parts : null;
};

export const compareMinutesItems = (
  a: SessionMinutesItem,
  b: SessionMinutesItem,
) => {
  const aParts = parseIdentifierForSort(a.identifier_text);
  const bParts = parseIdentifierForSort(b.identifier_text);

  if (aParts && bParts) {
    const maxLen = Math.max(aParts.length, bParts.length);
    for (let i = 0; i < maxLen; i++) {
      const aVal = aParts[i] ?? -1;
      const bVal = bParts[i] ?? -1;
      if (aVal !== bVal) return aVal - bVal;
    }
  } else if (aParts) {
    return -1;
  } else if (bParts) {
    return 1;
  }

  const aOrdinal =
    typeof a.ordinal === "number" ? a.ordinal : Number.MAX_SAFE_INTEGER;
  const bOrdinal =
    typeof b.ordinal === "number" ? b.ordinal : Number.MAX_SAFE_INTEGER;
  if (aOrdinal !== bOrdinal) return aOrdinal - bOrdinal;

  return a.id - b.id;
};
