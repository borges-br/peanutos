# 10 - Testing Notes

## Commands Run

- `npx pnpm install`: passed.
- `npx pnpm --filter @peanut/db exec prisma validate`: passed.
- `packages/db/node_modules/.bin/prisma.cmd generate --schema packages/db/prisma/schema.prisma`: passed.
- `node_modules/.bin/tsc.cmd -p apps/api/tsconfig.json --noEmit --pretty false`: passed.
- `node_modules/.bin/tsc.cmd -p apps/worker/tsconfig.json --noEmit --pretty false`: passed.
- `node_modules/.bin/tsc.cmd -p apps/web/tsconfig.json --noEmit --pretty false`: passed after removing stale generated `.next/types/app/dashboard/contracts/ [contractId]`.
- `node_modules/.bin/tsc.cmd -p packages/types/tsconfig.json --noEmit --pretty false`: passed.
- `node_modules/.bin/tsc.cmd -p packages/validators/tsconfig.json --noEmit --pretty false`: passed.
- `npx pnpm run typecheck`: passed.
- `npx pnpm run build`: passed.
- `npx pnpm run lint`: passed with warnings only.

## Migration Commands

- `npx pnpm --filter @peanut/db exec prisma migrate dev --create-only --name phase_4_contracts_billing`: failed.
- `packages/db/node_modules/.bin/prisma.cmd migrate dev --create-only --name phase_4_contracts_billing --schema packages/db/prisma/schema.prisma`: failed.

## Remaining Test Gaps

- No automated tests for contracts, quota enforcement, financials, or billing worker yet.
- No database-backed migration smoke test because PostgreSQL migration generation failed locally.
