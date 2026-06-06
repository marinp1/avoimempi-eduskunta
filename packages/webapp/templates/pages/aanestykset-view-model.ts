export interface VoteRow {
  id: number;
  votingNumber: number;
  time: string;
  title: string;
  questionText: string;
  sessionKey: string;
  sessionDate: string;
  asiakohtaNum: number | null;
  sectionKey: string | null;
  documents: Array<{
    identifier: string;
    label: string;
    isCommittee: boolean;
  }>;
  references: Array<{
    label: string;
    href: string;
  }>;
  nYes: number;
  nNo: number;
  nEmpty: number;
  nAbsent: number;
  nTotal: number;
  yesPct: number;
  noPct: number;
  outcome: "ok" | "no" | "neutral";
  outcomeLabel: string;
}

export interface VoteGroup {
  sessionKey: string;
  sessionDate: string;
  sessionDateLabel: string;
  rows: VoteRow[];
}

export interface AanestyksetData {
  groups: VoteGroup[];
  totalCount: number;
  fetchedAt: string;
}
