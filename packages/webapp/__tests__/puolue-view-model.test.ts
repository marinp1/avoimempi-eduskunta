import { describe, expect, test } from "bun:test";
import { buildPartyDetailData } from "../templates/pages/puolue-view-model";

describe("buildPartyDetailData", () => {
  test("builds party detail from summary and members", () => {
    const data = buildPartyDetailData({
      partyCode: "kok",
      partyRow: {
        member_count: 40,
        is_in_government: 1,
        participation_rate: 92.5,
        average_age: 48.3,
        female_count: 18,
        male_count: 22,
      },
      members: [
        {
          person_id: 1,
          first_name: "Aino",
          last_name: "Aalto",
          party: "kok",
          birth_date: "1980-05-15",
          current_municipality: "Helsinki",
        },
      ],
      cohRow: {
        discipline_rate: 95.5,
        total_votes: 120,
      },
      totalSeats: 200,
      fetchedAt: "1.6.2025",
    });

    expect(data.party.code).toBe("kok");
    expect(data.party.name).toBe("Kokoomus");
    expect(data.party.bloc).toBe("government");
    expect(data.party.seatCount).toBe(40);
    expect(data.party.seatShare).toBe("20.0 %");
    expect(data.totalSeats).toBe(200);
    expect(data.cohesion.pct).toBe(96);
    expect(data.cohesion.totalVotings).toBe(120);
    expect(data.members).toHaveLength(1);
    expect(data.members[0].firstName).toBe("Aino");
    expect(data.fetchedAt).toBe("1.6.2025");
  });

  test("empty data produces defaults", () => {
    const data = buildPartyDetailData({
      partyCode: "xyz",
      partyRow: undefined,
      members: [],
      cohRow: undefined,
      totalSeats: 0,
      fetchedAt: "",
    });

    expect(data.party.seatCount).toBe(0);
    expect(data.party.seatShare).toBe("\u2013");
    expect(data.party.bloc).toBe("opposition");
    expect(data.cohesion.pct).toBeNull();
    expect(data.members).toHaveLength(0);
  });
});
