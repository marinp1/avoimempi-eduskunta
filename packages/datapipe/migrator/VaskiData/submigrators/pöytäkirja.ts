import type { Database } from "bun:sqlite";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { extractDocumentTunnusCandidates } from "../../salidb-document-ref";
import type { VaskiEntry } from "../reader";

type MinutesItemKind = "asiakohta" | "muu_asiakohta";
type SectionMinutesMatchMode = "direct" | "parent_fallback";

type ParsedMinutesRow = {
  id: number;
  session_key: string;
  parliament_identifier: string;
  session_number: number;
  parliamentary_year: number;
  session_date: string;
  session_start_time: string;
  session_end_time: string;
  title: string;
  status: string;
  created_at: string;
  edk_identifier: string;
  source_path: string;
  attachment_group_id: number | null;
  has_signature: number;
  agenda_item_count: number;
  other_item_count: number;
};

type ParsedMinutesSpeech = {
  source_document_id: number;
  source_item_identifier: number;
  source_entry_order: number;
  source_speech_order: number;
  source_speech_identifier: number | null;
  person_id: number | null;
  first_name: string | null;
  last_name: string | null;
  speech_type_code: string | null;
  language_code: string | null;
  start_time: string | null;
  end_time: string | null;
  content: string;
};

type ParsedMinutesItem = {
  minutes_id: number;
  entry_order: number;
  entry_kind: MinutesItemKind;
  item_number: string;
  item_title: string | null;
  related_document_identifier: string | null;
  related_document_type: string | null;
  related_documents: Array<{ identifier: string; type: string | null }>;
  item_identifier: string;
  item_identifier_numeric: number;
  parent_item_identifier: string | null;
  processing_phase_code: string | null;
  general_processing_phase_code: string | null;
  item_order: number;
  content_text: string | null;
  speeches: ParsedMinutesSpeech[];
};

type ParsedRelatedDocument = {
  identifier: string;
  type: string | null;
};

type SpeechLookupCandidate = {
  id: number;
  person_id: number | null;
  first_name: string | null;
  last_name: string | null;
  ordinal_number: number | null;
  order_raw: string | null;
  request_time: string | null;
  created_datetime: string | null;
};

type SpeechLinkResult = {
  speech_id: number | null;
  warning: string | null;
};

function normalizeText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function parseRequiredText(
  value: unknown,
  fieldName: string,
  context?: string,
): string {
  const normalized = normalizeText(value);
  if (!normalized) {
    const suffix = context ? ` (${context})` : "";
    throw new Error(`Missing required text in ${fieldName}${suffix}`);
  }
  return normalized;
}

function normalizeArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

function toSafeFilePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function parseOptionalInteger(
  value: unknown,
  fieldName: string,
  context?: string,
): number | null {
  const suffix = context ? ` (${context})` : "";

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`Invalid integer in ${fieldName}${suffix}: '${value}'`);
    }
    return Math.trunc(value);
  }

  if (typeof value === "bigint") {
    return Number(value);
  }

  const normalized = normalizeText(value);
  if (!normalized) return null;

  const parsed = Number.parseInt(normalized, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid integer in ${fieldName}${suffix}: '${normalized}'`);
  }
  return parsed;
}

function parseDigitsInteger(value: unknown): number | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseRequiredInteger(
  value: unknown,
  fieldName: string,
  context?: string,
): number {
  const parsed = parseOptionalInteger(value, fieldName, context);
  if (parsed === null) {
    const suffix = context ? ` (${context})` : "";
    throw new Error(`Missing required integer in ${fieldName}${suffix}`);
  }
  return parsed;
}

function parseSessionKey(parliamentIdentifier: unknown): {
  key: string;
  number: number;
  year: number;
} | null {
  const normalized = normalizeText(parliamentIdentifier);
  if (!normalized) return null;

  const match = normalized.match(/^PTK\s+(\d+)\/(\d+)\s+vp$/i);
  if (!match) return null;

  const number = Number.parseInt(match[1], 10);
  const year = Number.parseInt(match[2], 10);
  if (Number.isNaN(number) || Number.isNaN(year)) return null;

  return {
    key: `${year}/${number}`,
    number,
    year,
  };
}

function parseMeta(row: VaskiEntry): Record<string, any> {
  return (
    row.contents?.Siirto?.SiirtoMetatieto?.JulkaisuMetatieto ||
    row.contents?.Siirto?.SiirtoMetatieto ||
    {}
  );
}

function parseBody(row: VaskiEntry): Record<string, any> {
  const body = row.contents?.Siirto?.SiirtoAsiakirja?.RakenneAsiakirja?.Poytakirja;
  if (!body || typeof body !== "object") {
    throw new Error(`Poytakirja body missing for row id=${row.id}`);
  }
  return body;
}

function collectTextFragments(node: unknown, output: string[]): void {
  if (node === null || node === undefined) return;

  if (typeof node === "string") {
    const normalized = normalizeText(node);
    if (normalized) output.push(normalized);
    return;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      collectTextFragments(item, output);
    }
    return;
  }

  if (typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if (typeof value === "string" && (key === "KappaleKooste" || key.endsWith("Teksti"))) {
        const normalized = normalizeText(value);
        if (normalized) output.push(normalized);
        continue;
      }
      collectTextFragments(value, output);
    }
  }
}

function dedupeNonEmpty(values: Array<string | null | undefined>): string[] {
  const deduped: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    deduped.push(normalized);
  }
  return deduped;
}

function extractSpeechText(parts: Record<string, any>[]): string | null {
  const collected: string[] = [];
  for (const part of parts) {
    collectTextFragments(part.KohtaSisalto, collected);
  }
  const deduped = dedupeNonEmpty(collected);
  return deduped.length > 0 ? deduped.join("\n\n") : null;
}

function extractItemContentText(item: Record<string, any>): string | null {
  const candidates: unknown[] = [item.KohtaSisalto, item.Toimenpide, item.PaatoksentekoToimenpide];

  if (item.KeskusteluToimenpide && typeof item.KeskusteluToimenpide === "object") {
    const discussionWithoutSpeeches = { ...item.KeskusteluToimenpide };
    delete discussionWithoutSpeeches.PuheenvuoroToimenpide;
    candidates.push(discussionWithoutSpeeches);
  }

  const collected: string[] = [];
  for (const candidate of candidates) {
    collectTextFragments(candidate, collected);
  }

  const deduped = dedupeNonEmpty(collected);
  return deduped.length > 0 ? deduped.join("\n\n") : null;
}

function upsertRelatedDocument(
  map: Map<string, ParsedRelatedDocument>,
  identifier: string,
  type: string | null,
) {
  const existing = map.get(identifier);
  if (!existing) {
    map.set(identifier, { identifier, type });
    return;
  }
  if (existing.type === null && type !== null) {
    map.set(identifier, { identifier, type });
  }
}

function addRelatedDocumentCandidate(
  map: Map<string, ParsedRelatedDocument>,
  candidate: unknown,
  type: string | null,
) {
  const normalized = normalizeText(candidate);
  if (!normalized) return;

  const extracted = extractDocumentTunnusCandidates(normalized);
  if (extracted.length > 0) {
    for (const identifier of extracted) {
      upsertRelatedDocument(map, identifier, type);
    }
    return;
  }

  upsertRelatedDocument(map, normalized, type);
}

function parseRelatedDocuments(item: Record<string, any>): ParsedRelatedDocument[] {
  const sources = [
    ...normalizeArray<Record<string, any>>(item.KohtaAsia),
    ...normalizeArray<Record<string, any>>(item.KohtaAsiakirja),
  ].filter((source) => source && typeof source === "object");
  if (sources.length === 0) return [];

  const references = new Map<string, ParsedRelatedDocument>();
  for (const source of sources) {
    const type = normalizeText(source.AsiakirjatyyppiNimi) || null;
    addRelatedDocumentCandidate(references, source.EduskuntaTunnus, type);
    addRelatedDocumentCandidate(references, source["@_hyperlinkkiKoodi"], type);
    addRelatedDocumentCandidate(references, source["@_muuTunnus"], type);
    addRelatedDocumentCandidate(references, source.MuuTunnus, type);
    addRelatedDocumentCandidate(references, source.MultiViiteTunnus, type);
    addRelatedDocumentCandidate(references, source.MuuViite?.ViiteTeksti, type);
  }

  return Array.from(references.values());
}

function normalizeSpeakerNode(toimija: unknown): Record<string, any> | null {
  if (!toimija || typeof toimija !== "object") return null;
  const personNode = (toimija as Record<string, any>).Henkilo;
  if (!personNode) return null;
  if (Array.isArray(personNode)) {
    const first = personNode.find(
      (entry) => entry && typeof entry === "object",
    ) as Record<string, any> | undefined;
    return first ?? null;
  }
  if (typeof personNode === "object") return personNode as Record<string, any>;
  return null;
}

function firstNonEmpty(values: Array<unknown>): string | null {
  for (const value of values) {
    const normalized = normalizeText(value);
    if (normalized) return normalized;
  }
  return null;
}

function extractSpeechesFromItem(
  row: ParsedMinutesRow,
  item: Record<string, any>,
  sourceEntryOrder: number,
  sourceItemIdentifier: number,
): { speeches: ParsedMinutesSpeech[]; issues: string[] } {
  const speeches: ParsedMinutesSpeech[] = [];
  const issues: string[] = [];

  const discussion = item.KeskusteluToimenpide;
  if (!discussion || typeof discussion !== "object") {
    return { speeches, issues };
  }

  const speechEntries = normalizeArray<Record<string, any>>(
    discussion.PuheenvuoroToimenpide,
  ).filter((entry) => entry && typeof entry === "object");

  for (const [speechIndex, speechEntry] of speechEntries.entries()) {
    const context =
      `row id=${row.id}, entry_order=${sourceEntryOrder}, speech_index=${speechIndex + 1}`;

    const speechParts = normalizeArray<Record<string, any>>(
      speechEntry.PuheenvuoroOsa,
    ).filter((part) => part && typeof part === "object");

    if (speechParts.length === 0) {
      issues.push(`Missing PuheenvuoroOsa (${context})`);
      continue;
    }

    const speechOrder =
      parseDigitsInteger(firstNonEmpty(speechParts.map((part) => part["@_puheenvuoroJNro"]))) ||
      parseDigitsInteger(speechEntry["@_puheenvuoroJNro"]);
    if (speechOrder === null) {
      issues.push(`Missing puheenvuoro order (${context})`);
      continue;
    }

    const content = extractSpeechText(speechParts);
    if (!content) {
      issues.push(`Missing speech content (${context})`);
      continue;
    }

    const speaker = normalizeSpeakerNode(speechEntry.Toimija);
    const startTime = firstNonEmpty([
      ...speechParts.map((part) => part["@_puheenvuoroAloitusHetki"]),
      speechEntry["@_puheenvuoroAloitusHetki"],
    ]);
    const endTime = firstNonEmpty([
      ...speechParts.map((part) => part["@_puheenvuoroLopetusHetki"]),
      speechEntry["@_puheenvuoroLopetusHetki"],
    ]);
    const languageCode = firstNonEmpty(
      speechParts.map((part) => part["@_kieliKoodi"]),
    );

    speeches.push({
      source_document_id: row.id,
      source_item_identifier: sourceItemIdentifier,
      source_entry_order: sourceEntryOrder,
      source_speech_order: speechOrder,
      source_speech_identifier: parseDigitsInteger(speechEntry["@_muuTunnus"]),
      person_id: parseDigitsInteger(speaker?.["@_muuTunnus"]),
      first_name: normalizeText(speaker?.EtuNimi),
      last_name: normalizeText(speaker?.SukuNimi),
      speech_type_code: normalizeText(speechEntry["@_puheenvuoroLuokitusKoodi"]),
      language_code: languageCode,
      start_time: startTime,
      end_time: endTime,
      content,
    });
  }

  return { speeches, issues };
}

function buildMinutesItems(
  row: ParsedMinutesRow,
  body: Record<string, any>,
): { items: ParsedMinutesItem[]; parseIssues: string[] } {
  const items: ParsedMinutesItem[] = [];
  const parseIssues: string[] = [];
  const mainItems = normalizeArray<Record<string, any>>(body.Asiakohta);
  const otherItems = normalizeArray<Record<string, any>>(body.MuuAsiakohta);

  const pushItem = (item: Record<string, any>, entryKind: MinutesItemKind) => {
    const context = `row id=${row.id}, entry_order=${items.length + 1}`;
    const relatedDocuments = parseRelatedDocuments(item);
    const primaryRelatedDocument =
      relatedDocuments.find((doc) => doc.type !== null) || relatedDocuments[0] || null;
    const itemTitle =
      normalizeText(item.KohtaNimeke?.NimekeTeksti) ||
      normalizeText(item.OtsikkoTeksti);
    const processingPhaseCode = normalizeText(item["@_kasittelyvaiheKoodi"]);
    const generalProcessingPhaseCode = normalizeText(
      item["@_yleinenKasittelyvaiheKoodi"],
    );
    const contentText = extractItemContentText(item);
    const itemIdentifier = parseRequiredText(
      item["@_muuTunnus"],
      "item_identifier",
      context,
    );
    const itemIdentifierNumeric = parseRequiredInteger(
      itemIdentifier,
      "item_identifier",
      context,
    );

    if ((processingPhaseCode === null) !== (generalProcessingPhaseCode === null)) {
      throw new Error(
        `processing phase codes mismatch (${context})`,
      );
    }

    if (
      itemTitle === null &&
      primaryRelatedDocument === null &&
      contentText === null
    ) {
      throw new Error(
        `Missing item title, related document and content text (${context})`,
      );
    }

    const { speeches, issues } = extractSpeechesFromItem(
      row,
      item,
      items.length + 1,
      itemIdentifierNumeric,
    );
    parseIssues.push(...issues);

    items.push({
      minutes_id: row.id,
      entry_order: items.length + 1,
      entry_kind: entryKind,
      item_number: parseRequiredText(item.KohtaNumero, "item_number", context),
      item_title: itemTitle,
      related_document_identifier: primaryRelatedDocument?.identifier ?? null,
      related_document_type: primaryRelatedDocument?.type ?? null,
      related_documents: relatedDocuments,
      item_identifier: itemIdentifier,
      item_identifier_numeric: itemIdentifierNumeric,
      parent_item_identifier: normalizeText(item["@_paakohtaTunnus"]),
      processing_phase_code: processingPhaseCode,
      general_processing_phase_code: generalProcessingPhaseCode,
      item_order: parseRequiredInteger(item["@_kohtaJNro"], "item_order", context),
      content_text: contentText,
      speeches,
    });
  };

  for (const item of mainItems) {
    if (!item || typeof item !== "object") continue;
    pushItem(item, "asiakohta");
  }

  for (const item of otherItems) {
    if (!item || typeof item !== "object") continue;
    pushItem(item, "muu_asiakohta");
  }

  return { items, parseIssues };
}

function buildMinutesRow(row: VaskiEntry): ParsedMinutesRow {
  const context = `row id=${row.id}`;
  const sessionKey = parseSessionKey(row.eduskuntaTunnus);
  if (!sessionKey) {
    throw new Error(`Could not parse PTK session key from '${row.eduskuntaTunnus}'`);
  }

  const meta = parseMeta(row);
  const body = parseBody(row);
  const minutesId = parseRequiredInteger(row.id, "id");

  const sessionDate = parseRequiredText(
    meta?.["@_laadintaPvm"] || meta?.KokousViite?.["@_kokousPvm"],
    "session_date",
    context,
  );
  const sessionStartTime = parseRequiredText(
    body["@_kokousAloitusHetki"],
    "session_start_time",
    context,
  );
  const sessionEndTime = parseRequiredText(
    body["@_kokousLopetusHetki"],
    "session_end_time",
    context,
  );
  const title = parseRequiredText(
    normalizeText(body?.IdentifiointiOsa?.Nimeke?.NimekeTeksti) ||
      normalizeText(meta?.IdentifiointiOsa?.Nimeke?.NimekeTeksti),
    "title",
    context,
  );
  const status = parseRequiredText(row.status, "status", context);
  const createdAt = parseRequiredText(row.created, "created_at", context);

  const edkIdentifier =
    normalizeText(meta?.["@_muuTunnus"]) || normalizeText(body?.["@_muuTunnus"]);
  if (!edkIdentifier) {
    throw new Error(`Missing edk_identifier (${context})`);
  }

  const sourcePath = row._source?.vaskiPath
    ? `${row._source.vaskiPath}#id=${minutesId}`
    : `vaski-data/pöytäkirja/unknown#id=${minutesId}`;

  const mainItems = normalizeArray<Record<string, any>>(body.Asiakohta);
  const otherItems = normalizeArray<Record<string, any>>(body.MuuAsiakohta);

  return {
    id: minutesId,
    session_key: sessionKey.key,
    parliament_identifier: `PTK ${sessionKey.number}/${sessionKey.year} vp`,
    session_number: sessionKey.number,
    parliamentary_year: sessionKey.year,
    session_date: sessionDate,
    session_start_time: sessionStartTime,
    session_end_time: sessionEndTime,
    title,
    status,
    created_at: createdAt,
    edk_identifier: edkIdentifier,
    source_path: sourcePath,
    attachment_group_id: parseOptionalInteger(
      row.attachmentGroupId,
      "attachment_group_id",
    ),
    has_signature: body.AllekirjoitusOsa ? 1 : 0,
    agenda_item_count: mainItems.length,
    other_item_count: otherItems.length,
  };
}

