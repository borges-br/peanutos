# NEXT AGENT PROMPT - Peanut OS

## Context Overview

You are continuing Peanut OS after Phase 4: Contracts & Recurring Billing Foundation.

The repository is `C:\Github\peanutos`. Preserve all existing changes. Do not run `git reset --hard`, `git checkout .`, `git restore .`, or `git clean -fd` unless the user explicitly asks.

## Verified State

- Phase 0 through Phase 3 remain implemented.
- Phase 4 code is implemented for contracts, line items, contract history, quota enforcement, contract-aware SLA selection, financial MRR, billing schedule events, a BullMQ billing scheduler foundation, and frontend contracts/financials screens.
- Prisma schema validates.
- Prisma client was regenerated locally.
- `npx pnpm install` passed.
- `npx pnpm run typecheck` passed.
- Direct `tsc --noEmit` checks passed for API, worker, web, types, and validators.
- `npx pnpm run build` passed.
- `npx pnpm run lint` passed with warnings only.

## Important Caveat

No Phase 4 migration file was created. Both:

- `npx pnpm --filter @peanut/db exec prisma migrate dev --create-only --name phase_4_contracts_billing`
- `packages/db/node_modules/.bin/prisma.cmd migrate dev --create-only --name phase_4_contracts_billing --schema packages/db/prisma/schema.prisma`

failed before writing a migration. The local schema engine returned `Schema engine error` against `localhost:5432`. Do not claim the database was migrated until a PostgreSQL instance is available and migration generation/application is repeated.

## Phase 5 Mission

Implement Phase 5: Quotes, Invoices & PDF Foundation.

Recommended scope:

- Quote models/endpoints/screens using existing client and contract data.
- Invoice draft models/endpoints/screens created from billing schedule events.
- PDF rendering foundation for quotes/invoices using the existing documents/worker direction.
- Keep real payment collection, PIX gateway, NFS-e, email, webhooks, signatures, and customer portal out of scope.

## Before Starting

Run:

```bash
git status
git diff --stat
git diff
```

Then confirm whether PostgreSQL is available. If it is available, generate/apply the missing Phase 4 migration before starting Phase 5.
