import type { SessionsIndexRow } from "../../../server/database/repositories/session-repository";

export interface SessionsIndexData {
  weeks: WeekGroup[];
  weekStats: WeekStats;
  fetchedAt: string;
  totalSessions: number;
}

export interface WeekStats {
  sessionCount: number;
  votingCount: number;
  speechCount: number;
  hours: number;
}

export interface WeekGroup {
  label: string;
  dateRange: string;
  meta: string;
  sessions: SessionRow[];
}

export interface SessionRow {
  kind: string;
  searchText: string;
  /** ISO date "2026-05-28" — used by the timeline island for date filtering */
  date: string;
  dayOfWeek: string;
  dayNum: string;
  month: string;
  dotClass: string;
  sessionId: string;
  status: "done" | "draft" | "live";
  timeRange: string;
  headline: string;
  note: string;
  dchips: Dchip[];
  votingCount: number;
  sectionCount: number;
  href: string;
}

export interface Dchip {
  kind: string;
  text: string;
  result?: { text: string; class: "ok" | "no" | "neu" };
  isMore?: boolean;
}

const MONTH_ABBR: Record<string, string> = {
  "01": "tammi",
  "02": "helmi",
  "03": "maalis",
  "04": "huhti",
  "05": "touko",
  "06": "kesä",
  "07": "heinä",
  "08": "elo",
  "09": "syys",
  "10": "loka",
  "11": "marras",
  "12": "joulu",
};

const DAY_ABBR: Record<string, string> = {
  "1": "Ma",
  "2": "Ti",
  "3": "Ke",
  "4": "To",
  "5": "Pe",
  "6": "La",
  "7": "Su",
};

function toLocalISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function finnishDate(iso: string): { dow: string; day: string; mon: string } {
  const d = new Date(iso + "T00:00:00");
  const dow = DAY_ABBR[String(d.getDay() || 7)] ?? "";
  const day = String(d.getDate());
  const monKey = String(d.getMonth() + 1).padStart(2, "0");
  return { dow, day, mon: MONTH_ABBR[monKey] ?? "" };
}

function formatDateRange(start: string, end: string): string {
  const ds = new Date(start + "T00:00:00");
  const de = new Date(end + "T00:00:00");
  const startDay = ds.getDate();
  const endDay = de.getDate();
  const month = de.toLocaleDateString("fi-FI", { month: "long" });
  const year = de.getFullYear();
  return `${startDay}.–${endDay}. ${month} ${year}`;
}

function isoWeek(iso: string): number {
  const d = new Date(iso + "T00:00:00");
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  const yearStart = new Date(d.getFullYear(), 0, 1);
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function isoWeekYear(iso: string): number {
  const d = new Date(iso + "T00:00:00");
  const dayNum = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dayNum);
  return d.getFullYear();
}

function getWeekStart(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  return toLocalISODate(d);
}

function getWeekEnd(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + (7 - day));
  return toLocalISODate(d);
}

function isCurrentWeek(iso: string): boolean {
  const todayStr = toLocalISODate(new Date());
  return (
    isoWeek(iso) === isoWeek(todayStr) &&
    isoWeekYear(iso) === isoWeekYear(todayStr)
  );
}

function extractTimeRange(row: SessionsIndexRow): string {
  if (row.minutes_title) {
    const m = row.minutes_title.match(
      /(\d{1,2})\.(\d{2})[–-](\d{1,2})\.(\d{2})/,
    );
    if (m) {
      return `klo ${m[1]}.${m[2]}–${m[3]}.${m[4]}`;
    }
  }
  if (row.minutes_start_time) {
    const start = row.minutes_start_time.slice(11, 16);
    const end = row.minutes_end_time ? row.minutes_end_time.slice(11, 16) : "";
    return end ? `klo ${start}–${end}` : `klo ${start}`;
  }
  return "";
}