function buildChangeSet(
  previousRow: Record<string, unknown>,
  nextRow: Record<string, unknown>,
): Record<string, { before: unknown; after: unknown }> {
  const changed: Record<string, { before: unknown; after: unknown }> = {};
  for (const key of Object.keys(nextRow)) {
    if (previousRow[key] !== nextRow[key]) {
      changed[key] = { before: previousRow[key], after: nextRow[key] };
    }
  }
  return changed;
}

function writeOverwriteLog(
  previousRow: Record<string, unknown>,
  previousItems: unknown[],
  previousSpeechContents: unknown[],
  incomingRow: ParsedMinutesRow,
  incomingItems: ParsedMinutesItem[],
  incomingSpeechContents: DatabaseTables.SpeechContent[],
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseDir =
    process.env.MIGRATOR_OVERWRITE_LOG_DIR ||
    join(process.cwd(), "data", "migration-overwrites", "VaskiData", "pöytäkirja");
  mkdirSync(baseDir, { recursive: true });

  const fileName = [
    timestamp,
    toSafeFilePart(String(incomingRow.session_key)),
    `old_${toSafeFilePart(String(previousRow.id ?? "unknown"))}`,
    `new_${toSafeFilePart(String(incomingRow.id))}`,
  ].join("__");

  const payload = {
    table: "Session+Section+SpeechContent",
    unique_key: {
      session_key: incomingRow.session_key,
    },
    old_row: previousRow,
    old_items: previousItems,
    old_speech_contents: previousSpeechContents,
    new_row: incomingRow,
    new_items: incomingItems,
    new_speech_contents: incomingSpeechContents,
    changed_fields: buildChangeSet(
      previousRow,
      incomingRow as unknown as Record<string, unknown>,
    ),
  };

  writeFileSync(join(baseDir, `${fileName}.json`), JSON.stringify(payload, null, 2), "utf8");
}

