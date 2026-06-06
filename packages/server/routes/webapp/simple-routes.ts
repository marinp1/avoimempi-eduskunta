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
import {
  partyColor,
  partyShortName,
  fetchedAt,
} from "../../../webapp/templates/helpers";
import { htmlResponse } from "../../../webapp/eta";
import {
  page,
  getTimelineData,
  setCursorCookie,
  readPeriod,
  getTermBounds,
  timelineOobHtml,
  isHtmx,
  formatFi,
} from "./helpers";
import { assetVersion } from "./assets";
import type { WebappDeps } from "./deps";
import i18next from "i18next";

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

        const htmx = isHtmx(req);
        const cookieHeader = dateParam ? setCursorCookie(dateParam) : undefined;

        if (htmx) {
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
            tlHtml +
              Home({
                title: i18next.t("home:title"),
                data,
                cursor,
                sessionCount,
              }),
            { headers: fullHeaders },
          );
        }

        const resolvedTl = dateParam
          ? { ...tlData, cursor, cursorFormatted: formatFi(cursor) }
          : tlData;
        const resp = page(
          req,
          Home({ title: i18next.t("home:title"), data, cursor, sessionCount }),
          "/",
          i18next.t("home:title"),
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
          fetchedAt: fetchedAt(),
        };

        return page(
          req,
          Puolueet({ title: i18next.t("puolueet:title"), data }),
          "/puolueet",
          i18next.t("puolueet:title"),
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

        const url = new URL(req.url);
        const searchQuery = url.searchParams.get("q")?.trim().toLowerCase();

        const browseResult = deps.votingRepository.browseVotings({
          startDate: bounds.startDate,
          endDate: bounds.endDate,
          sort: "newest",
          limit: 500,
        });

        const filtered = searchQuery
          ? browseResult.filter(
              (v) =>
                (v.title ?? "").toLowerCase().includes(searchQuery) ||
                (v.session_key ?? "").toLowerCase().includes(searchQuery),
            )
          : browseResult;

        const groupMap = new Map<string, VoteRow[]>();
        for (const v of filtered) {
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
            outcomeLabel:
              nYes > nNo
                ? i18next.t("aanestykset:outcome_approved")
                : i18next.t("aanestykset:outcome_rejected"),
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
            sessionDateLabel: i18next.t("aanestykset:group_session_prefix", {
              key: sessionKey,
            }),
            rows,
          }));

        const data: AanestyksetData = {
          groups,
          totalCount: filtered.length,
          fetchedAt: fetchedAt(),
        };

        const pageUrl = searchQuery
          ? `/aanestykset?q=${encodeURIComponent(searchQuery)}`
          : "/aanestykset";

        return page(
          req,
          Aanestykset({ title: i18next.t("aanestykset:title"), data }),
          pageUrl,
          i18next.t("aanestykset:title"),
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
          const dispatch = DOC_KIND_DISPATCH[config.key]!;
          const result = dispatch(deps, { query: q, page: currentPage, limit });
          rows = result.items.map((item) => mapToDocRow(item, config));
          totalCount = result.totalCount;
        } else {
          const allRows: DocumentRow[] = [];
          for (const c of DOC_KINDS) {
            try {
              const dispatch = DOC_KIND_DISPATCH[c.key]!;
              const result = dispatch(deps, { query: q, page: 1, limit: 10 });
              for (const item of result.items) {
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

        const data: AsiakirjatIndexData = {
          rows,
          totalCount,
          page: currentPage,
          totalPages: Math.ceil(totalCount / limit),
          kind: kind ?? "",
          fetchedAt: fetchedAt(),
        };

        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );

        const htmx = isHtmx(req);
        if (htmx) {
          const hxTarget = req.headers.get("HX-Target") || "";
          if (
            hxTarget.includes("doc-root") ||
            hxTarget.includes("tl-reactive")
          ) {
            const fragment = Asiakirjat({
              title: i18next.t("asiakirjat:title"),
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
            tlHtml +
              Asiakirjat({
                title: i18next.t("asiakirjat:title"),
                data,
                query: q,
                kind,
              }),
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
          Asiakirjat({
            title: i18next.t("asiakirjat:title"),
            data,
            query: q,
            kind,
          }),
          "/asiakirjat",
          i18next.t("asiakirjat:title"),
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
          Hallitukset({ title: i18next.t("nav:governments") }),
          "/hallitukset",
          i18next.t("nav:governments"),
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
          Analytiikka({ title: i18next.t("nav:analytics") }),
          "/analytiikka",
          i18next.t("nav:analytics"),
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
          Muutokset({ title: i18next.t("nav:changes") }),
          "/muutokset",
          i18next.t("nav:changes"),
          tlData,
        );
      },
    },
    "/laadunvalvonta": {
      GET: (req: Request) =>
        htmlResponse(
          req,
          `<title>${i18next.t("common:page_title_format", { title: i18next.t("nav:quality_control"), brand: i18next.t("common:brand_name") })}</title>
<section class="page-hero"><h1>${i18next.t("nav:quality_control")}</h1></section>`,
          {
            activePath: "/laadunvalvonta",
            title: i18next.t("nav:quality_control"),
            assetVersion,
          },
        ),
    },
  } as const;
}

interface DocKindConfig {
  key: string;
  label: string;
  dateField: string;
  dateFormatKey: string;
  identifierField: string;
  authorFields: string[];
  partyField: string;
  highlightFields: string[];
  linkField: string;
  hasDetail: boolean;
  statusMapper: (item: Record<string, unknown>) => {
    label: string | null;
    class: string;
  };
}

type DocQueryParams = { query?: string; page: number; limit: number };
type DocResult = { items: Record<string, unknown>[]; totalCount: number };

const DOC_KIND_DISPATCH: Record<
  string,
  (deps: WebappDeps, params: DocQueryParams) => DocResult
> = {
  kk: (deps, params) => deps.documentRepository.fetchWrittenQuestions(params),
  suullinen: (deps, params) =>
    deps.documentRepository.fetchOralQuestions(params),
  valikysymys: (deps, params) =>
    deps.documentRepository.fetchInterpellations(params),
  vastaus: (deps, params) =>
    deps.documentRepository.fetchWrittenQuestionResponses(params),
  he: (deps, params) =>
    deps.documentRepository.fetchGovernmentProposals(params),
  aloite: (deps, params) =>
    deps.documentRepository.fetchLegislativeInitiatives(params),
  mietinto: (deps, params) =>
    deps.documentRepository.fetchCommitteeReports(params),
  asiantuntija: (deps, params) =>
    deps.documentRepository.fetchExpertStatements(params),
  "vastaus-edk": (deps, params) =>
    deps.documentRepository.fetchParliamentAnswers(params),
};

const DOC_KINDS: DocKindConfig[] = [
  {
    key: "kk",
    label: i18next.t("asiakirjat:chip_labels.kk"),
    dateField: "submission_date",
    dateFormatKey: "asiakirjat:status_labels.submitted_on",
    identifierField: "parliament_identifier",
    authorFields: ["first_signer_first_name", "first_signer_last_name"],
    partyField: "first_signer_party",
    highlightFields: ["answer_minister_title"],
    linkField: "id",
    hasDetail: true,
    statusMapper: (item) =>
      item.answer_date
        ? {
            label: i18next.t("asiakirjat:status_labels.answered"),
            class: "spill--done",
          }
        : {
            label: i18next.t("asiakirjat:status_labels.pending"),
            class: "spill--draft",
          },
  },
  {
    key: "suullinen",
    label: i18next.t("asiakirjat:chip_labels.suullinen"),
    dateField: "submission_date",
    dateFormatKey: "asiakirjat:status_labels.submitted_on",
    identifierField: "parliament_identifier",
    authorFields: [],
    partyField: "",
    highlightFields: [],
    linkField: "id",
    hasDetail: true,
    statusMapper: (item) =>
      item.decision_outcome
        ? {
            label: i18next.t("asiakirjat:status_labels.handled"),
            class: "spill--done",
          }
        : {
            label: i18next.t("asiakirjat:status_labels.pending"),
            class: "spill--draft",
          },
  },
  {
    key: "valikysymys",
    label: i18next.t("asiakirjat:chip_labels.valikysymys"),
    dateField: "submission_date",
    dateFormatKey: "asiakirjat:status_labels.submitted_on",
    identifierField: "parliament_identifier",
    authorFields: ["first_signer_first_name", "first_signer_last_name"],
    partyField: "first_signer_party",
    highlightFields: [],
    linkField: "id",
    hasDetail: true,
    statusMapper: (item) =>
      item.decision_outcome
        ? {
            label: i18next.t("asiakirjat:status_labels.handled"),
            class: "spill--done",
          }
        : {
            label: i18next.t("asiakirjat:status_labels.pending"),
            class: "spill--draft",
          },
  },
  {
    key: "vastaus",
    label: i18next.t("asiakirjat:chip_labels.vastaus"),
    dateField: "answer_date",
    dateFormatKey: "asiakirjat:status_labels.answered_on",
    identifierField: "parliament_identifier",
    authorFields: [],
    partyField: "",
    highlightFields: ["minister_title", "question_identifier"],
    linkField: "question_id",
    hasDetail: true,
    statusMapper: () => ({
      label: i18next.t("asiakirjat:status_labels.response"),
      class: "spill--done",
    }),
  },
  {
    key: "he",
    label: i18next.t("asiakirjat:chip_labels.he"),
    dateField: "submission_date",
    dateFormatKey: "asiakirjat:status_labels.submitted_on",
    identifierField: "parliament_identifier",
    authorFields: [],
    partyField: "",
    highlightFields: ["author"],
    linkField: "id",
    hasDetail: true,
    statusMapper: (item) =>
      item.decision_outcome
        ? {
            label: i18next.t("asiakirjat:status_labels.handled"),
            class: "spill--done",
          }
        : {
            label: i18next.t("asiakirjat:status_labels.pending"),
            class: "spill--draft",
          },
  },
  {
    key: "aloite",
    label: i18next.t("asiakirjat:chip_labels.aloite"),
    dateField: "submission_date",
    dateFormatKey: "asiakirjat:status_labels.submitted_on",
    identifierField: "parliament_identifier",
    authorFields: ["first_signer_first_name", "first_signer_last_name"],
    partyField: "first_signer_party",
    highlightFields: ["initiative_type_code"],
    linkField: "id",
    hasDetail: true,
    statusMapper: (item) =>
      item.decision_outcome
        ? {
            label: i18next.t("asiakirjat:status_labels.handled"),
            class: "spill--done",
          }
        : {
            label: i18next.t("asiakirjat:status_labels.pending"),
            class: "spill--draft",
          },
  },
  {
    key: "mietinto",
    label: i18next.t("asiakirjat:chip_labels.mietinto"),
    dateField: "signature_date",
    dateFormatKey: "asiakirjat:status_labels.given_on",
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
    label: i18next.t("asiakirjat:chip_labels.asiantuntija"),
    dateField: "meeting_date",
    dateFormatKey: "",
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
    label: i18next.t("asiakirjat:chip_labels.vastaus-edk"),
    dateField: "submission_date",
    dateFormatKey: "asiakirjat:status_labels.given_on",
    identifierField: "parliament_identifier",
    authorFields: [],
    partyField: "",
    highlightFields: ["source_reference"],
    linkField: "id",
    hasDetail: true,
    statusMapper: () => ({ label: null, class: "" }),
  },
];

function mapToDocRow(
  item: Record<string, unknown>,
  config: DocKindConfig,
): DocumentRow {
  const date = (item[config.dateField] as string) ?? "";
  const dateLabel =
    date && config.dateFormatKey
      ? i18next.t(config.dateFormatKey, { date: formatFi(date) })
      : "";
  const status = config.statusMapper(item);
  const authorName =
    config.authorFields.length > 0
      ? config.authorFields
          .map((f) => (item[f] as string) ?? "")
          .filter(Boolean)
          .join(" ") || null
      : null;
  const authorParty = config.partyField
    ? ((item[config.partyField] as string) ?? null)
    : null;
  const highlight =
    config.highlightFields
      .map((f) => {
        const v = item[f];
        if (!v) return null;
        if (f === "initiative_type_code") {
          const LABELS: Record<string, string> = {
            LA: i18next.t("asiakirjat:initiative_type_labels.LA"),
            TPA: i18next.t("asiakirjat:initiative_type_labels.TPA"),
            RA: i18next.t("asiakirjat:initiative_type_labels.RA"),
          };
          return LABELS[v as string] ?? String(v);
        }
        if (f === "report_type_code") {
          const vStr = v as string;
          return vStr === "M"
            ? i18next.t("asiakirjat:report_type_labels.M")
            : vStr === "L"
              ? i18next.t("asiakirjat:report_type_labels.L")
              : vStr;
        }
        return String(v);
      })
      .filter(Boolean)
      .join(" · ") || null;

  const subjects: string[] =
    typeof item.subjects === "string"
      ? (item.subjects as string).split("||").filter(Boolean)
      : [];

  return {
    id: item.id as number,
    linkId: (item[config.linkField] as number) ?? (item.id as number),
    hasDetail: config.hasDetail,
    kind: config.key,
    identifier: (item[config.identifierField] as string) ?? "",
    title: (item.title as string) ?? "",
    date: date as string,
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
