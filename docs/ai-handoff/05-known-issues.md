# 05 - Known Issues

- Phase 4 migration is not created. Prisma migrate `--create-only` failed with `Schema engine error` against `localhost:5432`.
- `npx pnpm --filter @peanut/db prisma validate` is not a valid script in this repo; use `npx pnpm --filter @peanut/db exec prisma validate`.
- Lint passes but reports existing React hook dependency warnings in several dashboard screens and two existing unused variable warnings in `apps/api/src/users/users.service.ts`.
- Quota validation uses count-then-write service checks and is not yet protected by database locks or serializable transactions.
- Active recurring contract overlap is service-enforced, not protected by a partial unique index.
- `SlaPolicy.businessHoursOnly` remains stored but not interpreted by the SLA deadline calculator.
- Seed data is fictitious, but the broader seed remains not fully idempotent.
