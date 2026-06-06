import Istunto from "../../../webapp/templates/pages/istunto";
import { buildSessionDetailViewModel } from "../../../webapp/templates/pages/istunto-view-model";
import { page } from "./helpers";
import type { WebappDeps } from "./deps";

export function createIstuntoRoute(deps: WebappDeps) {
  return {
    "/istunto/:year/:num": {
      GET: (req: Request) => {
        const year = (req as any).params.year;
        const num = (req as any).params.num;
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

        const votingsBySectionKey = new Map<string, any[]>();
        for (const section of sections) {
          if (section.voting_count > 0) {
            const votings = deps.sessionRepository.fetchSectionVotings({
              sectionKey: section.key,
            });
            votingsBySectionKey.set(section.key, votings);
          }
        }

        let rollCallData: any = null;
        for (const section of sections) {
          const result = deps.sessionRepository.fetchSectionRollCall({
            sectionKey: section.key,
          });
          if (result) {
            rollCallData = result;
            break;
          }
        }

        const fetchedAt = new Date().toLocaleString("fi-FI", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const data = buildSessionDetailViewModel(
          session,
          sections,
          votingsBySectionKey,
          rollCallData,
          fetchedAt,
        );

        return page(req, Istunto({ data }), "/istunnot", `Täysistunto ${key}`);
      },
    },
  } as const;
}
