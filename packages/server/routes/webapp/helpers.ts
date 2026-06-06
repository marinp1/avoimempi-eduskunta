import { renderFullPage, type LayoutOptions } from "../../../webapp/eta";
import type { PeriodSelectorData } from "../../../webapp/src/period-selector-data";
import {
  timeline,
  type TimelineData,
  type SittingTick,
} from "../../../webapp/templates/partials/timeline";
import { esc } from "../../../webapp/templates/helpers";
import type { SessionRepository } from "../../database/repositories/session-repository";
import type { MetadataRepository } from "../../database/repositories/metadata-repository";
import { assetVersion } from "./assets";
import { formatFi, isHtmx } from "#shared-helpers";
export { formatFi, isHtmx };
export type { PeriodSelectorData };
import type { WebappDeps } from "./deps";
import i18next from "i18next";

const PEILI_DATE_COOKIE = "peili_date";
const PEILI_PERIOD_COOKIE = "peili_period";

export type PeriodSelection = number[] | "all";

export interface TermBounds {
  startDate: string;
  endDate?: string;
  governmentStartDate: string;
}

type GovPeriod = ReturnType<MetadataRepository["fetchHallituskaudet"]>[number];

const CACHE_TTL_MS = 5 * 60 * 1000;

let _governments: GovPeriod[] | null = null;
let _governmentsTs = 0;

function loadGovernments(repo: MetadataRepository): GovPeriod[] {
  const now = Date.now();
  if (_governments && now - _governmentsTs < CACHE_TTL_MS) return _governments;
  _governments = repo.fetchHallituskaudet();
  _governmentsTs = now;
  return _governments;
}

function currentGovernment(govs: GovPeriod[]): GovPeriod {
  return govs.find((g) => g.endDate === null) ?? govs[0]!;
}

/** Parse cookie value into a period selection. Handles legacy "2023"/"2019" → defaults to current. */
function parsePeriod(val: string | null, govs: GovPeriod[]): PeriodSelection {
  if (val === "all") return "all";
  if (!val) return [currentGovernment(govs).id];
  // Detect legacy format (year-based)
  if (/^\d{4}$/.test(val)) return [currentGovernment(govs).id];
  const ids = val
    .split(",")
    .map(Number)
    .filter((id) => !Number.isNaN(id));
  const valid = ids.filter((id) => govs.some((g) => g.id === id));
  return valid.length > 0 ? valid : [currentGovernment(govs).id];
}

export function getTermBounds(
  period: PeriodSelection,
  repo: MetadataRepository,
): TermBounds {
  const govs = loadGovernments(repo);

  if (period === "all") {
    const sorted = [...govs].sort((a, b) =>
      a.startDate.localeCompare(b.startDate),
    );
    const earliest = sorted[0]!;
    const latest = sorted[sorted.length - 1]!;
    return {
      startDate: earliest.startDate,
      endDate: latest.endDate ?? undefined,
      governmentStartDate: latest.startDate,
    };
  }

  const selected = govs.filter((g) => period.includes(g.id));
  if (selected.length === 0) {
    const c = currentGovernment(govs);
    return {
      startDate: c.startDate,
      governmentStartDate: c.startDate,
    };
  }

  selected.sort((a, b) => a.startDate.localeCompare(b.startDate));
  const earliest = selected[0]!;
  const latest = selected[selected.length - 1]!;

  return {
    startDate: earliest.startDate,
    endDate: latest.endDate ?? undefined,
    governmentStartDate: latest.startDate,
  };
}

// All sitting ticks cached after the first DB read (no limit on restarts)
let _allTicksCache: SittingTick[] | null = null;
let _allTicksTs = 0;

