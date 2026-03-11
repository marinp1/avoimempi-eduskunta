import { describe, expect, test } from "bun:test";
import {
  getInitialTraceTab,
  getTraceItemKey,
  groupTraceItemsByTable,
  resolveTraceSelection,
  type TraceItemLike,
} from "../components/traceExplorerModel";

const item = (overrides: Partial<TraceItemLike> = {}): TraceItemLike => ({
  table: "MemberOfParliament",
  pkName: "personId",
  pkValue: "1",
  label: "Ada Lovelace",
  ...overrides,
});

describe("trace explorer model", () => {
  test("uses the first page item when no preferred selection exists", () => {
    const items = [item(), item({ pkValue: "2", label: "Grace Hopper" })];

    expect(resolveTraceSelection(items, null)).toEqual(items[0]);
  });

  test("falls back to the first available item when the preferred selection disappears", () => {
    const items = [item(), item({ pkValue: "2", label: "Grace Hopper" })];
    const missingSelection = item({ pkValue: "999", label: "Missing" });

    expect(resolveTraceSelection(items, missingSelection)).toEqual(items[0]);
  });

  test("groups page items by source table", () => {
    const grouped = groupTraceItemsByTable([
      item(),
      item({ pkValue: "2", label: "Grace Hopper" }),
      item({
        table: "SaliDBAanestys",
        pkName: "AanestysId",
        pkValue: "77",
        label: "Äänestys #77",
      }),
    ]);

    expect(grouped).toEqual([
      {
        table: "MemberOfParliament",
        items: [item(), item({ pkValue: "2", label: "Grace Hopper" })],
      },
      {
        table: "SaliDBAanestys",
        items: [
          item({
            table: "SaliDBAanestys",
            pkName: "AanestysId",
            pkValue: "77",
            label: "Äänestys #77",
          }),
        ],
      },
    ]);
  });

  test("defaults the overlay to the item tab when page items are present", () => {
    expect(
      getInitialTraceTab({
        pageItems: [item()],
        hasSourceDefinitions: true,
      }),
    ).toBe("item");
  });

  test("defaults the overlay to the page tab when only page-level sources exist", () => {
    expect(
      getInitialTraceTab({
        pageItems: [],
        hasSourceDefinitions: true,
      }),
    ).toBe("page");
  });

  test("builds stable trace keys from table and primary key value", () => {
    expect(getTraceItemKey(item({ pkValue: "42" }))).toBe(
      "MemberOfParliament:42",
    );
  });
});
