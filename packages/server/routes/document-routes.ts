import type { DocumentRepository } from "../database/repositories/document-repository";
import { createCommitteeLegislativeRoutes } from "./documents/committee-legislative-routes";
import { createInterpellationGovernmentRoutes } from "./documents/interpellation-government-routes";
import { createParliamentAnswerRoutes } from "./documents/parliament-answer-routes";
import { createQuestionFamilyRoutes } from "./documents/question-family-routes";
import { createSearchRoutes } from "./documents/search-routes";

export const createDocumentRoutes = (db: DocumentRepository) => ({
  ...createInterpellationGovernmentRoutes(db),
  ...createQuestionFamilyRoutes(db),
  ...createCommitteeLegislativeRoutes(db),
  ...createParliamentAnswerRoutes(db),
  ...createSearchRoutes(db),
});
