import path from "path";

export const getDatabasePath = () => {
  return path.join(import.meta.dirname, "../../avoimempi-eduskunta.db");
};

export const getRawDatabasePath = () => {
  return path.join(import.meta.dirname, "../../eduskunta-raw-data.db");
};

export const getParsedDatabasePath = () => {
  return path.join(import.meta.dirname, "../../eduskunta-parsed-data.db");
};
