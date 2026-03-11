import { describe, expect, test } from "bun:test";
import {
  buildPartySelectionUrl,
  parseSelectedPartyCode,
} from "../pages/Parties/url-state";

describe("party url state", () => {
  test("parses selected party code from search params", () => {
    expect(parseSelectedPartyCode("?party=sdp")).toBe("SDP");
    expect(parseSelectedPartyCode("?foo=1&party=kok")).toBe("KOK");
  });

  test("returns null when selected party code is missing", () => {
    expect(parseSelectedPartyCode("?foo=1")).toBeNull();
    expect(parseSelectedPartyCode("")).toBeNull();
  });

  test("builds a shareable party selection URL", () => {
    expect(buildPartySelectionUrl("/puolueet", "", "ps")).toBe(
      "/puolueet?party=PS",
    );
    expect(buildPartySelectionUrl("/puolueet", "?foo=1", "kesk")).toBe(
      "/puolueet?foo=1&party=KESK",
    );
  });

  test("removes the party parameter while preserving others", () => {
    expect(
      buildPartySelectionUrl("/puolueet", "?foo=1&party=SDP&bar=2", null),
    ).toBe("/puolueet?foo=1&bar=2");
  });
});
