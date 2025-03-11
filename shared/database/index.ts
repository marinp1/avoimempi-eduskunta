import path from "path";

export const getDatabasePath = () => {
  return path.join(import.meta.dirname, "../../avoimempi-eduskunta.db");
};
