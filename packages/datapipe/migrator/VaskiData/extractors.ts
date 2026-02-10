import type { VaskiEntry } from "./reader";

/**
 * Check if a value is an empty object {} (common XML parsing artifact).
 */
function isEmptyObject(val: any): boolean {
  return val !== null && typeof val === "object" && !Array.isArray(val) && Object.keys(val).length === 0;
}

/**
 * Convert empty objects to null, return strings as-is.
 */
function strOrNull(val: any): string | null {
  if (val == null || isEmptyObject(val)) return null;
  if (typeof val === "string") return val || null;
  return null;
}

/**
 * Safely navigate nested objects. Returns undefined if any part of the path is missing.
 */
function dig(obj: any, ...keys: string[]): any {
  let current = obj;
  for (const key of keys) {
    if (current == null || typeof current !== "object") return undefined;
    current = current[key];
  }
  return current;
}

/**
 * Get the metadata section - handles both JulkaisuMetatieto and SiirtoMetatieto variants.
 */
function getMetadata(entry: VaskiEntry) {
  const meta = dig(entry, "contents", "Siirto", "SiirtoMetatieto");
  return meta?.JulkaisuMetatieto ?? meta?.SiirtoMetatieto ?? meta;
}

function getIdentification(entry: VaskiEntry) {
  return dig(getMetadata(entry), "IdentifiointiOsa");
}

/**
 * Flatten KappaleKooste which can be a string, an object with #text, or an array of either.
 */
function flattenKappaleKooste(kappale: any): string {
  if (kappale == null) return "";
  if (typeof kappale === "string") return kappale;
  if (typeof kappale === "object" && !Array.isArray(kappale)) {
    // Object with #text and possibly styled text like KursiiviTeksti
    const parts: string[] = [];
    if (kappale["#text"]) parts.push(kappale["#text"]);
    if (kappale.KursiiviTeksti) {
      const k = kappale.KursiiviTeksti;
      parts.push(typeof k === "string" ? k : Array.isArray(k) ? k.join(" ") : "");
    }
    if (kappale.LihavaTeksti) {
      const l = kappale.LihavaTeksti;
      parts.push(typeof l === "string" ? l : Array.isArray(l) ? l.join(" ") : "");
    }
    return parts.filter(Boolean).join(" ").trim();
  }
  if (Array.isArray(kappale)) {
    return kappale.map(flattenKappaleKooste).filter(Boolean).join("\n");
  }
  return String(kappale);
}

/**
 * Extract the summary text from the structured document content.
 * Looks for SisaltoKuvaus inside the RakenneAsiakirja's type-specific container.
 */
function extractSummaryFromContent(entry: VaskiEntry): string | null {
  const asiakirja = dig(entry, "contents", "Siirto", "SiirtoAsiakirja", "RakenneAsiakirja");
  if (!asiakirja || typeof asiakirja !== "object") return null;

  // The content is inside a type-specific key like HallituksenEsitys, Kysymys, etc.
  for (const key of Object.keys(asiakirja)) {
    if (key.startsWith("@_")) continue;
    const content = asiakirja[key];
    if (content?.SisaltoKuvaus) {
      return flattenKappaleKooste(content.SisaltoKuvaus.KappaleKooste) || null;
    }
    // For questions (Kysymys), the question text may be in KysymysOsa
    if (content?.KysymysOsa?.KappaleKooste) {
      return flattenKappaleKooste(content.KysymysOsa.KappaleKooste) || null;
    }
    // For committee reports, try PaatosehdotusOsa
    if (content?.PaatosehdotusOsa?.KappaleKooste) {
      return flattenKappaleKooste(content.PaatosehdotusOsa.KappaleKooste) || null;
    }
  }
  return null;
}

/**
 * Extract author information from IdentifiointiOsa.Toimija.
 */
function extractAuthor(entry: VaskiEntry) {
  const toimija = dig(getIdentification(entry), "Toimija");
  if (!toimija) return { firstName: null, lastName: null, role: null, organization: null };

  // Toimija can be an object or array - take the first with rooliKoodi "Laatija" or the first one
  const actor = Array.isArray(toimija)
    ? toimija.find((t: any) => t["@_rooliKoodi"] === "Laatija") ?? toimija[0]
    : toimija;

  const henkilo = actor?.Henkilo;

  return {
    firstName: strOrNull(henkilo?.EtuNimi),
    lastName: strOrNull(henkilo?.SukuNimi),
    role: strOrNull(henkilo?.AsemaTeksti) ?? strOrNull(actor?.TarkennusAsemaTeksti),
    organization: strOrNull(actor?.YhteisoTeksti),
  };
}

