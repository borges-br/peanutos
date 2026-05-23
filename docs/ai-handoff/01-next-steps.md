# 01 — Next Steps

This document outlines the priority checklist for the next AI agent (Codex, Claude, or Cursor) to execute during **Phase 1: Authentication & Client Management**.

## Phase 1 Execution Checklist

### 1. Local Database Migration & Seeding
- [ ] Spin up the Docker containers using `docker-compose -f infra/docker/docker-compose.yml up -d`.
- [ ] Execute initial database migration to PostgreSQL: `pnpm --filter @peanut/db prisma migrate dev --name init`.
- [ ] Execute the fictive seed script to populate initial workspaces, admin owner, client (Acme), contact, client user, operational assets, and initial ticket: `pnpm db:seed`.

### 2. NestJS Authentication & RBAC Core
- [ ] Implement a JWT-based, HTTP-only cookie-safe session mechanism inside `apps/api/src/auth`.
- [ ] Add the following enums for RBAC controls: `OWNER`, `ADMIN`, `TECHNICIAN`, `FINANCIAL`, `READ_ONLY`.
- [ ] Implement an `@Roles()` decorator and `RolesGuard` to lock routes down.
- [ ] Bind users to `workspaceId` upon session instantiation to verify logical tenant isolation.

### 3. NestJS Auditing & Logging Guard
- [ ] Create an `AuditService` in `apps/api/src/audit` that writes user actions into the `AuditLog` table.
- [ ] Create an `AuditInterceptor` to automatically record modifications on sensitive endpoints (e.g. client editing, asset deletions).

### 4. Client & Contact CRUD REST Endpoints
- [ ] Implement `GET /clients`, `POST /clients`, `GET /clients/:id`, `PATCH /clients/:id`, `DELETE /clients/:id` with strict Zod validation from `@peanut/validators`.
- [ ] Implement `GET /clients/:id/contacts` and matching CRUD operations for the `ClientContact` model.
- [ ] Verify that every REST controller filters records by the authenticated user's `workspaceId`.

### 5. Frontend Authentication & Client Dashboard
- [ ] Implement a premium dark glassmorphic Login screen in `apps/web/src/app/login` with Zod validation.
- [ ] Configure client-side React session context (`AuthProvider`).
- [ ] Build a sleek responsive table layout in `apps/web/src/app/dashboard/clients` to list and create Clients.
- [ ] Integrate appropriate skeleton loaders, error states, and empty states.
