import { describe, expect, test } from "bun:test";
import * as queries from "../database/queries";
import { sanityQueries } from "../database/sanity-queries";

describe("SQL sargability regressions", () => {
  test("voting inline detail queries avoid DATE()/SUBSTR() wrappers on join/filter columns", () => {
    expect(queries.coalitionVsOpposition).not.toMatch(
      /SUBSTR\s*\(\s*vt\.start_time/i,
    );

    expect(queries.votingGovernmentOppositionById).not.toMatch(
      /DATE\s*\(\s*gm\.start_date/i,
    );
    expect(queries.votingGovernmentOppositionById).not.toMatch(
      /DATE\s*\(\s*gm\.end_date/i,
    );
    expect(queries.votingMemberVotesById).not.toMatch(
      /DATE\s*\(\s*gm\.start_date/i,
    );
    expect(queries.votingMemberVotesById).not.toMatch(
      /DATE\s*\(\s*gm\.end_date/i,
    );
    expect(queries.votingPartyBreakdownById).not.toMatch(
      /DATE\s*\(\s*pgm\.start_date/i,
    );
    expect(queries.votingPartyBreakdownById).not.toMatch(
      /DATE\s*\(\s*pgm\.end_date/i,
    );
  });

  test("sanity votingSessionDateMismatch uses start_date instead of SUBSTR/JULIANDAY", () => {
    expect(sanityQueries.votingSessionDateMismatch).not.toMatch(/SUBSTR\s*\(/i);
    expect(sanityQueries.votingSessionDateMismatch).not.toMatch(
      /JULIANDAY\s*\(/i,
    );
  });
});
