import Keskustelu from "../../../webapp/templates/pages/keskustelu";
import { buildDebateViewModel } from "../../../webapp/templates/pages/keskustelu-view-model";
import { page, getTimelineData } from "./helpers";
import type { WebappDeps } from "./deps";

export function createKeskusteluRoute(deps: WebappDeps) {
  return {
    "/keskustelu": {
      GET: (req: Request) => {
        const url = new URL(req.url);
        const sectionKey = url.searchParams.get("key");
        if (!sectionKey) {
          return new Response("Not found", { status: 404 });
        }

        const section = deps.sessionRepository.fetchSectionByKey({
          sectionKey,
        });
        if (!section) {
          return new Response("Section not found", { status: 404 });
        }

        const sessionKey: string = (section as any).session_key;
        if (!sessionKey) {
          return new Response("Section has no session", { status: 404 });
        }

        const { session } = deps.sessionRepository.fetchSessionByKey({
          key: sessionKey,
        });
        if (!session) {
          return new Response("Session not found", { status: 404 });
        }

        const { speeches } = deps.sessionRepository.fetchSectionSpeeches({
          sectionKey,
          limit: 500,
          offset: 0,
        });

        const sectionVotings = deps.sessionRepository.fetchSectionVotings({
          sectionKey,
        });

        const sectionDocs = deps.sessionRepository.fetchSectionDocumentLinks({
          sectionKey,
        });

        const partySeatRows = deps.sessionRepository.fetchPartySeatCounts(
          (session as any).date ?? new Date().toISOString().slice(0, 10),
        );
        const partyGovMap = new Map<string, number>();
        for (const row of partySeatRows) {
          partyGovMap.set(row.party_code, row.is_in_government);
        }

        const fetchedAt = new Date().toLocaleString("fi-FI", {
          day: "numeric",
          month: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });

        const data = buildDebateViewModel({
          session,
          section,
          speeches,
          sectionVotings,
          sectionDocs,
          partyGovMap,
          fetchedAt,
        });

        const title = `Keskustelu: ${data.section.title}`;

        const tlData = getTimelineData(
          req,
          deps.sessionRepository,
          deps.metadataRepository,
        );

        return page(req, Keskustelu({ data }), "/istunnot", title, tlData);
      },
    },
  } as const;
}
