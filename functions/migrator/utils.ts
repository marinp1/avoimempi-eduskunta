import type { Database } from "bun:sqlite";

export const insertRows = (db: Database) => (table: string, rows: any[]) => {
  if (rows.length) {
    const columns = Object.keys(rows[0]);
    const values = rows.map((row) => Object.values(row));
    const columnsString = columns.join(", ");
    const valuesString = values
      .map(
        (row) =>
          `(${row
            .map((value) => `'${String(value || "").replaceAll("'", "''")}'`)
            .join(", ")})`
      )
      .join(", ");
    if (process.env.DEBUG) {
      console.log(
        `INSERT OR IGNORE INTO ${table} (${columnsString}) VALUES ${valuesString}`
      );
    }
    db.run(
      `INSERT OR IGNORE INTO ${table} (${columnsString}) VALUES ${valuesString}`
    );
  }
};
