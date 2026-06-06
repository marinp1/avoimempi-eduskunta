import { htmlResponse, renderFullPage } from "../../../webapp/eta";
import type {
  TimelineData,
  SittingTick,
} from "../../../webapp/templates/partials/timeline";
import type { SessionRepository } from "../../database/repositories/session-repository";
import { assetVersion } from "./assets";

const PEILI_DATE_COOKIE = "peili_date";
const PEILI_PERIOD_COOKIE = "peili_period";
const VALID_PERIODS = new Set(["2023", "2019", "all"]);
const DEFAULT_PERIOD = "2023";

export interface TermBounds {
  startDate: string;
  endDate?: string;
  governmentStartDate: string;
}

const TERM_BOUNDS: Record<string, TermBounds> = {
  "2023": { startDate: "2023-06-20", governmentStartDate: "2023-06-20" },
  "2019": {
    startDate: "2019-06-06",
    endDate: "2023-06-19",
    governmentStartDate: "2019-06-06",
  },
  // "all" spans everything; governmentStartDate uses current coalition for tagging
  all: { startDate: "1907-01-01", governmentStartDate: "2023-06-20" },
};

export function getTermBounds(period: string): TermBounds {
  return TERM_BOUNDS[period] ?? TERM_BOUNDS[DEFAULT_PERIOD]!;
}

// All sitting ticks cached after the first DB read (no limit on restarts)
let _allTicksCache: SittingTick[] | null = null;

function getAllTicks(repo: SessionRepository): SittingTick[] {
  if (_allTicksCache) return _allTicksCache;
  const rows = repo.fetchSittingTicks();
  _allTicksCache = rows.map((r) => ({
    d: r.date,
    id: r.key,
    type: r.voting_count > 0 ? "vote" : r.speech_count > 30 ? "talk" : "quiet",
  }));
  return _allTicksCache;
}

function readCookie(req: Request, name: string): string | null {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]!) : null;
}

export function readPeriod(req: Request): string {
  const val = readCookie(req, PEILI_PERIOD_COOKIE);
  return val && VALID_PERIODS.has(val) ? val : DEFAULT_PERIOD;
}

function readCursorDate(req: Request, termToday: string): string {
  const val = readCookie(req, PEILI_DATE_COOKIE);
  if (val && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  return termToday;
}

function formatFi(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y}`;
}

export function getTimelineData(
  req: Request,
  sessionRepo: SessionRepository,
): TimelineData {
  const period = readPeriod(req);
  const bounds = getTermBounds(period);
  const allTicks = getAllTicks(sessionRepo);

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

  return {
    term: period,
    today: termToday,
    cursor: clampedCursor,
    cursorFormatted: formatFi(clampedCursor),
    sittings: ticks,
  };
}

export function setCursorCookie(date: string): string {
  return `${PEILI_DATE_COOKIE}=${encodeURIComponent(date)}; Path=/; SameSite=Lax; Max-Age=31536000`;
}

export function page(
  req: Request,
  fragment: string,
  activePath: string,
  title?: string,
  timelineData?: TimelineData,
): Response {
  return htmlResponse(req, fragment, {
    activePath,
    title,
    assetVersion,
    timelineData,
  });
}

export function personNotFoundResponse(req: Request, path: string): Response {
  const isHtmx = req.headers.get("HX-Request") === "true";
  const fragment = notFoundFragment(path);
  const body = isHtmx
    ? fragment
    : renderFullPage(fragment, {
        activePath: "/edustajat",
        title: "Sivua ei löydy",
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function notFoundFragment(path: string): string {
  return `<title>Sivua ei löydy — Eduskuntapeili</title>
<section class="page-head wrap">
    <h1>Sivua ei löydy</h1>
    <p class="sub">Polkua <code>${escapeHtml(path)}</code> ei löydy.</p>
    <p><a href="/">Palaa etusivulle</a></p>
</section>`;
}
