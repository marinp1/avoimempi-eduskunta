type SearchParamValue = string | number | null | undefined;

const buildPath = (
  pathname: string,
  params: Record<string, SearchParamValue>,
) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
};

const dateOnly = (value?: string | null) => {
  if (!value) return undefined;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
};

export const refs = {
  member: (personId: number, date?: string | null) =>
    buildPath("/edustajat", {
      person: personId,
      date: dateOnly(date),
    }),
  session: (sessionKey: string, date?: string | null) =>
    buildPath("/istunnot", {
      session: sessionKey,
      date: dateOnly(date),
    }),
  section: (sectionKey: string, date?: string | null, sessionKey?: string | null) =>
    buildPath("/istunnot", {
      section: sectionKey,
      session: sessionKey ?? undefined,
      date: dateOnly(date),
    }),
  voting: (votingId: number, sessionKey?: string | null, date?: string | null) =>
    buildPath("/aanestykset", {
      voting: votingId,
      session: sessionKey ?? undefined,
      date: dateOnly(date),
    }),
};

