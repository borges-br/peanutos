# NEXT AGENT PROMPT - Peanut OS

Continue from Phase 4 completion in code.

## Must Read First

- `docs/ai-handoff/00-current-state.md`
- `docs/ai-handoff/05-known-issues.md`
- `docs/ai-handoff/08-database-notes.md`
- `docs/ai-handoff/10-testing-notes.md`

## First Commands

```bash
git status
git diff --stat
git diff
```

## Critical Database Task

Generate/apply the missing Phase 4 migration once PostgreSQL is available. Do not claim it exists until `packages/db/prisma/migrations` contains the migration.

## Next Phase

Phase 5: Quotes, Invoices & PDF Foundation.

Focus on invoice drafts from billing schedule events and PDF foundations. Keep real payments, PIX gateway, NFS-e, emails, webhooks, n8n, customer portal, and signatures out of scope.
