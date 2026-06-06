export interface PersonProfileData {
  person: {
    id: number;
    firstName: string;
    lastName: string;
    initials: string;
    partyCode: string;
    partyName: string;
    partyColor: string;
    isInGovernment: boolean;
    currentDistrict: string;
    birthYear: number | null;
    age: string;
    profession: string;
    memberSince: string;
  };
  stats: {
    participationPct: string;
    nTotal: number;
    nCast: number;
    nYes: number;
    nNo: number;
    nEmpty: number;
    nAbsent: number;
    nInitiatives: number;
    nWrittenQuestions: number;
  };
  dissents: Array<{
    votingId: number;
    startTime: string;
    title: string;
    sectionTitle: string;
    mpVote: string;
    majorityVote: string;
    partyName: string;
  }>;
  initiatives: Array<{
    documentId?: number;
    parliamentIdentifier: string;
    initiativeTypeCode: string;
    initiativeTypeLabel: string;
    title: string | null;
    submissionDate: string | null;
    relationRole: string;
  }>;
  questions: Array<{
    documentId?: number;
    questionKind: string;
    questionKindLabel: string;
    parliamentIdentifier: string;
    title: string | null;
    submissionDate: string | null;
  }>;
  committees: Array<{
    committeeCode: string;
    committeeName: string;
    role: string;
    startDate: string;
    endDate: string | null;
  }>;
  focusAreas: Array<{
    label: string;
    weight: number;
  }>;
  speeches: Array<{
    sectionTitle: string | null;
    startTime: string | null;
    speechType: string | null;
  }>;
  baselines: {
    speech: { own: number; partyAvg: number; parliamentAvg: number };
    initiative: { own: number; partyAvg: number; parliamentAvg: number };
    writtenQuestion: { own: number; partyAvg: number; parliamentAvg: number };
    participation: { own: string; partyAvg: string; parliamentAvg: string };
  } | null;
  hasAiSummary: boolean;
  fetchedAt: string;
}
