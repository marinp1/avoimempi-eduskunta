// modules/server/server.ts
import homepage from "./public/index.html";
import type { BunRequest, ServerWebSocket } from "bun";

import { DatabaseConnection } from "./database/db";
import { AdminStorageService } from "./database/admin-storage";
import { ScraperController } from "./scraper-controller";
import { ParserController } from "./parser-controller";
import { MigratorController } from "./migrator-controller";

const db = new DatabaseConnection();
const scraperController = ScraperController.getInstance();
const parserController = ParserController.getInstance();
const migratorController = MigratorController.getInstance();

const server = Bun.serve({
  routes: {
    "/": homepage,
    "/composition": homepage,
    "/votings": homepage,
    "/sessions": homepage,
    "/admin": homepage,

    "/api/status": new Response("OK"),

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
      GET: async () => {
        const sessions = await db.fetchSessions();
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

    "/api/admin/status": {
      GET: async () => {
        const adminService = new AdminStorageService();
        const status = await adminService.getStatus();
        return new Response(JSON.stringify(status), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/admin/overview": {
      GET: async () => {
        const adminService = new AdminStorageService();
        const overview = await adminService.getScrapingOverview();
        return new Response(JSON.stringify(overview), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/api/scraper/start": {
      POST: async (req: Request) => {
        try {
          const body = (await req.json()) as { tableName: string; mode?: any };

          if (!body.tableName) {
            return Response.json(
              { error: "tableName is required" },
              { status: 400 },
            );
          }

          // Start scraping in background
          scraperController
            .startScraping(body.tableName, body.mode)
            .catch(console.error);

          return Response.json({ success: true, message: "Scraping started" });
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      },
    },

    "/api/scraper/stop": {
      POST: async () => {
        try {
          scraperController.stopScraping();
          return Response.json({
            success: true,
            message: "Scraper stop requested",
          });
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 400 });
        }
      },
    },

    "/api/scraper/status": {
      GET: async () => {
        const status = scraperController.getStatus();
        return Response.json(status);
      },
    },

    "/api/parser/start": {
      POST: async (req: Request) => {
        try {
          const body = (await req.json()) as { tableName: string };

          if (!body.tableName) {
            return Response.json(
              { error: "tableName is required" },
              { status: 400 },
            );
          }

          // Start parsing in background
          parserController.startParsing(body.tableName).catch(console.error);

          return Response.json({ success: true, message: "Parsing started" });
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      },
    },

    "/api/parser/stop": {
      POST: async () => {
        try {
          parserController.stopParsing();
          return Response.json({
            success: true,
            message: "Parser stop requested",
          });
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 400 });
        }
      },
    },

    "/api/parser/status": {
      GET: async () => {
        const status = parserController.getStatus();
        return Response.json(status);
      },
    },

    "/api/migrator/start": {
      POST: async () => {
        try {
          // Start migration in background
          migratorController.startMigration().catch(console.error);

          return Response.json({ success: true, message: "Migration started" });
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 500 });
        }
      },
    },

    "/api/migrator/stop": {
      POST: async () => {
        try {
          migratorController.stopMigration();
          return Response.json({
            success: true,
            message: "Migration stop requested",
          });
        } catch (error: any) {
          return Response.json({ error: error.message }, { status: 400 });
        }
      },
    },

    "/api/migrator/status": {
      GET: async () => {
        const status = migratorController.getStatus();
        return Response.json(status);
      },
    },

    "/api/migrator/last-migration": {
      GET: async () => {
        const timestamp = MigratorController.getLastMigrationTimestamp();
        return Response.json({ timestamp });
      },
    },

    "/api/*": Response.json({ message: "Not found" }, { status: 404 }),
  },

  development: {
    hmr: true,
  },

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

  websocket: {
    open(ws: ServerWebSocket<{ type: string }>) {
      console.log(`WebSocket connection opened: ${ws.data.type}`);
      if (ws.data.type === "scraper") {
        scraperController.setWebSocket(ws);
      } else if (ws.data.type === "parser") {
        parserController.setWebSocket(ws);
      } else if (ws.data.type === "migrator") {
        migratorController.setWebSocket(ws);
      }
    },
    message(ws: ServerWebSocket<{ type: string }>, message: string | Buffer) {
      console.log(`WebSocket message received (${ws.data.type}):`, message);
      // Handle incoming WebSocket messages if needed
    },
    close(ws: ServerWebSocket<{ type: string }>) {
      console.log(`WebSocket connection closed: ${ws.data.type}`);
    },
  },

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

export {};
