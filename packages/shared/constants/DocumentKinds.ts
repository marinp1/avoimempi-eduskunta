/** All supported document kind keys. */
export const DOC_KIND_KEYS = [
  "kk",
  "suullinen",
  "valikysymys",
  "vastaus",
  "he",
  "aloite",
  "mietinto",
  "asiantuntija",
  "vastaus-edk",
] as const;

/** Discriminated union of document kind identifiers. */
export type DocumentKind = (typeof DOC_KIND_KEYS)[number];

/**
 * Discriminator for the status badge shown on listing rows.
 * - `"answer_date"` — answered if `answer_date` is present, else pending
 * - `"decision_outcome"` — handled if `decision_outcome` is present, else pending
 * - `"always-response"` — always shown as a response badge
 * - `null` — no status badge
 */
export type StatusDiscriminator =
  | "answer_date"
  | "decision_outcome"
  | "always-response"
  | null;

/** Metadata descriptor for a single document kind. */
export interface DocKindDescriptor {
  key: DocumentKind;
  /** i18n key for the detail-page label (e.g. `"asiakirjat:kind_labels.kk"`) */
  detailLabelI18n: string;
  /** i18n key for the filter-chip label (e.g. `"asiakirjat:chip_labels.kk"`) */
  chipLabelI18n: string;
  /** CSS custom-property colour for the filter-chip dot */
  dotColor: string;
  /** Field name for the primary date on listing rows */
  dateField: string;
  /** i18n key for formatting the primary date, or `""` if none */
  dateFormatKey: string;
  /** Field name for the document identifier on listing rows */
  identifierField: string;
  /** Fields used to build the author display name (first-signer name parts) */
  authorFields: string[];
  /** Field name for the author's party code */
  partyField: string;
  /** Fields whose values are rendered in the highlight column */
  highlightFields: string[];
  /** Field name for the link target on listing rows */
  linkField: string;
  /** Whether the kind has a detail page */
  hasDetail: boolean;
  /** How to compute the status badge on listing rows */
  statusFn: StatusDiscriminator;
}

/**
 * Type of a single list item from any document-kind search query.
 * All known fields are optional; concrete query results are narrower.
 */
export interface DocSearchItem {
  id: number;
  title: string | null;
  parliament_identifier?: string;
  edk_identifier?: string;
  submission_date?: string | null;
  answer_date?: string | null;
  signature_date?: string | null;
  draft_date?: string | null;
  meeting_date?: string | null;
  first_signer_first_name?: string | null;
  first_signer_last_name?: string | null;
  first_signer_party?: string | null;
  decision_outcome?: string | null;
  answer_minister_title?: string | null;
  author?: string | null;
  initiative_type_code?: string | null;
  committee_name?: string | null;
  report_type_code?: string | null;
  source_reference?: string | null;
  bill_identifier?: string | null;
  question_identifier?: string | null;
  minister_title?: string | null;
  subjects?: string | null;
  [key: string]: unknown;
}

/**
 * Parameters forwarded to document-kind repository list methods.
 */
export interface DocQueryParams {
  query?: string;
  page: number;
  limit: number;
}

/**
 * Paginated search result from a document-kind repository.
 */
export interface DocResult {
  items: DocSearchItem[];
  totalCount: number;
}

/**
 * Labels for legislative-initiative type codes.  Shared by detail builders
 * and the listing {@link mapDocHighlight} helper.
 */
export const LA_LABELS: Record<string, string> = {
  LA: "asiakirjat:initiative_type_labels.LA",
  TPA: "asiakirjat:initiative_type_labels.TPA",
  RA: "asiakirjat:initiative_type_labels.RA",
  A: "asiakirjat:initiative_type_labels.A",
};

/**
 * Labels for committee-report type codes.  Shared by detail builders
 * and the listing {@link mapDocHighlight} helper.
 */