/**
 * Map numeric tilaKoodi values to Finnish text equivalents.
 * Source: Eduskunta API internal status codes.
 */
const STATUS_CODE_MAP: Record<string, string> = {
  "5": "Valmis",
  "8": "Hyväksytty",
  "1234": "Valmis",
};

function normalizeStatus(code: string | null): string | null {
  if (!code) return null;
  return STATUS_CODE_MAP[code] ?? code;
}

/**
 * Normalize author role formatting:
 * - "kunta-ja alueministeri" -> "kunta- ja alueministeri" (missing space after hyphen)
 * - "Kulttuuri- ja asuntoministeri" -> "kulttuuri- ja asuntoministeri" (lowercase)
 * - "urheilu-, ja nuorisoministeri" -> "urheilu- ja nuorisoministeri" (extra comma)
 */
function normalizeAuthorRole(role: string | null): string | null {
  if (!role) return null;
  let result = role;
  // Fix missing space after hyphen before "ja"
  result = result.replace(/-ja /g, "- ja ");
  // Remove extra comma before "ja" (e.g. "urheilu-, ja" -> "urheilu- ja")
  result = result.replace(/-, ja /g, "- ja ");
  // Lowercase first letter (except "Valiokunta" which is a proper noun usage)
  if (result !== "Valiokunta" && result[0] >= "A" && result[0] <= "Z") {
    result = result[0].toLowerCase() + result.slice(1);
  }
  return result;
}

/**
 * Normalize document_type_code: fix known bad variants.
 */
export function normalizeDocTypeCode(code: string): string {
  if (code === "Kk") return "KK";
  if (code === "kkb") return "KK";
  return code;
}

/**
 * Extract the core metadata from a VaskiEntry into a VaskiDocument row.
 */
export function extractDocument(entry: VaskiEntry): DatabaseTables.VaskiDocument {
  const ident = getIdentification(entry);
  const meta = getMetadata(entry);
  const tunniste = ident?.EduskuntaTunniste;

  return {
    id: parseInt(entry.id, 10),
    eduskunta_tunnus: entry.eduskuntaTunnus,
    document_type_code: normalizeDocTypeCode(strOrNull(tunniste?.AsiakirjatyyppiKoodi) ?? ""),
    document_type_name: strOrNull(ident?.AsiakirjatyyppiNimi) ?? "",
    document_number: strOrNull(tunniste?.AsiakirjaNroTeksti),
    parliamentary_year: strOrNull(tunniste?.ValtiopaivavuosiTeksti),
    title: strOrNull(ident?.Nimeke?.NimekeTeksti),
    alternative_title: strOrNull(ident?.Nimeke?.["@_vaihtoehtoinenNimekeTeksti"]),
    version_text: null,
    laadinta_pvm: meta?.["@_laadintaPvm"] ?? null,
    muu_tunnus: strOrNull(meta?.["@_muuTunnus"]),
    paatehtava_koodi: strOrNull(meta?.["@_paatehtavaKoodi"]),
    rakennemaarittely_nimi: strOrNull(meta?.["@_rakennemaarittelyNimi"]),
    message_type: null,
    message_id: null,
    message_created: null,
    transfer_code: null,
    meeting_id: null,
    meeting_org: null,
    status: STATUS_CODE_MAP[meta?.["@_tilaKoodi"]] ?? meta?.["@_tilaKoodi"] ?? STATUS_CODE_MAP[entry.status] ?? entry.status,
    language_code: meta?.["@_kieliKoodi"] ?? "fi",
    publicity_code: meta?.["@_julkisuusKoodi"] ?? null,
    summary_text: extractSummaryFromContent(entry),
    attachment_group_id: entry.attachmentGroupId ? parseInt(entry.attachmentGroupId, 10) : null,
    created: entry.created,
  };
}

/**
 * Extract subject keywords from Aihe array.
 */
