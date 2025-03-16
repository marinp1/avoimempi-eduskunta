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
            .map(
              (value) =>
                `'${String(value === 0 ? "0" : value || "").replaceAll(
                  "'",
                  "''"
                )}'`
            )
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

export const parseDate = (date: string) => {
  return date.substring(0, 10);
};

export const parseDateTime = (date: string) => {
  return date.substring(0, 10) + "T" + date.substring(11);
};

export const parseYear = (year: string): number | null => {
  const parsed = parseInt(year);
  if (Number.isNaN(parsed)) return null;
  return parsed;
};
