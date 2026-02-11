import type { Database } from "bun:sqlite";
import { createBatchingInserter } from "../utils";
import type { VaskiEntry } from "./reader";
import { normalizeDocTypeCode, normalizeSpeechType, normalizeStatus } from "./extractors";

const isObject = (val: any): val is Record<string, any> =>
  val && typeof val === "object" && !Array.isArray(val);

const ensureArray = <T>(value: T | T[] | null | undefined): T[] => {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
};

const dig = (obj: any, ...keys: string[]) => {
  let current = obj;
  for (const key of keys) {
    if (!current || typeof current !== "object") return undefined;
    current = current[key];
  }
  return current;
};

const textFromNode = (node: any): string | null => {
  if (node == null) return null;
  if (typeof node === "string") return node;
  if (Array.isArray(node)) {
    const parts = node.map(textFromNode).filter(Boolean);
    return parts.length > 0 ? parts.join("\n") : null;
  }
  if (isObject(node)) {
    const parts: string[] = [];
    if (typeof node["#text"] === "string") parts.push(node["#text"]);
    if (typeof node.text === "string") parts.push(node.text);
    if (node.KursiiviTeksti) {
      const italic = node.KursiiviTeksti;
      parts.push(
        typeof italic === "string"
          ? italic
          : Array.isArray(italic)
            ? italic.map((v) => textFromNode(v) ?? "").join(" ")
            : "",
      );
    }
    if (node.LihavaTeksti) {
      const bold = node.LihavaTeksti;
      parts.push(
        typeof bold === "string"
          ? bold
          : Array.isArray(bold)
            ? bold.map((v) => textFromNode(v) ?? "").join(" ")
            : "",
      );
    }
    return parts.filter(Boolean).join(" ").trim() || null;
  }
  return null;
};

const textFromKappaleKooste = (node: any): string | null => {
  if (!node) return null;
  return textFromNode(node);
};

const textValue = (value: any): string | null => {
  if (value == null) return null;
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    const parts = value.map(textFromNode).filter(Boolean);
    return parts.length > 0 ? parts.join(" | ") : null;
  }
  return textFromNode(value);
};

const firstText = (entry: any, paths: string[][]): string | null => {
  for (const path of paths) {
    const val = dig(entry, ...path);
    const text = textFromKappaleKooste(val);
    if (text) return text;
  }
  return null;
};

const normalizeRole = (val: any): string | null => {
  if (val == null) return null;
  if (typeof val === "string") return val;
  return null;
};

const toInt = (val: any): number | null => {
  if (val == null || val === "") return null;
  const n = parseInt(String(val), 10);
  return Number.isNaN(n) ? null : n;
};

const toLower = (val: any): string | null => {
  if (!val) return null;
  return String(val).toLowerCase();
};

const slugify = (value: any): string => {
  const source = String(value ?? "unknown");
  return (
    source
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .toLowerCase() || "unknown"
  );
};

const digits = (val: any): string | null => {
  if (!val) return null;
  const match = String(val).match(/(\d+)/);
  return match ? match[1] : null;
};

const yearDigits = (val: any): string | null => {
  if (!val) return null;
  const match = String(val).match(/(19|20)\d{2}/);
  return match ? match[0] : null;
};

const trySessionKeyFromTunnus = (tunnus: any): string | null => {
  if (!tunnus) return null;
  const match = String(tunnus).match(/(\d+)\s*\/\s*((?:19|20)\d{2})/);
  if (!match) return null;
  return `${match[2]}/${match[1]}`;
};

function deriveSessionKey(
  documentNumber: any,
  parliamentaryYear: any,
  eduskuntaTunnus: any,
): string | null {
  const number = digits(documentNumber);
  const year = yearDigits(parliamentaryYear);
  if (number && year) return `${year}/${number}`;
  return trySessionKeyFromTunnus(eduskuntaTunnus);
}