export const REPORT_LABELS: Record<string, string> = {
  M: "asiakirjat:report_type_labels.M",
  L: "asiakirjat:report_type_labels.L",
};

/** The canonical registry of every supported document kind. */
export const DOC_KIND_REGISTRY: Record<DocumentKind, DocKindDescriptor> = {
  kk: {
    key: "kk",
    detailLabelI18n: "asiakirjat:kind_labels.kk",
    chipLabelI18n: "asiakirjat:chip_labels.kk",
    dotColor: "var(--blue)",
    dateField: "submission_date",
    dateFormatKey: "asiakirjat:status_labels.submitted_on",
    identifierField: "parliament_identifier",
    authorFields: ["first_signer_first_name", "first_signer_last_name"],
    partyField: "first_signer_party",
    highlightFields: ["answer_minister_title"],
    linkField: "id",
    hasDetail: true,
    statusFn: "answer_date",
  },
  suullinen: {
    key: "suullinen",
    detailLabelI18n: "asiakirjat:kind_labels.suullinen",
    chipLabelI18n: "asiakirjat:chip_labels.suullinen",
    dotColor: "var(--blue)",
    dateField: "submission_date",
    dateFormatKey: "asiakirjat:status_labels.submitted_on",
    identifierField: "parliament_identifier",
    authorFields: [],
    partyField: "",
    highlightFields: [],
    linkField: "id",
    hasDetail: true,
    statusFn: "decision_outcome",
  },
  valikysymys: {
    key: "valikysymys",
    detailLabelI18n: "asiakirjat:kind_labels.valikysymys",
    chipLabelI18n: "asiakirjat:chip_labels.valikysymys",
    dotColor: "var(--red)",
    dateField: "submission_date",
    dateFormatKey: "asiakirjat:status_labels.submitted_on",
    identifierField: "parliament_identifier",
    authorFields: ["first_signer_first_name", "first_signer_last_name"],
    partyField: "first_signer_party",
    highlightFields: [],
    linkField: "id",
    hasDetail: true,
    statusFn: "decision_outcome",
  },
  vastaus: {
    key: "vastaus",
    detailLabelI18n: "asiakirjat:kind_labels.vastaus",
    chipLabelI18n: "asiakirjat:chip_labels.vastaus",
    dotColor: "var(--hall)",
    dateField: "answer_date",
    dateFormatKey: "asiakirjat:status_labels.answered_on",
    identifierField: "parliament_identifier",
    authorFields: [],
    partyField: "",
    highlightFields: ["minister_title", "question_identifier"],
    linkField: "question_id",
    hasDetail: true,
    statusFn: "always-response",
  },
  he: {
    key: "he",
    detailLabelI18n: "asiakirjat:kind_labels.he",
    chipLabelI18n: "asiakirjat:chip_labels.he",
    dotColor: "var(--opp)",
    dateField: "submission_date",
    dateFormatKey: "asiakirjat:status_labels.submitted_on",
    identifierField: "parliament_identifier",
    authorFields: [],
    partyField: "",
    highlightFields: ["author"],
    linkField: "id",
    hasDetail: true,
    statusFn: "decision_outcome",
  },
  aloite: {
    key: "aloite",
    detailLabelI18n: "asiakirjat:kind_labels.aloite",
    chipLabelI18n: "asiakirjat:chip_labels.aloite",
    dotColor: "var(--hall)",
    dateField: "submission_date",
    dateFormatKey: "asiakirjat:status_labels.submitted_on",
    identifierField: "parliament_identifier",
    authorFields: ["first_signer_first_name", "first_signer_last_name"],
    partyField: "first_signer_party",
    highlightFields: ["initiative_type_code"],
    linkField: "id",
    hasDetail: true,
    statusFn: "decision_outcome",
  },
  mietinto: {
    key: "mietinto",
    detailLabelI18n: "asiakirjat:kind_labels.mietinto",
    chipLabelI18n: "asiakirjat:chip_labels.mietinto",
    dotColor: "var(--muted)",
    dateField: "signature_date",
    dateFormatKey: "asiakirjat:status_labels.given_on",
    identifierField: "parliament_identifier",
    authorFields: [],
    partyField: "",
    highlightFields: ["committee_name", "report_type_code"],
    linkField: "id",
    hasDetail: true,
    statusFn: null,
  },
  asiantuntija: {
    key: "asiantuntija",
    detailLabelI18n: "asiakirjat:kind_labels.kk", // fallback — no detail page
    chipLabelI18n: "asiakirjat:chip_labels.asiantuntija",
    dotColor: "var(--faint)",
    dateField: "meeting_date",
    dateFormatKey: "",
    identifierField: "edk_identifier",
    authorFields: [],
    partyField: "",
    highlightFields: ["committee_name", "bill_identifier"],
    linkField: "id",
    hasDetail: false,
    statusFn: null,
  },
  "vastaus-edk": {
    key: "vastaus-edk",
    detailLabelI18n: "asiakirjat:kind_labels.vastaus-edk",
    chipLabelI18n: "asiakirjat:chip_labels.vastaus-edk",
    dotColor: "var(--hall)",
    dateField: "submission_date",
    dateFormatKey: "asiakirjat:status_labels.given_on",
    identifierField: "parliament_identifier",
    authorFields: [],
    partyField: "",
    highlightFields: ["source_reference"],
    linkField: "id",
    hasDetail: true,
    statusFn: null,
  },
};

