const PARTY_PARAM = "party";

export const normalizePartyCode = (value: string | null | undefined) =>
  value?.trim().toUpperCase() || null;

export const parseSelectedPartyCode = (search: string) => {
  const params = new URLSearchParams(search);
  return normalizePartyCode(params.get(PARTY_PARAM));
};

export const buildPartySelectionUrl = (
  pathname: string,
  search: string,
  partyCode: string | null,
) => {
  const params = new URLSearchParams(search);
  const normalizedPartyCode = normalizePartyCode(partyCode);
  if (normalizedPartyCode) params.set(PARTY_PARAM, normalizedPartyCode);
  else params.delete(PARTY_PARAM);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
};
