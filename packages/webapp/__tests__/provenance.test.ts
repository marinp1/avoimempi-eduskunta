import { describe, expect, test } from "bun:test";
import { cite, sourceNote } from "../templates/components/provenance";

describe("cite", () => {
  test("wraps inner content in a .cite span", () => {
    const html = cite("108", { set: "Roster" });
    expect(html).toContain('<span class="cite"');
    expect(html).toContain(">108<");
  });

  test("converts camelCase keys to data-kebab-case attributes", () => {
    const html = cite("x", { markText: "*", endpoint: "/api" });
    expect(html).toContain('data-mark-text="*"');
    expect(html).toContain('data-endpoint="/api"');
  });

  test("omits null/undefined fields", () => {
    const html = cite("x", { set: "Roster", table: undefined });
    expect(html).not.toContain("data-table");
  });

  test("escapes attribute values", () => {
    const html = cite("x", { value: `a&"b` });
    expect(html).toContain('data-value="a&amp;&quot;b"');
  });
});

describe("sourceNote", () => {
  test("renders dataset and fetched date with a separator", () => {
    const html = sourceNote({ dataset: "Roster", fetchedAt: "1.1.2025" });
    expect(html).toContain("Roster");
    expect(html).toContain("haettu 1.1.2025");
    expect(html).toContain("·");
  });

  test("omits the separator when only one part is present", () => {
    const html = sourceNote({ dataset: "Roster" });
    expect(html).toContain("Roster");
    expect(html).not.toContain("haettu");
  });
});
