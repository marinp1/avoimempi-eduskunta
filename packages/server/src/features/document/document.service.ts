import type { DocumentRepository } from "./document.repository";
import type { PersonRepository } from "#server/features/person/person.repository";
import type { AsiakirjaViewModel } from "./pages/detail.page";
import type { DocumentKind, DocumentRow } from "./kinds/types";
import { DOCUMENT_KINDS, DOCUMENT_KIND_LIST } from "./kinds/registry";

export interface DocumentListResult {
  rows: DocumentRow[];
  totalCount: number;
}

export class DocumentService {
  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly personRepo: PersonRepository,
  ) {}

  /** Lists a single kind, or merges every kind when `kind` is unset/unknown. */
  listByKind(
    kind: string | undefined,
    params: { query?: string; page: number; limit: number },
  ): DocumentListResult {
    if (kind && kind in DOCUMENT_KINDS) {
      return DOCUMENT_KINDS[kind as DocumentKind].list(
        this.documentRepo,
        params,
      );
    }
    return this.listAllKinds(params);
  }

  /** Builds a kind's detail view model, or `null` when the kind has no detail. */
  buildDetail(kind: DocumentKind, id: string): AsiakirjaViewModel | null {
    const ctx = {
      documentRepo: this.documentRepo,
      personRepo: this.personRepo,
    };
    return DOCUMENT_KINDS[kind]?.detail?.(ctx, id) ?? null;
  }

  private listAllKinds(params: {
    query?: string;
    page: number;
    limit: number;
  }): DocumentListResult {
    const allRows: DocumentRow[] = [];
    const perKindLimit = 100;
    for (const mod of DOCUMENT_KIND_LIST) {
      try {
        const { rows } = mod.list(this.documentRepo, {
          query: params.query,
          page: 1,
          limit: perKindLimit,
        });
        allRows.push(...rows);
      } catch {
        // Skip kinds with no data or a failing query.
      }
    }
    allRows.sort(
      (a, b) => (b.date ?? "").localeCompare(a.date ?? "") || b.id - a.id,
    );
    const start = (params.page - 1) * params.limit;
    return {
      rows: allRows.slice(start, start + params.limit),
      totalCount: allRows.length,
    };
  }
}
