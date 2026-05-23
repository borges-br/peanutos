# 03 - Implemented Features

## Phase 4 - Contracts & Recurring Billing Foundation

### Data Model

- Added `ContractStatus`, `ContractType`, `RenewalMode`, `ContractLineItemType`, and `BillingScheduleStatus`.
- Added/expanded `Contract`, `ContractLineItem`, `ContractHistory`, and `BillingScheduleEvent`.
- Added `workspaceId` on all Phase 4 tables.
- Added `periodKey` and unique `contractId + periodKey` duplicate guard for monthly billing schedule events.
- Added fictitious seed data for `CTR-ACME-2026-001`, line items, contract history, and one pending billing event.

### API

- `GET /api/v1/contracts`
- `GET /api/v1/contracts/:contractId`
- `POST /api/v1/contracts`
- `PATCH /api/v1/contracts/:contractId`
- `PATCH /api/v1/contracts/:contractId/status`
- `GET /api/v1/clients/:clientId/contracts`
- `POST /api/v1/clients/:clientId/contracts`
- `GET /api/v1/contracts/:contractId/history`
- `POST /api/v1/contracts/:contractId/line-items`
- `PATCH /api/v1/contracts/:contractId/line-items/:lineItemId`
- `DELETE /api/v1/contracts/:contractId/line-items/:lineItemId`
- `GET /api/v1/contracts-quota/client/:clientId`
- `GET /api/v1/financials/mrr`
- `GET /api/v1/financials/billing-schedule`
- `GET /api/v1/tickets/sla-policies`

### Enforcement & Audit

- Client user quota validation on create/reactivation.
- Asset quota validation on create/reactivation.
- Active primary contract overlap validation for recurring/hybrid contracts.
- Contract-aware SLA policy selection for tickets.
- Audit actions: `contract.created`, `contract.updated`, `contract.status_changed`, `contract.line_item_added`, `contract.line_item_updated`, `contract.line_item_deleted`, `contract.quota_limit_reached`, `billing.event_created`, `billing.event_skipped`, `financials.mrr_viewed`, and `financials.billing_schedule_viewed`.

### Worker

- Added `billing-schedule` BullMQ queue and worker.
- Worker scans active recurring/hybrid contracts and creates monthly `BillingScheduleEvent` records.
- Worker clamps billing days to the last day of shorter months.
- Worker skips duplicate events for the same `periodKey`.
- Worker handles Redis offline errors as safe bypass logs.

### Frontend

- Added sidebar entries for Contracts and Financials.
- Added `/dashboard/contracts` list with status/type/client filters, financial display, billing day, dates, and quota utilization.
- Added `/dashboard/contracts/new` creation form with quotas, SLA policy, monetary cents conversion, and line item drafts.
- Added `/dashboard/contracts/[contractId]` detail screen with summary, status actions, line items, billing events, quotas, and history.
- Added `/dashboard/clients/[id]/contracts`.
- Added `/dashboard/financials` with MRR, active contracts, average contract value, upcoming billing events, and contracts by status.
