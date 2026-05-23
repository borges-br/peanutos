# 10 — Testing Notes

This document logs all tests, static linting runs, and verification steps performed during development.

## Setup Validations
The following execution pipeline was executed for verification of workspace integrity:

### 1. Monorepo dependencies installation
Command executed:
```bash
npx pnpm install
```
- **Status**: Completed successfully (added 447 packages in 15.9s).

### 2. Prisma Schema validation check
Command executed:
```bash
$env:DATABASE_URL="postgresql://peanut_user:change-me-in-production@localhost:5432/peanut_db?schema=public"; npx prisma validate
```
- **Status**: Completed successfully.
- **Output**: "The schema at prisma\schema.prisma is valid 🚀"

### 3. Workspace build validation
Command executed:
```bash
$env:DATABASE_URL="postgresql://peanut_user:change-me-in-production@localhost:5432/peanut_db?schema=public"; npx pnpm run build
```
- **Status**: Completed successfully.
- **Output**: `Tasks: 8 successful, 8 total` (all packages and runtimes built in 8.476s).

---

## Resolved Issues

### 1. Turborepo Tasks Parser Error
- **Issue**: Turborepo v1 (installed in monorepo devDependencies) did not recognize the `tasks` configuration key in `turbo.json`.
- **Resolution**: Updated `turbo.json` config key from `tasks` to `pipeline` to maintain strict Turborepo v1 compatibility.

### 2. TypeScript Node types missing in @peanut/utils
- **Issue**: Util package compilation failed due to `Buffer` reference being unrecognized in `index.ts`.
- **Resolution**: Added `@types/node` to `@peanut/utils` `devDependencies`, resolved the imports successfully.

### 3. Next.js Static Page Generation Timeout
- **Issue**: In `apps/web/src/app/page.tsx`, rendering failed because an event handler (`onClick`) was passed to a component in a Server Component context.
- **Resolution**: Prepended `"use client";` to the page rendering script to set it as a Client Component, allowing it to build smoothly.
