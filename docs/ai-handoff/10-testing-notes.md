# 10 — Testing Notes

This document provides verification procedures, diagnostic logs, and manual test strategies for **Phase 3: Helpdesk, Ticketing & SLA Foundation**.

---

## 1. Automated Build & Compilation checks

To verify that the monorepo builds, typechecks, and complies with standards, execute the following commands in the workspace root:

### 1.1 Complete Clean Build
Compiles all shared packages and applications (monolithic API, Next.js frontend, BullMQ background worker):
```bash
npx pnpm run build
```
*Result*: **100% Success**. Next.js production builds and NestJS compilations complete successfully.

### 1.2 TypeScript Static Typecheck
Validates typescript typings across all packages:
```bash
npx pnpm run typecheck
```
*Result*: **100% Success (Zero Errors)**.

### 1.3 Code Standards Linter
Runs ESLint across all monorepo modules:
```bash
npx pnpm run lint
```
*Result*: **100% Success**. All workspaces pass without syntax or formatting errors.

---

## 2. Prisma Database Scopes

To validate the PostgreSQL database schemas and typings:

### 2.1 Prisma Schema Check
```bash
npx prisma validate --schema=packages/db/prisma/schema.prisma
```
*Result*: **Schema is valid 🚀**

### 2.2 Prisma Client Generation
```bash
npx prisma generate --schema=packages/db/prisma/schema.prisma
```
*Result*: **Client Generated successfully**.

---

## 3. Ticketing State Machine Transitions

To test that the status transition validations are functioning correctly, try pushing status changes via `PATCH /tickets/:ticketId/status`:

### 3.1 Valid Transitions (Approved)
- `OPEN` -> `TRIAGE` (Ready for sorting)
- `OPEN` -> `IN_PROGRESS` (Started work)
- `IN_PROGRESS` -> `WAITING_CLIENT` (Pending feedback)
- `WAITING_CLIENT` -> `IN_PROGRESS` (Resume work)
- `IN_PROGRESS` -> `RESOLVED` (Mark solved)
- `RESOLVED` -> `CLOSED` (Immutable lock)

### 3.2 Blocked Transitions (Invalid)
- `CLOSED` -> `IN_PROGRESS` (Rejected)
- `CANCELLED` -> `IN_PROGRESS` (Rejected)
- `CLOSED` -> `RESOLVED` (Rejected)
- Reopening closed or cancelled tickets is strictly blocked in Phase 3.

---

## 4. Credentials Safeguard in Ticket Comments

To verify that the plaintext password checker blocks unauthorized credential logs:

### 4.1 Blocked Comment Test
- **Action**: Post a comment via `POST /tickets/:ticketId/comments` containing:
  - `"A senha de acesso do roteador é admin123"`
  - `"The password was set to Admin!"`
- **Result**: The API must reject the write with `400 Bad Request` and message: `"O comentário contém termos confidenciais (...) e foi bloqueado por segurança."`
- **Audit Logging**: Confirm that the blocked text is never logged to `audit_logs` or server history.

### 4.2 Valid Comment Test
- **Action**: Post a comment containing:
  - `"Entramos em contato com o suporte do AP para atualização de firmware."`
- **Result**: Comment is accepted, saved, and listed instantly on the detail card stream.

---

## 5. Time Tracking Verification

To verify that faturable time entry parameters are validated:

### 5.1 Invalid Duration Test
- **Action**: Post a time entry via `POST /tickets/:ticketId/time-entries` with `startedAt` as `"2026-05-23T12:00:00Z"` and `endedAt` as `"2026-05-23T11:00:00Z"`.
- **Result**: The API must reject the write with `400 Bad Request` and message: `"A data de término não pode ser anterior à data de início."`

### 5.2 Valid Duration Test
- **Action**: Post a time entry with `startedAt` as `"2026-05-23T10:00:00Z"` and `endedAt` as `"2026-05-23T11:30:00Z"`.
- **Result**: Entry is saved, duration is auto-calculated as exactly `90 minutes`, and faturable flag is stored.

---

## 6. Background SLA Monitor Sweeper

To verify that the background sweeper worker handles Redis connection losses gracefully:

### 6.1 Redis Connection Refusal Test
- **Action**: Stop the Redis server (or keep Docker daemon offline) and launch the background worker:
  ```bash
  npx pnpm --filter peanut-worker run build
  node apps/worker/dist/main.js
  ```
- **Result**: The process must print `[SLA Monitor Worker] Redis is offline (safe bypass)` warning messages instead of throwing uncaught exception crashes, allowing the helpdesk API monolith to remain fully functional.