function writeMigrationReport(
  row: VaskiEntry,
  reason: string,
  details: string,
) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const baseDir =
    process.env.MIGRATOR_REPORT_LOG_DIR ||
    join(process.cwd(), "data", "migration-reports", "VaskiData", "pöytäkirja");
  mkdirSync(baseDir, { recursive: true });

  const id = normalizeText(row.id) || "unknown-id";
  const fileName = [
    timestamp,
    toSafeFilePart(reason),
    toSafeFilePart(id),
  ].join("__");

  const payload = {
    reason,
    details,
    id: row.id,
    eduskuntaTunnus: row.eduskuntaTunnus,
    created: row.created,
    source: row._source || null,
  };

  writeFileSync(join(baseDir, `${fileName}.json`), JSON.stringify(payload, null, 2), "utf8");
}

function resolveSectionForMinutesItem(
  db: Database,
  sessionKey: string,
  item: ParsedMinutesItem,
): { sectionKey: string; matchMode: SectionMinutesMatchMode } | null {
  const context = `minutes_id=${item.minutes_id}, entry_order=${item.entry_order}`;
  const directMatches = db
    .query("SELECT key FROM Section WHERE session_key = ? AND vaski_id = ? LIMIT 2")
    .all(sessionKey, item.item_identifier_numeric) as Array<{ key: string }>;

  if (directMatches.length > 1) {
    throw new Error(
      `Ambiguous Section link by item_identifier=${item.item_identifier_numeric} (${context})`,
    );
  }
  if (directMatches.length === 1) {
    return {
      sectionKey: directMatches[0].key,
      matchMode: "direct",
    };
  }

  const parentIdentifier = parseDigitsInteger(item.parent_item_identifier);
  if (parentIdentifier === null) return null;

  const parentMatches = db
    .query("SELECT key FROM Section WHERE session_key = ? AND vaski_id = ? LIMIT 2")
    .all(sessionKey, parentIdentifier) as Array<{ key: string }>;

  if (parentMatches.length > 1) {
    throw new Error(
      `Ambiguous Section link by parent_item_identifier=${parentIdentifier} (${context})`,
    );
  }
  if (parentMatches.length === 1) {
    return {
      sectionKey: parentMatches[0].key,
      matchMode: "parent_fallback",
    };
  }

  return null;
}

