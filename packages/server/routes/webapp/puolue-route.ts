import Puolue from "../../../webapp/templates/pages/puolue";
import type { PartyDetailData } from "../../../webapp/templates/pages/puolue-view-model";
import { page, getWebappContext, getRouteParam } from "./helpers";
import {
  partyColor,
  partyShortName,
  fetchedAt,
} from "../../../webapp/templates/helpers";
import type { WebappDeps } from "./deps";

export function createPuolueRoute(deps: WebappDeps) {
  return {
    "/puolue/:code": {
      GET: async (req: Request) => {
        const code = getRouteParam(req, "code") ?? "";
        const { tlData, bounds } = getWebappContext(req, deps);

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
        const pColor = partyColor(code);
        const pName = partyShortName(code, code);

        const cohRow = partyDiscipline?.find((d) => d.party_code === code);
        const cohesionPct = cohRow?.discipline_rate ?? null;

        const data: PartyDetailData = {
          totalSeats,
          party: {
            code,
            name: pName,
            shortName: code,
            color: pColor,
            bloc:
              partyRow?.is_in_government === 1 ? "government" : "opposition",
            chairName: null,
            seatCount: partyRow?.member_count ?? 0,
            seatShare:
              totalSeats > 0
                ? `${(((partyRow?.member_count ?? 0) / totalSeats) * 100).toFixed(1)} %`
                : "–",
            avgAttendance:
              partyRow?.participation_rate != null
                ? `${partyRow.participation_rate.toFixed(0)}`
                : null,
            avgAge:
              partyRow?.average_age != null
                ? `${partyRow.average_age.toFixed(0)}`
                : null,
            govtSince: null,
            femaleCount: partyRow?.female_count ?? 0,
            maleCount: partyRow?.male_count ?? 0,
          },
          cohesion: {
            pct: cohesionPct != null ? Math.round(cohesionPct) : null,
            label:
              cohesionPct != null
                ? `Ryhmä äänestää yhtenäisesti ${Math.round(cohesionPct)} % äänestyksistä`
                : "Ei tietoa ryhmäkurista",
            totalVotings: cohRow?.total_votes ?? null,
          },
          members: members.map((m) => {
            const birthDate = m.birth_date ? new Date(m.birth_date) : null;
            const age =
              birthDate != null
                ? new Date().getFullYear() -
                  birthDate.getFullYear() -
                  (new Date().getMonth() < birthDate.getMonth() ||
                  (new Date().getMonth() === birthDate.getMonth() &&
                    new Date().getDate() < birthDate.getDate())
                    ? 1
                    : 0)
                : null;
            return {
              id: m.person_id,
              firstName: m.first_name,
              lastName: m.last_name,
              partyCode: m.party,
              color: partyColor(m.party),
              district: m.current_municipality ?? "",
              age,
              attendancePct: null,
            };
          }),
          splitVotes: [],
          topics: [],
          committeeChairs: [],
          recentSpeeches: [],
          fetchedAt: fetchedAt(),
        };

        return page(
          req,
          Puolue({ title: pName, data }),
          `/puolue/${code}`,
          pName,
          tlData,
        );
      },
    },
  } as const;
}
