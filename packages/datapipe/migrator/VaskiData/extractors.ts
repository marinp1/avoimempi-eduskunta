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
 * Extract the core metadata from a VaskiEntry into a VaskiDocument row.
 */
export function extractDocument(entry: VaskiEntry): DatabaseTables.VaskiDocument {
  const ident = getIdentification(entry);
  const meta = getMetadata(entry);
  const tunniste = ident?.EduskuntaTunniste;
  const author = extractAuthor(entry);

  const docNumber = tunniste?.AsiakirjaNroTeksti
    ? parseInt(tunniste.AsiakirjaNroTeksti, 10)
    : null;

  return {
    id: parseInt(entry.id, 10),
    eduskunta_tunnus: entry.eduskuntaTunnus,
    document_type_code: strOrNull(tunniste?.AsiakirjatyyppiKoodi) ?? "",
    document_type_name: strOrNull(ident?.AsiakirjatyyppiNimi) ?? "",
    document_number: Number.isNaN(docNumber) ? null : docNumber,
    parliamentary_year: strOrNull(tunniste?.ValtiopaivavuosiTeksti),
    title: strOrNull(ident?.Nimeke?.NimekeTeksti),
    author_first_name: author.firstName,
    author_last_name: author.lastName,
    author_role: author.role,
    author_organization: author.organization,
    creation_date: meta?.["@_laadintaPvm"] ?? null,
    status: meta?.["@_tilaKoodi"] ?? entry.status,
    language_code: meta?.["@_kieliKoodi"] ?? "fi",
    publicity_code: meta?.["@_julkisuusKoodi"] ?? null,
    source_reference: ident?.Vireilletulo?.EduskuntaTunnus ?? null,
    summary: extractSummaryFromContent(entry),
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
): DatabaseTables.DocumentSubject[] {
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
): DatabaseTables.DocumentRelationship[] {
  const relationships: DatabaseTables.DocumentRelationship[] = [];
  const ident = getIdentification(entry);
  const typeName = ident?.AsiakirjatyyppiNimi;
  const vireilletulo = ident?.Vireilletulo?.EduskuntaTunnus;

  if (!vireilletulo) return relationships;

  // Committee reports/opinions reference the proposal they're about
  if (typeName === "Valiokunnan mietintö" || typeName === "Valiokunnan lausunto") {
    relationships.push({
      source_document_id: documentId,
      target_eduskunta_tunnus: vireilletulo,
      relationship_type: "source_proposal",
    });
  }

  // Answers reference the question they're answering
  if (typeName === "Vastaus kirjalliseen kysymykseen") {
    relationships.push({
      source_document_id: documentId,
      target_eduskunta_tunnus: vireilletulo,
      relationship_type: "answer_to",
    });
  }

  return relationships;
}
