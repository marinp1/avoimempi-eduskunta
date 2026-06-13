import { describe, expect, test } from "bun:test";
import { buildAanestyksetData } from "../src/features/voting/pages/list.view-model";

function votingRow(
  overrides: Partial<
    Parameters<typeof buildAanestyksetData>[0]["votings"][number]
  > = {},
) {
  return {
    id: 1000 + (overrides.id ?? 0),
    number: overrides.number ?? 1,
    start_time: overrides.start_time ?? "2024-01-15T14:00:00",
    start_date: overrides.start_date ?? "2024-01-15",
    title: overrides.title ?? "Lakiehdotus 1",
    session_key: overrides.session_key ?? "2024/1",
    section_order: overrides.section_order ?? 1,
    section_key: overrides.section_key ?? "sec-001",
    n_yes: overrides.n_yes ?? 100,
    n_no: overrides.n_no ?? 50,
    n_abstain: overrides.n_abstain ?? 5,
    n_absent: overrides.n_absent ?? 10,
    n_total: overrides.n_total ?? 165,
    doc_tunnuses: overrides.doc_tunnuses ?? null,
  };
}

describe("buildAanestyksetData", () => {
  test("returns empty groups for empty votings", () => {
    const data = buildAanestyksetData({
      votings: [],
      totalCount: 0,
      activeFilter: null,
      fetchedAt: "2024-06-01",
    });

    expect(data.groups).toEqual([]);
    expect(data.totalCount).toBe(0);
    expect(data.nextCursor).toBe(null);
  });

  test("groups votings by session key", () => {
    const data = buildAanestyksetData({
      votings: [
        votingRow({ id: 1, session_key: "2024/1" }),
        votingRow({ id: 2, session_key: "2024/1" }),
        votingRow({ id: 3, session_key: "2024/2" }),
      ],
      totalCount: 3,
      activeFilter: null,
      fetchedAt: "2024-06-01",
    });

    expect(data.groups).toHaveLength(2);
    expect(data.groups[0]?.sessionKey).toBe("2024/2"); // newer first
    expect(data.groups[1]?.sessionKey).toBe("2024/1");
    expect(data.groups[0]?.rows).toHaveLength(1);
    expect(data.groups[1]?.rows).toHaveLength(2);
  });

  test("uses totalCount from input (not derived from rows)", () => {
    const data = buildAanestyksetData({
      votings: [votingRow()],
      totalCount: 500,
      activeFilter: null,
      fetchedAt: "2024-06-01",
    });

    expect(data.totalCount).toBe(500);
  });

  test("parses document tunnuses from doc_tunnuses field", () => {
    const data = buildAanestyksetData({
      votings: [votingRow({ doc_tunnuses: "HE 12/2024 vp||VaVL 5/2024" })],
      totalCount: 1,
      activeFilter: null,
      fetchedAt: "2024-06-01",
    });

    const docs = data.groups[0]?.rows[0]?.documents;
    expect(docs).toHaveLength(2);
    expect(docs?.[0]?.identifier).toBe("HE 12/2024 vp");
    expect(docs?.[0]?.isCommittee).toBe(false);
    expect(docs?.[1]?.identifier).toBe("VaVL 5/2024");
    expect(docs?.[1]?.isCommittee).toBe(true);
  });

  test("caps doc tunuses at 3", () => {
    const data = buildAanestyksetData({
      votings: [votingRow({ doc_tunnuses: "A||B||C||D" })],
      totalCount: 1,
      activeFilter: null,
      fetchedAt: "2024-06-01",
    });

    expect(data.groups[0]?.rows[0]?.documents).toHaveLength(3);
  });

  test("provides nextCursor when groups exceed 30", () => {
    const votings = [];
    for (let i = 0; i < 32; i++) {
      votings.push(
        votingRow({
          id: i,
          session_key: `2024/${i}`,
          start_date: `2024-01-${String(i + 1).padStart(2, "0")}`,
        }),
      );
    }

    const data = buildAanestyksetData({
      votings,
      totalCount: 32,
      activeFilter: null,
      fetchedAt: "2024-06-01",
    });

    expect(data.groups).toHaveLength(30);
    expect(data.nextCursor).toBe(data.groups[29]?.sessionDate ?? null);
    expect(data.nextCursor).not.toBeNull();
  });

  test("maps vote tally outcome", () => {
    const data = buildAanestyksetData({
      votings: [votingRow({ n_yes: 120, n_no: 30, n_total: 150 })],
      totalCount: 1,
      activeFilter: null,
      fetchedAt: "2024-06-01",
    });

    const row = data.groups[0]?.rows[0];
    expect(row?.nYes).toBe(120);
    expect(row?.nNo).toBe(30);
    expect(row?.outcome).toBe("ok");

    // A rejected voting (n_no > n_yes)
    const data2 = buildAanestyksetData({
      votings: [votingRow({ id: 2, n_yes: 30, n_no: 120, n_total: 150 })],
      totalCount: 1,
      activeFilter: null,
      fetchedAt: "2024-06-01",
    });
    expect(data2.groups[0]?.rows[0]?.outcome).toBe("no");
  });

  test("sets activeFilter on the result", () => {
    const data = buildAanestyksetData({
      votings: [votingRow()],
      totalCount: 1,
      activeFilter: "lait",
      fetchedAt: "2024-06-01",
    });

    expect(data.activeFilter).toBe("lait");
  });
});
