import type { BunRequest } from "bun";
import {
  getLimitOffsetQueryParams,
  getPageLimitQueryParams,
  getSearchParams,
} from "./http";
import { jsonOrNotFound } from "./route-responses";

type SessionRoutesDataAccess = {
  fetchSessions: (params: { page: number; limit: number }) => unknown;
  fetchSectionByKey: (params: { sectionKey: string }) => unknown;
  fetchSectionSpeeches: (params: {
    sectionKey: string;
    limit?: number;
    offset?: number;
  }) => unknown;
  fetchSectionVotings: (params: { sectionKey: string }) => unknown;
  fetchSectionSubSections: (params: { sectionKey: string }) => unknown;
  fetchSectionRollCall: (params: { sectionKey: string }) => unknown;
  fetchSessionByDate: (params: { date: string }) => unknown;
  fetchSessionWithSectionsByDate: (params: { date: string }) => Array<{
    key: string;
  }>;
  fetchSessionDocuments: (params: { sessionKey: string }) => unknown;
  fetchSessionNotices: (params: { sessionKey: string }) => unknown;
  fetchSpeechesByDate: (params: { date: string }) => unknown;
  fetchSessionDates: () => unknown;
  fetchCompletedSessionDates: () => unknown;
  fetchSectionDocumentLinks: (params: { sectionKey: string }) => unknown;
};

export const createSessionRoutes = (db: SessionRoutesDataAccess) => ({
  "/api/sessions": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const { page, limit } = getPageLimitQueryParams(searchParams);

      const sessions = await db.fetchSessions({ page, limit });
      return Response.json(sessions);
    },
  },

  "/api/sections/:sectionKey": {
    GET: async (req: BunRequest<"/api/sections/:sectionKey">) => {
      const section = await db.fetchSectionByKey({
        sectionKey: req.params.sectionKey,
      });
      return jsonOrNotFound(section, "Section not found");
    },
  },

  "/api/sections/:sectionKey/speeches": {
    GET: async (req: BunRequest<"/api/sections/:sectionKey/speeches">) => {
      const searchParams = getSearchParams(req);
      const { limit, offset } = getLimitOffsetQueryParams(searchParams);
      const result = await db.fetchSectionSpeeches({
        sectionKey: req.params.sectionKey,
        limit,
        offset,
      });
      return Response.json(result);
    },
  },

  "/api/sections/:sectionKey/votings": {
    GET: async (req: BunRequest<"/api/sections/:sectionKey/votings">) => {
      const votings = await db.fetchSectionVotings({
        sectionKey: req.params.sectionKey,
      });
      return Response.json(votings);
    },
  },

  "/api/sections/:sectionKey/subsections": {
    GET: async (req: BunRequest<"/api/sections/:sectionKey/subsections">) => {
      const subsections = await db.fetchSectionSubSections({
        sectionKey: req.params.sectionKey,
      });
      return Response.json(subsections);
    },
  },

  "/api/sections/:sectionKey/roll-call": {
    GET: async (req: BunRequest<"/api/sections/:sectionKey/roll-call">) => {
      const rollCall = await db.fetchSectionRollCall({
        sectionKey: req.params.sectionKey,
      });
      return Response.json(rollCall);
    },
  },

  "/api/day/:date/session": {
    GET: async (req: BunRequest<"/api/day/:date/session">) => {
      const sessions = await db.fetchSessionByDate({
        date: req.params.date,
      });
      return Response.json(sessions);
    },
  },

  "/api/day/:date/sessions": {
    GET: async (req: BunRequest<"/api/day/:date/sessions">) => {
      const sessions = await db.fetchSessionWithSectionsByDate({
        date: req.params.date,
      });
      const sessionsWithDocs = await Promise.all(
        sessions.map(async (session) => {
          const [documents, notices] = await Promise.all([
            db.fetchSessionDocuments({ sessionKey: session.key }),
            db.fetchSessionNotices({ sessionKey: session.key }),
          ]);
          return {
            ...session,
            documents,
            notices,
          };
        }),
      );
      return Response.json({ sessions: sessionsWithDocs });
    },
  },

  "/api/day/:date/speeches": {
    GET: async (req: BunRequest<"/api/day/:date/speeches">) => {
      const speeches = await db.fetchSpeechesByDate({
        date: req.params.date,
      });
      return Response.json(speeches);
    },
  },

  "/api/session-dates": {
    GET: async () => {
      const dates = await db.fetchSessionDates();
      return Response.json(dates);
    },
  },

  "/api/session-dates/completed": {
    GET: async () => {
      const dates = await db.fetchCompletedSessionDates();
      return Response.json(dates);
    },
  },

  "/api/sections/:sectionKey/links": {
    GET: async (req: BunRequest<"/api/sections/:sectionKey/links">) => {
      const links = await db.fetchSectionDocumentLinks({
        sectionKey: req.params.sectionKey,
      });
      return Response.json(links);
    },
  },
});
