// modules/server/server.ts

import type { BunRequest } from "bun";
import { StatusController } from "./controllers/status-controller";
import { DatabaseConnection } from "./database/db";
import homepage from "./public/index.html";

const db = new DatabaseConnection();
export const statusController = new StatusController(db);
const isDev = process.env.NODE_ENV === "development";
const configuredPort = Number.parseInt(process.env.PORT ?? "", 10);
const port =
  Number.isFinite(configuredPort) && configuredPort > 0
    ? configuredPort
    : isDev
      ? 3000
      : 80;

const server = Bun.serve<{
  type: "parser" | "scraper" | "migrator";
}>({
  port,
  routes: {
    "/": homepage,
    "/edustajat": homepage,
    "/puolueet": homepage,
    "/istunnot": homepage,
    "/aanestykset": homepage,
    "/asiakirjat": homepage,
    "/analytiikka": homepage,
    "/composition": homepage,
    "/votings": homepage,
    "/sessions": homepage,
    "/insights": homepage,
    ...(isDev
      ? {
          "/tila": homepage,
          "/status": homepage,
        }
      : {}),
    "/api/health": new Response("OK"),
    ...(isDev
      ? {
          "/api/status/overview": {
            GET: async () => {
              const overview = await statusController.getOverview();
              return new Response(JSON.stringify(overview), {
                headers: { "Content-Type": "application/json" },
              });
            },
          },
          "/api/status/sanity-checks": {
            GET: async () => {
              const checks = await statusController.getSanityChecks();
              return new Response(JSON.stringify(checks), {
                headers: { "Content-Type": "application/json" },
              });
            },
          },
          "/api/status/source-data": {
            GET: async () => {
              const sourceData = await statusController.getSourceDataStatus();
              return new Response(JSON.stringify(sourceData), {
                headers: { "Content-Type": "application/json" },
              });
            },
          },
        }
      : {}),
    "/api/composition/:date": {
      GET: async (req: BunRequest<"/api/composition/:date">) => {
        const composition = await db.fetchParliamentComposition(req.params);
        return new Response(JSON.stringify(composition), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/person/:id/group-memberships": {
      GET: async (req: BunRequest<"/api/person/:id/group-memberships">) => {
        const memberships = await db.fetchPersonGroupMemberships(req.params);
        return new Response(JSON.stringify(memberships), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/person/:id/terms": {
      GET: async (req: BunRequest<"/api/person/:id/terms">) => {
        const memberships = await db.fetchPersonTerms(req.params);
        return new Response(JSON.stringify(memberships), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/person/:id/votes": {
      GET: async (req: BunRequest<"/api/person/:id/votes">) => {
        const votes = await db.fetchPersonVotes(req.params);
        return new Response(JSON.stringify(votes), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/person/:id/details": {
      GET: async (req: BunRequest<"/api/person/:id/details">) => {
        const details = await db.fetchRepresentativeDetails(req.params);
        return new Response(JSON.stringify(details), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/person/:id/districts": {
      GET: async (req: BunRequest<"/api/person/:id/districts">) => {
        const districts = await db.fetchRepresentativeDistricts(req.params);
        return new Response(JSON.stringify(districts), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/person/:id/leaving-records": {
      GET: async (req: BunRequest<"/api/person/:id/leaving-records">) => {
        const records = await db.fetchLeavingParliamentRecords(req.params);
        return new Response(JSON.stringify(records), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/person/:id/trust-positions": {
      GET: async (req: BunRequest<"/api/person/:id/trust-positions">) => {
        const positions = await db.fetchTrustPositions(req.params);
        return new Response(JSON.stringify(positions), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/person/:id/government-memberships": {
      GET: async (
        req: BunRequest<"/api/person/:id/government-memberships">,
      ) => {
        const memberships = await db.fetchGovernmentMemberships(req.params);
        return new Response(JSON.stringify(memberships), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/votings/search": {
      GET: async (req: BunRequest<"/api/votings/search">) => {
        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q")?.trim() || "";
        if (!q)
          return Response.json(
            { message: "Missing query parameter" },
            { status: 400 },
          );
        if (q.length < 3)
          return Response.json(
            { message: "Query paramter requires at least three characters" },
            { status: 400 },
          );
        const titles = await db.queryVotings({ q });
        return new Response(JSON.stringify(titles), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/votings/:id": {
      GET: async (req: BunRequest<"/api/votings/:id">) => {
        const voting = await db.fetchVotingById(req.params);
        if (!voting) {
          return Response.json(
            { message: "Voting not found" },
            { status: 404 },
          );
        }
        return new Response(JSON.stringify(voting), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/sessions": {
      GET: async (req: Request) => {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "20", 10);

        const sessions = await db.fetchSessions({ page, limit });
        return new Response(JSON.stringify(sessions), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/sections/:sectionKey/speeches": {
      GET: async (req: BunRequest<"/api/sections/:sectionKey/speeches">) => {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "20", 10);
        const offset = parseInt(searchParams.get("offset") || "0", 10);
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
        return new Response(JSON.stringify(votings), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/sections/:sectionKey/subsections": {
      GET: async (req: BunRequest<"/api/sections/:sectionKey/subsections">) => {
        const subsections = await db.fetchSectionSubSections({
          sectionKey: req.params.sectionKey,
        });
        return new Response(JSON.stringify(subsections), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/sections/:sectionKey/roll-call": {
      GET: async (req: BunRequest<"/api/sections/:sectionKey/roll-call">) => {
        const rollCall = await db.fetchSectionRollCall({
          sectionKey: req.params.sectionKey,
        });
        return new Response(JSON.stringify(rollCall), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/insights/participation": {
      GET: async (req: Request) => {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate") || undefined;
        const endDate = searchParams.get("endDate") || undefined;

        const participation = await db.fetchVotingParticipation({
          startDate,
          endDate,
        });
        return new Response(JSON.stringify(participation), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/insights/participation/:personId/by-government": {
      GET: async (
        req: BunRequest<"/api/insights/participation/:personId/by-government">,
      ) => {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate") || undefined;
        const endDate = searchParams.get("endDate") || undefined;

        const participation = await db.fetchVotingParticipationByGovernment({
          personId: req.params.personId,
          startDate,
          endDate,
        });
        return new Response(JSON.stringify(participation), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/insights/gender-division": {
      GET: async () => {
        const genderDivision = await db.fetchGenderDivisionOverTime();
        return new Response(JSON.stringify(genderDivision), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/insights/age-division": {
      GET: async () => {
        const ageDivision = await db.fetchAgeDivisionOverTime();
        return new Response(JSON.stringify(ageDivision), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/insights/party-participation-by-government": {
      GET: async (req: Request) => {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate") || undefined;
        const endDate = searchParams.get("endDate") || undefined;

        const partyParticipation = await db.fetchPartyParticipationByGovernment(
          {
            startDate,
            endDate,
          },
        );
        return new Response(JSON.stringify(partyParticipation), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/day/:date/session": {
      GET: async (req: BunRequest<"/api/day/:date/session">) => {
        const sessions = await db.fetchSessionByDate({
          date: req.params.date,
        });
        return new Response(JSON.stringify(sessions), {
          headers: { "Content-Type": "application/json" },
        });
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
        return new Response(JSON.stringify({ sessions: sessionsWithDocs }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/day/:date/speeches": {
      GET: async (req: BunRequest<"/api/day/:date/speeches">) => {
        const speeches = await db.fetchSpeechesByDate({
          date: req.params.date,
        });
        return new Response(JSON.stringify(speeches), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/session-dates": {
      GET: async () => {
        const dates = await db.fetchSessionDates();
        return new Response(JSON.stringify(dates), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/sections/:sectionKey/links": {
      GET: async (req: BunRequest<"/api/sections/:sectionKey/links">) => {
        const links = await db.fetchSectionDocumentLinks({
          sectionKey: req.params.sectionKey,
        });
        return new Response(JSON.stringify(links), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    // ─── Analytics endpoints ───

    "/api/analytics/party-discipline": {
      GET: async () => {
        const data = await db.fetchPartyDiscipline();
        return Response.json(data);
      },
    },

    "/api/analytics/close-votes": {
      GET: async (req: Request) => {
        const { searchParams } = new URL(req.url);
        const threshold = parseInt(searchParams.get("threshold") || "10", 10);
        const limit = parseInt(searchParams.get("limit") || "50", 10);
        const data = await db.fetchCloseVotes({ threshold, limit });
        return Response.json(data);
      },
    },

    "/api/analytics/mp-activity": {
      GET: async (req: Request) => {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "50", 10);
        const data = await db.fetchMpActivityRanking({ limit });
        return Response.json(data);
      },
    },

    "/api/analytics/coalition-opposition": {
      GET: async (req: Request) => {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "50", 10);
        const data = await db.fetchCoalitionVsOpposition({ limit });
        return Response.json(data);
      },
    },

    "/api/analytics/dissent": {
      GET: async (req: Request) => {
        const { searchParams } = new URL(req.url);
        const personId = searchParams.get("personId");
        const limit = parseInt(searchParams.get("limit") || "100", 10);
        const data = await db.fetchDissentTracking({
          personId: personId ? +personId : undefined,
          limit,
        });
        return Response.json(data);
      },
    },

    "/api/analytics/speech-activity": {
      GET: async (req: Request) => {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "50", 10);
        const data = await db.fetchSpeechActivity({ limit });
        return Response.json(data);
      },
    },

    "/api/analytics/committees": {
      GET: async () => {
        const data = await db.fetchCommitteeOverview();
        return Response.json(data);
      },
    },

    "/api/analytics/recent-activity": {
      GET: async (req: Request) => {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "20", 10);
        const data = await db.fetchRecentActivity({ limit });
        return Response.json(data);
      },
    },

    // ─── Party endpoints ───

    "/api/parties/summary": {
      GET: async () => {
        const data = await db.fetchPartySummary();
        return Response.json(data);
      },
    },

    "/api/parties/:code/members": {
      GET: async (req: BunRequest<"/api/parties/:code/members">) => {
        const data = await db.fetchPartyMembers({
          partyCode: req.params.code,
        });
        return Response.json(data);
      },
    },

    // ─── Person analytics endpoints ───

    "/api/person/:id/speeches": {
      GET: async (req: BunRequest<"/api/person/:id/speeches">) => {
        const { searchParams } = new URL(req.url);
        const data = await db.fetchPersonSpeeches({
          personId: req.params.id,
          limit: parseInt(searchParams.get("limit") || "50", 10),
          offset: parseInt(searchParams.get("offset") || "0", 10),
        });
        return Response.json(data);
      },
    },

    "/api/person/:id/committees": {
      GET: async (req: BunRequest<"/api/person/:id/committees">) => {
        const data = await db.fetchPersonCommittees({
          personId: req.params.id,
        });
        return Response.json(data);
      },
    },

    "/api/person/:id/dissents": {
      GET: async (req: BunRequest<"/api/person/:id/dissents">) => {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get("limit") || "100", 10);
        const data = await db.fetchPersonDissents({
          personId: req.params.id,
          limit,
        });
        return Response.json(data);
      },
    },

    // ─── Interpellation endpoints ───

    "/api/interpellations": {
      GET: async (req: Request) => {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q") || undefined;
        const year = searchParams.get("year") || undefined;
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "20", 10);
        const data = await db.fetchInterpellations({ query, year, page, limit });
        return Response.json(data);
      },
    },

    "/api/interpellations/years": {
      GET: async () => {
        const data = await db.fetchInterpellationYears();
        return Response.json(data);
      },
    },

    "/api/interpellations/by-identifier/:identifier": {
      GET: async (
        req: BunRequest<"/api/interpellations/by-identifier/:identifier">,
      ) => {
        const data = await db.fetchInterpellationByIdentifier({
          identifier: decodeURIComponent(req.params.identifier),
        });
        if (!data) return Response.json({ message: "Not found" }, { status: 404 });
        return Response.json(data);
      },
    },

    "/api/interpellations/:id": {
      GET: async (req: BunRequest<"/api/interpellations/:id">) => {
        const data = await db.fetchInterpellationById({ id: req.params.id });
        if (!data) return Response.json({ message: "Not found" }, { status: 404 });
        return Response.json(data);
      },
    },

    // ─── Government proposal endpoints ───

    "/api/government-proposals": {
      GET: async (req: Request) => {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q") || undefined;
        const year = searchParams.get("year") || undefined;
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "20", 10);
        const data = await db.fetchGovernmentProposals({ query, year, page, limit });
        return Response.json(data);
      },
    },

    "/api/government-proposals/years": {
      GET: async () => {
        const data = await db.fetchGovernmentProposalYears();
        return Response.json(data);
      },
    },

    "/api/government-proposals/by-identifier/:identifier": {
      GET: async (
        req: BunRequest<"/api/government-proposals/by-identifier/:identifier">,
      ) => {
        const data = await db.fetchGovernmentProposalByIdentifier({
          identifier: decodeURIComponent(req.params.identifier),
        });
        if (!data) return Response.json({ message: "Not found" }, { status: 404 });
        return Response.json(data);
      },
    },

    "/api/government-proposals/:id": {
      GET: async (req: BunRequest<"/api/government-proposals/:id">) => {
        const data = await db.fetchGovernmentProposalById({ id: req.params.id });
        if (!data) return Response.json({ message: "Not found" }, { status: 404 });
        return Response.json(data);
      },
    },

    // ─── Written question endpoints ───

    "/api/written-questions": {
      GET: async (req: Request) => {
        const { searchParams } = new URL(req.url);
        const query = searchParams.get("q") || undefined;
        const year = searchParams.get("year") || undefined;
        const page = parseInt(searchParams.get("page") || "1", 10);
        const limit = parseInt(searchParams.get("limit") || "20", 10);
        const data = await db.fetchWrittenQuestions({ query, year, page, limit });
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
        if (!data) return Response.json({ message: "Not found" }, { status: 404 });
        return Response.json(data);
      },
    },

    "/api/written-questions/:id": {
      GET: async (req: BunRequest<"/api/written-questions/:id">) => {
        const data = await db.fetchWrittenQuestionById({ id: req.params.id });
        if (!data) return Response.json({ message: "Not found" }, { status: 404 });
        return Response.json(data);
      },
    },

    // ─── Federated search ───

    "/api/search": {
      GET: async (req: Request) => {
        const { searchParams } = new URL(req.url);
        const q = searchParams.get("q")?.trim() || "";
        if (!q || q.length < 2) {
          return Response.json(
            { message: "Query must be at least 2 characters" },
            { status: 400 },
          );
        }
        const data = await db.federatedSearch({
          q,
          limit: parseInt(searchParams.get("limit") || "30", 10),
        });
        return Response.json(data);
      },
    },

    ...(isDev ? await import("./admin").then((def) => def.routes) : {}),
    "/api/*": Response.json({ message: "Not found" }, { status: 404 }),
  },

  development: isDev
    ? {
        hmr: true,
      }
    : false,

  fetch(req, server) {
    if (!isDev) {
      return new Response("Not Found", { status: 404 });
    }

    // Handle WebSocket upgrades
    const url = new URL(req.url);
    if (url.pathname === "/ws/scraper") {
      if (server.upgrade(req, { data: { type: "scraper" } })) {
        return; // WebSocket upgrade successful
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    if (url.pathname === "/ws/parser") {
      if (server.upgrade(req, { data: { type: "parser" } })) {
        return; // WebSocket upgrade successful
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }
    if (url.pathname === "/ws/migrator") {
      if (server.upgrade(req, { data: { type: "migrator" } })) {
        return; // WebSocket upgrade successful
      }
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    return new Response("Not Found", { status: 404 });
  },
  websocket: isDev
    ? await import("./admin").then((def) => def.websocketHandler)
    : undefined,
  error(error) {
    console.error(error);
    return new Response(`Internal Error: ${error.message}`, {
      status: 500,
      headers: {
        "Content-Type": "text/plain",
      },
    });
  },
});

console.log(
  `Listening on ${server.url} ${server.development ? "(development)" : "(production)"}`,
);
