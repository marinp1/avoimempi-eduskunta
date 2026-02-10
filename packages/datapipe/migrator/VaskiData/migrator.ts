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
      const k = node.KursiiviTeksti;
      parts.push(typeof k === "string" ? k : Array.isArray(k) ? k.join(" ") : "");
    }
    if (node.LihavaTeksti) {
      const l = node.LihavaTeksti;
      parts.push(typeof l === "string" ? l : Array.isArray(l) ? l.join(" ") : "");
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

const docTypeFromRoot = (root: string): string => {
  switch (root) {
    case "HallituksenEsitys":
      return "VaskiGovernmentProposal";
    case "Kysymys":
      return "VaskiWrittenQuestion";
    case "EduskunnanVastaus":
      return "VaskiWrittenAnswer";
    case "Mietinto":
      return "VaskiCommitteeReport";
    case "Lausunto":
      return "VaskiCommitteeOpinion";
    case "Lakialoite":
      return "VaskiLegislativeInitiative";
    case "EduskuntaAloite":
      return "VaskiParliamentInitiative";
    case "Kirjelma":
      return "VaskiLetter";
    case "Paivajarjestys":
      return "VaskiAgenda";
    case "Esityslista":
      return "VaskiMeetingAgenda";
    case "KokousPoytakirja":
      return "VaskiMeetingMinutes";
    case "KokousSuunnitelma":
      return "VaskiMeetingPlan";
    case "Poytakirja":
      return "VaskiPlenaryMinutes";
    case "PoytakirjaAsiakohta":
      return "VaskiMinutesSection";
    case "PoytakirjaLiite":
      return "VaskiMinutesAttachment";
    case "KasittelytiedotValtiopaivaasia":
      return "VaskiProceedingInfo";
    case "KasittelytiedotLausumaasia":
      return "VaskiStatementProceedingInfo";
    case "TalousarvioKirjelma":
      return "VaskiBudgetLetter";
    case "TalousarvioMietinto":
      return "VaskiBudgetReport";
    case "SaadoskokoelmaEduskunnanVastaus":
      return "VaskiStatuteCollectionAnswer";
    case "SaadoskokoelmaTalousarvioKirjelma":
      return "VaskiStatuteCollectionBudgetLetter";
    case "Tilasto":
      return "VaskiStatistic";
    default:
      return root;
  }
};

let batcher: ReturnType<typeof createBatchingInserter> | null = null;
let currentDb: Database | null = null;

function resetState() {
  batcher = null;
  currentDb = null;
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
      contents: row.contents,
    };

    const siirto = entry.contents?.Siirto;
    const sanoma = siirto?.Sanomavalitys ?? {};
    const meta = siirto?.SiirtoMetatieto ?? {};
    const julkaisu = meta?.JulkaisuMetatieto ?? meta?.SiirtoMetatieto ?? meta;
    const ident = julkaisu?.IdentifiointiOsa ?? {};
    const kokous = julkaisu?.KokousViite ?? {};

    const tunniste = ident?.EduskuntaTunniste ?? {};
    const title = ident?.Nimeke?.NimekeTeksti ?? null;
    const alternativeTitle = ident?.Nimeke?.["@_vaihtoehtoinenNimekeTeksti"] ?? null;
    const summaryCandidate = firstText(entry.contents, [
      ["Siirto", "SiirtoAsiakirja", "RakenneAsiakirja", "HallituksenEsitys", "SisaltoKuvaus", "KappaleKooste"],
      ["Siirto", "SiirtoAsiakirja", "RakenneAsiakirja", "Lakialoite", "SisaltoKuvaus", "KappaleKooste"],
      ["Siirto", "SiirtoAsiakirja", "RakenneAsiakirja", "EduskuntaAloite", "SisaltoKuvaus", "KappaleKooste"],
      ["Siirto", "SiirtoAsiakirja", "RakenneAsiakirja", "Mietinto", "SisaltoKuvaus", "KappaleKooste"],
      ["Siirto", "SiirtoAsiakirja", "RakenneAsiakirja", "Lausunto", "SisaltoKuvaus", "KappaleKooste"],
      ["Siirto", "SiirtoAsiakirja", "RakenneAsiakirja", "Kirjelma", "SisaltoKuvaus", "KappaleKooste"],
      ["Siirto", "SiirtoAsiakirja", "RakenneAsiakirja", "Poytakirja", "SisaltoKuvaus", "KappaleKooste"],
      ["Siirto", "SiirtoAsiakirja", "RakenneAsiakirja", "KokousPoytakirja", "SisaltoKuvaus", "KappaleKooste"],
    ]);

    const documentRow: DatabaseTables.VaskiDocument = {
      id: parseInt(entry.id, 10),
      eduskunta_tunnus: entry.eduskuntaTunnus ?? null,
      document_type_name: ident?.AsiakirjatyyppiNimi ?? julkaisu?.["@_asiakirjatyyppiNimi"] ?? null,
      document_type_code: tunniste?.AsiakirjatyyppiKoodi
        ? normalizeDocTypeCode(tunniste.AsiakirjatyyppiKoodi)
        : null,
      language_code: julkaisu?.["@_kieliKoodi"] ?? null,
      publicity_code: julkaisu?.["@_julkisuusKoodi"] ?? null,
      status: normalizeStatus(entry.status ?? null),
      created: entry.created ?? null,
      attachment_group_id: entry.attachmentGroupId ? parseInt(entry.attachmentGroupId, 10) : null,
      version_text: julkaisu?.["@_versioTeksti"] ?? null,
      laadinta_pvm: julkaisu?.["@_laadintaPvm"] ?? ident?.LaadintaPvmTeksti ?? null,
      muu_tunnus: julkaisu?.["@_muuTunnus"] ?? null,
      paatehtava_koodi: julkaisu?.["@_paatehtavaKoodi"] ?? null,
      rakennemaarittely_nimi: julkaisu?.["@_rakennemaarittelyNimi"] ?? null,
      message_type: sanoma?.SanomatyyppiNimi ?? null,
      message_id: sanoma?.SanomaTunnus ?? null,
      message_created: sanoma?.LuontiHetki ?? null,
      transfer_code: sanoma?.SiirtoKoodi ?? null,
      meeting_id: kokous?.["@_kokousTunnus"] ?? null,
      meeting_org: kokous?.YhteisoTeksti ?? null,
      title,
      alternative_title: alternativeTitle,
      document_number: tunniste?.AsiakirjaNroTeksti ?? null,
      parliamentary_year: tunniste?.ValtiopaivavuosiTeksti ?? null,
      summary_text: summaryCandidate,
    };

    batcher?.insertRows("VaskiDocument", [documentRow]);

    const docId = documentRow.id;

    // Identifiers
    const identifiers = [
      ["eduskunta_tunnus", entry.eduskuntaTunnus],
      ["asiakirjatyyppi_koodi", tunniste?.AsiakirjatyyppiKoodi],
      ["asiakirja_nro", tunniste?.AsiakirjaNroTeksti],
      ["valtiopaivavuosi", tunniste?.ValtiopaivavuosiTeksti],
      ["eutori_tunnus", ident?.EutoriTunnus],
      ["identifiointi_tunnus", julkaisu?.["@_identifiointiTunnus"]],
    ].filter(([, v]) => v);

    if (identifiers.length > 0) {
      batcher?.insertRows(
        "VaskiIdentifier",
        identifiers.map(([type, value]) => ({
          document_id: docId,
          identifier_type: type as string,
          identifier_value: String(value),
        })),
      );
    }

    // Subjects
    const subjects = ensureArray(julkaisu?.Aihe)
      .map((s: any) => ({
        subject_text: textValue(s?.AiheTeksti),
        yso_url: textValue(s?.["@_muuTunnus"]) ?? null,
      }))
      .filter((s: any) => s.subject_text);

    if (subjects.length > 0) {
      batcher?.insertRows(
        "VaskiSubject",
        subjects.map((s: any) => ({
          document_id: docId,
          subject_text: s.subject_text,
          yso_url: s.yso_url,
        })),
      );
    }

    // Attachments
    const docs = ensureArray(entry.contents?.Siirto?.SiirtoTiedosto?.Document).map(
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

    if (docs.length > 0) {
      batcher?.insertRows(
        "VaskiAttachment",
        docs.map((d) => ({ document_id: docId, ...d })),
      );
    }

    // Actors
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
      batcher?.insertRows(
        "VaskiDocumentActor",
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

    // Relationships
    const vireilletulo = ensureArray(ident?.Vireilletulo)
      .map((v: any) => v?.EduskuntaTunnus)
      .filter(Boolean);

    const relationshipType = (() => {
      const typeName = documentRow.document_type_name;
      if (typeName === "Vastaus kirjalliseen kysymykseen") return "answer_to";
      if (typeName === "Valiokunnan mietintö" || typeName === "Valiokunnan lausunto") return "source_proposal";
      return "vireilletulo";
    })();

    if (vireilletulo.length > 0) {
      batcher?.insertRows(
        "VaskiRelationship",
        vireilletulo.map((t) => ({
          document_id: docId,
          relationship_type: relationshipType,
          target_eduskunta_tunnus: t,
        })),
      );
    }

    // Body root
    const rakenne = entry.contents?.Siirto?.SiirtoAsiakirja?.RakenneAsiakirja;
    const rootKeys = rakenne ? Object.keys(rakenne) : [];
    const root = rootKeys.length > 0 ? rootKeys[0] : null;

    if (!root) return;

    const body = rakenne[root];

    switch (root) {
      case "HallituksenEsitys": {
        batcher?.insertRows("VaskiGovernmentProposal", [
          {
            document_id: docId,
            title,
            alternative_title: alternativeTitle,
            document_number: tunniste?.AsiakirjaNroTeksti ?? null,
            parliamentary_year: tunniste?.ValtiopaivavuosiTeksti ?? null,
            summary_text: firstText(body, [["SisaltoKuvaus", "KappaleKooste"]]),
            justification_text: firstText(body, [["PerusteluOsa", "KappaleKooste"]]),
            proposal_text: firstText(body, [["PonsiOsa", "KappaleKooste"]]),
            statute_text: firstText(body, [["SaadosOsa", "KappaleKooste"]]),
            signing_text: firstText(body, [["AllekirjoitusOsa", "KappaleKooste"]]),
            attachment_note: firstText(body, [["LiiteOsa", "KappaleKooste"]]),
          },
        ]);
        break;
      }
      case "Kysymys": {
        batcher?.insertRows("VaskiWrittenQuestion", [
          {
            document_id: docId,
            title,
            document_number: tunniste?.AsiakirjaNroTeksti ?? null,
            parliamentary_year: tunniste?.ValtiopaivavuosiTeksti ?? null,
            question_text: firstText(body, [["KysymysOsa", "KappaleKooste"]]),
            justification_text: firstText(body, [["PerusteluOsa", "KappaleKooste"]]),
            proposal_text: firstText(body, [["PonsiOsa", "KappaleKooste"]]),
            signing_text: firstText(body, [["AllekirjoitusOsa", "KappaleKooste"]]),
          },
        ]);
        break;
      }
      case "EduskunnanVastaus": {
        batcher?.insertRows("VaskiWrittenAnswer", [
          {
            document_id: docId,
            title,
            document_number: tunniste?.AsiakirjaNroTeksti ?? null,
            parliamentary_year: tunniste?.ValtiopaivavuosiTeksti ?? null,
            answer_text: firstText(body, [["PaatosOsa", "KappaleKooste"], ["SisaltoKuvaus", "KappaleKooste"]]),
            statement_text: firstText(body, [["LausumaKannanottoOsa", "KappaleKooste"]]),
            signing_text: firstText(body, [["AllekirjoitusOsa", "KappaleKooste"]]),
          },
        ]);
        break;
      }
      case "Mietinto": {
        batcher?.insertRows("VaskiCommitteeReport", [
          {
            document_id: docId,
            title,
            document_number: tunniste?.AsiakirjaNroTeksti ?? null,
            parliamentary_year: tunniste?.ValtiopaivavuosiTeksti ?? null,
            summary_text: firstText(body, [["SisaltoKuvaus", "KappaleKooste"]]),
            decision_text: firstText(body, [["PaatosOsa", "KappaleKooste"]]),
            statement_text: firstText(body, [["LausumaKannanottoOsa", "KappaleKooste"]]),
            justification_text: firstText(body, [["PerusteluOsa", "KappaleKooste"]]),
            minority_opinion_text: firstText(body, [["JasenMielipideOsa", "KappaleKooste"]]),
          },
        ]);
        break;
      }
      case "Lausunto": {
        batcher?.insertRows("VaskiCommitteeOpinion", [
          {
            document_id: docId,
            title,
            document_number: tunniste?.AsiakirjaNroTeksti ?? null,
            parliamentary_year: tunniste?.ValtiopaivavuosiTeksti ?? null,
            summary_text: firstText(body, [["SisaltoKuvaus", "KappaleKooste"]]),
            decision_text: firstText(body, [["PaatosOsa", "KappaleKooste"]]),
            statement_text: firstText(body, [["LausumaKannanottoOsa", "KappaleKooste"]]),
            justification_text: firstText(body, [["PerusteluOsa", "KappaleKooste"]]),
            minority_opinion_text: firstText(body, [["JasenMielipideOsa", "KappaleKooste"]]),
          },
        ]);
        break;
      }
      case "Lakialoite": {
        batcher?.insertRows("VaskiLegislativeInitiative", [
          {
            document_id: docId,
            title,
            document_number: tunniste?.AsiakirjaNroTeksti ?? null,
            parliamentary_year: tunniste?.ValtiopaivavuosiTeksti ?? null,
            summary_text: firstText(body, [["SisaltoKuvaus", "KappaleKooste"]]),
            justification_text: firstText(body, [["PerusteluOsa", "KappaleKooste"]]),
            proposal_text: firstText(body, [["PonsiOsa", "KappaleKooste"]]),
            statute_text: firstText(body, [["SaadosOsa", "KappaleKooste"]]),
            signing_text: firstText(body, [["AllekirjoitusOsa", "KappaleKooste"]]),
          },
        ]);
        break;
      }
      case "EduskuntaAloite": {
        batcher?.insertRows("VaskiParliamentInitiative", [
          {
            document_id: docId,
            title,
            document_number: tunniste?.AsiakirjaNroTeksti ?? null,
            parliamentary_year: tunniste?.ValtiopaivavuosiTeksti ?? null,
            summary_text: firstText(body, [["SisaltoKuvaus", "KappaleKooste"]]),
            justification_text: firstText(body, [["PerusteluOsa", "KappaleKooste"]]),
            proposal_text: firstText(body, [["PonsiOsa", "KappaleKooste"]]),
            signing_text: firstText(body, [["AllekirjoitusOsa", "KappaleKooste"]]),
          },
        ]);
        break;
      }
      case "Kirjelma": {
        batcher?.insertRows("VaskiLetter", [
          {
            document_id: docId,
            title,
            document_number: tunniste?.AsiakirjaNroTeksti ?? null,
            parliamentary_year: tunniste?.ValtiopaivavuosiTeksti ?? null,
            summary_text: firstText(body, [["SisaltoKuvaus", "KappaleKooste"]]),
            memo_text: firstText(body, [["MuistioOsa", "KappaleKooste"]]),
            signing_text: firstText(body, [["AllekirjoitusOsa", "KappaleKooste"]]),
          },
        ]);
        break;
      }
      case "Paivajarjestys": {
        batcher?.insertRows("VaskiAgenda", [
          {
            document_id: docId,
            meeting_start: body?.["@_kokousAloitusHetki"] ?? null,
            meeting_end: body?.["@_kokousLopetusHetki"] ?? null,
            agenda_state: body?.["@_ennakkotietoTilaKoodi"] ?? body?.["@_tilaKoodi"] ?? null,
          },
        ]);
        insertAgendaItems(docId, body, "Paivajarjestys");
        break;
      }
      case "Esityslista": {
        batcher?.insertRows("VaskiMeetingAgenda", [
          {
            document_id: docId,
            meeting_start: body?.["@_kokousAloitusHetki"] ?? null,
            meeting_end: body?.["@_kokousLopetusHetki"] ?? null,
          },
        ]);
        insertAgendaItems(docId, body, "Esityslista");
        insertParticipants(docId, body);
        break;
      }
      case "KokousPoytakirja": {
        batcher?.insertRows("VaskiMeetingMinutes", [
          {
            document_id: docId,
            meeting_start: body?.["@_kokousAloitusHetki"] ?? null,
            meeting_end: body?.["@_kokousLopetusHetki"] ?? null,
            summary_text: firstText(body, [["SisaltoKuvaus", "KappaleKooste"]]),
          },
        ]);
        insertAgendaItems(docId, body, "KokousPoytakirja");
        insertParticipants(docId, body);
        break;
      }
      case "KokousSuunnitelma": {
        batcher?.insertRows("VaskiMeetingPlan", [
          {
            document_id: docId,
            plan_text: firstText(body, [["SuunnitelmaSisalto", "KappaleKooste"]]),
          },
        ]);
        insertMeetings(docId, body);
        insertMeetingEvents(docId, body);
        break;
      }
      case "Poytakirja": {
        batcher?.insertRows("VaskiPlenaryMinutes", [
          {
            document_id: docId,
            meeting_start: body?.["@_kokousAloitusHetki"] ?? null,
            meeting_end: body?.["@_kokousLopetusHetki"] ?? null,
            summary_text: firstText(body, [["SisaltoKuvaus", "KappaleKooste"]]),
          },
        ]);
        insertMinutesSections(docId, body, "Poytakirja");
        insertMinutesSpeeches(docId, body, "Poytakirja");
        break;
      }
      case "PoytakirjaAsiakohta": {
        insertMinutesSections(docId, body, "PoytakirjaAsiakohta");
        insertMinutesSpeeches(docId, body, "PoytakirjaAsiakohta");
        break;
      }
      case "PoytakirjaLiite": {
        batcher?.insertRows("VaskiMinutesAttachment", [
          {
            document_id: docId,
            title,
            related_document_tunnus: firstText(body, [["MuuAsiakohta", "KohtaAsiakirja", "AsiakirjaTunnus"], ["MuuAsiakohta", "KohtaAsiakirja", "AsiakirjaNimekeTeksti"]]),
          },
        ]);
        break;
      }
      case "KasittelytiedotValtiopaivaasia": {
        batcher?.insertRows("VaskiProceedingInfo", [
          {
            document_id: docId,
            status_text: body?.["@_tilaKoodi"] ?? null,
            end_date: body?.["@_paattymisPvm"] ?? null,
            last_processing_phase: body?.["@_viimeisinKasittelyvaiheKoodi"] ?? null,
            last_general_phase: body?.["@_viimeisinYleinenKasittelyvaiheKoodi"] ?? null,
            decision_description: firstText(body, [["EduskuntakasittelyPaatosKuvaus", "KappaleKooste"]]),
          },
        ]);
        break;
      }
      case "KasittelytiedotLausumaasia": {
        batcher?.insertRows("VaskiStatementProceedingInfo", [
          {
            document_id: docId,
            statement_text: firstText(body, [["LausumaKannanotto", "KappaleKooste"]]),
            decision_text: firstText(body, [["LausumaToimenpideJulkaisu", "KappaleKooste"]]),
          },
        ]);
        break;
      }
      case "TalousarvioKirjelma": {
        batcher?.insertRows("VaskiBudgetLetter", [
          {
            document_id: docId,
            summary_text: firstText(body, [["SisaltoKuvaus", "KappaleKooste"], ["AsiaKuvaus", "KappaleKooste"]]),
            budget_justification_text: firstText(body, [["TalousarvioPerusteluOsa", "KappaleKooste"]]),
            decision_text: firstText(body, [["PaatosOsa", "KappaleKooste"], ["LausumaKannanottoOsa", "KappaleKooste"]]),
            statute_text: firstText(body, [["VoimaantuloSaannosOsa", "KappaleKooste"]]),
          },
        ]);
        break;
      }
      case "TalousarvioMietinto": {
        batcher?.insertRows("VaskiBudgetReport", [
          {
            document_id: docId,
            summary_text: firstText(body, [["SisaltoKuvaus", "KappaleKooste"], ["AsiaKuvaus", "KappaleKooste"]]),
            budget_justification_text: firstText(body, [["TalousarvioPerusteluOsa", "KappaleKooste"]]),
            decision_text: firstText(body, [["PaatosOsa", "KappaleKooste"], ["LausumaKannanottoOsa", "KappaleKooste"]]),
            minority_opinion_text: firstText(body, [["JasenMielipideOsa", "KappaleKooste"]]),
          },
        ]);
        break;
      }
      case "SaadoskokoelmaEduskunnanVastaus": {
        batcher?.insertRows("VaskiStatuteCollectionAnswer", [
          {
            document_id: docId,
            statute_text: firstText(body, [["SaadosOsa", "KappaleKooste"]]),
            signing_text: firstText(body, [["AllekirjoitusOsa", "KappaleKooste"]]),
          },
        ]);
        break;
      }
      case "SaadoskokoelmaTalousarvioKirjelma": {
        batcher?.insertRows("VaskiStatuteCollectionBudgetLetter", [
          {
            document_id: docId,
            budget_justification_text: firstText(body, [["TalousarvioPerusteluOsa", "KappaleKooste"]]),
            statute_text: firstText(body, [["VoimaantuloSaannosOsa", "KappaleKooste"]]),
            decision_text: firstText(body, [["PaatosOsa", "KappaleKooste"], ["LausumaKannanottoOsa", "KappaleKooste"]]),
          },
        ]);
        break;
      }
      case "Tilasto": {
        batcher?.insertRows("VaskiStatistic", [
          {
            document_id: docId,
            title: textValue(body?.TilastoPaaotsikkoTeksti) ?? null,
            subtitle: textValue(body?.TilastoValiotsikkoTeksti) ?? null,
            time_range: textValue(body?.["@_tilastoAikarajausTeksti"]) ?? null,
          },
        ]);
        insertStatisticGroups(docId, body, db);
        break;
      }
      default:
        break;
    }
  };
};

export function flushVotes() {
  if (batcher) {
    batcher.flushAll();
  }
  resetState();
}

function insertAgendaItems(documentId: number, body: any, source: string) {
  const items = [
    ...ensureArray(body?.Asiakohta),
    ...ensureArray(body?.MuuAsiakohta),
  ];

  if (items.length === 0) return;

  const rows = items.map((item: any, idx: number) => {
    const title =
      textValue(item?.Otsikko) ??
      textValue(item?.KohtaAsia?.Nimeke?.NimekeTeksti) ??
      textValue(item?.KohtaAsia?.NimekeTeksti) ??
      textValue(item?.KohtaAsiakirja?.NimekeTeksti) ??
      null;
    const identifier =
      textValue(item?.Tunniste) ??
      textValue(item?.KohtaAsia?.AsiakirjaTunnus) ??
      textValue(item?.KohtaAsiakirja?.AsiakirjaTunnus) ??
      null;
    const related =
      textValue(item?.KohtaAsiakirja?.AsiakirjaTunnus) ??
      textValue(item?.KohtaAsiakirja?.AsiakirjaNimekeTeksti) ??
      null;

    return {
      document_id: documentId,
      ordinal: idx + 1,
      title,
      identifier,
      note: textValue(item?.HuomautusTeksti) ?? null,
      processing_title: textValue(item?.KasittelyotsikkoTeksti) ?? null,
      related_document_tunnus: related,
    };
  });

  batcher?.insertRows("VaskiAgendaItem", rows);
}

function insertParticipants(documentId: number, body: any) {
  const participants = ensureArray(body?.OsallistujaOsa?.Osallistuja);
  if (participants.length === 0) return;

  const rows = participants.map((p: any, idx: number) => ({
    document_id: documentId,
    ordinal: idx + 1,
    name: textValue(p?.NimiTeksti) ?? textValue(p?.Nimi) ?? null,
    role: textValue(p?.RooliTeksti) ?? textValue(p?.Rooli) ?? null,
    organization: textValue(p?.YhteisoTeksti) ?? null,
  }));

  batcher?.insertRows("VaskiMeetingParticipant", rows);
}

function insertMeetingEvents(documentId: number, body: any) {
  const events = ensureArray(body?.Tapahtuma);
  if (events.length === 0) return;
  const rows = events.map((e: any, idx: number) => ({
    document_id: documentId,
    ordinal: idx + 1,
    title: textValue(e?.NimiTeksti) ?? textValue(e?.Nimi) ?? null,
    start_time: e?.["@_alkuHetki"] ?? null,
    end_time: e?.["@_loppuHetki"] ?? null,
    location: textValue(e?.PaikkaTeksti) ?? null,
    description: textFromKappaleKooste(e?.KuvausTeksti ?? e?.Kuvaus),
  }));
  batcher?.insertRows("VaskiMeetingEvent", rows);
}

function insertMeetings(documentId: number, body: any) {
  const meetings = ensureArray(body?.Kokous);
  if (meetings.length === 0) return;
  const rows = meetings.map((m: any, idx: number) => ({
    document_id: documentId,
    ordinal: idx + 1,
    meeting_start: m?.["@_kokousAloitusHetki"] ?? null,
    meeting_end: m?.["@_kokousLopetusHetki"] ?? null,
    title: textValue(m?.NimiTeksti) ?? null,
  }));
  batcher?.insertRows("VaskiMeeting", rows);
}

function insertMinutesSections(documentId: number, body: any, source: string) {
  const items = [
    ...ensureArray(body?.Asiakohta),
    ...ensureArray(body?.MuuAsiakohta),
  ];
  if (items.length === 0) return;

  const rows = items.map((item: any, idx: number) => ({
    document_id: documentId,
    section_ordinal: idx + 1,
    title:
      textValue(item?.Otsikko) ??
      textValue(item?.KohtaAsia?.Nimeke?.NimekeTeksti) ??
      null,
    agenda_item_identifier:
      textValue(item?.Tunniste) ?? textValue(item?.KohtaAsia?.AsiakirjaTunnus) ?? null,
    processing_title: textValue(item?.KasittelyotsikkoTeksti) ?? null,
    note: textValue(item?.HuomautusTeksti) ?? null,
  }));

  batcher?.insertRows("VaskiMinutesSection", rows);
}

function generateLinkKey(startTime: string | null, personId: string | null): string {
  const match = startTime?.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  const yyyymmdd = match ? `${match[1]}${match[2]}${match[3]}` : "00000000";
  return [yyyymmdd, personId ?? "0"]
    .map((s) => String(s).toLowerCase().replace(/[^0-9a-z]/g, ""))
    .join("_");
}

function insertMinutesSpeeches(documentId: number, body: any, source: string) {
  const items = [
    ...ensureArray(body?.Asiakohta),
    ...ensureArray(body?.MuuAsiakohta),
  ];

  if (items.length === 0) return;

  const rows: any[] = [];
  let sectionOrdinal = 0;

  for (const item of items) {
    sectionOrdinal += 1;
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
        const startTime = puheenvuoroOsa?.["@_puheenvuoroAloitusHetki"] ?? pv?.["@_puheenvuoroAloitusHetki"] ?? null;
        const endTime = puheenvuoroOsa?.["@_puheenvuoroLopetusHetki"] ?? pv?.["@_puheenvuoroLopetusHetki"] ?? null;
        const ordinal = toInt(puheenvuoroOsa?.["@_puheenvuoroJNro"]) ?? null;

        rows.push({
          document_id: documentId,
          section_ordinal: sectionOrdinal,
          ordinal,
          person_id: toInt(personId),
          first_name: henkilo?.EtuNimi ?? null,
          last_name: henkilo?.SukuNimi ?? null,
          party: toLower(henkilo?.LisatietoTeksti),
          position: henkilo?.AsemaTeksti ?? null,
          speech_type: normalizeSpeechType(pv?.TarkenneTeksti ?? null),
          start_time: startTime,
          end_time: endTime,
          content,
        });
      }
    }
  }

  if (rows.length > 0) {
    rows.sort((a, b) => String(a.start_time ?? "").localeCompare(String(b.start_time ?? "")));
    const counts = new Map<string, number>();
    for (const row of rows) {
      const base = generateLinkKey(row.start_time ?? null, row.person_id ? String(row.person_id) : null);
      const next = (counts.get(base) ?? 0) + 1;
      counts.set(base, next);
      row.link_key = next === 1 ? base : `${base}_${next}`;
    }
    batcher?.insertRows("VaskiMinutesSpeech", rows);
  }
}