/** Returns an `DocKindDescriptor` array for iterating over all kinds. */
export function docKindList(): DocKindDescriptor[] {
  return DOC_KIND_KEYS.map((k) => DOC_KIND_REGISTRY[k]);
}

/**
 * Computes a status badge `{ label, class }` for a document listing row.
 * Consumed by {@link mapToDocRow} in the webapp listing route.
 */
export function docStatus(
  item: DocSearchItem,
  kind: DocumentKind,
): { label: string | null; class: string } {
  const cfg = DOC_KIND_REGISTRY[kind];
  if (cfg.statusFn === "answer_date") {
    return item.answer_date
      ? { label: "asiakirjat:status_labels.answered", class: "spill--done" }
      : { label: "asiakirjat:status_labels.pending", class: "spill--draft" };
  }
  if (cfg.statusFn === "decision_outcome") {
    return item.decision_outcome
      ? { label: "asiakirjat:status_labels.handled", class: "spill--done" }
      : { label: "asiakirjat:status_labels.pending", class: "spill--draft" };
  }
  if (cfg.statusFn === "always-response") {
    return { label: "asiakirjat:status_labels.response", class: "spill--done" };
  }
  return { label: null, class: "" };
}

/**
 * Renders the highlight text for a document listing row, resolving
 * initiative- and report-type codes to their i18n labels.
 * Consumed by {@link mapToDocRow} in the webapp listing route.
 */
export function mapDocHighlight(
  item: DocSearchItem,
  kind: DocumentKind,
): string | null {
  const cfg = DOC_KIND_REGISTRY[kind];
  return (
    cfg.highlightFields
      .map((f) => {
        const v = item[f];
        if (!v) return null;
        if (f === "initiative_type_code") {
          const LABELS: Record<string, string> = {
            LA: "asiakirjat:initiative_type_labels.LA",
            TPA: "asiakirjat:initiative_type_labels.TPA",
            RA: "asiakirjat:initiative_type_labels.RA",
          };
          return LABELS[v as string] ?? String(v);
        }
        if (f === "report_type_code") {
          const vStr = v as string;
          return vStr === "M"
            ? "asiakirjat:report_type_labels.M"
            : vStr === "L"
              ? "asiakirjat:report_type_labels.L"
              : vStr;
        }
        return String(v);
      })
      .filter(Boolean)
      .join(" · ") || null
  );
}
