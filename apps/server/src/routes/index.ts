import type { FastifyInstance } from "fastify";
import { gameModules } from "@fairy/shared";

export async function registerRoutes(app: FastifyInstance) {
  app.get("/api", async () => {
    return {
      name: "Fairy Cultivation API",
      modules: gameModules
    };
  });

  app.get("/api/modules", async () => {
    return gameModules;
  });
}
