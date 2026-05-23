# 01 — Next Steps

This document outlines the priority checklist for the next AI agent to execute during **Phase 2: Client Inventory & Asset Management**.

## Phase 2 Execution Checklist

### 1. Database Connections & Local Seeding
- [ ] Initialize the Docker Compose services manually using Docker Desktop on the host.
- [ ] Apply the Prisma schema migrations to the PostgreSQL database.
- [ ] Seed the fictive dataset using `pnpm db:seed` to populate the default admin (`admin@example.com` / `ChangeMe123!`), clients, and placeholder tickets.

### 2. Client Users Registry CRUD
- [ ] Implement CRUD REST endpoints in `apps/api` for the `ClientUser` model (`/clients/:clientId/users`).
- [ ] Scopes all operations strictly to the user's active `workspaceId`.
- [ ] Integrate appropriate Zod validators.

### 3. Technical Asset Inventory CRUD (NestJS API)
- [ ] Create `AssetsModule` in `apps/api` managing the `Asset` model.
- [ ] Expose CRUD REST endpoints (`GET /assets`, `POST /assets`, `PATCH /assets/:id`, `PATCH /assets/:id/status`) scoped by `workspaceId`.
- [ ] Support multi-field searches (name, serialNumber, hostname, assetTag) and filters by client and status.
- [ ] Support physical equipment assignment: allow linking an `Asset` to a specific `ClientUser`.

### 4. Symmetric Encryption Envelope (`@peanut/utils`)
- [ ] Upgrade the encryption stubs in `packages/utils/src/index.ts`.
- [ ] Implement secure AES-256-GCM symmetric encryption using a 32-byte key defined in `process.env.APPLICATION_ENCRYPTION_KEY`.
- [ ] Ensure that before saving sensitive credentials (like server passwords or remote desktop keys) to `sensitiveDataEncrypted` in the `Asset` table, the data is encrypted in the API, and decrypted on read.

### 5. Frontend Inventory Panels & Forms (Next.js)
- [ ] Build a responsive listing table at `/dashboard/inventory` (or inside `/dashboard/clients/[id]`) showing active assets, skeleton loaders, and filters.
- [ ] Build an asset creation and edit form validating inputs with Zod.
- [ ] Integrate secure detail sheets allowing authorized users (`OWNER`, `ADMIN`, `TECHNICIAN`) to view decrypted credentials.
- [ ] Build a client users listing tab inside `/dashboard/clients/[id]` supporting inline CRUD actions.
