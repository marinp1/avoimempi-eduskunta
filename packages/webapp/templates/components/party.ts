// Keys are the canonical party codes; values are the CSS custom property names
// defined in src/styles/_tokens.css. The CSS var() reference is used for inline
// style attributes so colors can be updated from one place.
const PARTY_CSS_VARS: Record<string, string> = {
  kok: "--party-kok",
  ps: "--party-ps",
  sd: "--party-sd",
  kesk: "--party-kesk",
  vihr: "--party-vihr",
  vas: "--party-vas",
  r: "--party-r",
  kd: "--party-kd",
  liik: "--party-liik",
  pg: "--party-pg",
};

const PARTY_SHORT: Record<string, string> = {
  kok: "Kokoomus",
  ps: "Perussuomalaiset",
  sd: "SDP",
  kesk: "Keskusta",
  vihr: "Vihreät",
  vas: "Vasemmistoliitto",
  r: "RKP",
  kd: "KD",
  liik: "Liike Nyt",
  pg: "Vornanen",
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
  const cssVar = PARTY_CSS_VARS[code];
  return cssVar ? `var(${cssVar})` : "#999999";
}

export function partyShortName(raw: string, fallback?: string): string {
  const code = resolveCode(raw);
  return PARTY_SHORT[code] ?? fallback ?? raw;
}
