# 03 — Implemented Features

This document maps all the features that are functionally complete and verified in the repository.

> [!NOTE]
> Do not add items to this list if they are only planned or stubbed.

## Phase 1: Authentication, RBAC & Client Management (May 23, 2026)
- **Cookie-less JWT Session Core**: Secure login at `POST /auth/login` signing tokens containing tenant payloads. Validates requester active status and logs failed/successful events.
- **Robust Security Audits**: Global `AuditService` with a recursive sanitization filter stripping passwords, password hashes, secrets, JWT tokens, and Authorization headers, preventing leaks.
- **Unified Roles and RBAC Guards**: Configured custom `@Roles()` endpoint decorators and `RolesGuard` protecting endpoints based on the `READ_ONLY`, `FINANCIAL`, `TECHNICIAN`, `ADMIN`, and `OWNER` roles.
- **Tenant Workspace Isolation**: Scoped all User, Client, and Contact query filters strictly to the logged-in user's `workspaceId`.
- **Workspace Users CRUD**: CRUD REST endpoints (`/users`) allowing list, detailed, and status adjustments. Enforces a safety guard preventing the deactivation of the last `OWNER` of a workspace.
- **Workspace Customers CRUD**: REST endpoints (`/clients`) utilizing Zod validators from `@peanut/validators`, supporting multi-field searches (tradeName, legalName, document, email), pagination, and status filters.
- **Client Contacts CRUD**: Sub-resource CRUD endpoints (`/clients/:clientId/contacts`) that verify tenant associations, validate roles, and dynamically toggle other contacts to inactive primary states if `isPrimary` is updated to true.
- **Frontend Admin Portal Pages**:
  - `/login`: Dark glassmorphic login screen managing validation, loading indicators, and server errors.
  - `/dashboard`: Overview panel greeting active users and showing cards placeholders for subsequent system tabs.
  - `/dashboard/clients`: Searchable, filtered clients list utilizing beautiful table states and skeletons.
  - `/dashboard/clients/new`: Wizard client registration form.
  - `/dashboard/clients/[id]`: Multi-tab details layout housing inline CRUD managers for Contacts and Phase 2 placeholders.

## Monorepo Foundation & Workspace Routing (Phase 0)
- **pnpm workspaces**: Configured workspaces for packages and apps, separating concerns cleanly.
- **Turborepo Integration**: Task orchestration with configured pipeline caching rules.
- **TypeScript Core Settings**: Centralized strict configurations (`tsconfig.base.json`).
- **Core Environment Config**: Completeness of `.env.example` mapping all integration nodes.

## Shared Packages (Phase 0)
- **@peanut/db**: Relational schema mapping 19 database tables with indexes, enums, and foreign-key configurations. Strictly fictive local seeds prepared for migrations. Added tsc compiler script and Node types.
- **@peanut/types**: TS interfaces defining states, priorities, assets, and tickets.
- **@peanut/validators**: Zod validation schemas for Login input, Client input, Asset configurations, and Ticket creation. Added User and Contact validators.
- **@peanut/utils**: Brazilian document formatters, currency formatters, and symmetric cryptography stubs.
- **@peanut/documents**: HTML document skeletons for A4 print-ready PDF configurations.
- **@peanut/config**: Compartimentalized build parameters.

## Workspace Runtimes (Phase 0)
- **apps/web**: Next.js 14 server with global responsive styling sheet and custom visual dashboard homepage importing and displaying shared custom Button components.
- **apps/api**: Fastify server utilizing NestJS controllers, configured with global route prefixes and complete uptime health endpoints.
- **apps/worker**: BullMQ worker loop setup demonstrating concurrent job consumer patterns for queues.

## Infrastructure Setup (Phase 0)
- **Docker Orchestration**: Complete Compose configuration for PostgreSQL, Redis, and MinIO storage, preloaded with port allocations matching developer guidelines.
