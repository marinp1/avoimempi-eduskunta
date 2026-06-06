import Istunto from "../../../webapp/templates/pages/istunto";
import { buildSessionDetailViewModel } from "../../../webapp/templates/pages/istunto-view-model";
import { page, getRouteParam, getWebappContext } from "./helpers";
import { fetchedAt } from "../../../webapp/templates/helpers";
import type { PartySeatRow } from "#shared-types";
import type { WebappDeps } from "./deps";

export function createIstuntoRoute(deps: WebappDeps) {
  return {
    "/istunto/:year/:num": {
      GET: (req: Request) => {
        const year = getRouteParam(req, "year");
        const num = getRouteParam(req, "num");
        if (!year || !num) {
          return new Response("Not found", { status: 404 });
        }

        const key = `${year}/${num}`;
        const { session, sections } = deps.sessionRepository.fetchSessionByKey({
          key,
        });

        if (!session) {
          return new Response("Session not found", { status: 404 });
        }

        const votingsBySectionKey = new Map<
          string,
          ReturnType<typeof deps.sessionRepository.fetchSectionVotings>
        >();
        for (const section of sections) {
          if (section.voting_count > 0) {
            const votings = deps.sessionRepository.fetchSectionVotings({
              sectionKey: section.key,
            });
            votingsBySectionKey.set(section.key, votings);
          }
        }

        let rollCallData = null;
        for (const section of sections) {
          const result = deps.sessionRepository.fetchSectionRollCall({
            sectionKey: section.key,
          });
          if (result) {
            rollCallData = result;
            break;
          }
        }

        const partySeatRows: PartySeatRow[] =
          deps.sessionRepository.fetchPartySeatCounts(
            session.date ?? new Date().toISOString().slice(0, 10),
          );
        const seatCounts: Record<string, { seats: number; inGov: boolean }> =
          {};
        for (const row of partySeatRows) {
          seatCounts[row.party_code] = {
            seats: row.seat_count,
            inGov: row.is_in_government === 1,
          };
        }

        const docIdMap = resolveDocumentIds(sections, deps);

        const data = buildSessionDetailViewModel(
          session,
          sections,
          votingsBySectionKey,
          rollCallData,
          fetchedAt(),
          seatCounts,
          docIdMap,
        );

        const { tlData } = getWebappContext(req, deps);
        return page(
          req,
          Istunto({ data }),
          "/istunnot",
          `Täysistunto ${key}`,
          tlData,
        );
      },
    },
  } as const;
}

function resolveDocumentIds(
  sections: Array<{ minutes_related_document_identifier?: string | null }>,
  deps: WebappDeps,
): Map<string, number> {
  const map = new Map<string, number>();
  const seen = new Set<string>();
  for (const section of sections) {
    const ident = section.minutes_related_document_identifier;
    if (!ident || seen.has(ident)) continue;
    seen.add(ident);
    try {
      const wq = deps.documentRepository.fetchWrittenQuestionByIdentifier({
        identifier: ident,
      });
      if (wq) map.set(ident, wq.id);
    } catch {
      // Identifier not found in WrittenQuestion — skip
    }
  }
  return map;
}
