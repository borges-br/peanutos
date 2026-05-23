# 01 - Next Steps

## Immediate Follow-Up

1. Start PostgreSQL/Docker Desktop locally.
2. Re-run Phase 4 migration generation:
   `npx pnpm --filter @peanut/db exec prisma migrate dev --create-only --name phase_4_contracts_billing`
3. If the migration is created successfully, review SQL and then apply it with:
   `npx pnpm --filter @peanut/db exec prisma migrate dev`
4. Re-run `npx pnpm --filter @peanut/db exec prisma validate`, `npx pnpm run build`, and `npx pnpm run lint`.

## Recommended Next Product Phase

Phase 5: Quotes, Invoices & PDF Foundation.

Rationale:

- Contracts now define recurring commercial terms.
- Billing schedule events now exist as future invoice seeds.
- The natural next layer is quote/invoice drafting and PDF output.

## Phase 5 Suggested Scope

- Quote data model and API.
- Invoice draft data model and API.
- Convert `BillingScheduleEvent` into invoice drafts without payment collection.
- Quote and invoice dashboard screens.
- PDF rendering foundation through the existing documents/worker architecture.

## Keep Out Of Scope

Real payment gateway, PIX collection, NFS-e, email sending, webhooks, n8n flows, client portal, digital signature, and final A4 monthly reports.
