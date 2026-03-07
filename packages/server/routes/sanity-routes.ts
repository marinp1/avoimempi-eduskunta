import type { ResolutionStore } from "../sanity/resolution-store";
import { json } from "./route-responses";

export const createSanityRoutes = (resolutionStore: ResolutionStore) => ({
  "/api/sanity/last-run": {
    GET: () => {
      return json(resolutionStore.getLastRun());
    },
  },
});
