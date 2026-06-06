import { describe, expect, test } from "bun:test";
import { partyColor, partyShortName, resolveParty } from "#shared/domain";

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

describe("resolveParty", () => {
  test("resolves a known code into name, code and color", () => {
    const p = resolveParty("kok");
    expect(p.code).toBe("kok");
    expect(p.name).toBe("Kokoomus");
    expect(p.color).toBe("var(--party-kok)");
  });

  test("resolves null → unknown with fallback color", () => {
    const p = resolveParty(null);
    expect(p.code).toBe("unknown");
    expect(p.color).toBe("#999999");
  });

  test("uses rawName as fallback for display", () => {
    const p = resolveParty("xyz", "My Party");
    expect(p.code).toBe("xyz");
    expect(p.name).toBe("My Party");
  });

  test("resolves English descriptions and provides name and color via internal helpers", () => {
    const p = resolveParty("Swedish Parliamentary Group");
    expect(p.code).toBe("Swedish Parliamentary Group");
    expect(p.name).toBe("RKP");
    expect(p.color).toBe("var(--party-r)");
  });
});
