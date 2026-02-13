import type { Database } from "bun:sqlite";

export interface AffectedRow {
  id: number | string;
  label: string;
  sourceUrl: string;
}

export interface KnownDataException {
  id: string;
  checkName: string;
  description: string;
  reason: string;
  affectedRows: AffectedRow[];
}

type Interval = [number, number];

const DAY_MS = 24 * 60 * 60 * 1000;
const PARLIAMENT_EXCEPTION_MIN_DATE = "1919-01-01";
const EXPECTED_PARLIAMENT_SIZE = 200;
const DEFAULT_SOURCE_URL = "https://avoindata.eduskunta.fi";

const toDay = (value: string): number =>
  Math.floor(new Date(`${value}T00:00:00Z`).getTime() / DAY_MS);

const toIsoDay = (day: number): string =>
  new Date(day * DAY_MS).toISOString().slice(0, 10);

const addToSetMap = (map: Map<number, Set<number>>, key: number, value: number) => {
  const set = map.get(key) ?? new Set<number>();
  set.add(value);
  map.set(key, set);
};

const mergeIntervals = (intervals: Interval[]): Interval[] => {
  if (intervals.length === 0) return [];
  const sorted = [...intervals].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Interval[] = [[sorted[0][0], sorted[0][1]]];

  for (const [start, end] of sorted.slice(1)) {
    const prev = merged[merged.length - 1];
    if (start <= prev[1] + 1) {
      if (end > prev[1]) prev[1] = end;
    } else {
      merged.push([start, end]);
    }
  }

  return merged;
};

const subtractIntervals = (base: Interval[], subs: Interval[]): Interval[] => {
  if (base.length === 0) return [];
  if (subs.length === 0) return base.map(([s, e]) => [s, e]);

  const out: Interval[] = [];
  let j = 0;

  for (const [baseStart, baseEnd] of base) {
    let cursor = baseStart;

    while (j < subs.length && subs[j][1] < baseStart) j++;

    let k = j;
    while (k < subs.length && subs[k][0] <= baseEnd) {
      const [subStart, subEnd] = subs[k];
      if (subStart > cursor) {
        out.push([cursor, Math.min(baseEnd, subStart - 1)]);
      }
      cursor = Math.max(cursor, subEnd + 1);
      if (cursor > baseEnd) break;
      k++;
    }

    if (cursor <= baseEnd) out.push([cursor, baseEnd]);
  }

  return out;
};

const sortedPeople = (
  ids: Set<number> | undefined,
  peopleById: Map<number, string>,
): string[] => {
  if (!ids || ids.size === 0) return [];
  return [...ids]
    .map((id) => ({ id, name: peopleById.get(id) ?? `person_id=${id}` }))
    .sort((a, b) => a.name.localeCompare(b.name, "fi"))
    .map((row) => `${row.name} (${row.id})`);
};

const parseReplacementName = (
  replacementPerson: string | null | undefined,
  prefix: "Seuraaja" | "Edeltäjä",
): string | null => {
  if (!replacementPerson) return null;
  const normalized = replacementPerson.trim();
  if (!normalized.startsWith(prefix)) return null;
  const withoutPrefix = normalized.slice(prefix.length).trim();
  const [name] = withoutPrefix.split("/");
  const cleaned = name?.trim() ?? "";
  return cleaned.length > 0 ? cleaned : null;
};

