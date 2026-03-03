import type { ServerWebSocket } from "bun";
import {
  getLastMigrationTimestamp,
  type MigratorMessage,
  runMigration,
} from "../datapipe/migrator/migrate";
import {
  clearMigrationLock,
  writeMigrationLock,
} from "./services/maintenance-lock";

export type { MigratorMessage };

export interface MigratorStatus {
  isRunning: boolean;
  currentTable: string | null;
  progress: number;
  totalTables: number;
}

/**
 * Server-side controller wrapping the datapipe migration function.
 *
 * Responsibilities:
 * - Singleton instance and WebSocket forwarding
 * - Running-state tracking (isRunning, currentTable, progress)
 * - Maintenance lock lifecycle (writeMigrationLock / clearMigrationLock)
 * - Stop-signal propagation via shouldStop flag
 *
 * All migration logic lives in packages/datapipe/migrator/migrate.ts.
 */
export class MigratorController {
  private static instance: MigratorController | null = null;
  private isRunning = false;
  private shouldStop = false;
  private currentTable: string | null = null;
  private progress = 0;
  private totalTables = 0;
  private ws: ServerWebSocket<unknown> | null = null;

  private constructor() {}

  static getInstance(): MigratorController {
    if (!MigratorController.instance) {
      MigratorController.instance = new MigratorController();
    }
    return MigratorController.instance;
  }

  setWebSocket(ws: ServerWebSocket<unknown>) {
    this.ws = ws;
  }

  getStatus(): MigratorStatus {
    return {
      isRunning: this.isRunning,
      currentTable: this.currentTable,
      progress: this.progress,
      totalTables: this.totalTables,
    };
  }

  private sendMessage(message: MigratorMessage) {
    const data = message.data ?? {};

    if (message.type === "status" && data.status === "started") {
      this.progress = 0;
      if (typeof data.totalTables === "number") {
        this.totalTables = data.totalTables;
      } else {
        this.totalTables = 0;
      }
    } else if (message.type === "progress") {
      if (typeof data.totalTables === "number") {
        this.totalTables = data.totalTables;
      }

      if (typeof data.percentComplete === "number") {
        this.progress = Math.max(0, Math.min(100, data.percentComplete));
      } else if (typeof data.overallPercentComplete === "number") {
        this.progress = Math.max(0, Math.min(100, data.overallPercentComplete));
      } else if (
        typeof data.tablesCompleted === "number" &&
        typeof data.totalTables === "number" &&
        data.totalTables > 0
      ) {
        this.progress = Math.max(
          0,
          Math.min(100, (data.tablesCompleted / data.totalTables) * 100),
        );
      }
    } else if (message.type === "complete") {
      this.progress = 100;
    }

    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(message));
    }
  }

  async startMigration() {
    if (this.isRunning) {
      throw new Error("Migration is already running");
    }

    this.isRunning = true;
    this.shouldStop = false;
    writeMigrationLock(new Date().toISOString());

    try {
      await runMigration({
        onMessage: (msg) => {
          if (msg.type === "progress") {
            this.currentTable = msg.data?.currentTable ?? this.currentTable;
          } else if (
            msg.type === "complete" ||
            msg.type === "error" ||
            msg.type === "stopped"
          ) {
            this.currentTable = null;
          }
          this.sendMessage(msg);
        },
        shouldStop: () => this.shouldStop,
      });
    } finally {
      this.isRunning = false;
      this.currentTable = null;
      this.shouldStop = false;
      clearMigrationLock();
    }
  }

  stopMigration() {
    if (!this.isRunning) {
      throw new Error("No migration is currently running");
    }

    this.shouldStop = true;
    this.sendMessage({
      type: "status",
      data: {
        status: "stopping",
        message: "Stopping migration...",
      },
    });
  }

  static getLastMigrationTimestamp(): string | null {
    return getLastMigrationTimestamp();
  }
}