function getAllTicks(repo: SessionRepository): SittingTick[] {
  const now = Date.now();
  if (_allTicksCache && now - _allTicksTs < CACHE_TTL_MS) return _allTicksCache;
  const rows = repo.fetchSittingTicks();
  _allTicksCache = rows.map((r) => ({
    d: r.date,
    id: r.key,
    type: r.voting_count > 0 ? "vote" : r.speech_count > 30 ? "talk" : "quiet",
  }));
  _allTicksTs = now;
  return _allTicksCache;
}

function readCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]!);
  } catch {
    return null;
  }
}

export function readPeriod(
  req: Request,
  repo: MetadataRepository,
): PeriodSelection {
  const val = readCookie(req, PEILI_PERIOD_COOKIE);
  const govs = loadGovernments(repo);
  return parsePeriod(val, govs);
}

function readCursorDate(req: Request, termToday: string): string {
  const val = readCookie(req, PEILI_DATE_COOKIE);
  if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  return termToday;
}

export type TickSource = "sessions" | "composition";

export function getTimelineData(
  req: Request,
  sessionRepo: SessionRepository,
  metadataRepo: MetadataRepository,
  tickSource: TickSource = "sessions",
): TimelineData {
  const period = readPeriod(req, metadataRepo);
  const bounds = getTermBounds(period, metadataRepo);
  const allTicks: SittingTick[] =
    tickSource === "composition"
      ? sessionRepo.fetchCompositionChangeDates().map((r) => {
          const parts: string[] = [];
          if (r.joined > 0)
            parts.push(
              i18next.t("components:composition.tick_joined", {
                count: r.joined,
              }),
            );
          if (r.left_count > 0)
            parts.push(
              i18next.t("components:composition.tick_left", {
                count: r.left_count,
              }),
            );
          return {
            d: r.date,
            id: parts.join(", "),
            type: "comp",
          };
        })
      : getAllTicks(sessionRepo);

  const ticks = allTicks.filter(
    (t) =>
      t.d >= bounds.startDate && (!bounds.endDate || t.d <= bounds.endDate),
  );

  const termToday =
    ticks.length > 0
      ? ticks[ticks.length - 1]!.d
      : new Date().toISOString().slice(0, 10);

  const cursor = readCursorDate(req, termToday);
  // Clamp cursor to term bounds — a stale peili_date from a different term is ignored
  const clampedCursor =
    cursor >= bounds.startDate && (!bounds.endDate || cursor <= bounds.endDate)
      ? cursor
      : termToday;

  const termStr = period === "all" ? "all" : period.join(",");

  return {
    term: termStr,
    today: termToday,
    cursor: clampedCursor,
    cursorFormatted: formatFi(clampedCursor),
    sittings: ticks,
    showLegend: tickSource !== "composition",
  };
}

export function setCursorCookie(date: string): string {
  return `${PEILI_DATE_COOKIE}=${encodeURIComponent(date)}; Path=/; SameSite=Lax; Max-Age=31536000`;
}

/** Convenience wrapper: fetches timeline data, period, and term bounds in one call. */
export function getWebappContext(
  req: Request,
  deps: Pick<WebappDeps, "sessionRepository" | "metadataRepository">,
  tickSource?: TickSource,
) {
  const tlData = getTimelineData(
    req,
    deps.sessionRepository,
    deps.metadataRepository,
    tickSource,
  );
  const period = readPeriod(req, deps.metadataRepository);
  const bounds = getTermBounds(period, deps.metadataRepository);
  return { tlData, period, bounds };
}

export function getPeriodSelectorData(
  req: Request,
  repo: MetadataRepository,
): PeriodSelectorData {
  const govs = loadGovernments(repo);
  const period = readPeriod(req, repo);
  const selectedIds = period === "all" ? govs.map((g) => g.id) : period;
  const selectedSet = new Set(selectedIds);
  const allSelected = selectedIds.length === govs.length;

  return {
    governments: govs.map((g) => ({
      id: g.id,
      name: g.name,
      dateRange: `${formatFi(g.startDate)} – ${g.endDate ? formatFi(g.endDate) : "kesken"}`,
    })),
    selectedIds,
    description: describePeriodSelection(govs, selectedSet, allSelected),
  };
}

