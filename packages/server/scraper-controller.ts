import type { ServerWebSocket } from "bun";
import { type ScrapeMode, scrapeTable } from "../datapipe/scraper/scraper";

export interface ScraperStatus {
  isRunning: boolean;
  currentTable: string | null;
  currentPage: number;
  totalRows: number;
  percentComplete: number;
}

export interface ScraperMessage {
  type: "status" | "progress" | "complete" | "error" | "stopped";
  data?: any;
}

/**
 * Controller for managing scraper processes with WebSocket communication
 */
export class ScraperController {
  private isRunning = false;
  private shouldStop = false;
  private currentTable: string | null = null;
  private ws: ServerWebSocket<unknown> | null = null;

  private constructor() {}

  static getInstance(): ScraperController {
    if (!ScraperController.instance) {
      ScraperController.instance = new ScraperController();
    }
    return ScraperController.instance;
  }

  setWebSocket(ws: ServerWebSocket<unknown>) {
    this.ws = ws;
  }

  getStatus(): ScraperStatus {
    return {
      isRunning: this.isRunning,
      currentTable: this.currentTable,
      currentPage: 0,
      totalRows: 0,
      percentComplete: 0,
    };
  }

  private sendMessage(message: ScraperMessage) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(message));
    }
  }

  async startScraping(
    tableName: string,
    mode: ScrapeMode = { type: "auto-resume" },
  ) {
    if (this.isRunning) {
      throw new Error("Scraper is already running");
    }

    this.isRunning = true;
    this.shouldStop = false;
    this.currentTable = tableName;

    this.sendMessage({
      type: "status",
      data: {
        status: "started",
        tableName,
        mode,
      },
    });

    try {
      await scrapeTable({
        tableName,
        mode,
        stage: "raw",
        onProgress: (progress) => {
          // Check if we should stop
          if (this.shouldStop) {
            throw new Error("Scraping stopped by user");
          }

          // Send progress update
          this.sendMessage({
            type: "progress",
            data: {
              tableName,
              page: progress.page,
              rowCount: progress.rowCount,
              totalRows: progress.totalRows,
              percentComplete: progress.percentComplete,
            },
          });
        },
      });

      // Scraping completed successfully
      this.sendMessage({
        type: "complete",
        data: {
          tableName,
          message: `Successfully scraped ${tableName}`,
        },
      });
    } catch (error: any) {
      if (this.shouldStop) {
        this.sendMessage({
          type: "stopped",
          data: {
            tableName,
            message: "Scraping stopped by user",
          },
        });
      } else {
        this.sendMessage({
          type: "error",
          data: {
            tableName,
            error: error.message,
          },
        });
      }
    } finally {
      this.isRunning = false;
      this.currentTable = null;
      this.shouldStop = false;
    }
  }

  stopScraping() {
    if (!this.isRunning) {
      throw new Error("No scraper is currently running");
    }

    this.shouldStop = true;
    this.sendMessage({
      type: "status",
      data: {
        status: "stopping",
        message: "Stopping scraper...",
      },
    });
  }
}
