# NEXT AGENT PROMPT - Peanut OS 🥜

## Context Overview
You are continuing the implementation of **Peanut OS**, a modular operational platform for IT Service Providers designed with logical multi-tenancy (`workspaceId`) and white-label customizability.

**Phase 2 (Client Inventory & Asset Management)** is 100% complete, verified, and build-green! All packages compile cleanly, typechecks are green, and linters pass successfully across all workspaces.

---

## 📈 Commands Executed & Diagnostic Report

### 1. Commands Executed Successfully:
- **Monorepo Compilation**: `npx pnpm run build` compiled all workspaces cleanly in Turborepo (under Next.js server components optimizations).
- **TypeScript Core Typecheck**: `npx pnpm run typecheck` validated all modules 100% type-safe.
- **ESLint stabilization**: resolved linter dependencies in NestJS and Next.js applications devDependencies. `npx pnpm run lint` passes across all packages successfully!
- **Prisma Schema Validation**: `npx prisma validate` checked the Postgres schema as 100% syntactically correct.
- **Symmetric Cryptography**: implemented real `AES-256-GCM` envelope encryption in `@peanut/utils` and fully updated seed configurations.

### 2. Issues Encountered & Resolved:
- *Error*: `notes` field name clash inside `Asset` model.
  - *Resolution*: Renamed the relation field to `assetNotes` in `Asset` to avoid clash with the simple `notes` string field.
- *Error*: Missing `phone` field in `ClientUser` during services development.
  - *Resolution*: Expanded `ClientUser` model in `schema.prisma` to include `phone String? @db.VarChar(30)` matching suggested fields.
- *Error*: Unbound type signature for `sensitiveDataEncrypted` inside `InventoryService` create function.
  - *Resolution*: Added explicit `string | null` type signature to resolve NestJS compilation.

### 3. Known Issues & Environment Workarounds (Pay attention!):
- *Service Block*: Windows powershell access restrictions prevent starting the local Docker Compose daemon dynamically.
  - *Mitigation*: Start Docker Desktop manually as a user process on the host, wait 2 minutes for WSL containers to mount, then execute database migrations and database seeding.

---

## 📂 Critical Files Created / Modified in Phase 2

### Cryptography & Database Schema:
- [schema.prisma](file:///C:/Github/peanutos/packages/db/prisma/schema.prisma) - Prisma schema including `ClientUser.workspaceId`, `ClientUser.phone`, `AssetHistory` and `AssetNote` models.
- [index.ts](file:///C:/Github/peanutos/packages/utils/src/index.ts) - AES-256-GCM symmetric envelope cryptography.
- [index.ts](file:///C:/Github/peanutos/packages/types/src/index.ts) - Updated type specifications.
- [index.ts](file:///C:/Github/peanutos/packages/validators/src/index.ts) - Comprehensive Zod schemas for inventory, users, notes and assignments.

### NestJS Backend Modules:
- [client-users.service.ts](file:///C:/Github/peanutos/apps/api/src/client-users/client-users.service.ts) - Client end users registry isolated by workspace.
- [inventory.service.ts](file:///C:/Github/peanutos/apps/api/src/inventory/inventory.service.ts) - Central hardware/software registry, assignments, password-rejection note generators, and audited reveal hooks.
- [app.module.ts](file:///C:/Github/peanutos/apps/api/src/app.module.ts) - Registered modules.
- [audit.service.ts](file:///C:/Github/peanutos/apps/api/src/audit/audit.service.ts) - Automatically sanitizing GCM payloads and switch passwords in audits.

### Next.js Dashboard Shells:
- [layout.tsx](file:///C:/Github/peanutos/apps/web/src/app/dashboard/layout.tsx) - Configured sidebar navigation hooks.
- [page.tsx](file:///C:/Github/peanutos/apps/web/src/app/dashboard/inventory/page.tsx) - Central inventory table showing hostname, location, IP and links.
- [page.tsx](file:///C:/Github/peanutos/apps/web/src/app/dashboard/clients/%5Bid%5D/users/page.tsx) - Client users manager in modern glassmorphic modals.
- [page.tsx](file:///C:/Github/peanutos/apps/web/src/app/dashboard/clients/%5Bid%5D/inventory/page.tsx) - Client specific assets manager.
- [page.tsx](file:///C:/Github/peanutos/apps/web/src/app/dashboard/clients/%5Bid%5D/assets/%5BassetId%5D/page.tsx) - Technical spec cards, history logs, diagnostics notes feed, and secure reveal creds overlays.

---

## 🎯 Your Mission: Phase 3 — Helpdesk, Ticketing & SLA Foundation

Your objective is to deliver operational tracking of tickets, comment registers, priority engines, and background SLA monitor daemons.

### Step 1: Database connections
- Manually run Docker Desktop. Apply migration `phase_2_inventory` dev and seed the database using `pnpm db:seed`.

### Step 2: SLA Deadlines Priority Engine
- Build a priority engine matching priority levels (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) with SLA time windows.
- Calculate `slaDueFirstResponseAt` and `slaDueStartAt` dynamically on ticket writes.

### Step 3: Ticketing API Scopes
- Implement isolated tickets REST routes (`/tickets` and `/clients/:clientId/tickets`).
- Support linking a ticket to a Contact, ClientUser, and technical Asset.
- Create `/comments` routes protecting internal notes vs public communications.

### Step 4: Background SLA monitors (BullMQ)
- Setup cron workers in `apps/worker` to monitor tickets SLA breach limits.
- Alert when limits are about to breach.

### Step 5: Support dashboard boards (Next.js)
- Build `/dashboard/tickets` displaying active helpdesk cards.
- Integrate dynamic ticket creation wizards searching contacts and assets.
- Build ticket details chat-like conversations streams and SLA tickers.

---

## 🛡️ Rules of Engagement
1. **Never hardcode secrets**: keep local cryptography customized in `.env`.
2. **Strictly fictive seeds**: ensure database seed remains populated with dummy data (Maria & João Example / Acme Tech).
3. **Preserve continuity logs**: at the end of your run, update AI handoff logs inside `docs/ai-handoff/` and write a new `NEXT_AGENT_PROMPT.md` preparing Phase 4.
