import { describe, expect, test } from "bun:test";
import { buildSingleVoteData } from "../templates/pages/aanestys-view-model";

describe("buildSingleVoteData", () => {
  test("builds vote data from voting row and details", () => {
    const data = buildSingleVoteData({
      voting: {
        id: 1,
        number: 42,
        title: "Testiäänestys",
        title_extra: null,
        start_date: "2025-01-15",
        start_time: "2025-01-15T10:00:00",
        session_key: "2025/1",
        section_order: 3,
        section_key: "SK-123",
        section_title: "Asiakohta A",
        n_yes: 100,
        n_no: 50,
        n_abstain: 10,
        n_absent: 40,
        n_total: 200,
      },
      details: {
        partyBreakdown: [
          {
            party_code: "kok",
            party_name: "Kokoomus",
            n_yes: 30,
            n_no: 10,
            n_abstain: 5,
            n_absent: 5,
            n_total: 50,
          },
        ],
        memberVotes: [
          {
            person_id: 1,
            first_name: "Matti",
            last_name: "Meikäläinen",
            party_code: "kok",
            vote: "JAA",
            is_government: 1,
          },
        ],
        governmentOpposition: {
          government_yes: 60,
          government_no: 30,
          government_abstain: 5,
          government_absent: 5,
          government_total: 100,
          opposition_yes: 40,
          opposition_no: 20,
          opposition_abstain: 5,
          opposition_absent: 35,
          opposition_total: 100,
        },
        relatedVotings: [],
      },
      fetchedAt: "1.6.2025",
    });

    expect(data.vote.id).toBe(1);
    expect(data.vote.votingNumber).toBe(42);
    expect(data.vote.title).toBe("Testiäänestys");
    expect(data.vote.nYes).toBe(100);
    expect(data.vote.nNo).toBe(50);
    expect(data.vote.nTotal).toBe(200);
    expect(data.vote.yesPct).toBe(50);
    expect(data.vote.noPct).toBe(25);
    expect(data.vote.outcome).toBe("ok");

    expect(data.partyBreakdown).toHaveLength(1);
    expect(data.partyBreakdown[0].partyCode).toBe("kok");
    expect(data.partyBreakdown[0].partyName).toBe("Kokoomus");
    expect(data.partyBreakdown[0].nYes).toBe(30);

    expect(data.mpVotes).toHaveLength(1);
    expect(data.mpVotes[0].vote).toBe("jaa");
    expect(data.mpVotes[0].bloc).toBe("government");

    expect(data.govOppBreakdown.governmentYes).toBe(60);
    expect(data.govOppBreakdown.oppositionYes).toBe(40);

    expect(data.fetchedAt).toBe("1.6.2025");
  });

  test("null details produce empty arrays and zero breakdown", () => {
    const data = buildSingleVoteData({
      voting: {
        id: 2,
        number: 1,
        title: "Empty",
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
      fetchedAt: "",
    });

    expect(data.partyBreakdown).toHaveLength(0);
    expect(data.mpVotes).toHaveLength(0);
    expect(data.govOppBreakdown.governmentTotal).toBe(0);
    expect(data.relatedVotes).toHaveLength(0);
    expect(data.vote.outcome).toBe("no");
  });
});
