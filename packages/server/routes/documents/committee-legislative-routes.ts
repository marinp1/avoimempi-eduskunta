import type { BunRequest } from "bun";
import type { DocumentRepository } from "../../database/repositories/document-repository";
import {
  getMappedOptionalQueryParams,
  getMappedPaginatedQueryParams,
  getSearchParams,
  validateDateRange,
} from "../http";
import { badRequest, json, jsonOrNotFound } from "../route-responses";

export const createCommitteeLegislativeRoutes = (db: DocumentRepository) => ({
  "/api/committee-reports": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const dateError = validateDateRange(searchParams);
      if (dateError) return dateError;
      const params = getMappedPaginatedQueryParams(
        searchParams,
        {
          query: "q",
          year: "year",
          sourceCommittee: "sourceCommittee",
          recipientCommittee: "recipientCommittee",
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
      const data = await db.fetchCommitteeReports(params);
      return json(data);
    },
  },

  "/api/committee-reports/years": {
    GET: async () => {
      const data = await db.fetchCommitteeReportYears();
      return json(data);
    },
  },

  "/api/committee-reports/source-committees": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const params = getMappedOptionalQueryParams(searchParams, {
        query: "q",
        year: "year",
        recipientCommittee: "recipientCommittee",
        startDate: "startDate",
        endDate: "endDate",
      } as const);
      const data = await db.fetchCommitteeReportSourceCommittees(params);
      return json(data);
    },
  },

  "/api/committee-reports/recipient-committees": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const params = getMappedOptionalQueryParams(searchParams, {
        query: "q",
        year: "year",
        sourceCommittee: "sourceCommittee",
        startDate: "startDate",
        endDate: "endDate",
      } as const);
      const data = await db.fetchCommitteeReportRecipientCommittees(params);
      return json(data);
    },
  },

  "/api/committee-reports/by-identifier/:identifier": {
    GET: async (
      req: BunRequest<"/api/committee-reports/by-identifier/:identifier">,
    ) => {
      const identifier = decodeURIComponent(req.params.identifier).trim();
      if (!identifier) return badRequest("Missing document identifier");
      const data = await db.fetchCommitteeReportByIdentifier({ identifier });
      return jsonOrNotFound(data);
    },
  },

  "/api/committee-reports/:id": {
    GET: async (req: BunRequest<"/api/committee-reports/:id">) => {
      const data = await db.fetchCommitteeReportById({ id: req.params.id });
      return jsonOrNotFound(data);
    },
  },

  "/api/legislative-initiatives": {
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
          initiativeTypeCode: "initiativeTypeCode",
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
      const data = await db.fetchLegislativeInitiatives(params);
      return json(data);
    },
  },

  "/api/legislative-initiatives/subjects": {
    GET: async () => {
      const data = await db.fetchLegislativeInitiativesSubjects();
      return json(data);
    },
  },

  "/api/legislative-initiatives/years": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const params = getMappedOptionalQueryParams(searchParams, {
        initiativeTypeCode: "initiativeTypeCode",
      } as const);
      const data = await db.fetchLegislativeInitiativeYears(params);
      return json(data);
    },
  },

  "/api/legislative-initiatives/by-identifier/:identifier": {
    GET: async (
      req: BunRequest<"/api/legislative-initiatives/by-identifier/:identifier">,
    ) => {
      const identifier = decodeURIComponent(req.params.identifier).trim();
      if (!identifier) return badRequest("Missing document identifier");
      const data = await db.fetchLegislativeInitiativeByIdentifier({
        identifier,
      });
      return jsonOrNotFound(data);
    },
  },

  "/api/legislative-initiatives/:id": {
    GET: async (req: BunRequest<"/api/legislative-initiatives/:id">) => {
      const data = await db.fetchLegislativeInitiativeById({
        id: req.params.id,
      });
      return jsonOrNotFound(data);
    },
  },
});