function deriveKind(row: SessionsIndexRow): string {
  const kinds: string[] = [];
  const secTitles = row.section_titles || "";

  if (secTitles.includes("Välikysymys")) kinds.push("vali");
  if (secTitles.includes("kyselytunti")) kinds.push("kysely");
  if (row.voting_count > 0) kinds.push("vote");
  if (kinds.length === 0 || row.speech_count > 50) kinds.push("talk");

  return [...new Set(kinds)].join(" ");
}

function deriveDotClass(kind: string): string {
  if (kind.includes("vote")) return "vote";
  return "talk";
}

function deriveStatus(row: SessionsIndexRow): "done" | "draft" | "live" {
  if (row.state === "KAYNNISSA") return "live";
  if (row.state === "LOPETETTU" && row.state_text_fi === "Istunto päättynyt")
    return "done";
  if (row.state === "PJLAADITTU") return "draft";
  if (row.state === "LOPETETTU" && row.state_text_fi !== "Istunto päättynyt")
    return "draft";
  return "done";
}

function buildHeadline(row: SessionsIndexRow): string {
  const secTitles = row.section_titles || "";
  const hasVali = secTitles.includes("Välikysymys");
  const hasKysely = secTitles.includes("kyselytunti");

  if (hasVali && row.voting_count > 0) {
    return `Välikysymyskeskustelu — hallituksen luottamus äänestykseen`;
  }
  if (hasVali) {
    const match = secTitles.match(/Välikysymys\s+([^|]+)/);
    const subject = match ? match[1].trim() : "";
    return subject
      ? `Välikysymyskeskustelu — ${subject}`
      : "Välikysymyskeskustelu";
  }
  if (hasKysely && row.voting_count > 0) {
    return `Kyselytunti ja äänestyksiä`;
  }
  if (hasKysely) {
    return `Kyselytunti ja keskusteluja`;
  }
  if (row.voting_count > 5) {
    return `Äänestyspäivä: ${row.voting_count} äänestystä`;
  }
  if (row.voting_count > 0) {
    return `Äänestyksiä: ${row.voting_count} kpl`;
  }
  if (row.minutes_title) {
    const dayName = row.minutes_title.split(" ")[0] ?? "";
    return `${dayName} ${row.date.slice(8, 10)}.${row.date.slice(5, 7)}.${row.date.slice(0, 4)}`;
  }
  return `Täysistunto ${row.key}`;
}

function buildNote(row: SessionsIndexRow): string {
  const parts: string[] = [];
  if (row.speech_count > 0) parts.push(`${row.speech_count} puheenvuoroa`);
  if (row.voting_count > 0) parts.push(`${row.voting_count} äänestystä`);
  if (row.section_count > 0) parts.push(`${row.section_count} asiakohtaa`);
  return parts.join(" · ");
}

function buildSearchText(row: SessionsIndexRow): string {
  const secTitles = (row.section_titles || "").replace(/\|\|/g, " ");
  const voteTitles = (row.voting_titles || "").replace(/\|\|/g, " ");
  const parts = [
    row.key,
    row.description,
    row.agenda_title,
    secTitles,
    voteTitles,
  ].filter(Boolean);
  return parts.join(" ");
}

function buildDchips(row: SessionsIndexRow): Dchip[] {
  const chips: Dchip[] = [];
  const secTitles = row.section_titles || "";

  if (secTitles.includes("Välikysymys")) {
    const match = secTitles.match(/Välikysymys\s+([^|]+)/);
    chips.push({
      kind: "välikysymys",
      text: match ? match[1].trim() : "Hallituksen politiikka",
    });
  }

  if (secTitles.includes("kyselytunti")) {
    chips.push({ kind: "kyselytunti", text: "Suullinen kyselytunti" });
  }

  if (row.voting_titles) {
    const voteTitles = row.voting_titles.split("||");
    const seen = new Set<string>();
    for (const vt of voteTitles) {
      const short = shortenVotingTitle(vt);
      if (short && !seen.has(short) && chips.length < 3) {
        seen.add(short);
        chips.push({ kind: "äänestys", text: short });
      }
    }
  }

  return chips;
}

