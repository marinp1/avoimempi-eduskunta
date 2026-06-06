import Aanestykset from "../../../webapp/templates/pages/aanestykset";
import type {
  AanestyksetData,
  VoteRow,
  VoteGroup,
} from "../../../webapp/templates/pages/aanestykset-view-model";
import Analytiikka from "../../../webapp/templates/pages/analytiikka";
import Asiakirjat, {
  type AsiakirjatIndexData,
  type DocumentRow,
} from "../../../webapp/templates/pages/asiakirjat";
import Hallitukset from "../../../webapp/templates/pages/hallitukset";
import Home, { HomeReactive } from "../../../webapp/templates/pages/home";
import Muutokset from "../../../webapp/templates/pages/muutokset";
import Puolueet from "../../../webapp/templates/pages/puolueet";
import type {
  PuolueetData,
  PartyRow,
} from "../../../webapp/templates/pages/puolueet-view-model";
import { partyColor, partyShortName } from "../../../webapp/templates/helpers";
import { htmlResponse } from "../../../webapp/eta";
import {
  page,
  getTimelineData,
  setCursorCookie,
  readPeriod,
  getTermBounds,
  timelineOobHtml,
} from "./helpers";
import { assetVersion } from "./assets";
import type { WebappDeps } from "./deps";

