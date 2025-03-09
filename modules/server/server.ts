import homepage from "./app/index.html";
import type { BunRequest } from "bun";

import { DatabaseConnection } from "./db.ts";
const db = new DatabaseConnection();

const server = Bun.serve({
  // `routes` requires Bun v1.2.3+
  routes: {
    "/": homepage,

    // Static routes
    "/api/status": new Response("OK"),

    "/api/composition/:date": {
      GET: async (
        // optional: you can explicitly pass a type to BunRequest:
        req: BunRequest<"/api/composition/:date">
      ) => {
        const { date } = req.params;
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) throw new Error("Invalid date");
        const response =
          await db.sql`SELECT * FROM getparliamentcomposition(${dateObj.toISOString()})`;
        return Response.json(response);
      },
    },

    // Wildcard route for all routes that start with "/api/" and aren't otherwise matched
    "/api/*": Response.json({ message: "Not found" }, { status: 404 }),

    /*
    // Serve a file by buffering it in memory
    "/favicon.ico": new Response(await Bun.file("./favicon.ico").bytes(), {
      headers: {
        "Content-Type": "image/x-icon",
      },
    }),
    */
  },

  development: true,

  // (optional) fallback for unmatched routes:
  // Required if Bun's version < 1.2.3
  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },

  // Global error handler
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
  `Listening on ${server.url} ${server.development ? "(development)" : ""}`
);

export {};