function resolveSectionKey(
  db: Database,
  sessionKey: string,
  sourceItemId: number | null,
  sectionOrdinal: number,
): string | null {
  if (sourceItemId != null) {
    const bySource = db
      .query(
        `SELECT key FROM Section
         WHERE session_key = $session_key
           AND vaski_id = $vaski_id
         ORDER BY id ASC
         LIMIT 1`,
      )
      .get({
        $session_key: sessionKey,
        $vaski_id: sourceItemId,
      }) as { key?: string } | undefined;
    if (bySource?.key) return bySource.key;
  }

  const fallback = `${sessionKey}/${sectionOrdinal}`;
  const byKey = db
    .query(`SELECT key FROM Section WHERE key = $key LIMIT 1`)
    .get({ $key: fallback }) as { key?: string } | undefined;
  return byKey?.key ?? null;
}

let batcher: ReturnType<typeof createBatchingInserter> | null = null;
let currentDb: Database | null = null;
const knownTableExists = new Map<string, boolean>();

function resetState() {
  batcher = null;
  currentDb = null;
  knownTableExists.clear();
}

function hasTable(db: Database, tableName: string): boolean {
  if (knownTableExists.has(tableName)) {
    return knownTableExists.get(tableName)!;
  }

  const row = db
    .query(
      `SELECT 1 as exists_flag FROM sqlite_master WHERE type = 'table' AND name = $name LIMIT 1`,
    )
    .get({ $name: tableName }) as { exists_flag?: number } | undefined;

  const exists = !!row?.exists_flag;
  knownTableExists.set(tableName, exists);
  return exists;
}

function insertRows(table: string, rows: any[]) {
  if (!currentDb || !batcher || rows.length === 0) return;
  if (!hasTable(currentDb, table)) return;
  batcher.insertRows(table, rows);
}

function safeRun(sql: string, params: any[] = []) {
  if (!currentDb) return;
  try {
    currentDb.run(sql, params);
  } catch {
    // schema compatibility guard for older migration versions in tests
  }
}

function isCommitteeOrganization(name: string | null): boolean {
  if (!name) return false;
  const n = name.toLowerCase();
  return n.includes("valiokunta") || n.includes("jaosto");
}

function committeeCodeFromName(name: string | null, meetingId: string | null): string {
  const fromMeeting = String(meetingId ?? "").match(/[A-Za-z]{2,12}/)?.[0];
  if (fromMeeting) return fromMeeting.toUpperCase();

  const words = String(name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);

  const initials = words.map((w) => w[0]).join("").toUpperCase();
  if (initials.length >= 2) return initials;

  return slugify(name).toUpperCase().slice(0, 12) || "UNK";
}

