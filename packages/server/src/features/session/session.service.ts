import type { SessionRepository } from "./session.repository";
import type { DocumentRepository } from "../document/document.repository";
import { buildSessionsViewModel } from "#server/features/session/pages/list.view-model";
import { buildSessionDetailViewModel } from "./pages/detail.view-model";
import type { PartySeatRow } from "#server/types/webapp";
import type { ProvenanceService } from "#server/domain/provenance.service";

export class SessionService {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly documentRepo: DocumentRepository,
    private readonly provenanceService: ProvenanceService,
  ) {}

  getSessionIndex(params: {
    startDate: string;
    endDate?: string;
    cursor: string;
    today: string;
    kind?: string;
    q?: string;
    offset?: number;
  }) {
    const raw = this.sessionRepo.fetchSessionsIndex({
      limit: 2000,
      startDate: params.startDate,
      endDateExclusive: params.endDate
        ? (() => {
            const d = new Date(`${params.endDate}T00:00:00Z`);
            d.setUTCDate(d.getUTCDate() + 1);
            return d.toISOString().substring(0, 10);
          })()
        : null,
    });
    const filtered =
      params.cursor < params.today
        ? raw.filter((r) => r.date <= params.cursor)
        : raw;
    return buildSessionsViewModel(
      filtered,
      { kind: params.kind, q: params.q },
      params.offset ?? 0,
    );
  }

  getSessionDetail(sessionKey: string) {
    const { session, sections } = this.sessionRepo.fetchSessionByKey({
      key: sessionKey,
    });

    if (!session) return null;

    // Batch fetch: all section votings in one query.
    const sectionKeysWithVotings = sections
      .filter((s) => s.voting_count > 0)
      .map((s) => s.key);
    const votingsBySectionKey = this.sessionRepo.fetchSectionVotingsByKeys(
      sectionKeysWithVotings,
    );

    // Batch fetch: first section with roll call data.
    const rollCallData = this.sessionRepo.fetchSectionRollCallByKeys(
      sections.map((s) => s.key),
    );

    const partySeatRows: PartySeatRow[] = this.sessionRepo.fetchPartySeatCounts(
      session.date ?? new Date().toISOString().slice(0, 10),
    );
    const seatCounts: Record<string, { seats: number; inGov: boolean }> = {};
    for (const row of partySeatRows) {
      seatCounts[row.party_code] = {
        seats: row.seat_count,
        inGov: row.is_in_government === 1,
      };
    }

    const docIdMap = this.resolveDocumentIds(sections);

    return buildSessionDetailViewModel(
      session,
      sections,
      votingsBySectionKey,
      rollCallData,
      this.provenanceService.tableFetchedAt("SaliDBIstunto"),
      seatCounts,
      docIdMap,
    );
  }

  getSectionDetail(sectionKey: string) {
    return this.sessionRepo.fetchSectionByKey({ sectionKey });
  }

  getSectionSpeeches(sectionKey: string, limit?: number, offset?: number) {
    return this.sessionRepo.fetchSectionSpeeches({
      sectionKey,
      limit,
      offset,
    });
  }

  getSectionVotings(sectionKey: string) {
    return this.sessionRepo.fetchSectionVotings({ sectionKey });
  }

  getSectionDocumentLinks(sectionKey: string) {
    return this.sessionRepo.fetchSectionDocumentLinks({ sectionKey });
  }

  getSectionRollCall(sectionKey: string) {
    return this.sessionRepo.fetchSectionRollCall({ sectionKey });
  }

  getCompositionChangeDetail(date: string) {
    return this.sessionRepo.fetchCompositionChangeDetail({ date });
  }

  private resolveDocumentIds(
    sections: Array<{
      minutes_related_document_identifier?: string | null;
    }>,
  ): Map<string, number> {
    const identifiers = Array.from(
      new Set(
        sections
          .map((s) => s.minutes_related_document_identifier)
          .filter((id): id is string => !!id),
      ),
    );
    if (identifiers.length === 0) return new Map();
    return this.sessionRepo.fetchWrittenQuestionsByIdentifiers(identifiers);
  }
}
