# 02 — Decisions Log

This document tracks all high-level technical decisions made during the design and bootstrap of **Peanut OS**.

---

## 2026-05-23 — Monorepo Architecture with PNPM Workspaces & Turborepo

- **Decision**: Adopt a strict Monorepo structure using `pnpm workspaces` and orchestrate builds/linting with `Turborepo`.
- **Reason**: The product contains multiple runtimes (`apps/web`, `apps/api`, `apps/worker`) that share domain models, schemas, and validators. A monorepo prevents double-declaring types or copy-pasting schemas, while PNPM provides fast caching and efficient disk usage. Turborepo handles parallel execution.
- **Alternatives considered**: Separate repositories (git submodules). Discarded due to heavy coordination friction.
- **Future Impact**: Ensures easy packaging, clean dependency boundaries, and high local developer velocity.

---

## 2026-05-23 — White-Label Configuration First

- **Decision**: Codebases must avoid hardcoded brand labels like "Borges OS" and reference environmental settings, defaulting to "Peanut OS".
- **Reason**: The tool will serve as an internal platform initially but is engineered as a commercial asset suitable for open-source or SaaS reselling.
- **Alternatives considered**: Keeping it branded as Borges OS and refactoring later. Rejected due to high technical debt.
- **Future Impact**: Easy customization via `.env` variables or custom branding assets without altering logic files.

---

## 2026-05-23 — Fastify Adapter for NestJS API

- **Decision**: Configure the NestJS modular monolith to use the Fastify adapter rather than Express.
- **Reason**: Fastify offers up to 2-3x higher performance and throughput for JSON-based payloads, which is critical for handling large technical inventory objects, telemetry, and fast session authentications.
- **Alternatives considered**: Express (the NestJS default). Express has higher ecosystem density, but Fastify is native enough in NestJS.
- **Future Impact**: High performance ceiling.

---

## 2026-05-23 — Structural workspaceId (Future Tenant Isolation)

- **Decision**: Include `workspaceId` as a structural relation in the initial database schemas and relational entities, but defer billing or tenancy routers for later phases.
- **Reason**: Refactoring a single-tenant database schema to support multi-tenancy at a later stage is a notoriously painful process. By introducing `workspaceId` (UUID) into `Client`, `User`, `Asset`, and `Ticket` today, the schema is naturally prepared for tenant-isolation without implementing complex SaaS logic during the MVP.
- **Alternatives considered**: Pure single-tenant schema (implied refactoring in Phase 8). Discarded due to long-term risk.
- **Future Impact**: Natural transition to B2B multi-tenant cloud deployments.

---

## 2026-05-23 — Playwright Worker for PDF Compilation

- **Decision**: PDF Generation is executed asynchronously inside an isolated `worker` queue consumer using Playwright headless Chromium, rather than synchronously in the HTTP API thread.
- **Reason**: PDF rendering is a CPU-intensive task that could choke NestJS request-response cycles. Offloading to BullMQ + Redis protects API uptime, and Playwright allows generating highly sophisticated styling using React/Tailwind/HTML templates.
- **Alternatives considered**: Generating PDFs on-the-fly in API controllers. Rejected due to thread blocking risk.
- **Future Impact**: Stable API performance, immune to rendering load spikes.
