import path from "node:path";

const resolvePath = (envValue: string): string => {
  if (path.isAbsolute(envValue)) return envValue;
  return path.join(import.meta.dirname, envValue);
};

export const getDatabasePath = () => {
  if (process.env.DB_PATH) return resolvePath(process.env.DB_PATH);
  return path.join(import.meta.dirname, "../../../avoimempi-eduskunta.db");
};

export const getChangesReportPath = () => {
  if (process.env.CHANGES_REPORT_PATH) return resolvePath(process.env.CHANGES_REPORT_PATH);
  return path.join(import.meta.dirname, "../../../data/metadata/changes-report.json");
};

export const getTraceDatabasePath = () => {
  if (process.env.TRACE_DB_PATH) return resolvePath(process.env.TRACE_DB_PATH);
  return path.join(
    import.meta.dirname,
    "../../../avoimempi-eduskunta-trace.db",
  );
};
