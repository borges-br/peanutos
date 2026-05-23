# 00 — Current State

This document outlines the real, verified technical state of **Peanut OS** as of the conclusion of **Phase 0 (Foundation and Continuity)** on **May 23, 2026**.

## What Exists in the Repository
- **Monorepo Structure**: Fully configured `pnpm workspaces` monorepo using Turborepo.
- **Root Setup**:
  - `pnpm-workspace.yaml` defining workspaces: `apps/*` and `packages/*`.
  - `turbo.json` with pipeline build orchestration supporting Turborepo v1/v2 syntax (`pipeline` configuration).
  - `package.json` mapping dependencies (`typescript`, `turbo`, `prettier`) and script shortcuts (`pnpm dev`, `pnpm build`, `pnpm db:generate`, etc.).
  - `tsconfig.base.json` defining strict TypeScript guidelines inherited by all projects.
  - `.gitignore` and `.env.example` templates.
- **Shared Packages (`packages/`)**:
  - `@peanut/db`: Full PostgreSQL relational data schemas mapped in Prisma (`prisma/schema.prisma`) with enums, indexes, and an automated TS-Node seed script with 100% fictive mock data.
  - `@peanut/ui`: Base React components with styling placeholders, importing successfully. Includes custom `Button` component.
  - `@peanut/types`: Common business models and status enums used by both apps.
  - `@peanut/validators`: Zod validator schemas for Login input, Client creation, Asset configurations, and Ticket creation.
  - `@peanut/documents`: Base HTML generator for rendering imutable A4 documents.
  - `@peanut/utils`: Base formatting utilities, Node type mappings, and Base64 encryption stubs.
  - `@peanut/config`: Extensible base configurations for ESM/CJS compiles.
- **Apps (`apps/`)**:
  - `apps/web`: Next.js 14 App Router shell with standard globals/layout, and a visually stunning dark landing page demonstrating active imports of `@peanut/ui` and client-side page rendering interactivity.
  - `apps/api`: NestJS Fastify adapter backend monolith with global route prefix (`api/v1`) and a custom Healthcheck controller.
  - `apps/worker`: BullMQ isolated worker daemon with stubs for `pdf-generation` and `webhook-dispatch` queue listeners.
- **Infrastructure (`infra/`)**:
  - `infra/docker/docker-compose.yml`: Services configured for PostgreSQL 16, Redis 7 (password-protected), and MinIO (S3 compatible) with healthcheck loops.
  - `infra/nginx/nginx.conf`: Local proxy router spec.

## What is Functional & Verified
- **Monorepo Dependency Imports**: Code imports across workspaces compile and resolve without errors.
- **Prisma Schema Validation**: Verified syntactically 100% valid using `npx prisma validate` on the active schema!
- **Workspace Build status**: Verified compilation output green using `turbo run build` across all 10 monorepo packages!
- **NextJS Static Generation**: Compiled successfully under strict React server component optimization rules.
- **Health Checks**: The NestJS api returns correct UP statuses and custom parameters.

## What is Pending Validation / Execution
- **Active Docker DB connection**: Commands will be validated in the local runtime environment to build pnpm locks and check schemas.

## Last Completed Milestone
- **Phase 0 — Monorepo Architecture Foundation & Continuity Protocol Establishments**.
