import type { RosterRow } from "../templates/helpers";

let nextId = 1;

// Builds a RosterRow with sensible defaults; override only the fields a test cares about.
export function makeRow(overrides: Partial<RosterRow> = {}): RosterRow {
  const id = nextId++;
  const first = overrides.first_name ?? "First";
  const last = overrides.last_name ?? "Last";
  return {
    person_id: id,
    first_name: first,
    last_name: last,
    sort_name: `${last}, ${first}`,
    birth_year: 1970,
    minister: 0,
    group_abbreviation: "kok",
    is_in_government: 1,
    district_name: "Helsingin vaalipiiri",
    participation_rate: 90,
    ...overrides,
  };
}