function insertStatisticGroups(documentId: number, body: any, db: Database) {
  const groups = ensureArray(body?.TilastoTietoRyhma);
  if (groups.length === 0) return;

  const groupStmt = db.prepare(
    `INSERT INTO VaskiStatisticGroup (statistic_id, ordinal, title)
     VALUES ($statistic_id, $ordinal, $title)
     RETURNING id`,
  );
  const valueStmt = db.prepare(
    `INSERT INTO VaskiStatisticValue (group_id, ordinal, label, value)
     VALUES ($group_id, $ordinal, $label, $value)`,
  );

  for (let i = 0; i < groups.length; i++) {
    const group = groups[i];
    const groupResult = groupStmt.get({
      $statistic_id: documentId,
      $ordinal: i + 1,
      $title:
        textValue(group?.TilastoRyhmaOtsikkoTeksti) ??
        textValue(group?.TilastoOtsikkoTeksti) ??
        null,
    }) as { id: number } | undefined;

    const groupId = groupResult?.id;
    if (!groupId) continue;

    const values = ensureArray(group?.TilastoTietoRivi ?? group?.TilastoTieto);
    for (let j = 0; j < values.length; j++) {
      const v = values[j];
      valueStmt.run({
        $group_id: groupId,
        $ordinal: j + 1,
        $label: textValue(v?.TilastoTietoTeksti) ?? textValue(v?.OtsikkoTeksti) ?? null,
        $value: textValue(v?.ArvoTeksti) ?? textValue(v?.Arvo) ?? null,
      });
    }
  }
}
