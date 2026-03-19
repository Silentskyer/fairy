import type { IncomingMessage, ServerResponse } from "node:http";
import { buildServer } from "../apps/server/src/app.js";

let appPromise: ReturnType<typeof buildServer> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = buildServer();
  }

  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  await app.ready();

  const injected = await app.inject({
    method: req.method ?? "GET",
    url: req.url ?? "/api",
    headers: req.headers as Record<string, string>,
    payload: req
  });

  for (const [key, value] of Object.entries(injected.headers)) {
    if (value !== undefined) {
      res.setHeader(key, value);
    }
  }

  res.statusCode = injected.statusCode;
  res.end(injected.body);
}
