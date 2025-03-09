// modules/server/server.ts
import homepage from "./app/index.html";
import type { BunRequest } from "bun";

import { DatabaseConnection } from "./db.ts";
const db = new DatabaseConnection();

const fetchComposition = async (params: { date: string; search?: string }) => {
  const dateObj = new Date(params.date);
  if (isNaN(dateObj.getTime())) throw new Error("Invalid date");
  let query = db.sql`SELECT * FROM GetParliamentComposition(${dateObj.toISOString()})`;

  if (params.search) {
    query = db.sql`${query} WHERE sort_name ILIKE ${`%${params.search}%`}`;
  }

  const response: DatabaseFunctions.GetParliamentComposition[] = await query;
  return response;
};

const fetchRepresentatives = async (page: number, limit: number) => {
  const offset = (page - 1) * limit;
  const response: DatabaseTables.Representative[] =
    await db.sql`SELECT * FROM Representative LIMIT ${limit} OFFSET ${offset}`;
  return response;
};

const server = Bun.serve({
  routes: {
    "/": homepage,

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
      POST: async (req: BunRequest<"/composition">) => {
        const formData = await req.formData();
        const composition = await fetchComposition({
          date: formData.get("date") as string,
          search: formData.get("search") as string,
        });
        const tableRows = composition
          .map((row) => {
            return `<tr>${Object.values(row)
              .map((value) => `<td>${value}</td>`)
              .join("")}</tr>`;
          })
          .join("");
        const tableHeaders = Object.keys(composition[0] ?? {})
          .map((key) => `<th>${key}</th>`)
          .join("");
        const htmlContent = `
          <div id="composition-count">Number of rows: ${composition.length}</div>
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

    "/representatives": {
      GET: async (req: BunRequest<"/representatives">) => {
        const sp = new URL(req.url).searchParams;
        const page = +(sp.get("page") ?? "1");
        const limit = +(sp.get("limit") ?? "100");
        const representatives = await fetchRepresentatives(page, limit);

        // Check if there are more pages to load
        const nextPageRepresentatives = await fetchRepresentatives(
          page + 1,
          limit
        );

        const tableRows = representatives
          .map((row) => {
            return `<tr>${Object.values(row)
              .map((value) => `<td>${value}</td>`)
              .join("")}</tr>`;
          })
          .join("");

        const loadMoreButton =
          nextPageRepresentatives.length > 0
            ? `<div id="load-more" hx-get="/representatives?page=${
                page + 1
              }&limit=${limit}" hx-trigger="revealed" hx-target="#representatives-table-content" hx-swap="beforeend"></div>`
            : "";

        const tableHeaders = Object.keys(representatives[0])
          .map((key) => `<th>${key}</th>`)
          .join("");

        const htmlContent =
          page === 1
            ? `
          <table border="1">
            <thead>
              <tr>${tableHeaders}</tr>
            </thead>
            <tbody id="representatives-table-content">
              ${tableRows}
              ${loadMoreButton}
            </tbody>
          </table>
        `
            : `
          ${tableRows}
          ${loadMoreButton}
        `;
        return new Response(htmlContent, {
          headers: {
            "Content-Type": "text/html",
          },
        });
      },
    },

    "/api/*": Response.json({ message: "Not found" }, { status: 404 }),
  },

  development: true,

  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },

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
