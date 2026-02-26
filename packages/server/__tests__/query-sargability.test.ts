import { describe, expect, test } from "bun:test";
import coalitionVsOpposition from "../database/queries/COALITION_VS_OPPOSITION.sql";
import votingGovernmentOppositionById from "../database/queries/VOTING_GOVERNMENT_OPPOSITION_BY_ID.sql";
import votingMemberVotesById from "../database/queries/VOTING_MEMBER_VOTES_BY_ID.sql";
import votingPartyBreakdownById from "../database/queries/VOTING_PARTY_BREAKDOWN_BY_ID.sql";
import { sanityQueries } from "../database/sanity-queries";

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

  test("sanity votingSessionDateMismatch uses start_date instead of SUBSTR/JULIANDAY", () => {
    expect(sanityQueries.votingSessionDateMismatch).not.toMatch(/SUBSTR\s*\(/i);
    expect(sanityQueries.votingSessionDateMismatch).not.toMatch(
      /JULIANDAY\s*\(/i,
    );
  });
});