function clearSessionSectionMinutes(db: Database, sessionKey: string) {
  db.run(
    "DELETE FROM SectionDocumentReference WHERE section_key IN (SELECT key FROM Section WHERE session_key = ?)",
    [sessionKey],
  );
  db.run(
    "UPDATE Section SET minutes_entry_kind = NULL, minutes_entry_order = NULL, minutes_item_identifier = NULL, minutes_parent_item_identifier = NULL, minutes_item_number = NULL, minutes_item_order = NULL, minutes_item_title = NULL, minutes_related_document_identifier = NULL, minutes_related_document_type = NULL, minutes_processing_phase_code = NULL, minutes_general_processing_phase_code = NULL, minutes_content_text = NULL, minutes_match_mode = NULL WHERE session_key = ?",
    [sessionKey],
  );
}

function clearSessionSubSections(db: Database, sessionKey: string) {
  db.run("DELETE FROM SubSection WHERE session_key = ?", [sessionKey]);
}

function clearSessionSpeechContents(db: Database, sessionKey: string) {
  db.run("DELETE FROM SpeechContent WHERE session_key = ?", [sessionKey]);
}

function updateSectionMinutes(
  db: Database,
  sectionKey: string,
  items: ParsedMinutesItem[],
  matchMode: SectionMinutesMatchMode,
) {
  const sortedItems = items.slice().sort((a, b) => a.entry_order - b.entry_order);
  const primary = sortedItems[0];
  const itemNumbers = dedupeNonEmpty(sortedItems.map((item) => item.item_number));
  const itemTitles = dedupeNonEmpty(sortedItems.map((item) => item.item_title));
  const relatedDocumentIdentifiers = dedupeNonEmpty(
    sortedItems.flatMap((item) =>
      item.related_documents.length > 0
        ? item.related_documents.map((document) => document.identifier)
        : [item.related_document_identifier],
    ),
  );
  const relatedDocumentTypes = dedupeNonEmpty(
    sortedItems.flatMap((item) =>
      item.related_documents.length > 0
        ? item.related_documents.map((document) => document.type)
        : [item.related_document_type],
    ),
  );
  const processingPhaseCodes = dedupeNonEmpty(
    sortedItems.map((item) => item.processing_phase_code),
  );
  const generalProcessingPhaseCodes = dedupeNonEmpty(
    sortedItems.map((item) => item.general_processing_phase_code),
  );
  const contentParts = dedupeNonEmpty(sortedItems.map((item) => item.content_text));

  const referenceMap = new Map<string, string | null>();
  for (const item of sortedItems) {
    const references =
      item.related_documents.length > 0
        ? item.related_documents
        : item.related_document_identifier
          ? [
              {
                identifier: item.related_document_identifier,
                type: item.related_document_type,
              },
            ]
          : [];
    for (const reference of references) {
      const identifier = reference.identifier.trim();
      if (!identifier) continue;
      if (referenceMap.has(identifier)) continue;
      referenceMap.set(identifier, reference.type?.trim() || null);
    }
  }
  const referenceRows = Array.from(referenceMap.entries()).map(([identifier, document_type]) => ({
    identifier,
    document_type,
  }));

  db.run(
    "UPDATE Section SET minutes_entry_kind = ?, minutes_entry_order = ?, minutes_item_identifier = ?, minutes_parent_item_identifier = ?, minutes_item_number = ?, minutes_item_order = ?, minutes_item_title = ?, minutes_related_document_identifier = ?, minutes_related_document_type = ?, minutes_processing_phase_code = ?, minutes_general_processing_phase_code = ?, minutes_content_text = ?, minutes_match_mode = ? WHERE key = ?",
    [
      primary.entry_kind,
      primary.entry_order,
      primary.item_identifier_numeric,
      primary.parent_item_identifier,
      itemNumbers.length > 0 ? itemNumbers.join(" | ") : null,
      primary.item_order,
      itemTitles.length > 0 ? itemTitles.join(" | ") : null,
      relatedDocumentIdentifiers.length > 0
        ? relatedDocumentIdentifiers.join(" | ")
        : null,
      relatedDocumentTypes.length > 0 ? relatedDocumentTypes.join(" | ") : null,
      processingPhaseCodes.length > 0 ? processingPhaseCodes.join(" | ") : null,
      generalProcessingPhaseCodes.length > 0
        ? generalProcessingPhaseCodes.join(" | ")
        : null,
      contentParts.length > 0 ? contentParts.join("\n\n") : null,
      matchMode,
      sectionKey,
    ],
  );

  upsertSectionDocumentReferences(db, sectionKey, referenceRows);
}

function upsertSectionDocumentReferences(
  db: Database,
  sectionKey: string,
  references: Array<{ identifier: string; document_type: string | null }>,
) {
  db.run("DELETE FROM SectionDocumentReference WHERE section_key = ?", [sectionKey]);
  if (references.length === 0) return;

  const stmt = db.prepare(
    "INSERT INTO SectionDocumentReference (section_key, document_identifier, document_type) VALUES (?, ?, ?)",
  );
  for (const reference of references) {
    stmt.run(sectionKey, reference.identifier, reference.document_type);
  }
  stmt.finalize();
}

