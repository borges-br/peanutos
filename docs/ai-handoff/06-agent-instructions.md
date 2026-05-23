# 06 - Agent Instructions

## Start Every Continuation With

```bash
git status
git diff --stat
git diff
```

Do not discard user or previous-agent changes.

## Phase 4 Recovery Notes

- Do not claim a migration exists until one is generated under `packages/db/prisma/migrations`.
- If PostgreSQL is unavailable, keep schema/client validation separate from migration application.
- Use `npx pnpm --filter @peanut/db exec prisma validate` for Prisma validation.
- Keep all financial amounts in cents.
- Keep seeds fictitious only.

## Recommended Next Step

Resolve the missing migration first, then start Phase 5.
