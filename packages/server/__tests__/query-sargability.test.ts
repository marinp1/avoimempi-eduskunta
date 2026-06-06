import { describe, expect, test } from "bun:test";
import coalitionVsOpposition from "../src/features/analytics/sql/analytics-coalition-opposition.sql";
import votingGovernmentOppositionById from "../src/features/voting/sql/voting-government-opposition.sql";
import votingMemberVotesById from "../src/features/voting/sql/voting-member-votes.sql";
import votingPartyBreakdownById from "../src/features/voting/sql/voting-party-breakdown.sql";

describe("SQL sargability regressions", () => {
  test("voting inline detail queries avoid DATE()/SUBSTR() wrappers on join/filter columns", () => {
    expect(coalitionVsOpposition).not.toMatch(/SUBSTR\s*\(\s*vt\.start_time/i);

    expect(votingGovernmentOppositionById).not.toMatch(
      /DATE\s*\(\s*gm\.start_date/i,
    );
    expect(votingGovernmentOppositionById).not.toMatch(
      /DATE\s*\(\s*gm\.end_date/i,
    );
    expect(votingMemberVotesById).not.toMatch(/DATE\s*\(\s*gm\.start_date/i);
    expect(votingMemberVotesById).not.toMatch(/DATE\s*\(\s*gm\.end_date/i);
    expect(votingPartyBreakdownById).not.toMatch(
      /DATE\s*\(\s*pgm\.start_date/i,
    );
    expect(votingPartyBreakdownById).not.toMatch(/DATE\s*\(\s*pgm\.end_date/i);
  });
});