function updateSessionMinutes(
  db: Database,
  row: ParsedMinutesRow,
) {
  db.run(
    "UPDATE Session SET minutes_document_id = ?, minutes_edk_identifier = ?, minutes_status = ?, minutes_created_at = ?, minutes_source_path = ?, minutes_has_signature = ?, minutes_agenda_item_count = ?, minutes_other_item_count = ?, minutes_start_time = ?, minutes_end_time = ?, minutes_title = ? WHERE key = ?",
    [
      row.id,
      row.edk_identifier,
      row.status,
      row.created_at,
      row.source_path,
      row.has_signature,
      row.agenda_item_count,
      row.other_item_count,
      row.session_start_time,
      row.session_end_time,
      row.title,
      row.session_key,
    ],
  );
}

function normalizeTimestampForMatch(value: string | null | undefined): string | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  const match = normalized.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
  if (!match) return null;
  return `${match[1]}T${match[2]}`;
}

function timestampToMillis(value: string | null | undefined): number | null {
  const normalized = normalizeTimestampForMatch(value);
  if (!normalized) return null;
  const match = normalized.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})$/,
  );
  if (!match) return null;
  const [, y, m, d, hh, mm, ss] = match;
  return Date.UTC(+y, +m - 1, +d, +hh, +mm, +ss);
}

function bestTimestampDeltaSeconds(
  sourceTime: string | null | undefined,
  candidateTime: string | null | undefined,
): { deltaSeconds: number; offsetHours: number } | null {
  const sourceMillis = timestampToMillis(sourceTime);
  const candidateMillis = timestampToMillis(candidateTime);
  if (sourceMillis === null || candidateMillis === null) return null;

  let best: { deltaSeconds: number; offsetHours: number } | null = null;
  const offsets = [0, 1, 2, 3, -1, -2, -3];
  for (const offsetHours of offsets) {
    const shiftedSourceMillis = sourceMillis - offsetHours * 3_600_000;
    const deltaSeconds = Math.abs(
      Math.round((candidateMillis - shiftedSourceMillis) / 1000),
    );
    if (!best || deltaSeconds < best.deltaSeconds) {
      best = { deltaSeconds, offsetHours };
    }
  }
  return best;
}

function normalizeNameForMatch(value: string | null | undefined): string | null {
  const normalized = normalizeText(value);
  return normalized ? normalized.toLocaleLowerCase("fi-FI") : null;
}

function resolveSpeechForMinutesSpeech(
  db: Database,
  sectionKey: string,
  speech: ParsedMinutesSpeech,
  usedSpeechIds: Set<number>,
): SpeechLinkResult {
  const allCandidates = db
    .query(
      "SELECT id, person_id, first_name, last_name, ordinal_number, order_raw, request_time, created_datetime FROM Speech WHERE section_key = ? ORDER BY created_datetime DESC, id DESC",
    )
    .all(sectionKey) as SpeechLookupCandidate[];

  const candidates = allCandidates.filter(
    (candidate) => !usedSpeechIds.has(candidate.id),
  );

  if (candidates.length === 0) {
    return {
      speech_id: null,
      warning: `No available Speech rows left (section_key='${sectionKey}')`,
    };
  }

  const byPersonId =
    speech.person_id === null
      ? candidates
      : candidates.filter((candidate) => candidate.person_id === speech.person_id);
  const personScoped = byPersonId.length > 0 ? byPersonId : candidates;

  const sourceStartTime = normalizeTimestampForMatch(speech.start_time);
  if (sourceStartTime) {
    const scored = personScoped
      .map((candidate) => {
        const candidateTime =
          normalizeTimestampForMatch(candidate.order_raw) ||
          normalizeTimestampForMatch(candidate.request_time) ||
          normalizeTimestampForMatch(candidate.created_datetime);
        const bestDelta = bestTimestampDeltaSeconds(sourceStartTime, candidateTime);
        return {
          candidate,
          bestDelta,
        };
      })
      .filter((entry) => entry.bestDelta !== null)
      .sort((a, b) => {
        const deltaCmp =
          (a.bestDelta?.deltaSeconds ?? Number.MAX_SAFE_INTEGER) -
          (b.bestDelta?.deltaSeconds ?? Number.MAX_SAFE_INTEGER);
        if (deltaCmp !== 0) return deltaCmp;
        return b.candidate.id - a.candidate.id;
      });

    const best = scored[0];
    if (best && best.bestDelta && best.bestDelta.deltaSeconds <= 2) {
      return {
        speech_id: best.candidate.id,
        warning:
          best.bestDelta.offsetHours === 0
            ? null
            : `Matched Speech by timestamp with offset ${best.bestDelta.offsetHours}h (section_key='${sectionKey}', speech_id=${best.candidate.id})`,
      };
    }
  }

  const ordinalCandidates = personScoped.filter(
    (candidate) => candidate.ordinal_number === speech.source_speech_order,
  );
  if (ordinalCandidates.length === 1) {
    return {
      speech_id: ordinalCandidates[0].id,
      warning: `Matched Speech by ordinal fallback (section_key='${sectionKey}', ordinal_number=${speech.source_speech_order})`,
    };
  }

  const firstName = normalizeNameForMatch(speech.first_name);
  const lastName = normalizeNameForMatch(speech.last_name);
  if (firstName && lastName) {
    const byName = personScoped.filter(
      (candidate) =>
        normalizeNameForMatch(candidate.first_name) === firstName &&
        normalizeNameForMatch(candidate.last_name) === lastName,
    );
    if (byName.length === 1) {
      return {
        speech_id: byName[0].id,
        warning: `Matched Speech by unique name fallback (section_key='${sectionKey}', ordinal_number=${speech.source_speech_order})`,
      };
    }
  }

  if (ordinalCandidates.length > 1) {
    return {
      speech_id: null,
      warning:
        `Ambiguous Speech match (section_key='${sectionKey}', ordinal_number=${speech.source_speech_order}, candidates=${ordinalCandidates.length})`,
    };
  }

  return {
    speech_id: null,
    warning: `No confident Speech match (section_key='${sectionKey}', ordinal_number=${speech.source_speech_order})`,
  };
}

