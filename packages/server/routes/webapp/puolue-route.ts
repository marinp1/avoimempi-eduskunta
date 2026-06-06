import Puolue from "#webapp/templates/pages/puolue";
import type { PartyDetailData } from "#webapp/templates/pages/puolue-view-model";
import { page, getWebappContext, getPeriodSelectorData } from "./helpers";
import { buildPartyDetailData } from "#webapp/templates/pages/puolue-view-model";
import { fetchedAt } from "#webapp/templates/helpers";
import type { WebappDeps } from "./deps";
import { defineRoute } from "#shared-helpers";

export function createPuolueRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/puolue/:code",
    GET: async (req, params) => {
      const code = params.code;
      const { tlData, bounds } = getWebappContext(req, deps);
      const periodData = getPeriodSelectorData(req, deps.metadataRepository);

      const summaryRows = deps.analyticsRepository.fetchPartySummary({
        asOfDate: tlData.cursor,
        startDate: bounds.startDate,
        endDate: bounds.endDate,
        governmentStartDate: bounds.governmentStartDate,
      });

      const partyRow = summaryRows.find((r) => r.party_code === code);
      const members = deps.analyticsRepository.fetchPartyMembers({
        partyCode: code,
        asOfDate: tlData.cursor,
        startDate: bounds.startDate,
        endDate: bounds.endDate,
        governmentStartDate: bounds.governmentStartDate,
      });

      const partyDiscipline = deps.analyticsRepository.fetchPartyDiscipline({
        startDate: bounds.startDate,
        endDate: bounds.endDate,
      });

      const govSeats = summaryRows
        .filter((r) => r.is_in_government === 1)
        .reduce((s, r) => s + r.member_count, 0);
      const oppSeats = summaryRows
        .filter((r) => r.is_in_government === 0)
        .reduce((s, r) => s + r.member_count, 0);
      const totalSeats = govSeats + oppSeats;

      const cohRow = partyDiscipline?.find((d) => d.party_code === code);

      const data: PartyDetailData = buildPartyDetailData({
        partyCode: code,
        partyRow,
        members,
        cohRow,
        totalSeats,
        fetchedAt: fetchedAt(),
      });

      return page({
        req,
        fragment: Puolue({ title: data.party.name, data }),
        activePath: `/puolue/${code}`,
        title: data.party.name,
        timelineData: tlData,
        periodData,
      });
    },
  });
}
