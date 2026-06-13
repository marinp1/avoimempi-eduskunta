// Title format: "[bill_id] [committee] [DD.MM.YYYY][_lang?] [author identity] [_lang?][doc type label][_suffix?]"
// - Date may be followed by "_fi_sv_" style language tags before the author text
// - Label may be preceded by "_fi_" / "_sv_" tags (2-letter lowercase + underscore sequences)
// - Label may be followed by comma- or underscore-qualified suffixes ("...lausunto,esitys", "...lausunto_Suomennos")
export const AUTHOR_IN_TITLE =
  /\d{1,2}\.\d{1,2}\.\d{4}(?:_[a-z_]+)?\s+([\s\S]+?)[\s_]+(?:(?:fi|sv|en)_)?(?:Asiantuntijalausunto|Asiantuntijalausunnon[\s_]liite|Asiantuntijasuunnitelma|kirjallinen|Suomennos)(?:[,_\s]|$)/i;

export function extractAuthorFromTitle(title: string | null): string | null {
  if (!title) return null;
  const m = AUTHOR_IN_TITLE.exec(title);
  if (!m) return null;
  const text = m[1].trim();
  return text.length >= 3 ? text : null;
}

// "Asiantuntijalausunto [n (n)] [date] [author text]" — author follows the page/date header
const BODY_AFTER_LABEL =
  /(?:Asiantuntijalausunto|Asiantuntijalausunnon\s+liite)\s+\d+\s*\(\d+\)\s+\d{1,2}\.\d{1,2}\.\d{4}\s+([\s\S]+?)(?=\s{2,}|\n|\bPL\b|\bwww\b|Y-tunnus|\d{5})/i;

// "[author/org] Asiantuntijalausunto" — author appears on the line immediately before the label
const BODY_BEFORE_LABEL =
  /^([\s\S]{4,150}?)\s*(?:Asiantuntijalausunto|Asiantuntijalausunnon\s+liite)\b/i;

export function extractAuthorFromBodyText(bodyText: string | null): string | null {
  if (!bodyText) return null;
  const head = bodyText.slice(0, 400).replace(/\r\n/g, "\n");

  const afterMatch = BODY_AFTER_LABEL.exec(head);
  if (afterMatch) {
    const candidate = afterMatch[1].replace(/\s+/g, " ").trim();
    if (candidate.length >= 4 && candidate.length <= 200) return candidate;
  }

  const beforeMatch = BODY_BEFORE_LABEL.exec(head);
  if (beforeMatch) {
    const lines = beforeMatch[1].split("\n").map((l) => l.trim()).filter(Boolean);
    const last = lines[lines.length - 1] ?? "";
    if (last.length >= 4 && last.length <= 150) return last;
  }

  return null;
}

export const ORG_INDICATORS =
  /\b(?:ry|rf|oyj|oy|ab|virasto|ministeriö|liitto|neuvosto|yhdistys|seura|säätiö|keskus|laitos|toimisto|komitea|toimikunta|järjestö|instituutti|institutti|yliopisto|ammattikorkeakoulu|korkeakoulu)\b/i;

export function extractOrgFromAuthorText(authorText: string | null): string | null {
  if (!authorText) return null;
  const lastCommaIdx = authorText.lastIndexOf(", ");
  if (lastCommaIdx === -1) {
    return ORG_INDICATORS.test(authorText) ? authorText : null;
  }
  if (authorText[lastCommaIdx - 1] === "-") {
    return authorText;
  }
  const candidate = authorText.slice(lastCommaIdx + 2);
  if (/\bosasto\b/i.test(candidate)) {
    return authorText;
  }
  return candidate;
}