function insertSpeechContents(db: Database, rows: DatabaseTables.SpeechContent[]) {
  for (const row of rows) {
    db.run(
      "INSERT INTO SpeechContent (speech_id, session_key, section_key, source_document_id, source_item_identifier, source_entry_order, source_speech_order, source_speech_identifier, speech_type_code, language_code, start_time, end_time, content, source_path, source_first_name, source_last_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        row.speech_id,
        row.session_key,
        row.section_key,
        row.source_document_id,
        row.source_item_identifier,
        row.source_entry_order,
        row.source_speech_order,
        row.source_speech_identifier,
        row.speech_type_code,
        row.language_code,
        row.start_time,
        row.end_time,
        row.content,
        row.source_path,
        row.source_first_name,
        row.source_last_name,
      ],
    );
  }
}

function insertSubSections(
  db: Database,
  rows: Omit<DatabaseTables.SubSection, "id">[],
) {
  for (const row of rows) {
    db.run(
      "INSERT INTO SubSection (session_key, section_key, entry_order, entry_kind, item_identifier, parent_item_identifier, item_number, item_order, item_title, related_document_identifier, related_document_type, processing_phase_code, general_processing_phase_code, content_text, match_mode, minutes_document_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        row.session_key,
        row.section_key,
        row.entry_order,
        row.entry_kind,
        row.item_identifier,
        row.parent_item_identifier,
        row.item_number,
        row.item_order,
        row.item_title,
        row.related_document_identifier,
        row.related_document_type,
        row.processing_phase_code,
        row.general_processing_phase_code,
        row.content_text,
        row.match_mode,
        row.minutes_document_id,
      ],
    );
  }
}

