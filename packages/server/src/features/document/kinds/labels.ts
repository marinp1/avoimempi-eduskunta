import i18next, { ParseKeys } from "i18next";

/** Labels for legislative-initiative type codes. */
export const LA_LABELS = {
  LA: "asiakirjat:initiative_type_labels.LA",
  TPA: "asiakirjat:initiative_type_labels.TPA",
  RA: "asiakirjat:initiative_type_labels.RA",
  A: "asiakirjat:initiative_type_labels.A",
} as const satisfies Record<string, ParseKeys>;

/** Labels for committee-report type codes. */
export const REPORT_LABELS = {
  M: "asiakirjat:report_type_labels.M",
  L: "asiakirjat:report_type_labels.L",
} as const satisfies Record<string, ParseKeys>;

/** Translated label for a legislative-initiative type code (e.g. `LA`, `TPA`). */
export function initiativeTypeLabel(
  code: string | null | undefined,
): string | null {
  if (!code) return null;
  const lookup = LA_LABELS[code as keyof typeof LA_LABELS];
  return i18next.t(lookup ?? "asiakirjat:initiative_type_labels.A");
}

/** Translated label for a committee-report type code (e.g. `M`, `L`). */
export function reportTypeLabel(
  code: string | null | undefined,
): string | null {
  if (!code) return null;
  const lookup = REPORT_LABELS[code as keyof typeof REPORT_LABELS];
  return i18next.t(lookup ?? "asiakirjat:report_type_labels.M");
}

const QUESTION_KIND_LABEL_KEYS = {
  written_question: "asiakirjat:kind_labels.kk",
  interpellation: "asiakirjat:kind_labels.valikysymys",
  oral_question: "asiakirjat:kind_labels.suullinen",
} as const;

/**
 * Translated label for a person-profile question kind
 * (`written_question` | `interpellation` | `oral_question`).
 */
export function questionKindLabel(kind: string | null | undefined): string {
  const key = kind
    ? QUESTION_KIND_LABEL_KEYS[kind as keyof typeof QUESTION_KIND_LABEL_KEYS]
    : undefined;
  return key ? i18next.t(key) : (kind ?? "");
}
