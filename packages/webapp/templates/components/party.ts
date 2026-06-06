const PARTY_COLORS: Record<string, string> = {
  kok:  "#1d4f91",
  ps:   "#2c3e8c",
  sd:   "#d3243a",
  kesk: "#0b8a4a",
  vihr: "#5aa829",
  vas:  "#9e1f4b",
  r:    "#1278b6",
  kd:   "#1a3f86",
  liik: "#f0841c",
  pg:   "#888888",
};

const PARTY_SHORT: Record<string, string> = {
  kok:  "Kokoomus",
  ps:   "Perussuomalaiset",
  sd:   "SDP",
  kesk: "Keskusta",
  vihr: "Vihreät",
  vas:  "Vasemmistoliitto",
  r:    "RKP",
  kd:   "KD",
  liik: "Liike Nyt",
  pg:   "Vornanen",
};

// Representative.party stores English lowercase group descriptions
const ENGLISH_NAME_TO_CODE: Record<string, string> = {
  "parliamentary group of the national coalition party": "kok",
  "swedish parliamentary group": "r",
  "social democratic parliamentary group": "sd",
  "christian democratic parliamentary group": "kd",
  "centre party parliamentary group": "kesk",
  "green parliamentary group": "vihr",
  "the finns party parliamentary group": "ps",
  "left alliance parliamentary group": "vas",
  "liike nyt-movement's parliamentary group": "liik",
  "parliamentary group timo vornanen": "pg",
};

function resolveCode(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return ENGLISH_NAME_TO_CODE[lower] ?? lower;
}

export function partyColor(raw: string): string {
  const code = resolveCode(raw);
  return PARTY_COLORS[code] ?? "#999999";
}

export function partyShortName(raw: string, fallback?: string): string {
  const code = resolveCode(raw);
  return PARTY_SHORT[code] ?? fallback ?? raw;
}
