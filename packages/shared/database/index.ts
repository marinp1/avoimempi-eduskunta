import path from "node:path";

const resolvePath = (envValue: string): string => {
  if (path.isAbsolute(envValue)) return envValue;
  return path.join(import.meta.dirname, envValue);
};

const resolveEnvPath = (envVar: string, defaultRelPath: string): string => {
  if (process.env[envVar]) return resolvePath(process.env[envVar]);
  return path.join(import.meta.dirname, defaultRelPath);
};

export const getDatabasePath = () => {
  return resolveEnvPath("DB_PATH", "../../../avoimempi-eduskunta.db");
};

export const getChangesReportPath = () => {
  if (process.env.CHANGES_REPORT_PATH)
    return resolvePath(process.env.CHANGES_REPORT_PATH);
  const storageDir = process.env.ROW_STORE_DIR ?? process.env.STORAGE_LOCAL_DIR;
  if (storageDir)
    return path.join(path.resolve(storageDir), "metadata/changes-report.json");
  return resolveEnvPath(
    "CHANGES_REPORT_PATH",
    "../../../data/metadata/changes-report.json",
  );
};

export const getChangesArchiveDir = () => {
  const storageDir = process.env.ROW_STORE_DIR ?? process.env.STORAGE_LOCAL_DIR;
  if (storageDir)
    return path.join(path.resolve(storageDir), "metadata/changes");
  return path.join(import.meta.dirname, "../../../data/metadata/changes");
};

export const getTraceDatabasePath = () =>
  resolveEnvPath("TRACE_DB_PATH", "../../../avoimempi-eduskunta-trace.db");

export const getQualityDatabasePath = () =>
  resolveEnvPath("QUALITY_DB_PATH", "../../../avoimempi-eduskunta-quality.db");

export const getDocumentsDatabasePath = () =>
  resolveEnvPath(
    "DOCUMENTS_DB_PATH",
    "../../../avoimempi-eduskunta-documents.db",
  );

export const getLastScraperRunAtPath = () => {
  const reportPath = getChangesReportPath();
  return path.join(path.dirname(reportPath), "last-scraper-run-at");
};

export const getLastMigratorRunAtPath = () => {
  const reportPath = getChangesReportPath();
  return path.join(path.dirname(reportPath), "last-migrator-run-at");
};
