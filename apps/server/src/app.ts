import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import { registerRoutes } from "./routes/index.js";

export async function buildServer() {
  const app = Fastify({
    logger: true
  });

  await app.register(cors, {
    origin: true
  });

  await app.register(jwt, {
    secret: process.env.JWT_SECRET ?? "replace-me"
  });

  app.get("/health", async () => {
    return { ok: true };
  });

  await registerRoutes(app);

  return app;
}
