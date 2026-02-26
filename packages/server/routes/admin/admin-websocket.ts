import type { ServerWebSocket, WebSocketHandler } from "bun";
import { MigratorController } from "../../migrator-controller";
import { ParserController } from "../../parser-controller";
import { ScraperController } from "../../scraper-controller";

const scraperController = ScraperController.getInstance();
const parserController = ParserController.getInstance();
const migratorController = MigratorController.getInstance();

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
