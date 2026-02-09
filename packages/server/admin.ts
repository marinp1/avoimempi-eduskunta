import type { ServerWebSocket, WebSocketHandler } from "bun";
import { AdminStorageService } from "./database/admin-storage";
import { MigratorController } from "./migrator-controller";
import { ParserController } from "./parser-controller";
import homepage from "./public/index.html";
import { ScraperController } from "./scraper-controller";

const scraperController = ScraperController.getInstance();
const parserController = ParserController.getInstance();
const migratorController = MigratorController.getInstance();

export const routes = {
  "/admin": homepage,
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

  "/api/scraper/bulk-start": {
    POST: async (req: Request) => {
      try {
        const body = (await req.json()) as {
          tableNames: string[];
          mode?: any;
        };

        if (!body.tableNames || !Array.isArray(body.tableNames)) {
          return Response.json(
            { error: "tableNames array is required" },
            { status: 400 },
          );
        }

        if (body.tableNames.length === 0) {
          return Response.json(
            { error: "tableNames array cannot be empty" },
            { status: 400 },
          );
        }

        // Start bulk scraping in background
        scraperController
          .startBulkScraping(body.tableNames, body.mode)
          .catch(console.error);

        return Response.json({
          success: true,
          message: "Bulk scraping started",
          tableCount: body.tableNames.length,
        });
      } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
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

  "/api/parser/bulk-start": {
    POST: async (req: Request) => {
      try {
        const body = (await req.json()) as {
          tableNames: string[];
          force?: boolean;
        };

        if (!body.tableNames || !Array.isArray(body.tableNames)) {
          return Response.json(
            { error: "tableNames array is required" },
            { status: 400 },
          );
        }

        if (body.tableNames.length === 0) {
          return Response.json(
            { error: "tableNames array cannot be empty" },
            { status: 400 },
          );
        }

        // Start bulk parsing in background
        parserController
          .startBulkParsing(body.tableNames, body.force)
          .catch(console.error);

        return Response.json({
          success: true,
          message: "Bulk parsing started",
          tableCount: body.tableNames.length,
        });
      } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
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
};

export const websocketHandler: WebSocketHandler<undefined> = {
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
};