function upsertCommitteeSessionForDocument(args: {
  documentId: number;
  organizationName: string | null;
  meetingId: string | null;
  documentNumberText: string | null;
  parliamentaryYearText: string | null;
  meetingStart: string | null;
  meetingEnd: string | null;
  sourcePath: string | null;
}) {
  if (!currentDb) return;
  if (!hasTable(currentDb, "Committee") || !hasTable(currentDb, "CommitteeSession")) return;
  if (!isCommitteeOrganization(args.organizationName)) return;

  const committeeCode = committeeCodeFromName(args.organizationName, args.meetingId);
  safeRun(`INSERT OR IGNORE INTO Committee (code, name) VALUES (?, ?)`, [
    committeeCode,
    args.organizationName,
  ]);
  safeRun(`UPDATE Committee SET name = COALESCE(?, name) WHERE code = ?`, [
    args.organizationName,
    committeeCode,
  ]);

  const sessionSlugSource = args.meetingId ?? `${args.parliamentaryYearText ?? ""}_${args.documentNumberText ?? ""}`;
  const committeeSessionKey = `${committeeCode}:${slugify(sessionSlugSource)}`;

  safeRun(
    `INSERT OR IGNORE INTO CommitteeSession (
       committee_code,
       session_key,
       label,
       number_text,
       parliamentary_year_text,
       start_time,
       end_time,
       source_path
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      committeeCode,
      committeeSessionKey,
      args.meetingId ?? args.organizationName,
      args.documentNumberText,
      args.parliamentaryYearText,
      args.meetingStart,
      args.meetingEnd,
      args.sourcePath,
    ],
  );

  const row = currentDb
    .query(`SELECT id FROM CommitteeSession WHERE session_key = $key LIMIT 1`)
    .get({ $key: committeeSessionKey }) as { id?: number } | undefined;

  if (!row?.id) return;

  safeRun(
    `UPDATE CommitteeSession
     SET document_id = COALESCE(document_id, ?)
     WHERE id = ?`,
    [args.documentId, row.id],
  );
}

function buildPerTypeRow(args: {
  documentId: number;
  title: string | null;
  alternativeTitle: string | null;
  body: any;
}): Record<string, any> {
  const { documentId, title, alternativeTitle, body } = args;

  return {
    document_id: documentId,
    title_text:
      title ??
      firstText(body, [["Nimeke", "NimekeTeksti"], ["Otsikko"], ["KohtaNimeke"]]),
    subtitle_text:
      alternativeTitle ??
      firstText(body, [["Alaotsikko"], ["TilastoValiotsikkoTeksti"]]),
    summary_text: firstText(body, [
      ["SisaltoKuvaus", "KappaleKooste"],
      ["AsiaKuvaus", "KappaleKooste"],
      ["PaatosOsa", "KappaleKooste"],
    ]),
    content_text: firstText(body, [
      ["KohtaSisalto", "KappaleKooste"],
      ["SuunnitelmaSisalto", "KappaleKooste"],
      ["KappaleKooste"],
    ]),
    question_text: firstText(body, [["KysymysOsa", "KappaleKooste"]]),
    answer_text: firstText(body, [
      ["VastausOsa", "KappaleKooste"],
      ["EduskunnanVastaus", "KappaleKooste"],
    ]),
    decision_text: firstText(body, [["PaatosOsa", "KappaleKooste"]]),
    statement_text: firstText(body, [
      ["LausumaKannanottoOsa", "KappaleKooste"],
      ["LausumaKannanotto", "KappaleKooste"],
    ]),
    justification_text: firstText(body, [
      ["PerusteluOsa", "KappaleKooste"],
      ["TalousarvioPerusteluOsa", "KappaleKooste"],
    ]),
    proposal_text: firstText(body, [["PonsiOsa", "KappaleKooste"]]),
    statute_text: firstText(body, [
      ["SaadosOsa", "KappaleKooste"],
      ["VoimaantuloSaannosOsa", "KappaleKooste"],
    ]),
    signing_text: firstText(body, [["AllekirjoitusOsa", "KappaleKooste"]]),
    note_text: firstText(body, [
      ["HuomautusTeksti"],
      ["MuistioOsa", "KappaleKooste"],
      ["LiiteOsa", "KappaleKooste"],
    ]),
    meeting_start: body?.["@_kokousAloitusHetki"] ?? null,
    meeting_end: body?.["@_kokousLopetusHetki"] ?? null,
    agenda_state: body?.["@_ennakkotietoTilaKoodi"] ?? body?.["@_tilaKoodi"] ?? null,
    related_document_tunnus: firstText(body, [
      ["MuuAsiakohta", "KohtaAsiakirja", "AsiakirjaTunnus"],
      ["MuuAsiakohta", "KohtaAsiakirja", "AsiakirjaNimekeTeksti"],
      ["KohtaAsiakirja", "AsiakirjaTunnus"],
      ["KohtaAsiakirja", "AsiakirjaNimekeTeksti"],
    ]),
  };
}

function insertSessionMinutesItems(documentId: number, body: any, sessionKey: string | null) {
  if (!sessionKey) return;

  const items: Array<{ item: any; itemType: string }> = [
    ...ensureArray(body?.Asiakohta).map((item: any) => ({ item, itemType: "asiakohta" })),
    ...ensureArray(body?.MuuAsiakohta).map((item: any) => ({ item, itemType: "muu_asiakohta" })),
  ];

  if (items.length === 0) return;

  const rows = items.map(({ item, itemType }, idx) => ({
    session_key: sessionKey,
    minutes_document_id: documentId,
    item_type: itemType,
    ordinal: idx + 1,
    title:
      textValue(item?.Otsikko) ??
      textValue(item?.KohtaNimeke) ??
      textValue(item?.KohtaAsia?.Nimeke?.NimekeTeksti) ??
      textValue(item?.KohtaAsia?.NimekeTeksti) ??
      null,
    identifier_text:
      textValue(item?.Tunniste) ??
      textValue(item?.KohtaNumero) ??
      textValue(item?.KohtaAsia?.AsiakirjaTunnus) ??
      null,
    processing_title: textValue(item?.KasittelyotsikkoTeksti) ?? null,
    note: textValue(item?.HuomautusTeksti) ?? null,
    source_item_id: toInt(item?.["@_muuTunnus"]),
    source_parent_item_id: toInt(item?.["@_paakohtaTunnus"]),
  }));

  insertRows("SessionMinutesItem", rows);

  if (!currentDb) return;

  for (const row of rows) {
    const sectionKey = resolveSectionKey(
      currentDb!,
      sessionKey,
      row.source_item_id ?? null,
      row.ordinal ?? 0,
    );

    if (!sectionKey) continue;

    safeRun(
      `UPDATE Section
       SET source_section_id = COALESCE(source_section_id, ?),
           source_parent_section_id = COALESCE(source_parent_section_id, ?),
           document_id = COALESCE(document_id, ?)
       WHERE key = ?`,
      [row.source_item_id, row.source_parent_item_id, documentId, sectionKey],
    );
  }
}

function generateLinkKey(startTime: string | null, personId: string | null): string {
  const match = startTime?.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  const yyyymmdd = match ? `${match[1]}${match[2]}${match[3]}` : "00000000";
  return [yyyymmdd, personId ?? "0"]
    .map((s) => String(s).toLowerCase().replace(/[^0-9a-z]/g, ""))
    .join("_");
}

function insertMinutesSpeeches(documentId: number, body: any, sessionKey: string | null) {
  if (!sessionKey || !currentDb) return;

  const items = [
    ...ensureArray(body?.Asiakohta),
    ...ensureArray(body?.MuuAsiakohta),
  ];

  if (items.length === 0) return;

  const rows: any[] = [];
  let sectionOrdinal = 0;

  for (const item of items) {
    sectionOrdinal += 1;
    const sourceItemId = toInt(item?.["@_muuTunnus"]);
    const keskustelu = ensureArray(item?.KeskusteluToimenpide);

    for (const k of keskustelu) {
      const puheenvuorot = ensureArray(k?.PuheenvuoroToimenpide);
      for (const pv of puheenvuorot) {
        const henkilo = pv?.Toimija?.Henkilo;
        if (!henkilo) continue;

        const puheenvuoroOsa = pv?.PuheenvuoroOsa;
        const kohtaSisalto = puheenvuoroOsa?.KohtaSisalto;
        const content = textFromKappaleKooste(kohtaSisalto?.KappaleKooste);
        if (!content) continue;

        const personId = henkilo?.["@_muuTunnus"] ?? null;
        const startTime =
          puheenvuoroOsa?.["@_puheenvuoroAloitusHetki"] ??
          pv?.["@_puheenvuoroAloitusHetki"] ??
          null;
        const endTime =
          puheenvuoroOsa?.["@_puheenvuoroLopetusHetki"] ??
          pv?.["@_puheenvuoroLopetusHetki"] ??
          null;

        rows.push({
          section_ordinal: sectionOrdinal,
          speech_ordinal: toInt(puheenvuoroOsa?.["@_puheenvuoroJNro"]),
          person_id: toInt(personId),
          first_name: henkilo?.EtuNimi ?? null,
          last_name: henkilo?.SukuNimi ?? null,
          party: toLower(henkilo?.LisatietoTeksti),
          position: henkilo?.AsemaTeksti ?? null,
          speech_type: normalizeSpeechType(pv?.TarkenneTeksti ?? null),
          start_time: startTime,
          end_time: endTime,
          content,
          source_item_id: sourceItemId,
        });
      }
    }
  }

  if (rows.length === 0) return;

  rows.sort((a, b) => String(a.start_time ?? "").localeCompare(String(b.start_time ?? "")));
  const counts = new Map<string, number>();
  for (const row of rows) {
    const base = generateLinkKey(
      row.start_time ?? null,
      row.person_id ? String(row.person_id) : null,
    );
    const next = (counts.get(base) ?? 0) + 1;
    counts.set(base, next);
    row.link_key = next === 1 ? base : `${base}_${next}`;
  }

  const sessionSpeechRows = rows
    .map((row) => {
      const sectionKey = resolveSectionKey(
        currentDb!,
        sessionKey,
        row.source_item_id ?? null,
        row.section_ordinal ?? 0,
      );
      if (!sectionKey) return null;

      return {
        session_key: sessionKey,
        section_key: sectionKey,
        minutes_item_id: null,
        source_document_id: documentId,
        section_ordinal: row.section_ordinal ?? null,
        speech_ordinal: row.speech_ordinal ?? null,
        person_id: row.person_id ?? null,
        first_name: row.first_name ?? null,
        last_name: row.last_name ?? null,
        party: row.party ?? null,
        position: row.position ?? null,
        speech_type: row.speech_type ?? null,
        start_time: row.start_time ?? null,
        end_time: row.end_time ?? null,
        content: row.content ?? null,
        link_key: row.link_key ?? null,
        source_item_id: row.source_item_id ?? null,
        source_path: null,
      };
    })
    .filter(Boolean) as any[];

  if (sessionSpeechRows.length > 0) {
    insertRows("SessionSectionSpeech", sessionSpeechRows);
  }
}

resetState();

export default (db: Database) => {
  resetState();
  currentDb = db;
  batcher = createBatchingInserter(db, 1000);

  return async (row: any) => {
    if (row._skip) return;

    const entry: VaskiEntry = {
      id: row.id,
      eduskuntaTunnus: row.eduskuntaTunnus,
      status: row.status,
      created: row.created,
      attachmentGroupId: row.attachmentGroupId,
      rootType: row.rootType ?? null,
      contents: row.contents,
    };

    const docId = parseInt(String(entry.id), 10);
    if (Number.isNaN(docId)) return;

    const siirto = entry.contents?.Siirto;
    const sanoma = siirto?.Sanomavalitys ?? {};
    const meta = siirto?.SiirtoMetatieto ?? {};
    const julkaisu = meta?.JulkaisuMetatieto ?? meta?.SiirtoMetatieto ?? meta;
    const ident = julkaisu?.IdentifiointiOsa ?? {};
    const kokous = julkaisu?.KokousViite ?? {};
    const rakenne = siirto?.SiirtoAsiakirja?.RakenneAsiakirja;
    const rootKeys = rakenne ? Object.keys(rakenne) : [];
    const root = row.rootType ?? (rootKeys.length > 0 ? rootKeys[0] : null);
    const body = root && isObject(rakenne) ? rakenne[root] : null;

    const tunniste = ident?.EduskuntaTunniste ?? {};
    const title = ident?.Nimeke?.NimekeTeksti ?? null;
    const alternativeTitle = ident?.Nimeke?.["@_vaihtoehtoinenNimekeTeksti"] ?? null;
    const typeName = ident?.AsiakirjatyyppiNimi ?? julkaisu?.["@_asiakirjatyyppiNimi"] ?? null;
    const typeSlug = slugify(typeName ?? "unknown");
    const sourcePath = row.sourcePath ?? row.path ?? null;

    const sessionKey = deriveSessionKey(
      tunniste?.AsiakirjaNroTeksti,
      tunniste?.ValtiopaivavuosiTeksti,
      entry.eduskuntaTunnus,
    );

    insertRows("Document", [
      {
        id: docId,
        type_slug: typeSlug,
        type_name_fi: typeName,
        root_family: root,
        eduskunta_tunnus: entry.eduskuntaTunnus ?? null,
        document_type_code: tunniste?.AsiakirjatyyppiKoodi
          ? normalizeDocTypeCode(tunniste.AsiakirjatyyppiKoodi)
          : null,
        document_number_text: tunniste?.AsiakirjaNroTeksti ?? null,
        parliamentary_year_text: tunniste?.ValtiopaivavuosiTeksti ?? null,
        title,
        alternative_title: alternativeTitle,
        status_text: normalizeStatus(entry.status ?? null),
        language_code: julkaisu?.["@_kieliKoodi"] ?? null,
        publicity_code: julkaisu?.["@_julkisuusKoodi"] ?? null,
        created_at: entry.created ?? null,
        laadinta_pvm: julkaisu?.["@_laadintaPvm"] ?? ident?.LaadintaPvmTeksti ?? null,
        source_identifiointi_tunnus: julkaisu?.["@_identifiointiTunnus"] ?? null,
        source_muu_tunnus: julkaisu?.["@_muuTunnus"] ?? null,
        primary_task_code: julkaisu?.["@_paatehtavaKoodi"] ?? null,
        structure_schema_name: julkaisu?.["@_rakennemaarittelyNimi"] ?? null,
        message_type: sanoma?.SanomatyyppiNimi ?? null,
        message_id: sanoma?.SanomaTunnus ?? null,
        message_created_at: sanoma?.LuontiHetki ?? null,
        transfer_code: sanoma?.SiirtoKoodi ?? null,
        organization_slug: slugify(kokous?.YhteisoTeksti ?? "no-yhteiso"),
        organization_name: kokous?.YhteisoTeksti ?? null,
        meeting_slug: slugify(kokous?.["@_kokousTunnus"] ?? "no-kokous"),
        source_path: sourcePath,
      },
    ]);

    if (sessionKey && typeSlug === "nimenhuutoraportti") {
      safeRun(`UPDATE Session SET roll_call_document_id = ? WHERE key = ?`, [docId, sessionKey]);
    }

    if (sessionKey && typeSlug === "paivajarjestys") {
      safeRun(`UPDATE Session SET agenda_document_id = ? WHERE key = ?`, [docId, sessionKey]);
    }

    if (sessionKey && (typeSlug === "poytakirja" || typeSlug === "taysistunnon_poytakirjan_paasivu")) {
      safeRun(`UPDATE Session SET minutes_document_id = ? WHERE key = ?`, [docId, sessionKey]);
    }

    const subjects = ensureArray(julkaisu?.Aihe)
      .map((s: any) => ({
        subject_text: textValue(s?.AiheTeksti),
        subject_uri: textValue(s?.["@_muuTunnus"]) ?? null,
      }))
      .filter((s: any) => s.subject_text);

    if (subjects.length > 0) {
      insertRows(
        "DocumentSubject",
        subjects.map((s: any) => ({
          document_id: docId,
          subject_text: s.subject_text,
          subject_uri: s.subject_uri,
        })),
      );
    }

    const attachments = ensureArray(entry.contents?.Siirto?.SiirtoTiedosto?.Document).map(
      (d: any) => ({
        native_id: d?.NativeId ?? null,
        use_type: d?.UseType ?? null,
        file_name: d?.File?.Name ?? null,
        file_path: d?.File?.Path ?? null,
        format_name: d?.Format?.Name ?? null,
        format_version: d?.Format?.Version ?? null,
        hash_algorithm: d?.HashAlgorithm ?? null,
        hash_value: d?.HashValue ?? null,
      }),
    );

    if (attachments.length > 0) {
      insertRows(
        "DocumentAttachment",
        attachments.map((a) => ({
          document_id: docId,
          ...a,
        })),
      );
    }

    const sanomaActors = ensureArray(sanoma?.Toimija).map((t: any) => ({
      role_code: t?.["@_rooliKoodi"] ?? null,
      person_id: toInt(t?.Henkilo?.["@_muuTunnus"]) ?? null,
      first_name: textValue(t?.Henkilo?.EtuNimi) ?? null,
      last_name: textValue(t?.Henkilo?.SukuNimi) ?? null,
      position_text: textValue(t?.TarkennusAsemaTeksti) ?? null,
      organization_text: textValue(t?.YhteisoTeksti) ?? null,
      extra_text: textValue(t?.Henkilo?.LisatietoTeksti) ?? null,
    }));

    const identActors = ensureArray(ident?.Toimija).map((t: any) => ({
      role_code: t?.["@_rooliKoodi"] ?? null,
      person_id: toInt(t?.Henkilo?.["@_muuTunnus"]) ?? null,
      first_name: textValue(t?.Henkilo?.EtuNimi) ?? null,
      last_name: textValue(t?.Henkilo?.SukuNimi) ?? null,
      position_text: textValue(t?.TarkennusAsemaTeksti) ?? null,
      organization_text: textValue(t?.YhteisoTeksti) ?? null,
      extra_text: textValue(t?.Henkilo?.LisatietoTeksti) ?? null,
    }));

    const allActors = [...sanomaActors, ...identActors].filter(
      (a) => a.first_name || a.last_name || a.organization_text || a.position_text,
    );

    if (allActors.length > 0) {
      insertRows(
        "DocumentActor",
        allActors.map((a) => ({
          document_id: docId,
          role_code: normalizeRole(a.role_code),
          person_id: a.person_id,
          first_name: a.first_name,
          last_name: a.last_name,
          position_text: a.position_text,
          organization_text: a.organization_text,
          extra_text: a.extra_text,
        })),
      );
    }

    const vireilletulo = ensureArray(ident?.Vireilletulo)
      .map((v: any) => v?.EduskuntaTunnus)
      .filter(Boolean);

    const relationshipType = (() => {
      if (typeName === "Vastaus kirjalliseen kysymykseen") return "answer_to";
      if (typeName === "Valiokunnan mietintö" || typeName === "Valiokunnan lausunto") {
        return "source_proposal";
      }
      return "vireilletulo";
    })();

    if (vireilletulo.length > 0) {
      insertRows(
        "DocumentRelation",
        vireilletulo.map((t) => ({
          document_id: docId,
          relation_type: relationshipType,
          target_tunnus: t,
          target_system: "Eduskunta",
          source_field: "IdentifiointiOsa.Vireilletulo.EduskuntaTunnus",
        })),
      );
    }

    if (root && body) {
      const perTypeTable = `DocType_${typeSlug}`;
      const perTypeRow = buildPerTypeRow({
        documentId: docId,
        title,
        alternativeTitle,
        body,
      });

      if (currentDb && hasTable(currentDb, perTypeTable)) {
        insertRows(perTypeTable, [perTypeRow]);
      } else {
        insertRows("DocType_unknown", [perTypeRow]);
      }
    }

    if (root === "Paivajarjestys" || root === "Poytakirja" || root === "PoytakirjaAsiakohta") {
      insertSessionMinutesItems(docId, body, sessionKey);
    }

    if (root === "Poytakirja" || root === "PoytakirjaAsiakohta") {
      insertMinutesSpeeches(docId, body, sessionKey);
    }

    if (root === "PoytakirjaLiite" && sessionKey) {
      const relatedDocumentTunnus = firstText(body, [
        ["MuuAsiakohta", "KohtaAsiakirja", "AsiakirjaTunnus"],
        ["MuuAsiakohta", "KohtaAsiakirja", "AsiakirjaNimekeTeksti"],
      ]);

      insertRows("SessionMinutesAttachment", [
        {
          session_key: sessionKey,
          minutes_document_id: docId,
          minutes_item_id: null,
          title: title ?? null,
          related_document_tunnus: relatedDocumentTunnus,
          file_name: null,
          file_path: null,
          native_id: null,
        },
      ]);
    }

    upsertCommitteeSessionForDocument({
      documentId: docId,
      organizationName: kokous?.YhteisoTeksti ?? null,
      meetingId: kokous?.["@_kokousTunnus"] ?? null,
      documentNumberText: tunniste?.AsiakirjaNroTeksti ?? null,
      parliamentaryYearText: tunniste?.ValtiopaivavuosiTeksti ?? null,
      meetingStart: body?.["@_kokousAloitusHetki"] ?? null,
      meetingEnd: body?.["@_kokousLopetusHetki"] ?? null,
      sourcePath,
    });
  };
};

export function flushVotes() {
  if (batcher) {
    batcher.flushAll();
  }
  resetState();
}
