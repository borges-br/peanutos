# 03 — Implemented Features

This document maps all the features that are functionally complete and verified in the repository.

> [!NOTE]
> Do not add items to this list if they are only planned or stubbed.

## Monorepo Foundation & Workspace Routing
- **pnpm workspaces**: Configured workspaces for packages and apps, separating concerns cleanly.
- **Turborepo Integration**: Task orchestration with configured pipeline caching rules.
- **TypeScript Core Settings**: Centralized strict configurations (`tsconfig.base.json`).
- **Core Environment Config**: Completeness of `.env.example` mapping all integration nodes.

## Shared Packages
- **@peanut/db**: Relational schema mapping 19 database tables with indexes, enums, and foreign-key configurations. Strictly fictive local seeds prepared for migrations.
- **@peanut/types**: TS interfaces defining states, priorities, assets, and tickets.
- **@peanut/validators**: Zod validation schemas for Login input, Client input, Asset configurations, and Ticket creation.
- **@peanut/utils**: Brazilian document formatters, currency formatters, and symmetric cryptography stubs.
- **@peanut/documents**: HTML document skeletons for A4 print-ready PDF configurations.
- **@peanut/config**: Compartimentalized build parameters.

## Workspace Runtimes
- **apps/web**: Next.js 14 server with global responsive styling sheet and custom visual dashboard homepage importing and displaying shared custom Button components.
- **apps/api**: Fastify server utilizing NestJS controllers, configured with global route prefixes and complete uptime health endpoints.
- **apps/worker**: BullMQ worker loop setup demonstrating concurrent job consumer patterns for queues.

## Infrastructure Setup
- **Docker Orchestration**: Complete Compose configuration for PostgreSQL, Redis, and MinIO storage, preloaded with port allocations matching developer guidelines.
