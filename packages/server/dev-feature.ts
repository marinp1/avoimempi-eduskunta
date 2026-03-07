import type { Database } from "bun:sqlite";
import { createSanityDevRoutes } from "./routes/sanity-dev-routes";
import { getQualityDb } from "./sanity/quality-db";
import { ResolutionStore } from "./sanity/resolution-store";
import { createSanityWsHandler } from "./sanity/ws-handler";

export const createDevFeatures = (db: Database) => {
  const qualityDb = getQualityDb();
  const resolutionStore = new ResolutionStore(qualityDb);

  return {
    routes: {
      ...createSanityDevRoutes(db, resolutionStore),
    },
    websocket: createSanityWsHandler(db, resolutionStore),
  };
};
