# 00 - Current State

Last updated: May 23, 2026.

## Current Milestone

Phase 4: Contracts & Recurring Billing Foundation is complete in code and verified by build/type/lint checks.

## Implemented Through Phase 4

- Phase 0 foundation: pnpm monorepo, Turborepo, Next.js web app, NestJS/Fastify API, BullMQ worker, Prisma/PostgreSQL package, Docker Compose dependencies.
- Phase 1 auth/RBAC/client management: JWT auth, guards, role decorators, internal users, clients, contacts, sanitized audit logs, login/dashboard/client UI.
- Phase 2 inventory: client users, assets, asset history, notes, AES-256-GCM sensitive data, audited reveal flow, inventory UI.
- Phase 3 helpdesk: tickets, comments, ticket history, time entries, SLA policies, SLA engine, state machine, ticket dashboards, SLA worker.
- Phase 4 contracts and recurring billing foundation:
  - Prisma enums/models for contracts, line items, contract history, and billing schedule events.
  - Contract CRUD, status lifecycle, client-scoped routes, line item CRUD, contract history route.
  - Client quota details endpoint.
  - Quota hard-blocks for active ClientUser and counted Asset creation/reactivation.
  - Contract-aware SLA policy selection for tickets.
  - Financial MRR and billing schedule endpoints.
  - BullMQ billing-schedule queue/worker foundation with monthly duplicate protection by `periodKey`.
  - Dashboard routes for contracts, new contract, contract detail, client contracts, and financials.

## Verification State

- `npx pnpm install`: passed.
- `npx pnpm --filter @peanut/db exec prisma validate`: passed.
- Local `prisma generate`: passed.
- Direct `tsc --noEmit`: passed for API, worker, web, types, validators.
- `npx pnpm run typecheck`: passed.
- `npx pnpm run build`: passed.
- `npx pnpm run lint`: passed with warnings only.

## Known Environment Limitation

No Phase 4 migration file was created. Prisma migrate `--create-only` failed with `Schema engine error` against `localhost:5432`. Treat the database migration as pending until PostgreSQL is available and migration generation/application is repeated.
