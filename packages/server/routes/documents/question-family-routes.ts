import type { BunRequest } from "bun";
import type { DocumentRepository } from "../../database/repositories/document-repository";
import { getMappedPaginatedQueryParams, getSearchParams, validateDateRange } from "../http";
import { badRequest, json, jsonOrNotFound } from "../route-responses";

export const createQuestionFamilyRoutes = (db: DocumentRepository) => ({
  "/api/written-questions": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const dateError = validateDateRange(searchParams);
      if (dateError) return dateError;
      const params = getMappedPaginatedQueryParams(
        searchParams,
        {
          query: "q",
          year: "year",
          subject: "subject",
          startDate: "startDate",
          endDate: "endDate",
        } as const,
        {
          pageFallback: 1,
          limitFallback: 20,
          minPage: 1,
          minLimit: 1,
          maxLimit: 200,
        },
      );
      const data = await db.fetchWrittenQuestions(params);
      return json(data);
    },
  },

  "/api/written-questions/subjects": {
    GET: async () => {
      const data = await db.fetchWrittenQuestionsSubjects();
      return json(data);
    },
  },

  "/api/written-questions/years": {
    GET: async () => {
      const data = await db.fetchWrittenQuestionYears();
      return json(data);
    },
  },

  "/api/written-questions/by-identifier/:identifier": {
    GET: async (
      req: BunRequest<"/api/written-questions/by-identifier/:identifier">,
    ) => {
      const identifier = decodeURIComponent(req.params.identifier).trim();
      if (!identifier) return badRequest("Missing document identifier");
      const data = await db.fetchWrittenQuestionByIdentifier({ identifier });
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
      const dateError = validateDateRange(searchParams);
      if (dateError) return dateError;
      const params = getMappedPaginatedQueryParams(
        searchParams,
        {
          query: "q",
          year: "year",
          committee: "committee",
          docType: "docType",
          startDate: "startDate",
          endDate: "endDate",
        } as const,
        {
          pageFallback: 1,
          limitFallback: 20,
          minPage: 1,
          minLimit: 1,
          maxLimit: 200,
        },
      );
      const data = await db.fetchExpertStatements(params);
      return json(data);
    },
  },

  "/api/expert-statements/years": {
    GET: async () => {
      const data = await db.fetchExpertStatementYears();
      return json(data);
    },
  },

  "/api/expert-statements/committees": {
    GET: async () => {
      const data = await db.fetchExpertStatementCommittees();
      return json(data);
    },
  },

  "/api/expert-statements/by-bill": {
    GET: async (req: Request) => {
      const identifier = new URL(req.url).searchParams.get("identifier");
      if (!identifier) return json([], { status: 400 });
      const data = await db.fetchExpertStatementsByBill(identifier);
      return json(data);
    },
  },

  "/api/written-question-responses": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const dateError = validateDateRange(searchParams);
      if (dateError) return dateError;
      const params = getMappedPaginatedQueryParams(
        searchParams,
        {
          query: "q",
          year: "year",
          minister: "minister",
          startDate: "startDate",
          endDate: "endDate",
        } as const,
        {
          pageFallback: 1,
          limitFallback: 20,
          minPage: 1,
          minLimit: 1,
          maxLimit: 200,
        },
      );
      const data = await db.fetchWrittenQuestionResponses(params);
      return json(data);
    },
  },

  "/api/written-question-responses/years": {
    GET: async () => {
      const data = await db.fetchWrittenQuestionResponseYears();
      return json(data);
    },
  },

  "/api/oral-questions": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const dateError = validateDateRange(searchParams);
      if (dateError) return dateError;
      const params = getMappedPaginatedQueryParams(
        searchParams,
        {
          query: "q",
          year: "year",
          subject: "subject",
          startDate: "startDate",
          endDate: "endDate",
        } as const,
        {
          pageFallback: 1,
          limitFallback: 20,
          minPage: 1,
          minLimit: 1,
          maxLimit: 200,
        },
      );
      const data = await db.fetchOralQuestions(params);
      return json(data);
    },
  },

  "/api/oral-questions/subjects": {
    GET: async () => {
      const data = await db.fetchOralQuestionsSubjects();
      return json(data);
    },
  },

  "/api/oral-questions/years": {
    GET: async () => {
      const data = await db.fetchOralQuestionYears();
      return json(data);
    },
  },

  "/api/oral-questions/by-identifier/:identifier": {
    GET: async (
      req: BunRequest<"/api/oral-questions/by-identifier/:identifier">,
    ) => {
      const identifier = decodeURIComponent(req.params.identifier).trim();
      if (!identifier) return badRequest("Missing document identifier");
      const data = await db.fetchOralQuestionByIdentifier({ identifier });
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