function buildParliamentSizeBelow200Exception(db: Database): KnownDataException {
  const minDay = toDay(PARLIAMENT_EXCEPTION_MIN_DATE);
  const maxDateStr = (
    db
      .query<{ max_date: string | null }, []>(
        "SELECT MAX(COALESCE(end_date, DATE('now'))) as max_date FROM Term",
      )
      .get() as { max_date: string | null }
  ).max_date;

  if (!maxDateStr) {
    return {
      id: "PARLIAMENT-SIZE-EXACT-200-001",
      checkName: "Parliament size limit",
      description: "No Term date coverage for exact-200 parliament-size exceptions",
      reason:
        "Term table has no date bounds, so exact-200 mismatch ranges cannot be derived.",
      affectedRows: [],
    };
  }

  const maxDay = toDay(maxDateStr);

  const peopleRows = db
    .query<
      { person_id: number; first_name: string | null; last_name: string | null },
      []
    >("SELECT person_id, first_name, last_name FROM Representative")
    .all();
  const peopleById = new Map<number, string>(
    peopleRows.map((row) => [
      row.person_id,
      `${(row.first_name ?? "").trim()} ${(row.last_name ?? "").trim()}`.trim() ||
        `person_id=${row.person_id}`,
    ]),
  );

  const leavingRows = db
    .query<
      { person_id: number; end_date: string | null; replacement_person: string | null },
      []
    >(
      "SELECT person_id, end_date, replacement_person FROM PeopleLeavingParliament WHERE end_date IS NOT NULL",
    )
    .all();
  const latestLeavingByPerson = new Map<
    number,
    { endDate: number; replacementPerson: string | null }
  >();
  for (const row of leavingRows) {
    if (!row.end_date) continue;
    const endDate = toDay(row.end_date);
    const prev = latestLeavingByPerson.get(row.person_id);
    if (!prev || endDate > prev.endDate) {
      latestLeavingByPerson.set(row.person_id, {
        endDate,
        replacementPerson: row.replacement_person,
      });
    }
  }

  const joiningRows = db
    .query<
      { person_id: number; start_date: string | null; replacement_person: string | null },
      []
    >(
      "SELECT person_id, start_date, replacement_person FROM PeopleJoiningParliament WHERE start_date IS NOT NULL",
    )
    .all();
  const joiningByPredecessorName = new Map<
    string,
    Array<{ joinerId: number; startDay: number }>
  >();
  for (const row of joiningRows) {
    if (!row.start_date) continue;
    const predecessorName = parseReplacementName(row.replacement_person, "Edeltäjä");
    if (!predecessorName) continue;
    const list = joiningByPredecessorName.get(predecessorName) ?? [];
    list.push({ joinerId: row.person_id, startDay: toDay(row.start_date) });
    joiningByPredecessorName.set(predecessorName, list);
  }
  for (const list of joiningByPredecessorName.values()) {
    list.sort((a, b) => a.startDay - b.startDay || a.joinerId - b.joinerId);
  }

  const termRows = db
    .query<
      { person_id: number; start_date: string; end_date: string | null },
      []
    >("SELECT person_id, start_date, end_date FROM Term WHERE start_date IS NOT NULL")
    .all();
  const absenceRows = db
    .query<
      { person_id: number; start_date: string; end_date: string | null },
      []
    >(
      "SELECT person_id, start_date, end_date FROM TemporaryAbsence WHERE start_date IS NOT NULL",
    )
    .all();

  const termsByPerson = new Map<number, Interval[]>();
  for (const row of termRows) {
    const start = toDay(row.start_date);
    const end = row.end_date ? toDay(row.end_date) : maxDay;
    if (end < minDay || start > maxDay) continue;

    const list = termsByPerson.get(row.person_id) ?? [];
    list.push([Math.max(start, minDay), Math.min(end, maxDay)]);
    termsByPerson.set(row.person_id, list);
  }

  const absencesByPerson = new Map<number, Interval[]>();
  for (const row of absenceRows) {
    const start = toDay(row.start_date);
    const end = row.end_date ? toDay(row.end_date) : maxDay;
    if (end < minDay || start > maxDay) continue;

    const list = absencesByPerson.get(row.person_id) ?? [];
    list.push([Math.max(start, minDay), Math.min(end, maxDay)]);
    absencesByPerson.set(row.person_id, list);
  }

  const deltaByDay = new Map<number, number>();
  const startByDay = new Map<number, Set<number>>();
  const endByDay = new Map<number, Set<number>>();

  const addDelta = (day: number, value: number) => {
    deltaByDay.set(day, (deltaByDay.get(day) ?? 0) + value);
  };

  for (const [personId, personTerms] of termsByPerson) {
    const mergedTerms = mergeIntervals(personTerms);
    const mergedAbsences = mergeIntervals(absencesByPerson.get(personId) ?? []);
    const activeIntervals = subtractIntervals(mergedTerms, mergedAbsences);

    for (const [start, end] of activeIntervals) {
      if (end < minDay || start > maxDay) continue;
      const clippedStart = Math.max(start, minDay);
      const clippedEnd = Math.min(end, maxDay);

      addDelta(clippedStart, +1);
      addToSetMap(startByDay, clippedStart, personId);

      if (clippedEnd + 1 <= maxDay + 1) {
        addDelta(clippedEnd + 1, -1);
        addToSetMap(endByDay, clippedEnd + 1, personId);
      }
    }
  }

  for (const [day, delta] of [...deltaByDay.entries()]) {
    if (delta === 0) deltaByDay.delete(day);
  }

  const boundaryDays = [...new Set([minDay, maxDay + 1, ...deltaByDay.keys()])]
    .filter((day) => day >= minDay && day <= maxDay + 1)
    .sort((a, b) => a - b);

  const mismatchRanges: Array<{ start: number; end: number; count: number }> = [];
  let currentCount = 0;

  for (let i = 0; i < boundaryDays.length - 1; i++) {
    const day = boundaryDays[i];
    currentCount += deltaByDay.get(day) ?? 0;

    const next = boundaryDays[i + 1];
    const end = next - 1;
    if (day > end) continue;
    if (currentCount !== EXPECTED_PARLIAMENT_SIZE) {
      mismatchRanges.push({ start: day, end, count: currentCount });
    }
  }

  const affectedRows: AffectedRow[] = mismatchRanges.map((range) => {
    const startIso = toIsoDay(range.start);
    const endIso = toIsoDay(range.end);
    const leftOn = range.start - 1 >= minDay ? toIsoDay(range.start - 1) : "<1919-01-01";
    const joinedOn =
      range.end + 1 <= maxDay ? toIsoDay(range.end + 1) : "(not yet in data)";
    const gapDays = range.end - range.start + 1;
    const leftIds = [...(endByDay.get(range.start) ?? new Set<number>())];
    const leftPeople = sortedPeople(endByDay.get(range.start), peopleById);
    const joinedPeople = sortedPeople(startByDay.get(range.end + 1), peopleById);
    const successorPairs = leftIds
      .map((leftId) => {
        const leftName = peopleById.get(leftId) ?? `person_id=${leftId}`;
        const leftDate = range.start - 1;
        const leaving = latestLeavingByPerson.get(leftId);
        const expectedSuccessorName = parseReplacementName(
          leaving?.replacementPerson,
          "Seuraaja",
        );
        const candidates = joiningByPredecessorName.get(leftName) ?? [];
        const matchedJoin = candidates.find((candidate) => candidate.startDay > leftDate);
        if (!matchedJoin) {
          return `${leftName} (${leftId}) -> ?`;
        }

        const joinerName =
          peopleById.get(matchedJoin.joinerId) ?? `person_id=${matchedJoin.joinerId}`;
        const gapFromLeft = Math.max(0, matchedJoin.startDay - leftDate - 1);
        const expectedSuffix =
          expectedSuccessorName && expectedSuccessorName !== joinerName
            ? `, expected_successor=${expectedSuccessorName}`
            : "";
        return `${leftName} (${leftId}) -> ${joinerName} (${matchedJoin.joinerId}) on ${toIsoDay(matchedJoin.startDay)} (gap=${gapFromLeft}d${expectedSuffix})`;
      })
      .sort((a, b) => a.localeCompare(b, "fi"));

    return {
      id: `${startIso}..${endIso}`,
      label: `${startIso}..${endIso} | mp_count=${range.count} | left_on=${leftOn}: ${leftPeople.length ? leftPeople.join(", ") : "-"} | joined_on=${joinedOn}: ${joinedPeople.length ? joinedPeople.join(", ") : "-"} | gap_days=${gapDays} | successor_pairs=${successorPairs.length ? successorPairs.join("; ") : "-"}`,
      sourceUrl: DEFAULT_SOURCE_URL,
    };
  });

  return {
    id: "PARLIAMENT-SIZE-EXACT-200-001",
    checkName: "Parliament size limit",
    description:
      "All historical ranges where active parliament composition differs from exactly 200 (including below-200 gaps)",
    reason:
      "Derived from merged Term intervals minus TemporaryAbsence intervals. Each row lists range, who left at range start, who joined at range end+1, and the resulting gap length in days.",
    affectedRows,
  };
}

