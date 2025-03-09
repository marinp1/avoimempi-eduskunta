import { DatabaseConnection } from "../utils/db.mts";

const { sql } = DatabaseConnection.instance;

export const getCompositionForDate = async (date: string) => {
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) throw new Error("Invalid date");
  const res: DatabaseFunctions.GetParliamentComposition[] =
    await sql`SELECT * FROM getparliamentcomposition(${dateObj.toISOString()})`;
  return res;
};
