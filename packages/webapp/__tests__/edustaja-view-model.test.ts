import { describe, expect, test } from "bun:test";
import { buildPersonProfileData } from "../templates/pages/edustaja-view-model";

describe("buildPersonProfileData", () => {
  test("builds profile from person details and arrays", () => {
    const data = buildPersonProfileData({
      details: {
        person_id: 123,
        first_name: "Matti",
        last_name: "Meikäläinen",
        birth_year: 1975,
        profession: "Opettaja",
        party: "sd",
      },
      groupMemberships: [{ end_date: null, group_abbreviation: "sd" }],
      districts: [{ end_date: null, district_name: "Helsingin vaalipiiri" }],
      terms: [{ start_year: 2019, start_date: null }],
      votes: [
        { vote: "Jaa" },
        { vote: "Jaa" },
        { vote: "Ei" },
        { vote: "Tyhjää" },
        { vote: "Poissa" },
      ],
      metrics: {
        person: {
          initiative_count: 5,
          written_question_count: 12,
          speech_count: 30,
        },
        party: {
          avgSpeechCount: 25,
          avgInitiativeCount: 3,
          avgWrittenQuestionCount: 8,
          avgVoteParticipationRate: 0.85,
        },
        parliament: {
          avgSpeechCount: 20,
          avgInitiativeCount: 2,
          avgWrittenQuestionCount: 6,
          avgVoteParticipationRate: 0.8,
        },
      },
      dissents: [],
      initiatives: [],
      questions: [],
      committees: [],
      focusAreas: { areas: [] },
      speeches: { speeches: [] },
      capabilities: { hasAiSummary: true },
      fetchedAt: "1.6.2025",
    });

    expect(data.person.id).toBe(123);
    expect(data.person.firstName).toBe("Matti");
    expect(data.person.partyCode).toBe("sd");
    expect(data.person.partyName).toBe("SDP");
    expect(data.person.isInGovernment).toBe(true);
    expect(data.person.currentDistrict).toBe("Helsingin vaalipiiri");
    expect(data.person.isInGovernment).toBe(true);
    expect(data.stats.nTotal).toBe(5);
    expect(data.stats.nYes).toBe(2);
    expect(data.stats.nNo).toBe(1);
    expect(data.stats.nEmpty).toBe(1);
    expect(data.stats.nAbsent).toBe(1);
    expect(data.stats.nCast).toBe(4);
    expect(data.stats.nInitiatives).toBe(5);
    expect(data.stats.nWrittenQuestions).toBe(12);
    expect(data.hasAiSummary).toBe(true);
    expect(data.fetchedAt).toBe("1.6.2025");
  });

  test("handles missing data gracefully", () => {
    const data = buildPersonProfileData({
      details: {
        person_id: 456,
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
      fetchedAt: "",
    });

    expect(data.person.partyCode).toBe("unknown");
    expect(data.person.isInGovernment).toBe(false);
    expect(data.person.currentDistrict).toBe("");
    expect(data.person.age).toBe("\u2014");
    expect(data.person.memberSince).toBe("");
    expect(data.stats.nTotal).toBe(0);
    expect(data.baselines).toBeNull();
  });
});