const MISSING_SINGLE_VOTE_ROWS: AffectedRow[] = [
  {
    id: 34376,
    label: "Äänestys 1, istunto 2009/61",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/1/61/2009",
  },
  {
    id: 34384,
    label: "Äänestys 10, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/10/63/2009",
  },
  {
    id: 34386,
    label: "Äänestys 11, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/11/63/2009",
  },
  {
    id: 34388,
    label: "Äänestys 12, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/12/63/2009",
  },
  {
    id: 34390,
    label: "Äänestys 13, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/13/63/2009",
  },
  {
    id: 34392,
    label: "Äänestys 14, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/14/63/2009",
  },
  {
    id: 34394,
    label: "Äänestys 15, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/15/63/2009",
  },
  {
    id: 34396,
    label: "Äänestys 16, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/16/63/2009",
  },
  {
    id: 34398,
    label: "Äänestys 17, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/17/63/2009",
  },
  {
    id: 34400,
    label: "Äänestys 1, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/1/63/2009",
  },
  {
    id: 34402,
    label: "Äänestys 2, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/2/63/2009",
  },
  {
    id: 34404,
    label: "Äänestys 3, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/3/63/2009",
  },
  {
    id: 34406,
    label: "Äänestys 4, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/4/63/2009",
  },
  {
    id: 34408,
    label: "Äänestys 5, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/5/63/2009",
  },
  {
    id: 34410,
    label: "Äänestys 6, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/6/63/2009",
  },
  {
    id: 34412,
    label: "Äänestys 7, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/7/63/2009",
  },
  {
    id: 34414,
    label: "Äänestys 8, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/8/63/2009",
  },
  {
    id: 34416,
    label: "Äänestys 9, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/9/63/2009",
  },
  {
    id: 34418,
    label: "Äänestys 30, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/30/63/2009",
  },
  {
    id: 34420,
    label: "Äänestys 31, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/31/63/2009",
  },
  {
    id: 34422,
    label: "Äänestys 20, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/20/63/2009",
  },
  {
    id: 34424,
    label: "Äänestys 32, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/32/63/2009",
  },
  {
    id: 34426,
    label: "Äänestys 21, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/21/63/2009",
  },
  {
    id: 34428,
    label: "Äänestys 33, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/33/63/2009",
  },
  {
    id: 34430,
    label: "Äänestys 22, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/22/63/2009",
  },
  {
    id: 34432,
    label: "Äänestys 34, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/34/63/2009",
  },
  {
    id: 34434,
    label: "Äänestys 23, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/23/63/2009",
  },
  {
    id: 34436,
    label: "Äänestys 24, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/24/63/2009",
  },
  {
    id: 34438,
    label: "Äänestys 25, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/25/63/2009",
  },
  {
    id: 34440,
    label: "Äänestys 26, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/26/63/2009",
  },
  {
    id: 34442,
    label: "Äänestys 27, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/27/63/2009",
  },
  {
    id: 34444,
    label: "Äänestys 28, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/28/63/2009",
  },
  {
    id: 34446,
    label: "Äänestys 18, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/18/63/2009",
  },
  {
    id: 34448,
    label: "Äänestys 29, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/29/63/2009",
  },
  {
    id: 34450,
    label: "Äänestys 19, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/19/63/2009",
  },
  {
    id: 34452,
    label: "Äänestys 41, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/41/63/2009",
  },
  {
    id: 34454,
    label: "Äänestys 35, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/35/63/2009",
  },
  {
    id: 34456,
    label: "Äänestys 36, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/36/63/2009",
  },
  {
    id: 34458,
    label: "Äänestys 37, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/37/63/2009",
  },
  {
    id: 34460,
    label: "Äänestys 38, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/38/63/2009",
  },
  {
    id: 34462,
    label: "Äänestys 42, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/42/63/2009",
  },
  {
    id: 34464,
    label: "Äänestys 39, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/39/63/2009",
  },
  {
    id: 34468,
    label: "Äänestys 43, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/43/63/2009",
  },
  {
    id: 34476,
    label: "Äänestys 44, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/44/63/2009",
  },
  {
    id: 34480,
    label: "Äänestys 45, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/45/63/2009",
  },
  {
    id: 34482,
    label: "Äänestys 46, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/46/63/2009",
  },
  {
    id: 34484,
    label: "Äänestys 40, istunto 2009/63",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/40/63/2009",
  },
  {
    id: 49119,
    label: "Äänestys 1, istunto 2022/45",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/1/45/2022",
  },
  {
    id: 49121,
    label: "Äänestys 2, istunto 2022/45",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/2/45/2022",
  },
  {
    id: 49123,
    label: "Äänestys 3, istunto 2022/45",
    sourceUrl: "https://avoindata.eduskunta.fi/aanestystulos/3/45/2022",
  },
];

