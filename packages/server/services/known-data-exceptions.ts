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

const PARLIAMENT_2019_SOURCE_GAP_ROWS: AffectedRow[] = [
  {
    id: 175,
    label:
      "Toimi Kankaanniemi (person_id=175): Term 2015-04-22..2023-04-04 stays active, but ParliamentaryGroupMembership has a gap 2019-04-17..2019-07-01.",
    sourceUrl: "https://avoindata.eduskunta.fi",
  },
  {
    id: 1107,
    label:
      "Teuvo Hakkarainen (person_id=1107): TemporaryAbsence starts 2019-07-02 with replacement_person='Toimi Kankaanniemi /ps'.",
    sourceUrl: "https://avoindata.eduskunta.fi",
  },
  {
    id: "2019-05-02..2019-06-28",
    label:
      "Parliament size limit exceeds 200 on 21 session dates in this interval (201 active MPs).",
    sourceUrl: "https://avoindata.eduskunta.fi",
  },
  {
    id: "2019-04-24",
    label:
      "Same source-data gap also causes one active-MP/group-membership mismatch date with count still at 200.",
    sourceUrl: "https://avoindata.eduskunta.fi",
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
  {
    id: "PARLIAMENT-SIZE-2019-001",
    checkName: "Parliament size limit",
    description:
      "Term/group-membership source window mismatch around spring-summer 2019 causes 201 active MPs on 21 dates",
    reason:
      "Source data keeps person_id=175 (Toimi Kankaanniemi) active in Term before replacement window starts. Replacement context: Teuvo Hakkarainen's TemporaryAbsence with replacement_person='Toimi Kankaanniemi /ps' begins on 2019-07-02, but the preceding gap is still represented as active in source tables.",
    affectedRows: PARLIAMENT_2019_SOURCE_GAP_ROWS,
  },
  {
    id: "ACTIVE-MP-GROUP-GAP-2019-001",
    checkName: "Active MPs have group membership",
    description:
      "One source-data gap causes active MP rows without an active parliamentary group membership",
    reason:
      "person_id=175 remains active in Term during 2019-04-17..2019-07-01 while ParliamentaryGroupMembership has no active row; replacement transition is only recorded from 2019-07-02.",
    affectedRows: PARLIAMENT_2019_SOURCE_GAP_ROWS,
  },
  {
    id: "GROUP-MEMBER-COUNT-GAP-2019-001",
    checkName: "Group member count matches active MPs",
    description:
      "Same spring-summer 2019 source gap causes active-term count to exceed active-group count",
    reason:
      "The same person/date window mismatch (person_id=175) causes date-level count mismatches between active MPs and active group memberships.",
    affectedRows: PARLIAMENT_2019_SOURCE_GAP_ROWS,
  },
];

export function buildKnownDataExceptions(_db: Database): KnownDataException[] {
  return KNOWN_DATA_EXCEPTIONS.map((exception) => ({
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