export default function createPoytakirjaSubMigrator(db: Database) {
  return {
    async migrateRow(row: VaskiEntry): Promise<void> {
      const sessionKey = parseSessionKey(row.eduskuntaTunnus);
      if (!sessionKey) return;
      if (row.rootType && row.rootType !== "Poytakirja") return;

      let incomingRow: ParsedMinutesRow;
      let incomingItems: ParsedMinutesItem[];
      let parseIssues: string[];
      try {
        incomingRow = buildMinutesRow(row);
        const body = parseBody(row);
        const parsedItems = buildMinutesItems(incomingRow, body);
        incomingItems = parsedItems.items;
        parseIssues = parsedItems.parseIssues;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        writeMigrationReport(row, "parse_error_row_skipped", message);
        return;
      }

      const sessionExists = db
        .query("SELECT 1 AS ok FROM Session WHERE key = ? LIMIT 1")
        .get(incomingRow.session_key) as { ok: number } | undefined;
      if (!sessionExists) {
        writeMigrationReport(
          row,
          "session_not_found_row_skipped",
          `No Session row found for session_key='${incomingRow.session_key}'`,
        );
        return;
      }

      const previousRow = db
        .query(
          "SELECT minutes_document_id AS id, minutes_edk_identifier AS edk_identifier, minutes_status AS status, minutes_created_at AS created_at, minutes_source_path AS source_path, minutes_has_signature AS has_signature, minutes_agenda_item_count AS agenda_item_count, minutes_other_item_count AS other_item_count, minutes_start_time AS session_start_time, minutes_end_time AS session_end_time, minutes_title AS title FROM Session WHERE key = ? LIMIT 1",
        )
        .get(incomingRow.session_key) as Record<string, unknown> | undefined;
      const previousItems = db
        .query(
          "SELECT key, minutes_entry_kind, minutes_entry_order, minutes_item_identifier, minutes_parent_item_identifier, minutes_item_number, minutes_item_order, minutes_item_title, minutes_related_document_identifier, minutes_related_document_type, minutes_processing_phase_code, minutes_general_processing_phase_code, minutes_content_text, minutes_match_mode FROM Section WHERE session_key = ? AND minutes_entry_order IS NOT NULL ORDER BY key",
        )
        .all(incomingRow.session_key) as Record<string, unknown>[];
      const previousSpeechContents = db
        .query(
          "SELECT speech_id, section_key, source_document_id, source_item_identifier, source_entry_order, source_speech_order FROM SpeechContent WHERE session_key = ? ORDER BY speech_id",
        )
        .all(incomingRow.session_key) as Record<string, unknown>[];

      updateSessionMinutes(db, incomingRow);

      clearSessionSectionMinutes(db, incomingRow.session_key);
      clearSessionSubSections(db, incomingRow.session_key);
      clearSessionSpeechContents(db, incomingRow.session_key);

      const sectionItemsByKey = new Map<
        string,
        {
          items: ParsedMinutesItem[];
          hasDirectMatch: boolean;
        }
      >();
      const usedSpeechIdsBySection = new Map<string, Set<number>>();
      const speechContentBySpeechId = new Map<number, DatabaseTables.SpeechContent>();
      const subSectionRows: Array<Omit<DatabaseTables.SubSection, "id">> = [];
      const speechIssues: string[] = [...parseIssues];

      for (const item of incomingItems) {
        let sectionLink: { sectionKey: string; matchMode: SectionMinutesMatchMode } | null;
        try {
          sectionLink = resolveSectionForMinutesItem(db, incomingRow.session_key, item);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          writeMigrationReport(row, "section_link_error_row_skipped", message);
          return;
        }

        if (!sectionLink) {
          const details = JSON.stringify(
            {
              session_key: incomingRow.session_key,
              minutes_id: item.minutes_id,
              entry_order: item.entry_order,
              item_identifier: item.item_identifier,
              parent_item_identifier: item.parent_item_identifier,
              item_number: item.item_number,
              item_title: item.item_title,
            },
            null,
            2,
          );
          writeMigrationReport(
            row,
            "section_link_unresolved_item_skipped",
            details,
          );
          continue;
        }

        const bucket = sectionItemsByKey.get(sectionLink.sectionKey);
        if (bucket) {
          bucket.items.push(item);
          if (sectionLink.matchMode === "direct") {
            bucket.hasDirectMatch = true;
          }
        } else {
          sectionItemsByKey.set(sectionLink.sectionKey, {
            items: [item],
            hasDirectMatch: sectionLink.matchMode === "direct",
          });
        }

        for (const speech of item.speeches) {
          const usedSpeechIds =
            usedSpeechIdsBySection.get(sectionLink.sectionKey) ?? new Set<number>();
          usedSpeechIdsBySection.set(sectionLink.sectionKey, usedSpeechIds);

          const speechLink = resolveSpeechForMinutesSpeech(
            db,
            sectionLink.sectionKey,
            speech,
            usedSpeechIds,
          );
          if (!speechLink.speech_id) {
            speechIssues.push(
              `Speech link unresolved: ${speechLink.warning ?? "unknown reason"}`,
            );
            continue;
          }

          usedSpeechIds.add(speechLink.speech_id);

          if (speechLink.warning) {
            speechIssues.push(`Speech link warning: ${speechLink.warning}`);
          }

          const speechContentRow: DatabaseTables.SpeechContent = {
            speech_id: speechLink.speech_id,
            session_key: incomingRow.session_key,
            section_key: sectionLink.sectionKey,
            source_document_id: speech.source_document_id,
            source_item_identifier: speech.source_item_identifier,
            source_entry_order: speech.source_entry_order,
            source_speech_order: speech.source_speech_order,
            source_speech_identifier: speech.source_speech_identifier,
            speech_type_code: speech.speech_type_code,
            language_code: speech.language_code,
            start_time: speech.start_time,
            end_time: speech.end_time,
            content: speech.content,
            source_path: incomingRow.source_path,
            source_first_name: speech.first_name,
            source_last_name: speech.last_name,
          };

          const existing = speechContentBySpeechId.get(speechLink.speech_id);
          if (!existing) {
            speechContentBySpeechId.set(speechLink.speech_id, speechContentRow);
            continue;
          }

          if (speechContentRow.content.length > existing.content.length) {
            speechContentBySpeechId.set(speechLink.speech_id, speechContentRow);
          }

          speechIssues.push(
            `Duplicate SpeechContent candidate for speech_id=${speechLink.speech_id}; selected ${
              speechContentRow.content.length > existing.content.length
                ? "longer"
                : "existing"
            } content`,
          );
        }
      }

      for (const [sectionKey, bucket] of sectionItemsByKey.entries()) {
        const sortedItems = bucket.items
          .slice()
          .sort((a, b) => a.entry_order - b.entry_order);

        updateSectionMinutes(
          db,
          sectionKey,
          sortedItems,
          bucket.hasDirectMatch ? "direct" : "parent_fallback",
        );

        for (const item of sortedItems) {
          const duplicateExisting = subSectionRows.find(
            (row) =>
              row.section_key === sectionKey && row.entry_order === item.entry_order,
          );
          if (duplicateExisting) {
            speechIssues.push(
              `Skipped duplicate SubSection entry_order=${item.entry_order} for section_key='${sectionKey}'`,
            );
            continue;
          }

          subSectionRows.push({
            session_key: incomingRow.session_key,
            section_key: sectionKey,
            entry_order: item.entry_order,
            entry_kind: item.entry_kind,
            item_identifier: item.item_identifier_numeric,
            parent_item_identifier: item.parent_item_identifier,
            item_number: item.item_number,
            item_order: item.item_order,
            item_title: item.item_title,
            related_document_identifier: item.related_document_identifier,
            related_document_type: item.related_document_type,
            processing_phase_code: item.processing_phase_code,
            general_processing_phase_code: item.general_processing_phase_code,
            content_text: item.content_text,
            match_mode: bucket.hasDirectMatch ? "direct" : "parent_fallback",
            minutes_document_id: incomingRow.id,
          });
        }
      }

      const incomingSpeechContents = Array.from(speechContentBySpeechId.values()).sort(
        (a, b) => a.speech_id - b.speech_id,
      );
      insertSubSections(db, subSectionRows);
      insertSpeechContents(db, incomingSpeechContents);

      if (previousRow?.id !== null && previousRow?.id !== undefined) {
        writeOverwriteLog(
          previousRow,
          previousItems,
          previousSpeechContents,
          incomingRow,
          incomingItems,
          incomingSpeechContents,
        );
      }

      if (speechIssues.length > 0) {
        const sampleLimit = 200;
        const sampled = speechIssues.slice(0, sampleLimit);
        const payload = {
          issue_count: speechIssues.length,
          sampled_issue_count: sampled.length,
          omitted_issue_count: Math.max(0, speechIssues.length - sampled.length),
          issues: sampled,
        };
        writeMigrationReport(
          row,
          "speech_content_issues",
          JSON.stringify(payload, null, 2),
        );
      }
    },
  };
}
