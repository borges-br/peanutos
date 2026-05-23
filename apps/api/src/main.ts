import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

async function bootstrap() {
  const adapter = new FastifyAdapter();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
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
