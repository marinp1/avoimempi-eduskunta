import type { SessionRepository } from "./session.repository";
import type { DocumentRepository } from "../document/document.repository";
import { buildSessionsViewModel } from "#server/features/session/pages/list.view-model";
import { buildSessionDetailViewModel } from "./pages/detail.view-model";
import type { PartySeatRow } from "#server/types/webapp";
import { fetchedAt } from "#server/helpers";

export class SessionService {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly documentRepo: DocumentRepository,
  ) {}

  getSessionIndex(params: {
    startDate: string;
    endDate?: string;
    cursor: string;
    today: string;
    kind?: string;
    q?: string;
  }) {
    const raw = this.sessionRepo.fetchSessionsIndex(2000);
    const termFiltered = raw.filter(
      (r) =>
        r.date >= params.startDate &&
        (!params.endDate || r.date <= params.endDate),
    );
    const filtered =
      params.cursor < params.today
        ? termFiltered.filter((r) => r.date <= params.cursor)
        : termFiltered;
    return buildSessionsViewModel(filtered, {
      kind: params.kind,
      q: params.q,
    });
  }

  getSessionDetail(sessionKey: string) {
    const { session, sections } = this.sessionRepo.fetchSessionByKey({
      key: sessionKey,
    });

    if (!session) return null;

    const votingsBySectionKey = new Map<
      string,
      ReturnType<typeof this.sessionRepo.fetchSectionVotings>
    >();
    for (const section of sections) {
      if (section.voting_count > 0) {
        const votings = this.sessionRepo.fetchSectionVotings({
          sectionKey: section.key,
        });
        votingsBySectionKey.set(section.key, votings);
      }
    }

    let rollCallData = null;
    for (const section of sections) {
      const result = this.sessionRepo.fetchSectionRollCall({
        sectionKey: section.key,
      });
      if (result) {
        rollCallData = result;
        break;
      }
    }

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
      fetchedAt(),
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
    const map = new Map<string, number>();
    const seen = new Set<string>();
    for (const section of sections) {
      const ident = section.minutes_related_document_identifier;
      if (!ident || seen.has(ident)) continue;
      seen.add(ident);
      try {
        const wq = this.documentRepo.fetchWrittenQuestionByIdentifier({
          identifier: ident,
        });
        if (wq) map.set(ident, wq.id);
      } catch {
        // Identifier not found in WrittenQuestion — skip
      }
    }
    return map;
  }
}
