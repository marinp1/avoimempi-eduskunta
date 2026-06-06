import Keskustelu from "#server/features/session/fragments/debate.fragment";
import { buildDebateViewModel } from "#server/features/session/pages/debate.view-model";
import {
  page,
  getWebappContext,
  getPeriodSelectorData,
  notFoundResponse,
} from "./helpers";
import { fetchedAt } from "#server/helpers/template-helpers";
import type { PartySeatRow } from "#server/types/webapp";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#server/helpers";

export function createDebateRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/keskustelu",
    GET: (req) => {
      const url = new URL(req.url);
      const sectionKey = url.searchParams.get("key");
      if (!sectionKey) {
        return notFoundResponse(req, "/keskustelu");
      }

      const section = deps.sessionRepository.fetchSectionByKey({
        sectionKey,
      });
      if (!section) {
        return notFoundResponse(
          req,
          `/keskustelu?key=${encodeURIComponent(sectionKey)}`,
        );
      }

      const sessionKey = section.session_key;
      if (!sessionKey) {
        return notFoundResponse(
          req,
          `/keskustelu?key=${encodeURIComponent(sectionKey)}`,
        );
      }

      const { session } = deps.sessionRepository.fetchSessionByKey({
        key: sessionKey,
      });
      if (!session) {
        return notFoundResponse(
          req,
          `/keskustelu?key=${encodeURIComponent(sectionKey)}`,
        );
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

      const partySeatRows: PartySeatRow[] =
        deps.sessionRepository.fetchPartySeatCounts(
          session.date ?? new Date().toISOString().slice(0, 10),
        );
      const partyGovMap = new Map<string, number>();
      for (const row of partySeatRows) {
        partyGovMap.set(row.party_code, row.is_in_government);
      }

      const data = buildDebateViewModel({
        session,
        section,
        speeches,
        sectionVotings,
        sectionDocs,
        partyGovMap,
        fetchedAt: fetchedAt(),
      });

      const title = i18next.t("common:debate_title_format", {
        title: data.section.title,
      });
      const { tlData } = getWebappContext(url, deps);
      const periodData = getPeriodSelectorData(url, deps.metadataRepository);

      return page({
        req,
        fragment: Keskustelu({ data }),
        activePath: "/istunnot",
        title,
        timelineData: tlData,
        periodData,
      });
    },
  });
}
