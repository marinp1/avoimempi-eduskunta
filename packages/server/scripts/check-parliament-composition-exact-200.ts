import { Database } from "bun:sqlite";
import { getDatabasePath } from "../../shared/database";
import currentComposition from "../database/queries/CURRENT_COMPOSITION.sql";

type SessionDateRow = {
  date: string;
};

type CompositionRow = {
  person_id: number;
};

type OffendingRange = {
  startDate: string;
  endDate: string;
  mpCount: number;
  dateCount: number;
};

const EXPECTED_MEMBER_COUNT = 200;
const DEFAULT_MIN_DATE = "1919-01-01";

function parseArgs(argv: string[]) {
  const includePre1919 = argv.includes("--include-pre-1919");
  const json = argv.includes("--json");
  const useSessionDates = argv.includes("--session-dates");
  const minDateArg = argv.find((arg) => arg.startsWith("--min-date="));
  const minDate = includePre1919
    ? "1907-01-01"
    : minDateArg?.split("=")[1] || DEFAULT_MIN_DATE;

  return {
    includePre1919,
    json,
    minDate,
    useSessionDates,
  };
}

function toRanges(
  entries: Array<{ date: string; mpCount: number }>,
): OffendingRange[] {
  const ranges: OffendingRange[] = [];
  let current: OffendingRange | null = null;

  for (const entry of entries) {
    if (entry.mpCount === EXPECTED_MEMBER_COUNT) {
      if (current) {
        ranges.push(current);
        current = null;
      }
      continue;
    }

    if (current && current.mpCount === entry.mpCount) {
      current.endDate = entry.date;
      current.dateCount += 1;
      continue;
    }

    if (current) {
      ranges.push(current);
    }

    current = {
      startDate: entry.date,
      endDate: entry.date,
      mpCount: entry.mpCount,
      dateCount: 1,
    };
  }

  if (current) {
    ranges.push(current);
  }

  return ranges;
}

function formatRanges(ranges: OffendingRange[]) {
  if (ranges.length === 0) return "No offending ranges found.";
  const lines = [
    "mp_count | start_date | end_date | days",
    "-------- | ---------- | -------- | -------------",
  ];
  for (const range of ranges) {
    lines.push(
      `${String(range.mpCount).padStart(8)} | ${range.startDate} | ${range.endDate} | ${range.dateCount}`,
    );
  }
  return lines.join("\n");
}

function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

function enumerateDates(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (cursor.getTime() <= end.getTime()) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function main() {
  const args = parseArgs(Bun.argv.slice(2));
  const db = new Database(getDatabasePath(), { readonly: true });

  try {
    const boundsStmt = db.query<
      { min_date: string | null; max_date: string | null },
      []
    >(
      `SELECT
         MIN(start_date) as min_date,
         MAX(COALESCE(end_date, DATE('now'))) as max_date
       FROM Term`,
    );
    const sessionDatesStmt = db.query<SessionDateRow, { $minDate: string }>(
      `SELECT DISTINCT date as date
       FROM Session
       WHERE date IS NOT NULL
         AND date >= $minDate
       ORDER BY date ASC`,
    );
    const compositionStmt = db.query<CompositionRow, { $date: string }>(
      currentComposition,
    );

    const bounds = boundsStmt.get();
    if (!bounds?.min_date || !bounds.max_date) {
      throw new Error("Term table has no date bounds");
    }

    const lowerBound = maxDate(args.minDate, bounds.min_date);
    const dateSeries = args.useSessionDates
      ? sessionDatesStmt.all({ $minDate: lowerBound }).map((row) => row.date)
      : enumerateDates(lowerBound, bounds.max_date);

    const entries = dateSeries.map((date) => {
      const rows = compositionStmt.all({ $date: date });
      const mpCount = new Set(rows.map((row) => row.person_id)).size;
      return { date, mpCount };
    });

    const offendingEntries = entries.filter(
      (entry) => entry.mpCount !== EXPECTED_MEMBER_COUNT,
    );
    const ranges = toRanges(entries);
    const distinctOffendingCounts = [
      ...new Set(offendingEntries.map((entry) => entry.mpCount)),
    ].sort((a, b) => a - b);

    const summary = {
      expectedMemberCount: EXPECTED_MEMBER_COUNT,
      minDateIncluded: lowerBound,
      dateSource: args.useSessionDates ? "session-dates" : "all-calendar-days",
      analyzedDateCount: entries.length,
      offendingDateCount: offendingEntries.length,
      offendingRangeCount: ranges.length,
      offendingCounts: distinctOffendingCounts,
      firstAnalyzedDate: entries[0]?.date ?? null,
      lastAnalyzedDate: entries[entries.length - 1]?.date ?? null,
    };

    if (args.json) {
      console.log(
        JSON.stringify(
          {
            summary,
            ranges,
          },
          null,
          2,
        ),
      );
      return;
    }

    console.log(
      [
        `Expected member count: ${summary.expectedMemberCount}`,
        `Date source: ${summary.dateSource}`,
        `Analyzed dates: ${summary.analyzedDateCount} (${summary.firstAnalyzedDate} .. ${summary.lastAnalyzedDate})`,
        `Minimum date included: ${summary.minDateIncluded}`,
        `Offending dates: ${summary.offendingDateCount}`,
        `Offending ranges: ${summary.offendingRangeCount}`,
        `Offending counts: ${summary.offendingCounts.length > 0 ? summary.offendingCounts.join(", ") : "none"}`,
        "",
        formatRanges(ranges),
      ].join("\n"),
    );
  } finally {
    db.close();
  }
}

main();