export function createSimplePageRoutes(deps: WebappDeps) {
  return {
    "/": {
      GET: async (req: Request) => {
        const url = new URL(req.url);
        const dateParam = url.searchParams.get("date");
        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );
        const cursor = dateParam ?? tlData.cursor;

        const period = readPeriod(req, deps.metadataRepository);
        const bounds = getTermBounds(period, deps.metadataRepository);
        const data = await deps.homeRepository.fetchOverview({
          asOfDate: cursor,
          startDate: bounds.startDate,
          endDate: bounds.endDate,
          governmentStartDate: bounds.governmentStartDate,
        });
        const sessionCount = tlData.sittings.filter(
          (s) => s.d <= cursor,
        ).length;

        const isHtmx = req.headers.get("HX-Request") === "true";
        const cookieHeader = dateParam ? setCursorCookie(dateParam) : undefined;

        if (isHtmx) {
          const hxTarget = req.headers.get("HX-Target") || "";
          if (hxTarget.includes("tl-reactive") && dateParam) {
            const fragment = HomeReactive({ data, cursor, sessionCount });
            const headers: Record<string, string> = {
              "Content-Type": "text/html; charset=utf-8",
              Vary: "HX-Request",
            };
            if (cookieHeader) headers["Set-Cookie"] = cookieHeader;
            headers["HX-Replace-Url"] = `/?date=${encodeURIComponent(cursor)}`;
            return new Response(fragment, { headers });
          }

          const tlHtml = timelineOobHtml(tlData);
          const fullHeaders: Record<string, string> = {
            "Content-Type": "text/html; charset=utf-8",
            Vary: "HX-Request",
          };
          if (dateParam && cursor < tlData.today) {
            fullHeaders["HX-Replace-Url"] =
              `/?date=${encodeURIComponent(cursor)}`;
          }
          return new Response(
            tlHtml + Home({ title: "Etusivu", data, cursor, sessionCount }),
            { headers: fullHeaders },
          );
        }

        const resolvedTl = dateParam
          ? { ...tlData, cursor, cursorFormatted: formatFi(cursor) }
          : tlData;
        const resp = page(
          req,
          Home({ title: "Etusivu", data, cursor, sessionCount }),
          "/",
          "Etusivu",
          resolvedTl,
        );
        if (cookieHeader && resp.status === 200) {
          const bodyStr = await resp.text();
          return new Response(bodyStr, {
            status: resp.status,
            headers: {
              ...Object.fromEntries(resp.headers),
              "Set-Cookie": cookieHeader,
            },
          });
        }
        return resp;
      },
    },
    "/puolueet": {
      GET: (req: Request) => {
        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );
        const period = readPeriod(req, deps.metadataRepository);
        const bounds = getTermBounds(period, deps.metadataRepository);

        const summaryRows = deps.analyticsRepository.fetchPartySummary({
          asOfDate: tlData.cursor,
          startDate: bounds.startDate,
          endDate: bounds.endDate,
          governmentStartDate: bounds.governmentStartDate,
        });

        const partyDiscipline = deps.analyticsRepository.fetchPartyDiscipline({
          startDate: bounds.startDate,
          endDate: bounds.endDate,
        });

        const govSeats = summaryRows
          .filter((r) => r.is_in_government === 1)
          .reduce((s, r) => s + r.member_count, 0);
        const oppSeats = summaryRows
          .filter((r) => r.is_in_government === 0)
          .reduce((s, r) => s + r.member_count, 0);
        const totalSeats = govSeats + oppSeats;

        const fetchedAt = new Date().toLocaleString("fi-FI", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const rows: PartyRow[] = summaryRows.map((r) => {
          const disc = partyDiscipline?.find(
            (d) => d.party_code === r.party_code,
          );
          const cohesionPct = disc?.discipline_rate ?? null;
          return {
            code: r.party_code,
            name: partyShortName(r.party_display_code, r.party_name),
            shortName: r.party_display_code,
            color: partyColor(r.party_display_code),
            bloc: r.is_in_government === 1 ? "government" : "opposition",
            chairName: null,
            seatCount: r.member_count,
            seatShare:
              totalSeats > 0
                ? `${((r.member_count / totalSeats) * 100).toFixed(1)} %`
                : "–",
            cohesionPct: cohesionPct != null ? Math.round(cohesionPct) : null,
            cohesionLabel:
              cohesionPct != null ? `${Math.round(cohesionPct)} %` : "–",
          };
        });

        const data: PuolueetData = {
          rows,
          govSeats,
          oppSeats,
          totalSeats,
          fetchedAt,
        };

        return page(
          req,
          Puolueet({ title: "Puolueet", data }),
          "/puolueet",
          "Puolueet",
          tlData,
        );
      },
    },
    "/aanestykset": {
      GET: (req: Request) => {
        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );
        const period = readPeriod(req, deps.metadataRepository);
        const bounds = getTermBounds(period, deps.metadataRepository);

        const browseResult = deps.votingRepository.browseVotings({
          startDate: bounds.startDate,
          endDate: bounds.endDate,
          sort: "newest",
          limit: 500,
        });

        const fetchedAt = new Date().toLocaleString("fi-FI", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        // Group votes by session
        const groupMap = new Map<string, VoteRow[]>();
        for (const v of browseResult) {
          const nYes = v.n_yes ?? 0;
          const nNo = v.n_no ?? 0;
          const nEmpty = v.n_abstain ?? 0;
          const nAbsent = v.n_absent ?? 0;
          const nTotal = v.n_total ?? 0;
          const row: VoteRow = {
            id: v.id,
            votingNumber: v.number,
            time: v.start_time ?? "",
            title: v.title ?? "",
            questionText: (v.title ?? "").substring(0, 120),
            sessionKey: v.session_key ?? "",
            sessionDate: v.start_date ?? "",
            asiakohtaNum: v.section_order ?? null,
            sectionKey: v.section_key ?? null,
            documents: [],
            references: [],
            nYes,
            nNo,
            nEmpty,
            nAbsent,
            nTotal,
            yesPct: nTotal > 0 ? (nYes / nTotal) * 100 : 0,
            noPct: nTotal > 0 ? (nNo / nTotal) * 100 : 0,
            outcome: nYes > nNo ? "ok" : "no",
            outcomeLabel: nYes > nNo ? "Hyväksytty" : "Hylätty",
          };
          const sk = v.session_key ?? "";
          if (!groupMap.has(sk)) groupMap.set(sk, []);
          groupMap.get(sk)!.push(row);
        }

        const groups: VoteGroup[] = Array.from(groupMap.entries())
          .sort(([a], [b]) => b.localeCompare(a))
          .slice(0, 30)
          .map(([sessionKey, rows]) => ({
            sessionKey,
            sessionDate: rows[0]?.sessionDate ?? "",
            sessionDateLabel: `Täysistunto ${sessionKey}`,
            rows,
          }));

        const data: AanestyksetData = {
          groups,
          totalCount: browseResult.length,
          fetchedAt,
        };

        return page(
          req,
          Aanestykset({ title: "Äänestykset", data }),
          "/aanestykset",
          "Äänestykset",
          tlData,
        );
      },
    },
    "/asiakirjat": {
      GET: (req: Request) => {
        const url = new URL(req.url);
        const q = url.searchParams.get("q") ?? undefined;
        const kind = url.searchParams.get("kind") ?? undefined;
        const currentPage =
          parseInt(url.searchParams.get("page") ?? "1", 10) || 1;
        const limit = 50;

        const config = kind ? DOC_KINDS.find((c) => c.key === kind) : undefined;

        let rows: DocumentRow[];
        let totalCount: number;

        if (config) {
          const method = (deps.documentRepository as any)[
            config.repoMethod
          ] as Function;
          const result = method.call(deps.documentRepository, {
            query: q,
            page: currentPage,
            limit,
          });
          rows = (result.items as any[]).map((item) =>
            mapToDocRow(item, config),
          );
          totalCount = result.totalCount;
        } else {
          const allRows: DocumentRow[] = [];
          for (const c of DOC_KINDS) {
            try {
              const method = (deps.documentRepository as any)[
                c.repoMethod
              ] as Function;
              const result = method.call(deps.documentRepository, {
                query: q,
                page: 1,
                limit: 10,
              });
              for (const item of result.items as any[]) {
                allRows.push(mapToDocRow(item, c));
              }
            } catch {
              // Skip types that don't have data or fail
            }
          }
          allRows.sort(
            (a, b) => (b.date ?? "").localeCompare(a.date ?? "") || b.id - a.id,
          );
          const start = (currentPage - 1) * limit;
          rows = allRows.slice(start, start + limit);
          totalCount = allRows.length;
        }

        const fetchedAt = new Date().toLocaleString("fi-FI", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const data: AsiakirjatIndexData = {
          rows,
          totalCount,
          page: currentPage,
          totalPages: Math.ceil(totalCount / limit),
          kind: kind ?? "",
          fetchedAt,
        };

        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );

        const isHtmx = req.headers.get("HX-Request") === "true";
        if (isHtmx) {
          const hxTarget = req.headers.get("HX-Target") || "";
          if (
            hxTarget.includes("doc-root") ||
            hxTarget.includes("tl-reactive")
          ) {
            const fragment = Asiakirjat({
              title: "Asiakirjat",
              data,
              query: q,
              kind,
            });
            const tlHtml = timelineOobHtml(tlData);
            return new Response(tlHtml + fragment, {
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                Vary: "HX-Request",
              },
            });
          }

          const tlHtml = timelineOobHtml(tlData);
          return new Response(
            tlHtml + Asiakirjat({ title: "Asiakirjat", data, query: q, kind }),
            {
              headers: {
                "Content-Type": "text/html; charset=utf-8",
                Vary: "HX-Request",
              },
            },
          );
        }

        return page(
          req,
          Asiakirjat({ title: "Asiakirjat", data, query: q, kind }),
          "/asiakirjat",
          "Asiakirjat",
          tlData,
        );
      },
    },
    "/hallitukset": {
      GET: (req: Request) => {
        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );
        return page(
          req,
          Hallitukset({ title: "Hallitukset" }),
          "/hallitukset",
          "Hallitukset",
          tlData,
        );
      },
    },
    "/analytiikka": {
      GET: (req: Request) => {
        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );
        return page(
          req,
          Analytiikka({ title: "Analytiikka" }),
          "/analytiikka",
          "Analytiikka",
          tlData,
        );
      },
    },
    "/muutokset": {
      GET: (req: Request) => {
        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );
        return page(
          req,
          Muutokset({ title: "Muutokset" }),
          "/muutokset",
          "Muutokset",
          tlData,
        );
      },
    },
    "/laadunvalvonta": {
      GET: (req: Request) =>
        htmlResponse(
          req,
          `<title>Laadunvalvonta — Eduskuntapeili</title>
<section class="page-hero"><h1>Laadunvalvonta</h1></section>`,
          {
            activePath: "/laadunvalvonta",
            title: "Laadunvalvonta",
            assetVersion,
          },
        ),
    },
  } as const;
}

