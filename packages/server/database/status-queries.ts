import { sql } from "./sql-tag";

const INTERNAL_STATUS_TABLES = ["_bun_migrations", "_migration_info"] as const;

function escapeSqliteIdentifier(identifier: string): string {
  return identifier.replaceAll('"', '""');
}

export function getStatusTableNamesQuery(): string {
  const internalTableList = INTERNAL_STATUS_TABLES.map((tableName) => {
    const escaped = tableName.replaceAll("'", "''");
    return `'${escaped}'`;
  }).join(", ");

  return sql`SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name NOT LIKE 'sqlite_%'
        AND name NOT IN (${internalTableList})
      ORDER BY name`;
}

export function getStatusTableCountQuery(tableName: string): string {
  return sql`SELECT COUNT(*) as count FROM "${escapeSqliteIdentifier(tableName)}"`;
}

export function getStatusTableInfoQuery(tableName: string): string {
  return sql`PRAGMA table_info("${escapeSqliteIdentifier(tableName)}")`;
}