export function extractSubjects(
  entry: VaskiEntry,
  documentId: number,
): DatabaseTables.VaskiSubject[] {
  const meta = getMetadata(entry);
  const aiheet = meta?.Aihe;
  if (!aiheet) return [];

  const subjects = Array.isArray(aiheet) ? aiheet : [aiheet];
  return subjects
    .filter((a: any) => a?.AiheTeksti && typeof a.AiheTeksti === "string")
    .map((a: any) => ({
      document_id: documentId,
      subject_text: a.AiheTeksti as string,
      yso_url: strOrNull(a["@_muuTunnus"]),
    }));
}

/**
 * Extract document relationships (source proposals, question-answer links).
 */
export function extractRelationships(
  entry: VaskiEntry,
  documentId: number,
): DatabaseTables.VaskiRelationship[] {
  const relationships: DatabaseTables.VaskiRelationship[] = [];
  const ident = getIdentification(entry);
  const typeName = ident?.AsiakirjatyyppiNimi;
  const vireilletulo = ident?.Vireilletulo?.EduskuntaTunnus;

  if (!vireilletulo) return relationships;

  // Committee reports/opinions reference the proposal they're about
  if (typeName === "Valiokunnan mietintö" || typeName === "Valiokunnan lausunto") {
    relationships.push({
      document_id: documentId,
      target_eduskunta_tunnus: vireilletulo,
      relationship_type: "source_proposal",
    });
  }

  // Answers reference the question they're answering
  if (typeName === "Vastaus kirjalliseen kysymykseen") {
    relationships.push({
      document_id: documentId,
      target_eduskunta_tunnus: vireilletulo,
      relationship_type: "answer_to",
    });
  }

  return relationships;
}

/**
 * Normalize speech_type by fixing OCR hyphenation artifacts and extra whitespace.
 * Known bad values from the data:
 *   "(vastauspuheenvuo-ro)" -> "(vastauspuheenvuoro)"
 *   "(vastauspuheenvuo--ro)" -> "(vastauspuheenvuoro)"
 *   "(vastauspuheenvuo- ro)" -> "(vastauspuheenvuoro)"
 *   "(vastauspuheenvu-ro)" -> "(vastauspuheenvuoro)"  (OCR also dropped a letter)
 *   "(vastauspuheen-- vuoro)" -> "(vastauspuheenvuoro)"  (OCR dropped letters)
 *   "(esittelypuheenvuo-ro)" -> "(esittelypuheenvuoro)"
 *   "( vastauspuheenvuoro)" -> "(vastauspuheenvuoro)"
 *   "(esittelypuheenvuoro )" -> "(esittelypuheenvuoro)"
 */
const SPEECH_TYPE_NORMALIZATIONS: Record<string, string> = {
  "(vastauspuheenvuo-ro)": "(vastauspuheenvuoro)",
  "(vastauspuheenvuo--ro)": "(vastauspuheenvuoro)",
  "(vastauspuheenvuo- ro)": "(vastauspuheenvuoro)",
  "(vastauspuheenvu-ro)": "(vastauspuheenvuoro)",
  "(vastauspuheen-- vuoro)": "(vastauspuheenvuoro)",
  "(esittelypuheenvuo-ro)": "(esittelypuheenvuoro)",
  "( vastauspuheenvuoro)": "(vastauspuheenvuoro)",
  "(esittelypuheenvuoro )": "(esittelypuheenvuoro)",
};

export function normalizeSpeechType(val: string | null): string | null {
  if (!val) return null;
  let result = val;
  result = SPEECH_TYPE_NORMALIZATIONS[result] ?? result;
  result = result.trim();
  if (!result) return null;
  // Remove spacing inside parentheses and collapse whitespace.
  result = result.replace(/\(\s+/g, "(").replace(/\s+\)/g, ")");
  result = result.replace(/\s+/g, " ");
  // Remove hyphenated word breaks and any remaining hyphens.
  result = result.replace(/-\s*/g, "");
  return result;
}

export { normalizeStatus };

/**
 * Generate an excel_id matching the format used by SaliDBPuheenvuoro migrator.
 * Format: YYYYMMDD_personId (with _2, _3 suffixes handled externally for dedup)
 */
function generateExcelId(startTime: string, personId: string): string {
  const timeMatch = startTime.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  const yyyymmdd = timeMatch ? `${timeMatch[1]}${timeMatch[2]}${timeMatch[3]}` : "00000000";
  return [yyyymmdd, personId]
    .map((s) => s.toLowerCase().replace(/[^0-9a-z]/g, ""))
    .join("_");
}