function shortenVotingTitle(title: string): string | null {
  const cleaned = title
    .replace(/^\d+\s*[a-z]+\s*§:\s*/, "")
    .replace(/\s+JAA\s*\/.*$/, "")
    .replace(/\s+JAA\s*$/, "")
    .replace(/^Hallituksen esitys eduskunnalle /, "")
    .replace(/^Hallituksen esitys /, "")
    .replace(/^Lakiehdotusten hyväksyminen.*$/, "")
    .replace(/^Mietintö\s+/, "")
    .replace(/\s*\(.*?\)\s*$/, "")
    .replace(/^(Käsittelyn pohja|Voimaantulosäännös|115 a §):\s*/, "")
    .replace(/\s*\|.*$/, "")
    .trim();

  if (!cleaned || cleaned.length < 8) return null;

  const maxLen = 42;
  return cleaned.length > maxLen
    ? cleaned.slice(0, maxLen).replace(/\s+\S*$/, "") + "…"
    : cleaned;
}

function computeWeekStats(rows: SessionsIndexRow[]): WeekStats {
  let votingCount = 0;
  let speechCount = 0;
  let hours = 0;
  for (const r of rows) {
    votingCount += r.voting_count;
    speechCount += r.speech_count;
  }
  return {
    sessionCount: rows.length,
    votingCount,
    speechCount,
    hours,
  };
}

export function buildSessionsViewModel(
  raw: SessionsIndexRow[],
  filters: { kind?: string; q?: string } = {},
): SessionsIndexData {
  const today = new Date();

  const filtered = raw.filter((row) => {
    if (filters.kind && filters.kind !== "all") {
      if (!deriveKind(row).includes(filters.kind)) return false;
    }
    if (filters.q) {
      if (!buildSearchText(row).toLowerCase().includes(filters.q.toLowerCase()))
        return false;
    }
    return true;
  });

  const groups = new Map<string, SessionsIndexRow[]>();

  for (const row of filtered) {
    const key = `${isoWeekYear(row.date)}-W${String(isoWeek(row.date)).padStart(2, "0")}`;
    const existing = groups.get(key) ?? [];
    existing.push(row);
    groups.set(key, existing);
  }

  const weeks: WeekGroup[] = [];

  for (const [, rows] of groups) {
    const dates = rows.map((r) => r.date).sort();
    const firstDate = dates[0]!;

    const isCurrent = isCurrentWeek(firstDate);
    const weekStartDate = getWeekStart(firstDate);
    const weekEndDate = getWeekEnd(firstDate);
    const weekStats = computeWeekStats(rows);

    weeks.push({
      label: isCurrent ? "Tällä viikolla" : "Istuntoviikko",
      dateRange: formatDateRange(weekStartDate, weekEndDate),
      meta: `${rows.length} istuntoa${weekStats.votingCount > 0 ? ` · ${weekStats.votingCount} äänestystä` : ""}${weekStats.speechCount > 0 ? ` · ${weekStats.speechCount} puheenvuoroa` : ""}`,
      sessions: rows
        .sort((a, b) => b.date.localeCompare(a.date) || b.number - a.number)
        .map((row) => {
          const fd = finnishDate(row.date);
          const kind = deriveKind(row);
          const status = deriveStatus(row);
          return {
            kind,
            searchText: buildSearchText(row),
            date: row.date,
            dayOfWeek: fd.dow,
            dayNum: fd.day,
            month: fd.mon,
            dotClass: deriveDotClass(kind),
            sessionId: `Täysistunto ${row.key}`,
            status,
            timeRange: extractTimeRange(row),
            headline: buildHeadline(row),
            note: buildNote(row),
            dchips: buildDchips(row),
            votingCount: row.voting_count,
            sectionCount: row.section_count,
            href: `/istunto/${row.key}`,
          };
        }),
    });
  }

  return {
    weeks,
    weekStats: computeWeekStats(filtered),
    fetchedAt: today.toLocaleString("fi-FI", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    totalSessions: filtered.length,
  };
}
