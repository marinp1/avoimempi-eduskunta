export type TraceItemLike = {
  table: string;
  pkName: string;
  pkValue: string;
  label: string;
};

export type TraceExplorerTab = "item" | "page";

export const getTraceItemKey = (
  item: Pick<TraceItemLike, "table" | "pkValue">,
) => `${item.table}:${item.pkValue}`;

export const resolveTraceSelection = <T extends TraceItemLike>(
  items: T[],
  preferredItem: T | null,
): T | null => {
  if (items.length === 0) return null;
  if (!preferredItem) return items[0] ?? null;

  const preferredKey = getTraceItemKey(preferredItem);
  return items.find((item) => getTraceItemKey(item) === preferredKey) ?? items[0];
};

export const groupTraceItemsByTable = <T extends TraceItemLike>(items: T[]) => {
  const grouped = new Map<string, T[]>();

  for (const item of items) {
    const existing = grouped.get(item.table);
    if (existing) {
      existing.push(item);
      continue;
    }
    grouped.set(item.table, [item]);
  }

  return Array.from(grouped.entries()).map(([table, groupedItems]) => ({
    table,
    items: groupedItems,
  }));
};

export const getInitialTraceTab = (params: {
  pageItems: TraceItemLike[];
  hasSourceDefinitions: boolean;
}): TraceExplorerTab => {
  if (params.pageItems.length > 0) return "item";
  if (params.hasSourceDefinitions) return "page";
  return "item";
};