function describePeriodSelection(
  govs: GovPeriod[],
  selected: Set<number>,
  allSelected: boolean,
): PeriodSelectorData["description"] {
  if (allSelected) {
    return {
      btnLabel: "Kaikki hallituskaudet",
      badge: "koko aineisto",
      badgeClass: "",
    };
  }

  const chosen = govs.filter((g) => selected.has(g.id));
  if (chosen.length === 0) {
    const c = govs[0]!;
    const isNow = c.endDate === null;
    return {
      btnLabel: c.name,
      badge: isNow ? "nykyinen" : "päättynyt",
      badgeClass: isNow ? "is-now" : "",
    };
  }

  if (chosen.length === 1) {
    const c = chosen[0]!;
    const isNow = c.endDate === null;
    return {
      btnLabel: c.name,
      badge: isNow ? "nykyinen" : "päättynyt",
      badgeClass: isNow ? "is-now" : "",
    };
  }

  const hasCurrent = chosen.some((g) => g.endDate === null);
  return {
    btnLabel: `${chosen.length} hallituskautta`,
    badge: hasCurrent ? "nykyinen + muita" : "valitut",
    badgeClass: hasCurrent ? "is-now" : "",
  };
}

export function timelineOobHtml(data: TimelineData): string {
  return timeline({ ...data, oob: true });
}

export interface PageOptions extends Pick<LayoutOptions, "activePath" | "title" | "timelineData" | "periodData"> {
  req: Request;
  fragment: string;
  extraHeaders?: Record<string, string>;
}

export function page(opts: PageOptions): Response {
  const htmx = isHtmx(opts.req);
  const baseHeaders: Record<string, string> = {
    "Content-Type": "text/html; charset=utf-8",
    Vary: "HX-Request",
  };
  if (opts.extraHeaders) Object.assign(baseHeaders, opts.extraHeaders);
  if (htmx && opts.timelineData) {
    const tlHtml = timeline({ ...opts.timelineData, oob: true });
    return new Response(tlHtml + opts.fragment, { headers: baseHeaders });
  }
  if (htmx) {
    return new Response(opts.fragment, { headers: baseHeaders });
  }
  const fullPage = renderFullPage(opts.fragment, {
    activePath: opts.activePath,
    title: opts.title,
    assetVersion,
    timelineData: opts.timelineData,
    periodData: opts.periodData,
  });
  return new Response(fullPage, { headers: baseHeaders });
}

export function notFoundResponse(req: Request, path: string): Response {
  const htmx = isHtmx(req);
  const fragment = notFoundFragment(path);
  const body = htmx
    ? fragment
    : renderFullPage(fragment, {
        activePath: path,
        title: i18next.t("errors:not_found_title"),
        assetVersion,
      });
  return new Response(body, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      Vary: "HX-Request",
    },
  });
}

export function personNotFoundResponse(req: Request, path: string): Response {
  const htmx = isHtmx(req);
  const fragment = notFoundFragment(path);
  const body = htmx
    ? fragment
    : renderFullPage(fragment, {
        activePath: "/edustajat",
        title: i18next.t("edustajat:profile.not_found"),
        assetVersion,
      });
  return new Response(body, {
    status: 404,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      Vary: "HX-Request",
    },
  });
}

function notFoundFragment(path: string): string {
  return `<title>${i18next.t("common:page_title_format", { title: i18next.t("errors:not_found_title"), brand: i18next.t("common:brand_name") })}</title>
<section class="page-head wrap">
    <h1>${i18next.t("errors:not_found_title")}</h1>
    <p class="sub">${i18next.t("errors:not_found_desc", { path: esc(path) })}</p>
    <p><a href="/">${i18next.t("errors:back_to_home")}</a></p>
</section>`;
}
