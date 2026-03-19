import { buildServer } from "./app.js";

const port = Number(process.env.PORT ?? 3001);

async function bootstrap() {
  const app = await buildServer();
  await app.listen({ port, host: "0.0.0.0" });
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
