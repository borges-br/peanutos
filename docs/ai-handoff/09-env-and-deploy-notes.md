# 09 - Env And Deploy Notes

## Required Local Services

- PostgreSQL for Prisma migration/application.
- Redis for BullMQ queues.
- MinIO remains part of local infra but Phase 4 does not add new object storage needs.

## Phase 4 Environment

- `DATABASE_URL` is required for Prisma migration and seed.
- `REDIS_HOST`, `REDIS_PORT`, and `REDIS_PASSWORD` are used by worker queues.
- `BILLING_SCHEDULE_CRON` is optional; default is `0 2 * * *`.

## Current Limitation

The code validates and builds without Docker running, but migration generation/application requires PostgreSQL. Do not deploy Phase 4 to a real database until the missing migration has been generated and reviewed.
