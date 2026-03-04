import { createCommitteeLegislativeRoutes } from "./documents/committee-legislative-routes";
import { createInterpellationGovernmentRoutes } from "./documents/interpellation-government-routes";
import { createQuestionFamilyRoutes } from "./documents/question-family-routes";
import { createSearchRoutes } from "./documents/search-routes";

export type DocumentRoutesDataAccess = {
  fetchInterpellations: (params: {
    query?: string;
    year?: string;
    subject?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) => unknown;
  fetchInterpellationsSubjects: () => unknown;
  fetchInterpellationYears: () => unknown;
  fetchInterpellationByIdentifier: (params: { identifier: string }) => unknown;
  fetchInterpellationById: (params: { id: string }) => unknown;
  fetchGovernmentProposals: (params: {
    query?: string;
    year?: string;
    subject?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) => unknown;
  fetchGovernmentProposalsSubjects: () => unknown;
  fetchGovernmentProposalYears: () => unknown;
  fetchGovernmentProposalByIdentifier: (params: {
    identifier: string;
  }) => unknown;
  fetchGovernmentProposalById: (params: { id: string }) => unknown;
  fetchWrittenQuestions: (params: {
    query?: string;
    year?: string;
    subject?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) => unknown;
  fetchWrittenQuestionsSubjects: () => unknown;
  fetchWrittenQuestionYears: () => unknown;
  fetchWrittenQuestionByIdentifier: (params: { identifier: string }) => unknown;
  fetchWrittenQuestionById: (params: { id: string }) => unknown;
  fetchExpertStatements: (params: {
    query?: string;
    year?: string;
    committee?: string;
    docType?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) => unknown;
  fetchExpertStatementYears: () => unknown;
  fetchExpertStatementCommittees: () => unknown;
  fetchExpertStatementsByBill: (identifier: string) => unknown;
  fetchWrittenQuestionResponses: (params: {
    query?: string;
    year?: string;
    minister?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) => unknown;
  fetchWrittenQuestionResponseYears: () => unknown;
  fetchOralQuestions: (params: {
    query?: string;
    year?: string;
    subject?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) => unknown;
  fetchOralQuestionsSubjects: () => unknown;
  fetchOralQuestionYears: () => unknown;
  fetchOralQuestionByIdentifier: (params: { identifier: string }) => unknown;
  fetchOralQuestionById: (params: { id: string }) => unknown;
  fetchCommitteeReports: (params: {
    query?: string;
    year?: string;
    sourceCommittee?: string;
    recipientCommittee?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) => unknown;
  fetchCommitteeReportYears: () => unknown;
  fetchCommitteeReportSourceCommittees: (params?: {
    query?: string;
    year?: string;
    recipientCommittee?: string;
    startDate?: string;
    endDate?: string;
  }) => unknown;
  fetchCommitteeReportRecipientCommittees: (params?: {
    query?: string;
    year?: string;
    sourceCommittee?: string;
    startDate?: string;
    endDate?: string;
  }) => unknown;
  fetchCommitteeReportByIdentifier: (params: { identifier: string }) => unknown;
  fetchCommitteeReportById: (params: { id: string }) => unknown;
  fetchLegislativeInitiatives: (params: {
    query?: string;
    year?: string;
    subject?: string;
    initiativeTypeCode?: string;
    startDate?: string;
    endDate?: string;
    page: number;
    limit: number;
  }) => unknown;
  fetchLegislativeInitiativesSubjects: () => unknown;
  fetchLegislativeInitiativeYears: (params?: {
    initiativeTypeCode?: string;
  }) => unknown;
  fetchLegislativeInitiativeByIdentifier: (params: {
    identifier: string;
  }) => unknown;
  fetchLegislativeInitiativeById: (params: { id: string }) => unknown;
  federatedSearch: (params: { q: string; limit?: number }) => unknown;
};

export const createDocumentRoutes = (db: DocumentRoutesDataAccess) => ({
  ...createInterpellationGovernmentRoutes(db),
  ...createQuestionFamilyRoutes(db),
  ...createCommitteeLegislativeRoutes(db),
  ...createSearchRoutes(db),
});
