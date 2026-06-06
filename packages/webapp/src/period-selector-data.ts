export interface PeriodSelectorData {
  governments: Array<{
    id: number;
    name: string;
    dateRange: string;
  }>;
  selectedIds: number[];
  description: {
    btnLabel: string;
    badge: string;
    badgeClass: string;
  };
}
