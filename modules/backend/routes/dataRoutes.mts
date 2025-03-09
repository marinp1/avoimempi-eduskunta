import type { FastifyPluginCallback } from "fastify";
import { getCompositionHandler } from "../controllers/dataController.mts";

export const dataRoutes: FastifyPluginCallback = (fastify, opts, done) => {
  fastify.get<{ Params: { date: string } }>(
    "/composition/:date",
    getCompositionHandler
  );
  done();
};
