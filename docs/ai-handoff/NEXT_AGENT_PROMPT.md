# NEXT AGENT PROMPT - Peanut OS 🥜

## Context Overview
You are continuing the implementation of **Peanut OS**, a modular operational platform for IT Service Providers designed with logical multi-tenancy (`workspaceId`) and white-label customizability.

**Phase 1 (Authentication, RBAC & Client Management)** is 100% complete, verified, and build-green! The entire monorepo is type-safe and compiles cleanly.

---

## 📈 Commands Executed & Diagnostic Report

### 1. Commands Executed Successfully:
- **Monorepo Compilation**: `npx pnpm run build` built all 10 packages cleanly in 10.352s (including next.js optimized page renders).
- **TypeScript Core Typecheck**: `npx pnpm run typecheck` checked all workspace modules 100% type-safe in 246ms.
- **Prisma Schema Validation**: `npx pnpm --filter @peanut/db exec prisma validate` validated the PostgreSQL schema successfully using Prisma `v5.22.0`.
- **Crypto pre-calculation**: Inline `node` execution inside the API folder successfully compiled and hashed the stronger development seed password (`ChangeMe123!`).

### 2. Issues Encountered & Resolved:
- *Error*: `@peanut/db` import was unrecognized inside backend compilation.
  - *Resolution*: Added `"build": "tsc"` script in `packages/db/package.json` to compile types/declarations into `dist/`.
- *Error*: Unrecognized node `process` global variables in database client.
  - *Resolution*: Installed `@types/node` as a devDependency in `@peanut/db`.
- *Error*: TS compile warning regarding the `delete` operator on non-optional fields inside the user update service.
  - *Resolution*: Refactored user property exclusions to use modern ES6 destructuring (`const { passwordHash: _, ...before } = user;`), removing compiler errors.
- *Error*: Type signature clash with jsonwebtoken options.
  - *Resolution*: Cast `expiresIn` to `any` inside the JWT signing config.

### 3. Known Issues & Unresolved Actions (Pay attention!):
- *Service Block*: Docker Desktop daemon service (`com.docker.service`) cannot be started directly from powershell inside this local script execution context due to standard Windows access restrictions.
  - *Mitigation*: Start Docker Desktop manually as a user process on the host, wait 2-3 minutes for the WSL Ubuntu virtual machine to initialize, and then run migrations and seeding.
- *Linter Failure*: Running `pnpm run lint` fails on `peanut-api` because `eslint` and its configurations are missing from its local `devDependencies`. This was registered in `05-known-issues.md`. Build and typecheck are 100% green, so we bypassed this linter roadblock.

---

## 📂 Critical Files Created / Modified in Phase 1

### API Core & Guards:
- [auth.service.ts](file:///C:/Github/peanutos/apps/api/src/auth/auth.service.ts) - JWT login, password compare (bcrypt), token validation, and audits.
- [auth.guard.ts](file:///C:/Github/peanutos/apps/api/src/auth/auth.guard.ts) - Bearer token validator.
- [roles.guard.ts](file:///C:/Github/peanutos/apps/api/src/auth/roles.guard.ts) - Custom roles metadata verifier.
- [audit.service.ts](file:///C:/Github/peanutos/apps/api/src/audit/audit.service.ts) - Global logger recursively stripping sensitive parameters (passwords, tokens).

### Scoped Services & Controllers:
- [users.service.ts](file:///C:/Github/peanutos/apps/api/src/users/users.service.ts) - Tenant-isolated users CRUD containing active owner deactivation blocks.
- [clients.service.ts](file:///C:/Github/peanutos/apps/api/src/clients/clients.service.ts) - Tenant-isolated customers CRUD and sub-contact managers.

### Next.js Pages & Providers:
- [api.ts](file:///C:/Github/peanutos/apps/web/src/lib/api.ts) - Axios-like HTTP fetch helper injecting authorization headers.
- [AuthContext.tsx](file:///C:/Github/peanutos/apps/web/src/context/AuthContext.tsx) - Client-side state hook.
- [layout.tsx](file:///C:/Github/peanutos/apps/web/src/app/dashboard/layout.tsx) - Authenticated sidebar navigation sidebar.
- [page.tsx](file:///C:/Github/peanutos/apps/web/src/app/dashboard/clients/%5Bid%5D/page.tsx) - Gorgeous multi-tab sheets featuring details and inline Contact CRUD.

---

## 🎯 Your Mission: Phase 2 — Technical Asset Inventory & Cryptography

Your objective is to deliver full operational tracking of hardware & software components, connect them to end users, and implement a production-grade symmetric encryption envelope.

### Step 1: Client Users Registry CRUD
- Implement CRUD endpoints in `apps/api` for `ClientUser` (`/clients/:clientId/users`).
- Ensure logical workspace boundaries (`workspaceId`) are strictly enforced.

### Step 2: Technical Asset CRUD
- Implement CRUD REST endpoints for `Asset` model (`/assets`) under the `AssetsModule` in `apps/api`.
- Support multi-field query parameters (search by name, serialNumber, hostname, assetTag) and filter outputs by client and status.
- Allow physical asset assignment: link an `Asset` record to a specific `ClientUser`.

### Step 3: Symmetric Encryption Envelope (`@peanut/utils`)
- Upgrade the base64 encryption stubs inside `packages/utils/src/index.ts`.
- Implement robust symmetric envelope encryption (AES-256-GCM) utilizing a 32-byte key defined in `process.env.APPLICATION_ENCRYPTION_KEY`.
- Secure sensitive equipment details: before writing credentials (like server passwords or remote desktop keys) to `sensitiveDataEncrypted` in the `Asset` table, the API must encrypt it, and decrypt it on read.

### Step 4: Next.js Panels
- Build a responsive table layout at `/dashboard/inventory` listing active equipment.
- Build asset creation and edit forms, validating inputs via Zod.
- Integrate secure credential overlays: allow authorized roles (`OWNER`, `ADMIN`, `TECHNICIAN`) to click and view decrypted details.
- Build a client users listing tab inside `/dashboard/clients/[id]` supporting inline CRUD actions.

---

## 🛡️ Rules of Engagement (Compliance)
1. **Never Hardcode Secrets**: Keep the symmetric key customizable via `.env.example`.
2. **Strictly Fictive seeds**: Ensure seed scripts use fictional datasets (e.g. Acme Tech) and never write live passwords or CPF/CNPJ documents.
3. **Preserve Continuity Logs**: At the end of your run, update all handoff documentation inside `docs/ai-handoff/` and write a new `NEXT_AGENT_PROMPT.md` for Phase 3.
