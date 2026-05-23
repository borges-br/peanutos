# 05 — Known Issues

This document records all known issues, resolved bugs, and environment limitations in **Peanut OS**.

---

## 1. Environment Limitations

### 🧪 Local Docker Desktop Service Permissions (Windows PowerShell)
- **Warning**: Starting the local Docker daemon service `com.docker.service` directly from powershell via `Start-Service` throws Access Denied errors unless running in elevated Administrator privileges.
- **Workaround**: Start Docker Desktop manually as a user process from Windows (using the taskbar or desktop shortcut). It can take up to 2-3 minutes to mount WSL virtual engines and initialize port bindings on port 5432.
- **Status**: Environment limitation. No block to development.

### 🌐 S3 MinIO TLS Plaintext
- **Warning**: The MinIO config template inside `.env.example` lists `S3_USE_SSL=false` and connects via plaintext port `9000` to local containers.
- **Impact**: Secure environments will require overriding variables to enforce strict HTTPS connections.
- **Status**: Planned production review.

### 🔌 Database Offline during Dev Migration
- **Warning**: Running `prisma migrate dev` fails if the local Docker Compose PostgreSQL database server is offline.
- **Mitigation**: Run `npx prisma validate` to confirm schema syntactical correctness, and run `npx prisma generate` to generate local typescript Prisma Client typings so compilation passes 100% green. Apply migration `phase_3_ticketing_sla` immediately after spinning up Docker services.
- **Status**: Development workaround verified. All package typechecks and Next/Nest compilations are 100% stable and build green.

---

## 2. Resolved in Phase 3

### ⚠️ React Hook useEffect Missing Dependency Warnings in Next.js Build
- **Issue**: Strict NextJS production compilation failed in the ticket forms due to React Hook `useEffect` dependency analysis and unused destructured variables (`setSubcategory` in `/tickets/new/page.tsx`).
- **Resolution**:
  - Removed the unused `setSubcategory` state hook to clean up the code.
  - Aligned all path depth references (e.g. `../../../../lib/api` and `../../../lib/api`) so compiler imports resolve successfully.
- **Status**: **100% Fixed and Stable**. Production Turborepo build compiles successfully.

---

## 3. Resolved in Phase 2

### ⚠️ Missing ESLint Dependency in apps/api & apps/web
- **Issue**: Executing `pnpm run lint` was failing across the monorepo because `eslint` and its configurations were omitted in NestJS and Next.js applications devDependencies.
- **Resolution**:
  - Added essential ESLint packages and configurations inside `apps/api/package.json` and created `apps/api/.eslintrc.js`.
  - Added `eslint` and `eslint-config-next` inside `apps/web/package.json` and created `apps/web/.eslintrc.json`.
- **Status**: **100% Fixed and Stable**. Linter passes cleanly on all workspaces.

### 🔐 Sensitive Data Cryptography Upgrade
- **Issue**: Utility stubs in `@peanut/utils` were converting secrets to plain Base64.
- **Resolution**: Implemented robust AES-256-GCM symmetric envelope encryption/decryption in `packages/utils/src/index.ts`. Added environment variable checks and strict 32-byte key size validations.
- **Status**: **100% Implemented and Verified**.
