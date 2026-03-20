import type { IncomingMessage, ServerResponse } from "node:http";
import { buildServer } from "../apps/server/src/app.js";

let appPromise: ReturnType<typeof buildServer> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = buildServer();
  }

  return appPromise;
}

async function readBody(req: IncomingMessage) {
  const method = req.method ?? "GET";

  if (!["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    return undefined;
  }

  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  if (!chunks.length) {
    return undefined;
  }

  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  await app.ready();
  const payload = await readBody(req);

  const injected = await app.inject({
    method: req.method ?? "GET",
    url: req.url ?? "/api",
    headers: Object.fromEntries(
      Object.entries(req.headers).map(([key, value]) => [key, Array.isArray(value) ? value.join(",") : value ?? ""])
    ),
    payload
  });

  for (const [key, value] of Object.entries(injected.headers)) {
    if (value !== undefined) {
      res.setHeader(key, value);
    }
  }

  res.statusCode = injected.statusCode;
  res.end(injected.body);
}
