export interface AsiakohtaData {
  section: {
    key: string;
    itemNumber: string | null;
    title: string;
    processingTitle: string | null;
    sessionKey: string;
    sessionDate: string;
    sessionDateLabel: string;
    sessionTitle: string;
    identifier: string | null;
    timeRange: string | null;
    phase: string;
    note: string | null;
    resolution: string | null;
  };
  prevSection: {
    key: string;
    itemNumber: string | null;
    title: string;
  } | null;
  nextSection: {
    key: string;
    itemNumber: string | null;
    title: string;
  } | null;
  sessionItemsCount: number;
  currentItemIndex: number;
  lifecycleSteps: Array<{
    label: string;
    isDone: boolean;
    isCurrent: boolean;
    date: string | null;
    tag: string | null;
    tagClass: string | null;
  }>;
  viewpoints: {
    for: string[];
    against: string[];
  };
  votings: Array<{
    id: number;
    votingNumber: number;
    title: string;
    nYes: number;
    nNo: number;
    nEmpty: number;
    nAbsent: number;
    yesPct: number;
    noPct: number;
    outcome: "ok" | "no";
    outcomeLabel: string;
  }>;
  speeches: Array<{
    personId: number;
    firstName: string;
    lastName: string;
    initials: string;
    partyCode: string;
    partyName: string;
    partyColor: string;
    bloc: string;
    roleLabel: string;
    roleClass: string;
    timeLabel: string;
    durationLabel: string | null;
    summary: string | null;
    fullText: string | null;
    contentLength: number;
  }>;
  fetchedAt: string;
}
