import type { ServerWebSocket } from "bun";
import { parseTable } from "../datapipe/parser/parser";

export interface ParserStatus {
  isRunning: boolean;
  currentTable: string | null;
  currentPage: number;
  totalRows: number;
  percentComplete: number;
}

export interface ParserMessage {
  type: "status" | "progress" | "complete" | "error" | "stopped";
  data?: any;
}

/**
 * Controller for managing parser processes with WebSocket communication
 */
export class ParserController {
  private static instance: ParserController | null = null;
  private isRunning = false;
  private shouldStop = false;
  private currentTable: string | null = null;
  private ws: ServerWebSocket<unknown> | null = null;

  private constructor() {}

  static getInstance(): ParserController {
    if (!ParserController.instance) {
      ParserController.instance = new ParserController();
    }
    return ParserController.instance;
  }

  setWebSocket(ws: ServerWebSocket<unknown>) {
    this.ws = ws;
  }

  getStatus(): ParserStatus {
    return {
      isRunning: this.isRunning,
      currentTable: this.currentTable,
      currentPage: 0,
      totalRows: 0,
      percentComplete: 0,
    };
  }

  private sendMessage(message: ParserMessage) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(message));
    }
  }

  async startParsing(tableName: string, force = false) {
    if (this.isRunning) {
      throw new Error("Parser is already running");
    }

    this.isRunning = true;
    this.shouldStop = false;
    this.currentTable = tableName;

    this.sendMessage({
      type: "status",
      data: {
        status: "started",
        tableName,
      },
    });

    try {
      await parseTable({
        tableName,
        targetStage: "parsed",
        force,
        onProgress: (progress) => {
          // Check if we should stop
          if (this.shouldStop) {
            throw new Error("Parsing stopped by user");
          }

          // Send progress update
          this.sendMessage({
            type: "progress",
            data: {
              tableName,
              page: progress.page,
              rowsParsed: progress.rowsParsed,
              totalPages: progress.totalPages,
              percentComplete: progress.percentComplete,
            },
          });
        },
      });

      // Parsing completed successfully
      this.sendMessage({
        type: "complete",
        data: {
          tableName,
          message: `Successfully parsed ${tableName}`,
        },
      });
    } catch (error: any) {
      if (this.shouldStop) {
        this.sendMessage({
          type: "stopped",
          data: {
            tableName,
            message: "Parsing stopped by user",
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

  stopParsing() {
    if (!this.isRunning) {
      throw new Error("No parser is currently running");
    }

    this.shouldStop = true;
    this.sendMessage({
      type: "status",
      data: {
        status: "stopping",
        message: "Stopping parser...",
      },
    });
  }

  async startBulkParsing(tableNames: string[], force = false) {
    if (this.isRunning) {
      throw new Error("Parser is already running");
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
          await parseTable({
            tableName,
            targetStage: "parsed",
            force,
            onProgress: (progress) => {
              if (this.shouldStop) {
                throw new Error("Parsing stopped by user");
              }

              this.sendMessage({
                type: "progress",
                data: {
                  mode: "bulk",
                  tableName,
                  currentTableIndex: completedTables + 1,
                  totalTables,
                  page: progress.page,
                  rowsParsed: progress.rowsParsed,
                  totalPages: progress.totalPages,
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
            message: "Bulk parsing stopped by user",
            completedTables,
            totalTables,
            failedTables,
          },
        });
      } else {
        this.sendMessage({
          type: "complete",
          data: {
            message: `Bulk parsing completed`,
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
