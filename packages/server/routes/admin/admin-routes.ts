import type { ScrapeMode } from "../../../datapipe/scraper/scraper";
import { AdminStorageService } from "../../database/admin-storage";
import { MigratorController } from "../../migrator-controller";
import { ParserController } from "../../parser-controller";
import homepage from "../../public/index.html";
import { ScraperController } from "../../scraper-controller";
import { getSearchParams } from "../http";
import {
  parseParserBulkStartBody,
  parseParserStartBody,
  parseScraperBulkStartBody,
  parseScraperStartBody,
} from "./body-validators";
import { badRequest, clientError, serverError } from "./responses";
import type { AdminRouteDependencies } from "./types";

const scraperController = ScraperController.getInstance();
const parserController = ParserController.getInstance();
const migratorController = MigratorController.getInstance();

export const createAdminRoutes = ({
  statusController,
}: AdminRouteDependencies) => ({
  "/admin": homepage,
  "/api/admin/table-list": {
    GET: async () => {
      const adminService = new AdminStorageService();
      return Response.json(adminService.getTableNames());
    },
  },

  "/api/admin/table-status": {
    GET: async (req: Request) => {
      const adminService = new AdminStorageService();
      const tableName = getSearchParams(req).get("tableName");
      if (!tableName) {
        return badRequest("tableName is required");
      }

      const status = await adminService.getTableStatus(tableName);
      if (!status) {
        return badRequest("Invalid tableName");
      }
      return Response.json(status);
    },
  },

  "/api/admin/status": {
    GET: async () => {
      const adminService = new AdminStorageService();
      const status = await adminService.getStatus();
      return Response.json(status);
    },
  },

  "/api/admin/overview": {
    GET: async () => {
      const adminService = new AdminStorageService();
      const overview = await adminService.getScrapingOverview();
      return Response.json(overview);
    },
  },

  "/api/scraper/start": {
    POST: async (req: Request) => {
      try {
        if (scraperController.getStatus().isRunning) {
          return Response.json(
            { success: false, error: "Scraper is already running" },
            { status: 409 },
          );
        }
        const parsed = await parseScraperStartBody(req);
        if (parsed.ok === false) {
          return badRequest(parsed.error);
        }

        const mode = parsed.value.mode as ScrapeMode | undefined;
        scraperController
          .startScraping(parsed.value.tableName, mode)
          .catch(console.error);

        return Response.json({ success: true, message: "Scraping started" });
      } catch (error: unknown) {
        return serverError(error);
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
      } catch (error: unknown) {
        return clientError(error);
      }
    },
  },

  "/api/scraper/bulk-start": {
    POST: async (req: Request) => {
      try {
        if (scraperController.getStatus().isRunning) {
          return Response.json(
            { success: false, error: "Scraper is already running" },
            { status: 409 },
          );
        }
        const parsed = await parseScraperBulkStartBody(req);
        if (parsed.ok === false) {
          return badRequest(parsed.error);
        }

        const mode = parsed.value.mode as ScrapeMode | undefined;
        scraperController
          .startBulkScraping(parsed.value.tableNames, mode)
          .catch(console.error);

        return Response.json({
          success: true,
          message: "Bulk scraping started",
          tableCount: parsed.value.tableNames.length,
        });
      } catch (error: unknown) {
        return serverError(error);
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
        if (parserController.getStatus().isRunning) {
          return Response.json(
            { success: false, error: "Parser is already running" },
            { status: 409 },
          );
        }
        const parsed = await parseParserStartBody(req);
        if (parsed.ok === false) {
          return badRequest(parsed.error);
        }

        parserController
          .startParsing(parsed.value.tableName)
          .catch(console.error);

        return Response.json({ success: true, message: "Parsing started" });
      } catch (error: unknown) {
        return serverError(error);
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
      } catch (error: unknown) {
        return clientError(error);
      }
    },
  },

  "/api/parser/bulk-start": {
    POST: async (req: Request) => {
      try {
        if (parserController.getStatus().isRunning) {
          return Response.json(
            { success: false, error: "Parser is already running" },
            { status: 409 },
          );
        }
        const parsed = await parseParserBulkStartBody(req);
        if (parsed.ok === false) {
          return badRequest(parsed.error);
        }

        parserController
          .startBulkParsing(parsed.value.tableNames, parsed.value.force)
          .catch(console.error);

        return Response.json({
          success: true,
          message: "Bulk parsing started",
          tableCount: parsed.value.tableNames.length,
        });
      } catch (error: unknown) {
        return serverError(error);
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
        if (migratorController.getStatus().isRunning) {
          return Response.json(
            { success: false, error: "Migration is already running" },
            { status: 409 },
          );
        }
        migratorController
          .startMigration()
          .then(() => statusController.invalidateCache())
          .catch(console.error);

        return Response.json({ success: true, message: "Migration started" });
      } catch (error: unknown) {
        return serverError(error);
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
      } catch (error: unknown) {
        return clientError(error);
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
});
