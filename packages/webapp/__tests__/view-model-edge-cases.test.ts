/**
 * Part C of the SQL↔type contract (see packages/server/__tests__/sql-contract.test.ts).
 *
 * The repository row types are not a runtime guarantee — `db.prepare<Result>()` is an
 * unchecked cast. The `?? fallback` logic in the view-model builders is what actually
 * protects the rendered page when a column is null in production but happened to be
 * non-null in the seed fixtures. These tests feed each pure builder rows where every
 * nullable field is null / every collection is empty, and assert the builder applies
 * its fallbacks instead of throwing or emitting `undefined`.
 *
 * If a builder starts dereferencing a "non-null" field without a guard, the matching
 * test here throws — catching the exact class of bug the snapshot's happy-path
 * nullability cannot.
 */
import { describe, expect, test } from "bun:test";
import { buildPersonProfileData } from "../templates/pages/edustaja-view-model";
import { buildSingleVoteData } from "../templates/pages/aanestys-view-model";
import { buildPartyDetailData } from "../templates/pages/puolue-view-model";

describe("view-model builders tolerate null/empty rows", () => {
  test("buildPersonProfileData: all-null details, empty collections", () => {
    const data = buildPersonProfileData({
      details: {
        person_id: 999,
        first_name: null,
        last_name: null,
        birth_year: null,
        profession: null,
        party: null,
      },
      groupMemberships: [],
      districts: [],
      terms: [],
      votes: [],
      metrics: { person: null, party: null, parliament: null },
      dissents: [],
      initiatives: [],
      questions: [],
      committees: [],
      focusAreas: { areas: [] },
      speeches: { speeches: [] },
      capabilities: { hasAiSummary: false },
      fetchedAt: "1.6.2025",
    });

    expect(data.person.id).toBe(999);
    expect(data.person.partyCode).toBe("unknown");
    expect(data.person.firstName).toBe("");
    expect(data.person.initials).toBe("—");
    expect(data.person.currentDistrict).toBe("");
    expect(data.person.age).toBe("—");
    expect(data.person.isInGovernment).toBe(false);
    expect(data.stats.participationPct).toBe("0");
    expect(data.stats.nTotal).toBe(0);
    expect(data.baselines).toBeNull();
    expect(data.dissents).toEqual([]);
    expect(data.hasAiSummary).toBe(false);
  });

  test("buildSingleVoteData: null title, zero totals, null details", () => {
    const data = buildSingleVoteData({
      voting: {
        id: 7,
        number: 0,
        title: null,
        title_extra: null,
        start_date: null,
        start_time: null,
        session_key: "",
        section_order: null,
        section_key: null,
        section_title: null,
        n_yes: 0,
        n_no: 0,
        n_abstain: 0,
        n_absent: 0,
        n_total: 0,
      },
      details: null,
      fetchedAt: "1.6.2025",
    });

    expect(data.vote.id).toBe(7);
    expect(data.vote.title).toBe("");
    expect(data.vote.dateLabel).toBe("");
    // No division-by-zero when n_total is 0.
    expect(data.vote.yesPct).toBe(0);
    expect(data.vote.noPct).toBe(0);
    expect(Number.isNaN(data.vote.yesPct)).toBe(false);
    expect(data.vote.outcome).toBe("no");
    expect(data.partyBreakdown).toEqual([]);
    expect(data.mpVotes).toEqual([]);
    expect(data.relatedVotes).toEqual([]);
    // govOppBreakdown falls back to an all-zero block, not undefined.
    expect(data.govOppBreakdown.governmentTotal).toBe(0);
    expect(data.govOppBreakdown.oppositionTotal).toBe(0);
  });

  test("buildPartyDetailData: undefined summary, no members, no discipline", () => {
    const data = buildPartyDetailData({
      partyCode: "xyz",
      partyRow: undefined,
      members: [],
      cohRow: undefined,
      totalSeats: 0,
      fetchedAt: "1.6.2025",
    });

    expect(data.party.code).toBe("xyz");
    expect(data.party.bloc).toBe("opposition");
    expect(data.party.seatCount).toBe(0);
    // No division-by-zero when totalSeats is 0.
    expect(data.party.seatShare).toBe("–");
    expect(data.party.avgAttendance).toBeNull();
    expect(data.party.avgAge).toBeNull();
    expect(data.cohesion.pct).toBeNull();
    expect(data.cohesion.totalVotings).toBeNull();
    expect(data.members).toEqual([]);
  });
});
