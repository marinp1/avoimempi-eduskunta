const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type SessionsUrlState = {
  date: string;
  sessionKey: string | null;
  sectionKey: string | null;
};

const getDefaultDate = () => new Date().toISOString().split("T")[0];

export const parseSessionsUrlState = (
  search: string,
  fallbackDate = getDefaultDate(),
): SessionsUrlState => {
  const params = new URLSearchParams(search);
  const dateParam = params.get("date");

  return {
    date:
      dateParam && ISO_DATE_PATTERN.test(dateParam) ? dateParam : fallbackDate,
    sessionKey: params.get("session"),
    sectionKey: params.get("section"),
  };
};

export const buildSessionsUrl = (
  pathname: string,
  search: string,
  state: SessionsUrlState,
) => {
  const params = new URLSearchParams(search);

  params.set("date", state.date);

  if (state.sessionKey) params.set("session", state.sessionKey);
  else params.delete("session");

  if (state.sectionKey) params.set("section", state.sectionKey);
  else params.delete("section");

  const query = params.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
};
