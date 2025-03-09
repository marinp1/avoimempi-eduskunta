import type { FastifyReply, FastifyRequest } from "fastify";
import { getCompositionForDate } from "../services/dataService.mts";

export const getCompositionHandler = async (
  request: FastifyRequest<{ Params: { date: string } }>,
  reply: FastifyReply
) => {
  const { date } = request.params;
  const data = await getCompositionForDate(date);
  reply.send(data);
};
