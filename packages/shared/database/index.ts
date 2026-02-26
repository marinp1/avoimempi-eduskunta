import path from "node:path";

export const getDatabasePath = () => {
  if (process.env.DB_PATH)
    return path.join(import.meta.dirname, process.env.DB_PATH);
  return path.join(import.meta.dirname, "../../../avoimempi-eduskunta.db");
};

export const getTraceDatabasePath = () => {
  if (process.env.TRACE_DB_PATH)
    return path.join(import.meta.dirname, process.env.TRACE_DB_PATH);
  return path.join(import.meta.dirname, "../../../avoimempi-eduskunta-trace.db");
};
