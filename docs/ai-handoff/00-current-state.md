# 00 — Current State

This document outlines the real, verified technical state of **Peanut OS** as of the conclusion of **Phase 1 (Authentication, RBAC & Client Management)** on **May 23, 2026**.

## What Exists in the Repository

- **Monorepo Structure**: Fully configured `pnpm workspaces` monorepo using Turborepo.
- **Root Setup**:
  - `pnpm-workspace.yaml` defining workspaces: `apps/*` and `packages/*`.
  - `turbo.json` with pipeline build orchestration supporting Turborepo v1 syntax.
  - `package.json` mapping dependencies (`typescript`, `turbo`, `prettier`) and script shortcuts (`pnpm dev`, `pnpm build`, `pnpm db:generate`, etc.).
  - `tsconfig.base.json` defining strict TypeScript guidelines inherited by all projects.
  - `.env` and `.env.example` templates, containing secure JWT keys.
- **Shared Packages (`packages/`)**:
  - `@peanut/db`: Full PostgreSQL relational data schemas mapped in Prisma (`prisma/schema.prisma`). Compiled successfully to `dist` using `tsc`. Seeding script `seed.ts` has been upgraded to a stronger, secure development seed password: `ChangeMe123!`.
  - `@peanut/ui`: Base React components. Includes custom `Button` component.
  - `@peanut/types`: Common business models and status enums, including the unified `READ_ONLY` role.
  - `@peanut/validators`: Zod validator schemas for Login input, Client creation, Asset configurations, Ticket creation, and newly added User creation and ClientContact creation.
  - `@peanut/documents`: Base HTML generator for rendering imutable A4 documents.
  - `@peanut/utils`: Base formatting utilities and Base64 encryption stubs.
  - `@peanut/config`: Extensible base configurations for ESM/CJS compiles.
- **Apps (`apps/`)**:
  - `apps/web`: Next.js 14 App Router dashboard shell, housing:
    - `api.ts`: Fetch HTTP client with JWT header injectors.
    - `AuthContext.tsx`: Session state provider hooks.
    - `/login`: Premium dark glassmorphic interface with validations.
    - `/dashboard`: Layout sidebar and visao geral showing card summaries.
    - `/dashboard/clients`: Searchable lists, paging buttons, and detail hooks.
    - `/dashboard/clients/new`: Customer creation wizard.
    - `/dashboard/clients/[id]`: Detail tabs, status selectors, and inline Contact CRUD.
  - `apps/api`: NestJS Fastify adapter backend monolith with global route prefix (`api/v1`), housing:
    - `/auth`: Controller, Service, AuthGuard, and RolesGuard for JWT token logins and RBAC filters.
    - `/audit`: Global sanitization logger stripping passwords, password hashes, secrets, and auth tokens.
    - `/users`: Controller and Service scoped to tenant workspace, containing deactivation safeguards for the final active `OWNER`.
    - `/clients`: Controller and Service managing tenant-isolated customers and client contacts.
  - `apps/worker`: BullMQ isolated worker daemon.

## What is Functional & Verified
- **Monorepo Dependency Imports**: Code imports across workspaces compile and resolve without errors.
- **Prisma Schema Validation**: Verified syntactically 100% valid using `npx prisma validate` on the active schema!
- **Workspace Build status**: Verified compilation output 100% green using `turbo run build` across all 10 monorepo packages!
- **NextJS Static Generation**: Compiled successfully under strict React server component optimization rules.
- **TypeScript Core Verification**: Verified 100% successful via `turbo run typecheck`.

## What is Pending Validation / Execution
- **Active Docker DB connection**: Local Docker daemon service has startup restrictions in this environment, which is documented in the known issues list.

## Last Completed Milestone
- **Phase 1 — Authentication, RBAC & Client Management**.
