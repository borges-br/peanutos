import "./load-env";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

async function bootstrap() {
  // 5 MB body limit to support base64 image uploads (2 MB image ≈ 2.67 MB base64 in JSON)
  const adapter = new FastifyAdapter({ bodyLimit: 5 * 1024 * 1024 });
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { rawBody: true },
  );

  // Set global API prefix
  app.setGlobalPrefix("api/v1");

  // Enable CORS
  app.enableCors({
    origin: true,
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
