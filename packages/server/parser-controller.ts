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

  async startParsing(tableName: string) {
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
        sourceStage: "raw",
        targetStage: "parsed",
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
}
