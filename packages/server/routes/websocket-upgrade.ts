type WebSocketType = "parser" | "scraper" | "migrator";

type DevelopmentWebSocketServer = {
  upgrade: (
    req: Request,
    options: { data: { type: WebSocketType } },
  ) => boolean;
};

const websocketPathToType: Record<string, WebSocketType> = {
  "/ws/scraper": "scraper",
  "/ws/parser": "parser",
  "/ws/migrator": "migrator",
};

export const handleDevelopmentWebSocketUpgrade = (
  req: Request,
  server: DevelopmentWebSocketServer,
): Response | undefined => {
  const type = websocketPathToType[new URL(req.url).pathname];
  if (!type) {
    return new Response("Not Found", { status: 404 });
  }

  if (server.upgrade(req, { data: { type } })) {
    return undefined;
  }

  return new Response("WebSocket upgrade failed", { status: 400 });
};
