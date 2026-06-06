import Keskustelu from "#webapp/templates/pages/keskustelu";
import { buildDebateViewModel } from "#webapp/templates/pages/keskustelu-view-model";
import {
  page,
  getWebappContext,
  getPeriodSelectorData,
  notFoundResponse,
} from "./helpers";
import { fetchedAt } from "#webapp/templates/helpers";
import type { PartySeatRow } from "#shared-types";
import type { WebappDeps } from "./deps";
import i18next from "i18next";
import { defineRoute } from "#shared-helpers";

export function createKeskusteluRoute(deps: WebappDeps) {
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
      const { tlData } = getWebappContext(req, deps);
      const periodData = getPeriodSelectorData(req, deps.metadataRepository);

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
