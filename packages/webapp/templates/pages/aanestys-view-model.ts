export interface SingleVoteData {
  vote: {
    id: number;
    votingNumber: number;
    title: string;
    titleExtra: string | null;
    date: string;
    dateLabel: string;
    time: string;
    sessionKey: string;
    sessionDateLabel: string;
    asiakohtaNum: number | null;
    sectionKey: string | null;
    sectionTitle: string | null;
    nYes: number;
    nNo: number;
    nEmpty: number;
    nAbsent: number;
    nTotal: number;
    yesPct: number;
    noPct: number;
    emptyPct: number;
    absentPct: number;
    outcome: "ok" | "no";
    outcomeLabel: string;
    yesProposition: string | null;
    noProposition: string | null;
  };
  partyBreakdown: Array<{
    partyCode: string;
    partyName: string;
    partyColor: string;
    nYes: number;
    nNo: number;
    nEmpty: number;
    nAbsent: number;
    nTotal: number;
    yesPct: number;
    noPct: number;
  }>;
  mpVotes: Array<{
    personId: number;
    firstName: string;
    lastName: string;
    partyCode: string;
    partyColor: string;
    vote: "jaa" | "ei" | "tyhjaa" | "poissa";
    bloc: "government" | "opposition";
    personSort: string;
  }>;
  govOppBreakdown: {
    governmentYes: number;
    governmentNo: number;
    governmentEmpty: number;
    governmentAbsent: number;
    governmentTotal: number;
    oppositionYes: number;
    oppositionNo: number;
    oppositionEmpty: number;
    oppositionAbsent: number;
    oppositionTotal: number;
  };
  relatedVotes: Array<{
    id: number;
    votingNumber: number;
    title: string;
    date: string;
    nYes: number;
    nNo: number;
    outcomeLabel: string;
  }>;
  fetchedAt: string;
}
