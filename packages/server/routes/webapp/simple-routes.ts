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
  getPeriodSelectorData,
} from "./helpers";
import { assetVersion } from "./assets";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#shared-helpers";
import {
  type DocumentKind,
  type DocKindDescriptor,
  type DocSearchItem,
  type DocQueryParams,
  type DocResult,
  DOC_KIND_REGISTRY,
  docKindList,
  docStatus,
  mapDocHighlight,
  LA_LABELS,
  REPORT_LABELS,
} from "#shared/constants/DocumentKinds";

export function createSimplePageRoutes(deps: WebappDeps) {
  return {
    ...defineRoute({
      path: "/",
      GET: async (req) => {
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
            const fragment = HomeReactive({ data, sessionCount });
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
        const periodData = getPeriodSelectorData(req, deps.metadataRepository);
        return page({
          req,
          fragment: Home({
            title: i18next.t("home:title"),
            data,
            cursor,
            sessionCount,
          }),
          activePath: "/",
          title: i18next.t("home:title"),
          timelineData: resolvedTl,
          extraHeaders: cookieHeader
            ? { "Set-Cookie": cookieHeader }
            : undefined,
          periodData,
        });
      },
    }),
    ...defineRoute({
      path: "/puolueet",
      GET: (req) => {
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

        const periodData = getPeriodSelectorData(req, deps.metadataRepository);
        return page({
          req,
          fragment: Puolueet({ title: i18next.t("puolueet:title"), data }),
          activePath: "/puolueet",
          title: i18next.t("puolueet:title"),
          timelineData: tlData,
          periodData,
        });
      },
    }),
    ...defineRoute({
      path: "/aanestykset",
      GET: (req) => {
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

        const periodData = getPeriodSelectorData(req, deps.metadataRepository);
        return page({
          req,
          fragment: Aanestykset({
            title: i18next.t("aanestykset:title"),
            data,
          }),
          activePath: pageUrl,
          title: i18next.t("aanestykset:title"),
          timelineData: tlData,
          periodData,
        });
      },
    }),
    ...defineRoute({
      path: "/asiakirjat",
      GET: (req) => {
        const url = new URL(req.url);
        const q = url.searchParams.get("q") ?? undefined;
        const kind = url.searchParams.get("kind") ?? undefined;
        const rawPage = parseInt(url.searchParams.get("page") ?? "1", 10);
        let currentPage = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : 1;
        const limit = 50;

        const config = kind && kind in DOC_KIND_REGISTRY ? DOC_KIND_REGISTRY[kind as DocumentKind] : undefined;

        let rows: DocumentRow[];
        let totalCount: number;

        if (config) {
          const dispatch = DOC_KIND_DISPATCH[config.key]!;
          const result = dispatch(deps, { query: q, page: currentPage, limit });
          rows = result.items.map((item) => mapToDocRow(item, config));
          totalCount = result.totalCount;
        } else {
          const allRows: DocumentRow[] = [];
          const perKindLimit = 100;
          for (const c of docKindList()) {
            try {
              const dispatch = DOC_KIND_DISPATCH[c.key]!;
              const result = dispatch(deps, {
                query: q,
                page: 1,
                limit: perKindLimit,
              });
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

        currentPage = Math.min(currentPage, Math.ceil(totalCount / limit) || 1);

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

        const periodData = getPeriodSelectorData(req, deps.metadataRepository);
        return page({
          req,
          fragment: Asiakirjat({
            title: i18next.t("asiakirjat:title"),
            data,
            query: q,
            kind,
          }),
          activePath: "/asiakirjat",
          title: i18next.t("asiakirjat:title"),
          timelineData: tlData,
          periodData,
        });
      },
    }),
    ...defineRoute({
      path: "/hallitukset",
      GET: (req) => {
        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );
        const periodData = getPeriodSelectorData(req, deps.metadataRepository);
        return page({
          req,
          fragment: Hallitukset({ title: i18next.t("nav:governments") }),
          activePath: "/hallitukset",
          title: i18next.t("nav:governments"),
          timelineData: tlData,
          periodData,
        });
      },
    }),
    ...defineRoute({
      path: "/analytiikka",
      GET: (req) => {
        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );
        const periodData = getPeriodSelectorData(req, deps.metadataRepository);
        return page({
          req,
          fragment: Analytiikka({ title: i18next.t("nav:analytics") }),
          activePath: "/analytiikka",
          title: i18next.t("nav:analytics"),
          timelineData: tlData,
          periodData,
        });
      },
    }),
    ...defineRoute({
      path: "/muutokset",
      GET: (req) => {
        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );
        const periodData = getPeriodSelectorData(req, deps.metadataRepository);
        return page({
          req,
          fragment: Muutokset({ title: i18next.t("nav:changes") }),
          activePath: "/muutokset",
          title: i18next.t("nav:changes"),
          timelineData: tlData,
          periodData,
        });
      },
    }),
    ...defineRoute({
      path: "/laadunvalvonta",
      GET: (req) =>
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
    }),
  } as const;
}
// ─── Document-kind dispatch & listing helpers ──────────

const DOC_KIND_DISPATCH: Record<
  DocumentKind,
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

function mapToDocRow(
  item: DocSearchItem,
  desc: DocKindDescriptor,
): DocumentRow {
  const date = (item[desc.dateField] as string) ?? "";
  const dateLabel =
    date && desc.dateFormatKey
      ? i18next.t(desc.dateFormatKey, { date: formatFi(date) })
      : "";

  const status = docStatus(item, desc.key);
  const authorName =
    desc.authorFields.length > 0
      ? desc.authorFields
          .map((f) => (item[f] as string) ?? "")
          .filter(Boolean)
          .join(" ") || null
      : null;

  const authorParty = desc.partyField
    ? ((item[desc.partyField] as string) ?? null)
    : null;

  const subjects: string[] =
    typeof item.subjects === "string"
      ? (item.subjects as string).split("||").filter(Boolean)
      : [];

  return {
    id: item.id as number,
    linkId: (item[desc.linkField] as number) ?? (item.id as number),
    hasDetail: desc.hasDetail,
    kind: desc.key,
    identifier: (item[desc.identifierField] as string) ?? "",
    title: (item.title as string) ?? "",
    date: date as string,
    dateLabel,
    authorName,
    authorParty,
    authorPartyColor: partyColor(authorParty ?? ""),
    statusLabel: status.label ? i18next.t(status.label) : null,
    statusClass: status.class,
    subjects,
    highlight: mapDocHighlight(item, desc.key),
  };
}
