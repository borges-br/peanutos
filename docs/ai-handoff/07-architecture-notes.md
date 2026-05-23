# 07 - Architecture Notes

## Phase 4 Architecture

- Contracts live in `apps/api/src/contracts`.
- Financial read models live in `apps/api/src/financials`.
- Contract quota enforcement is injected into `client-users` and `inventory` services.
- Tickets call `SlaService.calculateSla(workspaceId, priority, openedAt, clientId)` so an active primary contract can override the priority SLA.
- Billing schedule generation lives in `apps/worker/src/main.ts` as the `billing-schedule` BullMQ queue/worker.
- Frontend contract/financial screens are under `apps/web/src/app/dashboard`.

## Workspace Isolation

All Phase 4 tables include `workspaceId`. Services query by `workspaceId` before returning or mutating contract, financial, quota, asset, and client-user data.

## RBAC

- OWNER, ADMIN, FINANCIAL: full contracts and financials.
- TECHNICIAN, READ_ONLY: limited contract reads; no financial endpoints.
- Quota hard-blocks apply to all roles.
