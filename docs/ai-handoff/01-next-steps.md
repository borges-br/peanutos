# 01 — Next Steps

This document outlines the priority checklist for the next AI agent to execute during **Phase 4: Contracts & Recurring Billing Foundation**.

The objective of Phase 4 is to build the contractual backbone of the platform, enabling service providers to register client contracts, manage user/asset limits, set recurring monthly fees, specify billing days, and render a financial MRR summary dashboard.

---

## Phase 4 Execution Checklist

### 1. Database Migrations (Prisma Schema)
- [ ] Inspect existing `Contract` and `Invoice` models in `schema.prisma`.
- [ ] Ensure correct relationships are established (Client -> Contract -> SLA Policy).
- [ ] Update models or enums if necessary to represent draft, active, suspended, or terminated contracts.
- [ ] Regenerate Prisma client offline using `prisma generate` if Docker PostgreSQL is still offline.

### 2. Contract Tracking Engine (NestJS Monolith)
- [ ] Create `ContractsModule` in `apps/api/src/contracts/`.
- [ ] Expose REST endpoints:
  - `GET /contracts` (Paginated list, filterable by status, client, and search).
  - `GET /clients/:clientId/contracts` (Client-specific contract details).
  - `POST /contracts` (Create contracts capturing startDate, endDate, monthlyValue, billingDay, quotas for maxUsers/maxAssets, and custom SLAs).
  - `PATCH /contracts/:contractId` (Edit details).
  - `PATCH /contracts/:contractId/status` (Activate, suspend, or terminate contracts).
- [ ] Enforce quota rules:
  - Implement service-level validation checking if adding a new Technical Asset or Client User exceeds the active contract's `maxAssets` or `maxUsers` limits.
  - Throw a `BadRequestException` if limits are exceeded, prompting contract upgrade.

### 3. Financial Recurring Engine (MRR)
- [ ] Create simple MRR calculation service in `apps/api/src/contracts/financials.service.ts`.
- [ ] Provide statistics endpoints:
  - `GET /financials/summary` returning total MRR (sum of all monthlyValues of active contracts), counts of active/suspended contracts, and next billing date aggregates.
  - Ensure strict tenant workspace isolation (`workspaceId`).
  - Restrict access strictly to `OWNER`, `ADMIN`, and `FINANCIAL` roles using `@Roles(...)` decorators.

### 4. Background Billing Scheduler (BullMQ)
- [ ] Inside `apps/worker/src/main.ts`, introduce `billing-scheduler.queue` and `billing-scheduler.worker`.
- [ ] The billing worker scans active contracts whose `billingDay` is today or approaching to log invoice draft generation requests.
- [ ] Standard try-catch connection error events to avoid breaking local runs if Redis is offline.

### 5. Next.js Financial & Contract Panels (Next.js `/dashboard`)
- [ ] Add `/dashboard/contracts` and `/dashboard/financials` routes to Layout Sidebar.
- [ ] Restrict financials sidebar visibility to OWNER, ADMIN, and FINANCIAL roles.
- [ ] Create Contracts Board (`/dashboard/contracts`):
  - Lists company contracts, current quotas progress bars (e.g. "Assets used: 4/10", "Users used: 2/5"), status badges, and active value.
  - Create contract editor/creation forms.
- [ ] Create Financial Overview Board (`/dashboard/financials`):
  - Display stunning MRR HSL-based cards, active monthly value streams, and upcoming billings lists.
