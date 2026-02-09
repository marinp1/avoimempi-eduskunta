// modules/server/server.ts

import type { BunRequest } from "bun";
import { DatabaseConnection } from "./database/db";
import { StatusController } from "./controllers/status-controller";
import homepage from "./public/index.html";

const db = new DatabaseConnection();
const statusController = new StatusController(db);
const isDev = process.env.NODE_ENV === "development";

const server = Bun.serve<{
  type: "parser" | "scraper" | "migrator";
}>({
  routes: {
    "/": homepage,
    "/edustajat": homepage,
    "/puolueet": homepage,
    "/istunnot": homepage,
    "/aanestykset": homepage,
    "/asiakirjat": homepage,
    "/analytiikka": homepage,
    "/tila": homepage,
    "/composition": homepage,
    "/votings": homepage,
    "/sessions": homepage,
    "/insights": homepage,
    "/status": homepage,
    "/api/health": new Response("OK"),
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
        const speeches = await db.fetchSectionSpeeches({
          sectionKey: req.params.sectionKey,
        });
        return new Response(JSON.stringify(speeches), {
          headers: { "Content-Type": "application/json" },
        });
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
        return new Response(JSON.stringify(sessions), {
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
    ...(isDev ? await import("./admin").then((def) => def.routes) : {}),
    "/api/*": Response.json({ message: "Not found" }, { status: 404 }),
  },

  development: isDev
    ? {
        hmr: true,
      }
    : false,

  fetch(req, server) {
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
  `Listening on ${server.url} ${server.development ? "(development)" : ""}`,
);