/**
 * Extract speeches from a Pöytäkirjan asiakohta vaski entry.
 *
 * Speeches are nested inside:
 *   RakenneAsiakirja.PoytakirjaAsiakohta.Asiakohta.KeskusteluToimenpide.PuheenvuoroToimenpide[]
 *
 * Each PuheenvuoroToimenpide contains speaker info, timestamps, and full speech text.
 */
export function extractSpeeches(entry: VaskiEntry): Omit<DatabaseTables.ExcelSpeech, "excel_id">[] {
  const pka = dig(entry, "contents", "Siirto", "SiirtoAsiakirja", "RakenneAsiakirja", "PoytakirjaAsiakohta");
  if (!pka) return [];

  const speeches: Omit<DatabaseTables.ExcelSpeech, "excel_id">[] = [];

  // Asiakohta can be a single object or array
  const asiakohdat = pka.Asiakohta;
  if (!asiakohdat) return [];
  const items = Array.isArray(asiakohdat) ? asiakohdat : [asiakohdat];

  for (const asiakohta of items) {
    // KeskusteluToimenpide can be at top level or nested under Toimenpide
    const keskustelu = asiakohta?.KeskusteluToimenpide;
    if (!keskustelu) continue;

    const keskustelut = Array.isArray(keskustelu) ? keskustelu : [keskustelu];

    for (const kesk of keskustelut) {
      const pvt = kesk?.PuheenvuoroToimenpide;
      if (!pvt) continue;

      const puheenvuorot = Array.isArray(pvt) ? pvt : [pvt];

      for (const pv of puheenvuorot) {
        const henkilo = pv?.Toimija?.Henkilo;
        if (!henkilo) continue;

        const puheenvuoroOsa = pv?.PuheenvuoroOsa;
        const kohtaSisalto = puheenvuoroOsa?.KohtaSisalto;
        if (!kohtaSisalto) continue;

        const personId = strOrNull(henkilo["@_muuTunnus"]);
        if (!personId) continue;

        // Timestamps and ordinal are on PuheenvuoroOsa, with fallback to the outer element
        const startTime = strOrNull(puheenvuoroOsa?.["@_puheenvuoroAloitusHetki"]) ??
                          strOrNull(pv["@_puheenvuoroAloitusHetki"]);
        const endTime = strOrNull(puheenvuoroOsa?.["@_puheenvuoroLopetusHetki"]) ??
                        strOrNull(pv["@_puheenvuoroLopetusHetki"]);
        const ordinal = strOrNull(puheenvuoroOsa?.["@_puheenvuoroJNro"]) ?? "0";

        const content = flattenKappaleKooste(kohtaSisalto.KappaleKooste);
        if (!content) continue;

        speeches.push({
          processing_phase: null,
          document: null,
          ordinal: parseInt(ordinal, 10) || 0,
          position: strOrNull(henkilo.AsemaTeksti),
          first_name: strOrNull(henkilo.EtuNimi),
          last_name: strOrNull(henkilo.SukuNimi),
          party: strOrNull(henkilo.LisatietoTeksti)?.toLowerCase() ?? null,
          speech_type: normalizeSpeechType(strOrNull(pv.TarkenneTeksti)),
          start_time: startTime,
          end_time: endTime,
          content,
          minutes_url: null,
          source_file: "vaski",
          _personId: personId,
          _startTime: startTime,
          _ordinal: ordinal,
        } as any);
      }
    }
  }

  return speeches;
}

/**
 * Assign excel_id values to extracted speeches, handling duplicates with suffixes.
 */
export function assignExcelIds(
  speeches: any[],
  excelIdCounts: Map<string, number>,
): DatabaseTables.ExcelSpeech[] {
  return speeches.map((speech) => {
    const baseId = generateExcelId(
      speech._startTime ?? "",
      speech._personId ?? "0",
    );

    const currentCount = excelIdCounts.get(baseId) || 0;
    const newCount = currentCount + 1;
    excelIdCounts.set(baseId, newCount);
    const finalId = newCount === 1 ? baseId : `${baseId}_${newCount}`;

    // Remove internal fields and add excel_id
    const { _personId, _startTime, _ordinal, ...row } = speech;
    return { ...row, excel_id: finalId } as DatabaseTables.ExcelSpeech;
  });
}
