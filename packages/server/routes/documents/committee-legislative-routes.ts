import type { BunRequest } from "bun";
import type { DocumentRoutesDataAccess } from "../document-routes";
import {
  getMappedOptionalQueryParams,
  getMappedPaginatedQueryParams,
  getSearchParams,
} from "../http";
import { jsonOrNotFound } from "../route-responses";

export const createCommitteeLegislativeRoutes = (
  db: DocumentRoutesDataAccess,
) => ({
  "/api/committee-reports": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
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
      return Response.json(data);
    },
  },

  "/api/committee-reports/years": {
    GET: async () => {
      const data = await db.fetchCommitteeReportYears();
      return Response.json(data);
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
      return Response.json(data);
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
      return Response.json(data);
    },
  },

  "/api/committee-reports/by-identifier/:identifier": {
    GET: async (
      req: BunRequest<"/api/committee-reports/by-identifier/:identifier">,
    ) => {
      const data = await db.fetchCommitteeReportByIdentifier({
        identifier: decodeURIComponent(req.params.identifier),
      });
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
      return Response.json(data);
    },
  },

  "/api/legislative-initiatives/subjects": {
    GET: async () => {
      const data = await db.fetchLegislativeInitiativesSubjects();
      return Response.json(data);
    },
  },

  "/api/legislative-initiatives/years": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const params = getMappedOptionalQueryParams(searchParams, {
        initiativeTypeCode: "initiativeTypeCode",
      } as const);
      const data = await db.fetchLegislativeInitiativeYears(params);
      return Response.json(data);
    },
  },

  "/api/legislative-initiatives/by-identifier/:identifier": {
    GET: async (
      req: BunRequest<"/api/legislative-initiatives/by-identifier/:identifier">,
    ) => {
      const data = await db.fetchLegislativeInitiativeByIdentifier({
        identifier: decodeURIComponent(req.params.identifier),
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
