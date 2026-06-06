import type { AnalyticsRepository } from "./analytics.repository";
import { buildPuolueetData } from "../metadata/pages/list.view-model";
import { buildPartyDetailData } from "../metadata/pages/detail.view-model";
import { fetchedAt } from "#server/helpers";

export class AnalyticsService {
  constructor(private readonly analyticsRepo: AnalyticsRepository) {}

  getPartyList(params: {
    asOfDate: string;
    startDate?: string;
    endDate?: string;
    governmentStartDate?: string;
  }) {
    const summaryRows = this.analyticsRepo.fetchPartySummary({
      asOfDate: params.asOfDate,
      startDate: params.startDate,
      endDate: params.endDate,
      governmentStartDate: params.governmentStartDate,
    });
    const partyDiscipline = this.analyticsRepo.fetchPartyDiscipline({
      startDate: params.startDate,
      endDate: params.endDate,
    });
    return buildPuolueetData({
      summaryRows,
      partyDiscipline,
      fetchedAt: fetchedAt(),
    });
  }

  getPartyDetail(params: {
    partyCode: string;
    asOfDate: string;
    startDate?: string;
    endDate?: string;
    governmentStartDate?: string;
  }) {
    const summaryRows = this.analyticsRepo.fetchPartySummary({
      asOfDate: params.asOfDate,
      startDate: params.startDate,
      endDate: params.endDate,
      governmentStartDate: params.governmentStartDate,
    });
    const partyRow = summaryRows.find((r) => r.party_code === params.partyCode);
    const members = this.analyticsRepo.fetchPartyMembers({
      partyCode: params.partyCode,
      asOfDate: params.asOfDate,
      startDate: params.startDate,
      endDate: params.endDate,
      governmentStartDate: params.governmentStartDate,
    });
    const partyDiscipline = this.analyticsRepo.fetchPartyDiscipline({
      startDate: params.startDate,
      endDate: params.endDate,
    });

    const govSeats = summaryRows
      .filter((r) => r.is_in_government === 1)
      .reduce((s, r) => s + r.member_count, 0);
    const oppSeats = summaryRows
      .filter((r) => r.is_in_government === 0)
      .reduce((s, r) => s + r.member_count, 0);
    const totalSeats = govSeats + oppSeats;

    const cohRow = partyDiscipline?.find(
      (d) => d.party_code === params.partyCode,
    );

    return buildPartyDetailData({
      partyCode: params.partyCode,
      partyRow,
      members,
      cohRow,
      totalSeats,
      fetchedAt: fetchedAt(),
    });
  }
}
