# 08 - Database Notes

## Phase 4 Schema

Added:

- `ContractStatus`
- `ContractType`
- `RenewalMode`
- `ContractLineItemType`
- `BillingScheduleStatus`
- `Contract`
- `ContractLineItem`
- `ContractHistory`
- `BillingScheduleEvent`

Financial values are integer cents:

- `monthlyAmountCents`
- `unitPriceCents`
- `totalPriceCents`
- `amountCents`

`BillingScheduleEvent` has `periodKey` (`YYYY-MM`) and `@@unique([contractId, periodKey])`.

## Migration Status

No Phase 4 migration file exists yet.

Commands attempted:

```bash
npx pnpm --filter @peanut/db exec prisma migrate dev --create-only --name phase_4_contracts_billing
packages/db/node_modules/.bin/prisma.cmd migrate dev --create-only --name phase_4_contracts_billing --schema packages/db/prisma/schema.prisma
```

Result: failed with `Schema engine error` before writing a migration. PostgreSQL/Docker availability should be fixed before retrying.

## Validation

`npx pnpm --filter @peanut/db exec prisma validate` passed.

Prisma client generation passed locally.
