import type { BunRequest } from "bun";
import type { DocumentRoutesDataAccess } from "../document-routes";
import { getMappedPaginatedQueryParams, getSearchParams } from "../http";
import { jsonOrNotFound } from "../route-responses";

export const createQuestionFamilyRoutes = (db: DocumentRoutesDataAccess) => ({
  "/api/written-questions": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const params = getMappedPaginatedQueryParams(searchParams, {
        query: "q",
        year: "year",
        subject: "subject",
        startDate: "startDate",
        endDate: "endDate",
      } as const);
      const data = await db.fetchWrittenQuestions(params);
      return Response.json(data);
    },
  },

  "/api/written-questions/subjects": {
    GET: async () => {
      const data = await db.fetchWrittenQuestionsSubjects();
      return Response.json(data);
    },
  },

  "/api/written-questions/years": {
    GET: async () => {
      const data = await db.fetchWrittenQuestionYears();
      return Response.json(data);
    },
  },

  "/api/written-questions/by-identifier/:identifier": {
    GET: async (
      req: BunRequest<"/api/written-questions/by-identifier/:identifier">,
    ) => {
      const data = await db.fetchWrittenQuestionByIdentifier({
        identifier: decodeURIComponent(req.params.identifier),
      });
      return jsonOrNotFound(data);
    },
  },

  "/api/written-questions/:id": {
    GET: async (req: BunRequest<"/api/written-questions/:id">) => {
      const data = await db.fetchWrittenQuestionById({ id: req.params.id });
      return jsonOrNotFound(data);
    },
  },

  "/api/expert-statements": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const params = getMappedPaginatedQueryParams(searchParams, {
        query: "q",
        year: "year",
        committee: "committee",
        docType: "docType",
        startDate: "startDate",
        endDate: "endDate",
      } as const);
      const data = await db.fetchExpertStatements(params);
      return Response.json(data);
    },
  },

  "/api/expert-statements/years": {
    GET: async () => {
      const data = await db.fetchExpertStatementYears();
      return Response.json(data);
    },
  },

  "/api/expert-statements/committees": {
    GET: async () => {
      const data = await db.fetchExpertStatementCommittees();
      return Response.json(data);
    },
  },

  "/api/written-question-responses": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const params = getMappedPaginatedQueryParams(searchParams, {
        query: "q",
        year: "year",
        minister: "minister",
        startDate: "startDate",
        endDate: "endDate",
      } as const);
      const data = await db.fetchWrittenQuestionResponses(params);
      return Response.json(data);
    },
  },

  "/api/written-question-responses/years": {
    GET: async () => {
      const data = await db.fetchWrittenQuestionResponseYears();
      return Response.json(data);
    },
  },

  "/api/oral-questions": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const params = getMappedPaginatedQueryParams(searchParams, {
        query: "q",
        year: "year",
        subject: "subject",
        startDate: "startDate",
        endDate: "endDate",
      } as const);
      const data = await db.fetchOralQuestions(params);
      return Response.json(data);
    },
  },

  "/api/oral-questions/subjects": {
    GET: async () => {
      const data = await db.fetchOralQuestionsSubjects();
      return Response.json(data);
    },
  },

  "/api/oral-questions/years": {
    GET: async () => {
      const data = await db.fetchOralQuestionYears();
      return Response.json(data);
    },
  },

  "/api/oral-questions/by-identifier/:identifier": {
    GET: async (
      req: BunRequest<"/api/oral-questions/by-identifier/:identifier">,
    ) => {
      const data = await db.fetchOralQuestionByIdentifier({
        identifier: decodeURIComponent(req.params.identifier),
      });
      return jsonOrNotFound(data);
    },
  },

  "/api/oral-questions/:id": {
    GET: async (req: BunRequest<"/api/oral-questions/:id">) => {
      const data = await db.fetchOralQuestionById({ id: req.params.id });
      return jsonOrNotFound(data);
    },
  },
});
