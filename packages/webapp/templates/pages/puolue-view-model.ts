export interface PartyDetailData {
  party: {
    code: string;
    name: string;
    shortName: string;
    color: string;
    bloc: "government" | "opposition";
    chairName: string | null;
    seatCount: number;
    seatShare: string;
    avgAttendance: string | null;
    avgAge: string | null;
    govtSince: string | null;
    femaleCount: number;
    maleCount: number;
  };
  cohesion: {
    pct: number | null;
    label: string;
  };
  members: Array<{
    id: number;
    firstName: string;
    lastName: string;
    partyCode: string;
    color: string;
    district: string;
  }>;
  splitVotes: Array<{
    id: number;
    title: string;
    date: string;
    nYes: number;
    nNo: number;
  }>;
  topics: string[];
  committeeChairs: Array<{
    committee: string;
    name: string;
  }>;
  recentSpeeches: Array<{
    personId: number;
    name: string;
    partyCode: string;
    color: string;
    date: string;
    title: string;
  }>;
  fetchedAt: string;
}
