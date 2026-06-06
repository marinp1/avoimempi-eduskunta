import { describe, expect, test } from "bun:test";
import { partyColor, partyShortName } from "../templates/components/party";

describe("partyColor", () => {
  test("maps a known code to its CSS variable", () => {
    expect(partyColor("kok")).toBe("var(--party-kok)");
    expect(partyColor("vihr")).toBe("var(--party-vihr)");
  });

  test("resolves English group descriptions to a code", () => {
    expect(partyColor("Swedish Parliamentary Group")).toBe("var(--party-r)");
    expect(partyColor("Left Alliance Parliamentary Group")).toBe(
      "var(--party-vas)",
    );
  });

  test("falls back to grey for unknown groups", () => {
    expect(partyColor("nonexistent")).toBe("#999999");
  });
});

describe("partyShortName", () => {
  test("maps a known code to its short name", () => {
    expect(partyShortName("sd")).toBe("SDP");
    expect(partyShortName("r")).toBe("RKP");
  });

  test("resolves English descriptions", () => {
    expect(partyShortName("the finns party parliamentary group")).toBe(
      "Perussuomalaiset",
    );
  });

  test("uses fallback then raw value for unknown groups", () => {
    expect(partyShortName("xyz", "Tuntematon")).toBe("Tuntematon");
    expect(partyShortName("xyz")).toBe("xyz");
  });
});
