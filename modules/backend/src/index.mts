import Fastify from "fastify";
import { dataRoutes } from "../routes/dataRoutes.mts";

const fastify = Fastify({ logger: true });

fastify.register(require("@fastify/swagger"), {
  routePrefix: "/docs",
  openapi: {
    info: {
      title: "Avoimempi Eduskunta API",
      description: "API for fetching data from the database",
      version: "1.0.0",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
  },
  exposeRoute: true,
});

fastify.register(dataRoutes);

const start = async () => {
  try {
    await fastify.listen({ port: 3000, host: "0.0.0.0" });
    console.log(`Server is running at http://localhost:3000`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
