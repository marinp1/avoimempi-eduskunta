import homepage from "./app/index.html";
import type { BunRequest } from "bun";

import { DatabaseConnection } from "./db.ts";
const db = new DatabaseConnection();

const fetchComposition = async (params: { date: string }) => {
  const dateObj = new Date(params.date);
  if (isNaN(dateObj.getTime())) throw new Error("Invalid date");
  const response: DatabaseFunctions.GetParliamentComposition[] =
    await db.sql`SELECT * FROM getparliamentcomposition(${dateObj.toISOString()})`;
  return response;
};

const server = Bun.serve({
  // `routes` requires Bun v1.2.3+
  routes: {
    "/": homepage,

    // Static routes
    "/api/status": new Response("OK"),

    "/api/composition/:date": {
      GET: async (req: BunRequest<"/api/composition/:date">) => {
        const composition = await fetchComposition(req.params);
        return new Response(JSON.stringify(composition), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },

    "/composition": {
      POST: async (
        // optional: you can explicitly pass a type to BunRequest:
        req: BunRequest<"/composition">
      ) => {
        const formData = await req.formData();
        const composition = await fetchComposition({
          date: formData.get("date") as string,
        });
        const tableRows = composition
          .map((row) => {
            return `<tr>${Object.values(row)
              .map((value) => `<td>${value}</td>`)
              .join("")}</tr>`;
          })
          .join("");
        const tableHeaders = Object.keys(composition[0])
          .map((key) => `<th>${key}</th>`)
          .join("");
        const htmlContent = `
          <table border="1">
            <thead>
              <tr>${tableHeaders}</tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        `;
        return new Response(htmlContent, {
          headers: {
            "Content-Type": "text/html",
          },
        });
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
