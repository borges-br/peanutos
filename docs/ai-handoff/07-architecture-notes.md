# 07 — Architecture Notes

This document highlights critical structural features of the monorepo architecture.

## Monorepo Layout Rules
- **web** (`apps/web`): Accesses the backend strictly via JSON REST API. It **never** connects directly to PostgreSQL or processes business logic.
- **api** (`apps/api`): NestJS Fastify modular monolith holding domain packages.
- **worker** (`apps/worker`): Isolated background job executor listening to Redis queues.
- **db** (`packages/db`): Centralized Prisma database access layer, shared by `api` and `worker`.
- **ui** (`packages/ui`): Layout design systems. It has **no** dependencies on `db` or `api`.
- **types** (`packages/types`): Core TS definitions, completely isolated from `@prisma/client`.
- **validators** (`packages/validators`): Shared Zod validation schemas.

---

## Modular Monolith NestJS Strategy
The backend is built as a single, cohesive modular monolith. Domain boundaries are strictly separated by NestJS modules (e.g. `AuthModule`, `ClientsModule`, `InventoryModule`, `TicketsModule`). This provides high code maintainability while eliminating the network complexity of microservices.

---

## Playwright PDF Pipeline
Playwright Chromium handles complex documents. Because rendering consumes server resources, PDF tasks are queued as BullMQ jobs. The worker loads the mock A4 HTML from `@peanut/documents`, processes it, and uploads the immutable PDF to MinIO object storage.
