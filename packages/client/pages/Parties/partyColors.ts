export const PARTY_COLORS: Record<string, string> = {
  KOK: "#0066CC",
  SDP: "#E11931",
  PS: "#FFDE55",
  KESK: "#3AAA35",
  VIHR: "#61BF1A",
  VAS: "#AA0000",
  RKP: "#FFD500",
  KD: "#1E90FF",
  LIIK: "#00A0DC",
};

export const getPartyColor = (partyCode: string) =>
  PARTY_COLORS[partyCode] || "#64748B";
