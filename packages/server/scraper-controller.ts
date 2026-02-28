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
  private static instance: ScraperController | null = null;
  private isRunning = false;
  private shouldStop = false;
  private currentTable: string | null = null;
  private currentPage = 0;
  private totalRows = 0;
  private percentComplete = 0;
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
      currentPage: this.currentPage,
      totalRows: this.totalRows,
      percentComplete: this.percentComplete,
    };
  }

  private sendMessage(message: ScraperMessage) {
    const data = message.data ?? {};

    if (message.type === "status" && data.status === "started") {
      this.currentPage = 0;
      this.totalRows = 0;
      this.percentComplete = 0;
    } else if (message.type === "progress") {
      if (typeof data.page === "number") {
        this.currentPage = data.page;
      }
      if (typeof data.totalRows === "number") {
        this.totalRows = data.totalRows;
      }
      if (typeof data.overallPercentComplete === "number") {
        this.percentComplete = Math.max(
          0,
          Math.min(100, data.overallPercentComplete),
        );
      } else if (typeof data.percentComplete === "number") {
        this.percentComplete = Math.max(0, Math.min(100, data.percentComplete));
      }
    } else if (message.type === "complete") {
      this.percentComplete = 100;
    }

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

  async startBulkScraping(
    tableNames: string[],
    mode: ScrapeMode = { type: "auto-resume" },
  ) {
    if (this.isRunning) {
      throw new Error("Scraper is already running");
    }

    this.isRunning = true;
    this.shouldStop = false;

    const totalTables = tableNames.length;
    let completedTables = 0;
    const failedTables: Array<{ table: string; error: string }> = [];

    this.sendMessage({
      type: "status",
      data: {
        status: "started",
        mode: "bulk",
        totalTables,
      },
    });

    try {
      for (const tableName of tableNames) {
        if (this.shouldStop) {
          break;
        }

        this.currentTable = tableName;

        this.sendMessage({
          type: "progress",
          data: {
            mode: "bulk",
            tableName,
            currentTableIndex: completedTables + 1,
            totalTables,
            percentComplete: (completedTables / totalTables) * 100,
          },
        });

        try {
          await scrapeTable({
            tableName,
            mode,
            onProgress: (progress) => {
              if (this.shouldStop) {
                throw new Error("Scraping stopped by user");
              }

              this.sendMessage({
                type: "progress",
                data: {
                  mode: "bulk",
                  tableName,
                  currentTableIndex: completedTables + 1,
                  totalTables,
                  page: progress.page,
                  rowCount: progress.rowCount,
                  totalRows: progress.totalRows,
                  tablePercentComplete: progress.percentComplete,
                  overallPercentComplete:
                    ((completedTables + progress.percentComplete / 100) /
                      totalTables) *
                    100,
                },
              });
            },
          });

          completedTables++;

          this.sendMessage({
            type: "progress",
            data: {
              mode: "bulk",
              tableName,
              status: "completed",
              currentTableIndex: completedTables,
              totalTables,
              percentComplete: (completedTables / totalTables) * 100,
            },
          });
        } catch (error: any) {
          failedTables.push({ table: tableName, error: error.message });

          this.sendMessage({
            type: "progress",
            data: {
              mode: "bulk",
              tableName,
              status: "failed",
              error: error.message,
              currentTableIndex: completedTables + 1,
              totalTables,
            },
          });

          completedTables++;
        }
      }

      if (this.shouldStop) {
        this.sendMessage({
          type: "stopped",
          data: {
            message: "Bulk scraping stopped by user",
            completedTables,
            totalTables,
            failedTables,
          },
        });
      } else {
        this.sendMessage({
          type: "complete",
          data: {
            message: `Bulk scraping completed`,
            completedTables,
            totalTables,
            failedTables,
          },
        });
      }
    } catch (error: any) {
      this.sendMessage({
        type: "error",
        data: {
          error: error.message,
          completedTables,
          totalTables,
          failedTables,
        },
      });
    } finally {
      this.isRunning = false;
      this.currentTable = null;
      this.shouldStop = false;
    }
  }
}
