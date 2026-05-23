# 02 — Decisions Log

This document tracks all high-level technical decisions made during the design and bootstrap of **Peanut OS**.

---

## 2026-05-23 — English Routing Conventions for Frontend Runtimes

- **Decision**: Adopt a clean, consistent English routing layout inside Next.js App Router: `/login`, `/dashboard`, `/dashboard/clients`, `/dashboard/clients/new`, `/dashboard/clients/[id]`.
- **Reason**: Standardizing on English in routing parameters aligns directly with database schemas, model entities (`Client`, `ClientContact`), REST API paths, and validator models, reducing semantic translation debt for developers.
- **Alternatives considered**: Translating routes to Portuguese (`/clientes`). Rejected to prevent friction.
- **Future Impact**: Sleek, predictable route matching.

---

## 2026-05-23 — Bearer JWT Stateless Token MVP

- **Decision**: Use Bearer token authorization headers containing signed stateless JSON Web Tokens for authentication, stored in client-side localStorage.
- **Reason**: Simplifies initial integration across Next.js static layouts and NestJS monolith runtimes in local monorepo settings, without introducing complex cookie domain coordinations or CORS frictions.
- **Future Evolution**:slated for production exposition, this decision must be evolved to secure HttpOnly cookies to protect tokens from XSS vulnerabilities. This is registered as a planned evolution.

---

## 2026-05-23 — Global Sanitized Auditing Service

- **Decision**: Implement a global `@Global()` `AuditService` that recursively traverses logged request data and scrubs keys matching `password`, `passwordHash`, `token`, `authorization`, or `secret`, replacing values with `[REDACTED]`.
- **Reason**: Guarantees compliance with strict security parameters by preventing any sensitive passwords, cryptographic keys, or active JWT credentials from entering PostgreSQL logs.
- **Future Impact**: Secure, auditable trail.

---

## 2026-05-23 — Workspace Owner Deactivation Safeguard

- **Decision**: Enforce a strict validation check counting active `OWNER` roles in a tenant workspace before deactivating/changing any user status, rejecting the mutation if it targets the sole active `OWNER`.
- **Reason**: Prevents tenant lockouts where a workspace is left with zero administrators, which would require manual database interventions to repair.
- **Future Impact**: High tenant operations safety.

---

## 2026-05-23 — Database Types Compilations (`@peanut/db` build script)

- **Decision**: Add an explicit `"build": "tsc"` script to `packages/db/package.json` and install `@types/node` as a devDependency.
- **Reason**: Ensures that Turborepo task orchestration compiles Prisma schema bindings and TypeScript declarations into `./dist` cleanly before other apps or runtimes invoke the database package, preventing type reference crashes.

---

## 2026-05-23 — Monorepo Architecture with PNPM Workspaces & Turborepo (Phase 0)

- **Decision**: Adopt a strict Monorepo structure using `pnpm workspaces` and orchestrate builds/linting with `Turborepo`.
- **Reason**: The product contains multiple runtimes (`apps/web`, `apps/api`, `apps/worker`) that share domain models, schemas, and validators. A monorepo prevents double-declaring types or copy-pasting schemas.

---

## 2026-05-23 — White-Label Configuration First (Phase 0)

- **Decision**: Codebases must avoid hardcoded brand labels like "Borges OS" and reference environmental settings, defaulting to "Peanut OS".
- **Reason**: The tool will serve as an internal platform initially but is engineered as a commercial asset suitable for open-source or SaaS reselling.

---

## 2026-05-23 — Fastify Adapter for NestJS API (Phase 0)

- **Decision**: Configure the NestJS modular monolith to use the Fastify adapter rather than Express.
- **Reason**: Fastify offers up to 2-3x higher performance and throughput for JSON-based payloads, which is critical for handling large technical inventory objects.

---

## 2026-05-23 — Structural workspaceId (Future Tenant Isolation) (Phase 0)

- **Decision**: Include `workspaceId` as a structural relation in the initial database schemas and relational entities, but defer billing or tenancy routers for later phases.
- **Reason**: Refactoring a single-tenant database schema to support multi-tenancy at a later stage is notoriously painful. By introducing `workspaceId` today, the schema is naturally prepared for tenant-isolation without implementing complex SaaS logic during the MVP.

---

## 2026-05-23 — Playwright Worker for PDF Compilation (Phase 0)

- **Decision**: PDF Generation is executed asynchronously inside an isolated `worker` queue consumer using Playwright headless Chromium, rather than synchronously in the HTTP API thread.
- **Reason**: PDF rendering is CPU-intensive. Offloading to BullMQ + Redis protects API uptime, and Playwright allows generating highly sophisticated styling using React/Tailwind/HTML templates.
