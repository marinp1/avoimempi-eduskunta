import { Database } from "bun:sqlite";
import ageDivisionOverTime from "../database/queries/AGE_DIVISION_OVER_TIME.sql";
import partyDiscipline from "../database/queries/PARTY_DISCIPLINE.sql";
import partyParticipationByGovernment from "../database/queries/PARTY_PARTICIPATION_BY_GOVERNMENT.sql";
import partySummary from "../database/queries/PARTY_SUMMARY.sql";
import sessionSections from "../database/queries/SESSION_SECTIONS.sql";

type Target = {
  name: string;
  sql: string;
  params: Record<string, unknown>;
};

const targets: Target[] = [
  {
    name: "sessionSections",
    sql: sessionSections,
    params: { $sessionKey: "2021/129" },
  },
  { name: "partySummary", sql: partySummary, params: {} },
  { name: "partyDiscipline", sql: partyDiscipline, params: {} },
  {
    name: "partyParticipationByGovernment",
    sql: partyParticipationByGovernment,
    params: { $startDate: null, $endDateExclusive: null },
  },
  { name: "ageDivisionOverTime", sql: ageDivisionOverTime, params: {} },
];

const db = new Database(
  "/workspaces/avoimempi-eduskunta/avoimempi-eduskunta.db",
  {
    readonly: true,
  },
);
db.exec("PRAGMA temp_store = MEMORY;");

for (const target of targets) {
  try {
    const explainStmt = db.prepare(`EXPLAIN QUERY PLAN ${target.sql}`);
    const planRows = explainStmt.all(target.params as any) as Array<{
      detail: string;
    }>;
    explainStmt.finalize();

    const fullScans = planRows.filter(
      (row) =>
        /SCAN\s+/i.test(row.detail) &&
        !/USING\s+(COVERING\s+)?INDEX/i.test(row.detail),
    ).length;

    const stmt = db.prepare(target.sql);
    const t0 = performance.now();
    const rows = stmt.all(target.params as any) as unknown[];
    const t1 = performance.now();
    stmt.finalize();

    console.log(
      JSON.stringify({
        name: target.name,
        rows: rows.length,
        ms: Number((t1 - t0).toFixed(2)),
        fullScans,
      }),
    );
  } catch (error) {
    console.log(JSON.stringify({ name: target.name, error: String(error) }));
  }
}

db.close();