function formatFi(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y}`;
}

interface DocKindConfig {
  key: string;
  label: string;
  repoMethod: string;
  dateField: string;
  datePrefix: string;
  identifierField: string;
  authorFields: string[];
  partyField: string;
  highlightFields: string[];
  linkField: string;
  hasDetail: boolean;
  statusMapper: (item: any) => {
    label: string | null;
    class: string;
  };
}

const DOC_KINDS: DocKindConfig[] = [
  {
    key: "kk",
    label: "Kirjalliset kysymykset",
    repoMethod: "fetchWrittenQuestions",
    dateField: "submission_date",
    datePrefix: "Jätetty",
    identifierField: "parliament_identifier",
    authorFields: ["first_signer_first_name", "first_signer_last_name"],
    partyField: "first_signer_party",
    highlightFields: ["answer_minister_title"],
    linkField: "id",
    hasDetail: true,
    statusMapper: (item: any) =>
      item.answer_date
        ? { label: "Vastattu", class: "spill--done" }
        : { label: "Vireillä", class: "spill--draft" },
  },
  {
    key: "suullinen",
    label: "Suulliset kysymykset",
    repoMethod: "fetchOralQuestions",
    dateField: "submission_date",
    datePrefix: "Jätetty",
    identifierField: "parliament_identifier",
    authorFields: [],
    partyField: "",
    highlightFields: [],
    linkField: "id",
    hasDetail: true,
    statusMapper: (item: any) =>
      item.decision_outcome
        ? { label: "Käsitelty", class: "spill--done" }
        : { label: "Vireillä", class: "spill--draft" },
  },
  {
    key: "valikysymys",
    label: "Välikysymykset",
    repoMethod: "fetchInterpellations",
    dateField: "submission_date",
    datePrefix: "Jätetty",
    identifierField: "parliament_identifier",
    authorFields: ["first_signer_first_name", "first_signer_last_name"],
    partyField: "first_signer_party",
    highlightFields: [],
    linkField: "id",
    hasDetail: true,
    statusMapper: (item: any) =>
      item.decision_outcome
        ? { label: "Käsitelty", class: "spill--done" }
        : { label: "Vireillä", class: "spill--draft" },
  },
  {
    key: "vastaus",
    label: "Kirjalliset vastaukset",
    repoMethod: "fetchWrittenQuestionResponses",
    dateField: "answer_date",
    datePrefix: "Vastattu",
    identifierField: "parliament_identifier",
    authorFields: [],
    partyField: "",
    highlightFields: ["minister_title", "question_identifier"],
    linkField: "question_id",
    hasDetail: true,
    statusMapper: () => ({ label: "Vastaus", class: "spill--done" }),
  },
  {
    key: "he",
    label: "Hallituksen esitykset",
    repoMethod: "fetchGovernmentProposals",
    dateField: "submission_date",
    datePrefix: "Jätetty",
    identifierField: "parliament_identifier",
    authorFields: [],
    partyField: "",
    highlightFields: ["author"],
    linkField: "id",
    hasDetail: true,
    statusMapper: (item: any) =>
      item.decision_outcome
        ? { label: "Käsitelty", class: "spill--done" }
        : { label: "Vireillä", class: "spill--draft" },
  },
  {
    key: "aloite",
    label: "Lakialoitteet",
    repoMethod: "fetchLegislativeInitiatives",
    dateField: "submission_date",
    datePrefix: "Jätetty",
    identifierField: "parliament_identifier",
    authorFields: ["first_signer_first_name", "first_signer_last_name"],
    partyField: "first_signer_party",
    highlightFields: ["initiative_type_code"],
    linkField: "id",
    hasDetail: true,
    statusMapper: (item: any) =>
      item.decision_outcome
        ? { label: "Käsitelty", class: "spill--done" }
        : { label: "Vireillä", class: "spill--draft" },
  },
  {
    key: "mietinto",
    label: "Mietinnöt",
    repoMethod: "fetchCommitteeReports",
    dateField: "signature_date",
    datePrefix: "Annettu",
    identifierField: "parliament_identifier",
    authorFields: [],
    partyField: "",
    highlightFields: ["committee_name", "report_type_code"],
    linkField: "id",
    hasDetail: true,
    statusMapper: () => ({ label: null, class: "" }),
  },
  {
    key: "asiantuntija",
    label: "Asiantuntijalausunnot",
    repoMethod: "fetchExpertStatements",
    dateField: "meeting_date",
    datePrefix: "",
    identifierField: "edk_identifier",
    authorFields: [],
    partyField: "",
    highlightFields: ["committee_name", "bill_identifier"],
    linkField: "id",
    hasDetail: false,
    statusMapper: () => ({ label: null, class: "" }),
  },
  {
    key: "vastaus-edk",
    label: "Eduskunnan vastaukset",
    repoMethod: "fetchParliamentAnswers",
    dateField: "submission_date",
    datePrefix: "Annettu",
    identifierField: "parliament_identifier",
    authorFields: [],
    partyField: "",
    highlightFields: ["source_reference"],
    linkField: "id",
    hasDetail: true,
    statusMapper: () => ({ label: null, class: "" }),
  },
];

function mapToDocRow(item: any, config: DocKindConfig): DocumentRow {
  const date = item[config.dateField] ?? "";
  const dateLabel = date ? `${config.datePrefix} ${formatFi(date)}`.trim() : "";
  const status = config.statusMapper(item);
  const authorName =
    config.authorFields.length > 0
      ? config.authorFields
          .map((f: string) => item[f] ?? "")
          .filter(Boolean)
          .join(" ") || null
      : null;
  const authorParty = config.partyField
    ? (item[config.partyField] ?? null)
    : null;
  const highlight =
    config.highlightFields
      .map((f: string) => {
        const v = item[f];
        if (!v) return null;
        if (f === "initiative_type_code") {
          const LABELS: Record<string, string> = {
            LA: "Lakialoite",
            TPA: "Toimenpidealoite",
            RA: "Rahoitusaloite",
          };
          return LABELS[v] ?? v;
        }
        if (f === "report_type_code") {
          return v === "M" ? "Mietintö" : v === "L" ? "Lausunto" : v;
        }
        return String(v);
      })
      .filter(Boolean)
      .join(" · ") || null;

  const subjects: string[] = item.subjects
    ? item.subjects.split("||").filter(Boolean)
    : [];

  return {
    id: item.id,
    linkId: item[config.linkField] ?? item.id,
    hasDetail: config.hasDetail,
    kind: config.key,
    identifier: item[config.identifierField] ?? "",
    title: item.title ?? "",
    date,
    dateLabel,
    authorName,
    authorParty,
    authorPartyColor: partyColor(authorParty ?? ""),
    statusLabel: status.label,
    statusClass: status.class,
    subjects,
    highlight,
  };
}
