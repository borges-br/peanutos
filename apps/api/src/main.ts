import "./load-env";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

function parseCorsOrigin() {
  const rawOrigin =
    process.env.CORS_ORIGIN ||
    process.env.WEB_ORIGIN ||
    process.env.NEXT_PUBLIC_WEB_URL;

  if (!rawOrigin) return true;
  if (rawOrigin.trim() === "*") return true;

  const origins = rawOrigin
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length === 1 ? origins[0] : origins;
}

function parseBodyLimit() {
  const fallback = 25 * 1024 * 1024;
  const parsed = Number.parseInt(
    process.env.API_BODY_LIMIT_BYTES || String(fallback),
    10,
  );

  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function bootstrap() {
  // 5 MB body limit to support base64 image uploads (2 MB image ≈ 2.67 MB base64 in JSON)
  const adapter = new FastifyAdapter({ bodyLimit: parseBodyLimit() });
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { rawBody: true },
  );

  // Set global API prefix
  app.setGlobalPrefix("api/v1");

  // Enable CORS
  app.enableCors({
    origin: parseCorsOrigin(),
    credentials: true,
  });

  const port = process.env.PORT_API || 3001;
  await app.listen(port, "0.0.0.0");
  console.log(
    `🚀 Peanut OS Modular Monolith API is running on: http://localhost:${port}/api/v1`,
  );
}

bootstrap().catch((err) => {
  console.error("Error bootstrapping NestJS Fastify app", err);
});
