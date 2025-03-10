// modules/server/server.ts
import homepage from "./app/index.html";
import type { BunRequest } from "bun";

import { DatabaseConnection } from "./db.ts";
const db = new DatabaseConnection();

const fetchComposition = async (params: { date: string; search?: string }) => {
  const dateObj = new Date(params.date);
  if (isNaN(dateObj.getTime())) throw new Error("Invalid date");
  const d1 = dateObj.toISOString();
  const query = `
    SELECT pc.*, pgm.group_name, pgm.group_name
    FROM getparliamentcomposition(${d1}) pc
    JOIN parliamentarygroupmembership pgm
    ON pc.person_id = pgm.person_id
    WHERE pgm.start_date <= ${d1} AND (pgm.end_date IS NULL OR pgm.end_date >= ${d1})`;
  const response: DatabaseFunctions.GetParliamentComposition[] =
    await db.sql`${query}`;
  return response;
};

const fetchRepresentatives = async (page: number, limit: number) => {
  const offset = (page - 1) * limit;
  const response: DatabaseTables.Representative[] =
    await db.sql`SELECT * FROM Representative LIMIT ${limit} OFFSET ${offset}`;
  return response;
};

const fetchGenderStatistics = async () => {
  const response: {
    date: string;
    total_rows: number;
    number_of_women: number;
    number_of_men: number;
  }[] = await db.sql.unsafe(`SELECT * FROM statistics_composition_gender`);
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

    "/api/statistics/by-gender": {
      GET: async (req: BunRequest<"/api/statistics/by-gender">) => {
        const statistics = await fetchGenderStatistics();
        return new Response(JSON.stringify(statistics), {
          headers: { "Content-Type": "application/json" },
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
