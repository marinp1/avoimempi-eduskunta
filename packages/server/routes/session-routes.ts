import type { BunRequest } from "bun";
import type { SessionRepository } from "../database/repositories/session-repository";
import {
  getLimitOffsetQueryParams,
  getPageLimitQueryParams,
  getSearchParams,
} from "./http";
import { json, jsonOrNotFound } from "./route-responses";

export const createSessionRoutes = (db: SessionRepository) => ({
  "/api/sessions": {
    GET: async (req: Request) => {
      const searchParams = getSearchParams(req);
      const { page, limit } = getPageLimitQueryParams(searchParams, {
        pageFallback: 1,
        limitFallback: 20,
        minPage: 1,
        minLimit: 1,
        maxLimit: 200,
      });

      const sessions = await db.fetchSessions({ page, limit });
      return json(sessions);
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
      const { limit, offset } = getLimitOffsetQueryParams(searchParams, {
        limitFallback: 20,
        offsetFallback: 0,
        minLimit: 1,
        minOffset: 0,
        maxLimit: 500,
      });
      const result = await db.fetchSectionSpeeches({
        sectionKey: req.params.sectionKey,
        limit,
        offset,
      });
      return json(result);
    },
  },

  "/api/sections/:sectionKey/votings": {
    GET: async (req: BunRequest<"/api/sections/:sectionKey/votings">) => {
      const votings = await db.fetchSectionVotings({
        sectionKey: req.params.sectionKey,
      });
      return json(votings);
    },
  },

  "/api/sections/:sectionKey/subsections": {
    GET: async (req: BunRequest<"/api/sections/:sectionKey/subsections">) => {
      const subsections = await db.fetchSectionSubSections({
        sectionKey: req.params.sectionKey,
      });
      return json(subsections);
    },
  },

  "/api/sections/:sectionKey/roll-call": {
    GET: async (req: BunRequest<"/api/sections/:sectionKey/roll-call">) => {
      const rollCall = await db.fetchSectionRollCall({
        sectionKey: req.params.sectionKey,
      });
      return json(rollCall);
    },
  },

  "/api/day/:date/session": {
    GET: async (req: BunRequest<"/api/day/:date/session">) => {
      const sessions = await db.fetchSessionByDate({
        date: req.params.date,
      });
      return json(sessions);
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
      const vaskiLatestSpeechDate = db.fetchLatestSpeechDate();
      return json({ sessions: sessionsWithDocs, vaskiLatestSpeechDate });
    },
  },

  "/api/day/:date/speeches": {
    GET: async (req: BunRequest<"/api/day/:date/speeches">) => {
      const speeches = await db.fetchSpeechesByDate({
        date: req.params.date,
      });
      return json(speeches);
    },
  },

  "/api/session-dates": {
    GET: async () => {
      const dates = await db.fetchSessionDates();
      return json(dates);
    },
  },

  "/api/session-dates/completed": {
    GET: async () => {
      const dates = await db.fetchCompletedSessionDates();
      return json(dates);
    },
  },

  "/api/sections/:sectionKey/links": {
    GET: async (req: BunRequest<"/api/sections/:sectionKey/links">) => {
      const links = await db.fetchSectionDocumentLinks({
        sectionKey: req.params.sectionKey,
      });
      return json(links);
    },
  },
});
