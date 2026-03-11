import type { BunRequest } from "bun";
import type { DocumentRepository } from "../../database/repositories/document-repository";
import {
  getMappedPaginatedQueryParams,
  getSearchParams,
} from "../http";
import { json, jsonOrNotFound } from "../route-responses";

export const createParliamentAnswerRoutes = (db: DocumentRepository) => ({
  "/api/parliament-answers": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
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
      const data = await db.fetchParliamentAnswers(params);
      return json(data);
    },
  },

  "/api/parliament-answers/years": {
    GET: async () => {
      const data = await db.fetchParliamentAnswerYears();
      return json(data);
    },
  },

  "/api/parliament-answers/by-source-reference/:sourceReference": {
    GET: async (
      req: BunRequest<"/api/parliament-answers/by-source-reference/:sourceReference">,
    ) => {
      const data = await db.fetchParliamentAnswerBySourceReference({
        sourceReference: decodeURIComponent(req.params.sourceReference),
      });
      return jsonOrNotFound(data);
    },
  },

  "/api/parliament-answers/by-identifier/:identifier": {
    GET: async (
      req: BunRequest<"/api/parliament-answers/by-identifier/:identifier">,
    ) => {
      const data = await db.fetchParliamentAnswerByIdentifier({
        identifier: decodeURIComponent(req.params.identifier),
      });
      return jsonOrNotFound(data);
    },
  },

  "/api/parliament-answers/:id": {
    GET: async (req: BunRequest<"/api/parliament-answers/:id">) => {
      const data = await db.fetchParliamentAnswerById({ id: req.params.id });
      return jsonOrNotFound(data);
    },
  },
});
