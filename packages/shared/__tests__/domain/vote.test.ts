import { describe, expect, test } from "bun:test";
import { buildVoteTally, tallyVoteList } from "#shared/domain";

describe("buildVoteTally", () => {
  test("zero total → all pcts 0 and outcome 'no'", () => {
    const t = buildVoteTally({});
    expect(t.nYes).toBe(0);
    expect(t.nNo).toBe(0);
    expect(t.yesPct).toBe(0);
    expect(t.noPct).toBe(0);
    expect(t.emptyPct).toBe(0);
    expect(t.absentPct).toBe(0);
    expect(t.participationPct).toBe(0);
    expect(t.nCast).toBe(0);
    expect(t.outcome).toBe("no");
  });

  test("tie (nYes === nNo) → outcome 'no'", () => {
    const t = buildVoteTally({ nYes: 50, nNo: 50, nTotal: 100 });
    expect(t.outcome).toBe("no");
  });

  test("nYes > nNo → outcome 'ok'", () => {
    const t = buildVoteTally({ nYes: 60, nNo: 40, nTotal: 100 });
    expect(t.outcome).toBe("ok");
  });

  test("known case: 100/40/5/5/200 → correct pcts", () => {
    const t = buildVoteTally({
      nYes: 100,
      nNo: 40,
      nEmpty: 5,
      nAbsent: 5,
      nTotal: 200,
    });
    expect(t.nYes).toBe(100);
    expect(t.nNo).toBe(40);
    expect(t.nEmpty).toBe(5);
    expect(t.nAbsent).toBe(5);
    expect(t.nTotal).toBe(200);
    expect(t.nCast).toBe(145);
    expect(t.yesPct).toBe(50);
    expect(t.noPct).toBe(20);
    expect(t.emptyPct).toBe(2.5);
    expect(t.absentPct).toBe(2.5);
    expect(t.participationPct).toBe(72.5);
  });

  test("partial input uses 0 for missing fields", () => {
    const t = buildVoteTally({ nYes: 10, nNo: 5 });
    expect(t.nTotal).toBe(0);
    expect(t.nEmpty).toBe(0);
    expect(t.nAbsent).toBe(0);
  });
});

describe("tallyVoteList", () => {
  test("correctly tallies Finnish vote labels", () => {
    const votes = [
      { vote: "Jaa" },
      { vote: "Jaa" },
      { vote: "Jaa" },
      { vote: "Ei" },
      { vote: "Ei" },
      { vote: "Tyhjää" },
      { vote: "Poissa" },
    ];
    const t = tallyVoteList(votes);
    expect(t.nYes).toBe(3);
    expect(t.nNo).toBe(2);
    expect(t.nEmpty).toBe(1);
    expect(t.nAbsent).toBe(1);
    expect(t.nTotal).toBe(7);
    expect(t.nCast).toBe(6);
    expect(t.participationPct).toBeCloseTo(85.714, 1);
  });

  test("empty list → all zeros", () => {
    const t = tallyVoteList([]);
    expect(t.nTotal).toBe(0);
    expect(t.nYes).toBe(0);
    expect(t.outcome).toBe("no");
  });
});
