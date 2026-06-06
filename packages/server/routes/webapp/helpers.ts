import { htmlResponse, renderFullPage } from "../../../webapp/eta";
import type {
  TimelineData,
  SittingTick,
} from "../../../webapp/templates/partials/timeline";
import type { SessionRepository } from "../../database/repositories/session-repository";
import { assetVersion } from "./assets";

const PEILI_DATE_COOKIE = "peili_date";
const TERM = "2023";

let _ticksCache: SittingTick[] | null = null;
let _todayCache: string | null = null;

function buildTicks(repo: SessionRepository): {
  ticks: SittingTick[];
  today: string;
} {
  if (_ticksCache && _todayCache)
    return { ticks: _ticksCache, today: _todayCache };

  const rows = repo.fetchSittingTicks();
  const ticks: SittingTick[] = rows.map((r) => ({
    d: r.date,
    id: r.key,
    type: r.voting_count > 0 ? "vote" : r.speech_count > 30 ? "talk" : "quiet",
  }));

  const today =
    ticks.length > 0
      ? ticks[ticks.length - 1]!.d
      : new Date().toISOString().slice(0, 10);
  _ticksCache = ticks;
  _todayCache = today;
  return { ticks, today };
}

function readCursorDate(req: Request, today: string): string {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(
    new RegExp(`(?:^|;\\s*)${PEILI_DATE_COOKIE}=([^;]+)`),
  );
  if (match) {
    const val = decodeURIComponent(match[1]!).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  }
  return today;
}

function formatFi(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${Number(d)}.${Number(m)}.${y}`;
}

export function getTimelineData(
  req: Request,
  sessionRepo: SessionRepository,
): TimelineData {
  const { ticks, today } = buildTicks(sessionRepo);
  const cursor = readCursorDate(req, today);
  return {
    term: TERM,
    today,
    cursor,
    cursorFormatted: formatFi(cursor),
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
