import { sql } from "./queries";

export const STATUS_TABLES = [
  "Representative",
  "Term",
  "Session",
  "Agenda",
  "Section",
  "Voting",
  "Vote",
  "Speech",
  "SectionDocumentLink",
  "SessionNotice",
  "SaliDBDocumentReference",
  "ParliamentaryGroup",
  "ParliamentaryGroupMembership",
  "Committee",
  "CommitteeMembership",
  "GovernmentMembership",
  "TrustPosition",
  "District",
  "RepresentativeDistrict",
] as const;

export type StatusTableName = (typeof STATUS_TABLES)[number];

const statusTableNameSet = new Set<string>(STATUS_TABLES);

export function isStatusTableName(
  tableName: string,
): tableName is StatusTableName {
  return statusTableNameSet.has(tableName);
}

export function getStatusTableCountQuery(tableName: StatusTableName): string {
  return sql`SELECT COUNT(*) as count FROM "${tableName}"`;
}

export function getStatusTableInfoQuery(tableName: StatusTableName): string {
  return sql`PRAGMA table_info("${tableName}")`;
}