const KNOWN_DATA_EXCEPTIONS: KnownDataException[] = [
  {
    id: "VOTE-MISSING-001",
    checkName: "Individual vote count matches",
    description:
      "50 tunnettua äänestystä, joista yksittäinen ääni puuttuu lähdedatasta",
    reason:
      "Known incorrect entries tracked explicitly by voting id; upstream root cause documented separately.",
    affectedRows: MISSING_SINGLE_VOTE_ROWS,
  },
  {
    id: "VOTE-AGGREGATION-001",
    checkName: "Vote aggregation per type",
    description:
      "Samat 50 äänestystä aiheuttavat poikkeaman myös aggregoiduissa äänimäärissä",
    reason:
      "Known incorrect entries tracked explicitly by voting id; upstream root cause documented separately.",
    affectedRows: MISSING_SINGLE_VOTE_ROWS,
  },
];

export function buildKnownDataExceptions(_db: Database): KnownDataException[] {
  const computedExceptions: KnownDataException[] = [
    buildParliamentSizeBelow200Exception(_db),
  ];

  return [...KNOWN_DATA_EXCEPTIONS, ...computedExceptions].map((exception) => ({
    ...exception,
    affectedRows: [...exception.affectedRows],
  }));
}

export function getExceptionsForCheck(
  exceptions: KnownDataException[],
  checkName: string,
): KnownDataException[] {
  return exceptions.filter((e) => e.checkName === checkName);
}

export function getExceptionIdSetForCheck(
  exceptions: KnownDataException[],
  checkName: string,
): Set<string> {
  const ids = getExceptionsForCheck(exceptions, checkName).flatMap((exception) =>
    exception.affectedRows.map((row) => String(row.id)),
  );
  return new Set(ids);
}
