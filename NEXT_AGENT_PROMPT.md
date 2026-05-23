# NEXT AGENT PROMPT - Peanut OS 🥜

## Context Overview
You are continuing the implementation of **Peanut OS**, a modular operational platform for IT Service Providers designed with logical multi-tenancy (`workspaceId`) and white-label customizability.

**Phase 3 (Helpdesk, Ticketing & SLA Foundation)** is 100% complete, verified, and build-green! All packages compile cleanly, typechecks are green, and linters pass successfully across all workspaces.

---

## 📈 Commands Executed & Diagnostic Report

### 1. Commands Executed Successfully:
- **Monorepo Compilation**: `npx pnpm run build` compiled all workspaces cleanly in Turborepo (generating optimized static React pages and NestJS/Fastify monolithic backend assets).
- **TypeScript Core Typecheck**: `npx pnpm run typecheck` validated all modules as 100% type-safe.
- **ESLint stabilization**: linter checks pass 100% successfully across all packages (`npx pnpm run lint`).
- **Prisma Schema Validation**: `npx prisma validate` checked the Postgres schema as 100% syntactically correct.
- **Prisma Client Compilation**: generated local Prisma typings offline utilizing `prisma generate`, updating local packages cleanly.

### 2. Issues Encountered & Resolved:
- *Error*: Unused `setSubcategory` hook warning blocking Next.js strict compiler checks in `/dashboard/tickets/new/page.tsx`.
  - *Resolution*: Replaced state hook with a clean static constant since subcategory isn't utilized by the initial creation wizard layout.
- *Error*: Import depth mismatches on `apiRequest` client library in tickets new and board forms.
  - *Resolution*: Corrected relative import path offsets (e.g. `../../../../lib/api` vs `../../../lib/api`) to match folder depth structures.

### 3. Known Issues & Environment Workarounds (Pay attention!):
- *Service Block*: Windows powershell access restrictions prevent starting the local Docker Compose daemon dynamically.
  - *Mitigation*: Start Docker Desktop manually as a user process on the host, wait 2 minutes for WSL containers to mount, then execute database migrations and database seeding.

---

## 📂 Critical Files Created / Modified in Phase 3

### Database Schema & Validators:
- [schema.prisma](file:///C:/Github/peanutos/packages/db/prisma/schema.prisma) - Prisma schema expanded for `SlaPolicy`, `TicketComment` workspace constraints, `TicketHistory`, and `TicketTimeEntry`.
- [index.ts](file:///C:/Github/peanutos/packages/types/src/index.ts) - Updated type specifications for helpdesk and SLA policies.
- [index.ts](file:///C:/Github/peanutos/packages/validators/src/index.ts) - Comprehensive Zod schemas for tickets, status transitions, reassigns, time logs, and SLA configurations.

### NestJS Backend Modules:
- [ticket-state-machine.ts](file:///C:/Github/peanutos/apps/api/src/tickets/ticket-state-machine.ts) - Central state transition lifecycle engine.
- [sla.service.ts](file:///C:/Github/peanutos/apps/api/src/tickets/sla.service.ts) - Isolated SLA policy calculator using calendar minutes.
- [tickets.service.ts](file:///C:/Github/peanutos/apps/api/src/tickets/tickets.service.ts) - Scoped operations, validations, comment terms blockers, and time entries duration checks.
- [tickets.controller.ts](file:///C:/Github/peanutos/apps/api/src/tickets/tickets.controller.ts) - Exposing endpoints under `/tickets` and scoped client routes `/clients/:clientId/tickets`.
- [users.controller.ts](file:///C:/Github/peanutos/apps/api/src/users/users.controller.ts) - Opened read access on user lists to Technicians to enable UI assignments.
- [seed.ts](file:///C:/Github/peanutos/packages/db/prisma/seed.ts) - Updated db seed to populate standard SLA Policies, and specific mock tickets (`TCK-000001` / `TCK-000002` / `TCK-000003`).

### Next.js Dashboard Shells:
- [layout.tsx](file:///C:/Github/peanutos/apps/web/src/app/dashboard/layout.tsx) - Integrated "Chamados" navigation item to sidebar menu and headers.
- [page.tsx](file:///C:/Github/peanutos/apps/web/src/app/dashboard/tickets/page.tsx) - Interactive Tickets Board with countdown SLA badges.
- [page.tsx](file:///C:/Github/peanutos/apps/web/src/app/dashboard/tickets/new/page.tsx) - Dynamic cascading wizard for new support registrations.
- [page.tsx](file:///C:/Github/peanutos/apps/web/src/app/dashboard/tickets/%5BticketId%5D/page.tsx) - Split layout displaying chat timeline, confidential padlock notes, working log grids, re-assign buttons, and transitions.
- [page.tsx](file:///C:/Github/peanutos/apps/web/src/app/dashboard/clients/%5Bid%5D/tickets/page.tsx) - Client specific tickets dashboard tab.
- [page.tsx](file:///C:/Github/peanutos/apps/web/src/app/dashboard/clients/%5Bid%5D/page.tsx) - Activated clickable client detail action cards.

---

## 🎯 Your Mission: Phase 4 — Advanced Contracts & Recurring Billing Foundation

Your objective is to deliver the contractual and recurring financial layer of the platform, enabling service providers to register service contracts, manage user/asset quotas, set recurring monthly fees, specify billing days, and render a financial MRR summary dashboard.

### Step 1: Database Setup
- If Docker PostgreSQL is running, apply the generated dev migrations. If it remains offline, proceed with schema verification and type safety using `prisma generate` to compile types.

### Step 2: Contract Tracking & Quota Enforcer (NestJS)
- Implement `ContractsModule` exposing paginated workspace-isolated `/contracts` routes.
- Enforce active contract quotas:
  - Add validator hooks inside Asset addition and ClientUser creation services.
  - If a technician attempts to create an Asset or User that exceeds the active client contract's `maxAssets` or `maxUsers` limits, block the write and throw a `BadRequestException` ("Quota limite de ativos/usuários do contrato atingida. Por favor, faça um upgrade no contrato do cliente.").

### Step 3: Financial MRR Calculation Service
- Build `financials.service.ts` to compute:
  - Total Monthly Recurring Revenue (MRR) based on active contracts.
  - Metrics detailing active contract counts, billing day progress bars, and next billing timelines.
  - Restrict access strictly to `OWNER`, `ADMIN`, and `FINANCIAL` roles in controllers.

### Step 4: Background Billing Schedulers (BullMQ)
- Expand the background worker daemon in `apps/worker` to monitor active contracts whose `billingDay` is today or approaching, and automatically log billing draft events.

### Step 5: Next.js Contract & Financial Dashboards
- Integrate `/dashboard/contracts` and `/dashboard/financials` inlayout sidebars.
- Display quota utilization progress bars (used/allowed assets) on client profiles.
- Display MRR stat cards, invoices lists, and contract creation/editing forms.

---

## 🛡️ Rules of Engagement
1. **Never hardcode secrets**: keep local cryptography customized in `.env`.
2. **Strictly fictive seeds**: ensure database seed remains populated with dummy data (Maria & João Example / Acme Tech / TCK-000001).
3. **Preserve continuity logs**: at the end of your run, update AI handoff logs inside `docs/ai-handoff/` and write a new `NEXT_AGENT_PROMPT.md` preparing Phase 5.
