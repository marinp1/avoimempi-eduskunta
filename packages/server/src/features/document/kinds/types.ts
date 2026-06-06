import type { AsiakirjaViewModel } from "../pages/detail.page";
import type { DocumentRepository } from "../document.repository";
import type { PersonRepository } from "#server/features/person/person.repository";

import type { ParseKeys, Namespace } from "i18next";

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

export type TranslationKey = ParseKeys<Namespace>;

/** A single row in the unified document listing. */
export interface DocumentRow {
  id: number;
  linkId: number;
  hasDetail: boolean;
  kind: DocumentKind;
  identifier: string;
  title: string;
  date: string;
  dateLabel: string;
  authorName: string | null;
  authorParty: string | null;
  authorPartyColor: string;
  statusLabel: string | null;
  statusClass: string;
  subjects: string[];
  highlight: string | null;
}

/** Parameters forwarded to a kind's list query. */
export interface DocumentListParams {
  query?: string;
  page: number;
  limit: number;
}

/**
 * Cross-repository context handed to detail builders.  Replaces the previous
 * `WebappDeps` dependency so the document feature does not import from `routes/`.
 * Supplied by {@link DocumentService}.
 */
export interface DocumentDetailContext {
  documentRepo: DocumentRepository;
  personRepo: PersonRepository;
}

/**
 * Everything the app needs to know about one document kind, in one place:
 * the filter chip, how to list it, and how to build its detail view.
 * Adding a kind = write one module + register it in `registry.ts`.
 */
export interface DocumentKindModule {
  key: DocumentKind;
  /** Filter-chip presentation on the listing page. */
  chip: { labelI18n: TranslationKey; dotColor: string };
  /** Fetch one page of this kind and map to uniform {@link DocumentRow}s. */
  list(
    repo: DocumentRepository,
    params: DocumentListParams,
  ): { rows: DocumentRow[]; totalCount: number };
  /** Build the detail view model; omit for kinds with no detail page. */
  detail?(ctx: DocumentDetailContext, id: string): AsiakirjaViewModel | null;
}
