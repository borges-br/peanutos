# NEXT AGENT PROMPT - Peanut OS 🥜

## Context Overview
You are continuing the implementation of **Peanut OS** (formerly Borges OS), an operational platform for IT Service Providers designed with structural multi-tenancy (`workspaceId`) and white-label customizability.

**Phase 0 (Foundation and Continuity)** is 100% complete and verified build-ready! The monorepo workspaces, Turborepo pipeline, configuration bases, relational PostgreSQL Prisma schema, local Docker compose databases, and initial application skeletons are fully set up.

---

## 📈 Commands Executed & Diagnostic Report

### 1. Commands Executed Successfully:
- **Workspace Bootstrap**: `npx pnpm install` compiled and linked all 11 monorepo workspaces.
- **Prisma Schema Validation**: `$env:DATABASE_URL="postgresql://peanut_user:change-me-in-production@localhost:5432/peanut_db?schema=public"; npx prisma validate` validated the PostgreSQL schema successfully.
- **Turborepo Monorepo Build**: `$env:DATABASE_URL="postgresql://peanut_user:change-me-in-production@localhost:5432/peanut_db?schema=public"; npx pnpm run build` compiled all 10 packages cleanly.

### 2. Commands/Steps that Encountered Errors (And How They Were Resolved):
- *Error*: `pnpm` command not globally found in execution PowerShell environment.
  - *Resolution*: Used `npx pnpm` which delegates commands directly to the project's local pnpm version (v9.1.1).
- *Error*: `npx prisma validate` failed due to missing `DATABASE_URL` environment parameter.
  - *Resolution*: Fed the inline mock environment parameter `$env:DATABASE_URL="..."` to execute successfully.
- *Error*: Turborepo parsed with `Found an unknown key tasks` inside `turbo.json`.
  - *Resolution*: Renamed `tasks` configuration to `pipeline` inside `turbo.json` to keep strict Turborepo v1 compatibility.
- *Error*: TypeScript compiler error in `@peanut/utils` due to missing `Buffer` types.
  - *Resolution*: Added `@types/node` into `@peanut/utils` devDependencies and re-ran pnpm install.
- *Error*: Next.js static page generation timed out because `/page.tsx` was a Server Component but contained an `onClick` event handler.
  - *Resolution*: Prepended `"use client";` to `apps/web/src/app/page.tsx` turning it into a Client Component.

---

## 📂 Critical Files Created

### Core Workspace Configurations:
- [pnpm-workspace.yaml](file:///C:/Github/peanutos/pnpm-workspace.yaml) - Defines Monorepo bounds.
- [turbo.json](file:///C:/Github/peanutos/turbo.json) - Parallel compilation pipeline configurations.
- [tsconfig.base.json](file:///C:/Github/peanutos/tsconfig.base.json) - Strict TypeScript parameters.
- [.env.example](file:///C:/Github/peanutos/.env.example) - Documented local environment settings.

### Relational Schema & Seeds:
- [schema.prisma](file:///C:/Github/peanutos/packages/db/prisma/schema.prisma) - Relational definitions for 19 tables.
- [seed.ts](file:///C:/Github/peanutos/packages/db/prisma/seed.ts) - 100% fictive mock data seeding (Acme Tecnologia Ltda, strictly secure).

### Runtimes:
- [apps/web/src/app/page.tsx](file:///C:/Github/peanutos/apps/web/src/app/page.tsx) - Dark interactive HSL dashboard showing `@peanut/ui` imports.
- [apps/api/src/health/health.controller.ts](file:///C:/Github/peanutos/apps/api/src/health/health.controller.ts) - Custom white-label NestJS health parameters.
- [apps/worker/src/main.ts](file:///C:/Github/peanutos/apps/worker/src/main.ts) - BullMQ daemon setup.

---

## 🎯 Your Mission: Phase 1 — Authentication & Client Management

You are tasked with bringing functional operations to the platform by implementing Session-based Authentication, RBAC, and Client/Contact CRUD endpoints.

### Step 1: Initialize Database & Seed (Local Setup)
Ensure Docker desktop is active and run these commands to start databases and apply the schema:
1. Spin up local containers:
   ```bash
   docker-compose -f infra/docker/docker-compose.yml up -d
   ```
2. Apply initial migrations:
   ```bash
   pnpm --filter @peanut/db prisma migrate dev --name init
   ```
3. Seed the fictive dataset:
   ```bash
   pnpm db:seed
   ```

### Step 2: NestJS Session Authentication & RBAC Core
- Inside `apps/api`, create the `auth` module.
- Implement cookie-based Session/JWT token authentication.
- Establish Role-Based Access Control (RBAC) utilizing the enums: `OWNER`, `ADMIN`, `TECHNICIAN`, `FINANCIAL`, `READ_ONLY`.
- Implement a route-level `RolesGuard` protecting controllers.
- Ensure all business logs filter records matching the authenticated user's `workspaceId`.

### Step 3: Audit Log System
- Implement an Auditing interceptor/service that writes record modifications into the `AuditLog` table, logging IP addresses, User-Agents, active workspace, and actor user IDs.

### Step 4: Clients & Contacts CRUD
- Create `ClientsModule` inside `apps/api`.
- Expose REST endpoints matching standard CRUD operations (`GET /clients`, `POST /clients`, etc.) using Zod validation schemas from `@peanut/validators`.
- Expose contact management sub-routes (`GET /clients/:clientId/contacts`, `POST /clients/:clientId/contacts`).

### Step 5: Frontend Login & Dashboard
- In `apps/web`, build a sleek glassmorphic Login screen at `/login` validating fields with Zod.
- Configure client-side context hooks (`AuthProvider`) to manage active sessions.
- Build a responsive table dashboard at `/dashboard/clients` listing and registering customer accounts. Implement skeleton loader blocks, error handlers, and empty states.

---

## 🛡️ Rules of Engagement (Compliance)
1. **White-Label First**: Do not hardcode "Borges TI" or "Borges OS" in any user-facing code. Reference `process.env.NEXT_PUBLIC_BRAND_NAME` or custom brand layouts.
2. **Strictly Fictive Seeds**: Never enter real phone numbers, real CPF/CNPJ, or real passwords into database scripts.
3. **No improvising Cryptography**: Keep the cryptographic methods inside `@peanut/utils` as stubs for now. Real symmetric AES-256-GCM envelope encryption is slated for Phase 2.
4. **Preserve Continuity Logs**: At the end of your run, update all documents inside `docs/ai-handoff/` and write a new `NEXT_AGENT_PROMPT.md` for the next AI agent.
