# 07 — Architecture Notes

This document highlights critical structural features of the monorepo architecture.

## Monorepo Layout Rules
- **web** (`apps/web`): Accesses the backend strictly via JSON REST API. It **never** connects directly to PostgreSQL or processes business logic.
- **api** (`apps/api`): NestJS Fastify modular monolith holding domain packages.
- **worker** (`apps/worker`): Isolated background job executor listening to Redis queues.
- **db** (`packages/db`): Centralized Prisma database access layer, shared by `api` and `worker`.
- **ui** (`packages/ui`): Layout design systems. It has **no** dependencies on `db` or `api`.
- **types** (`packages/types`): Core TS definitions, completely isolated from `@prisma/client`.
- **validators** (`packages/validators`): Shared Zod validation schemas.

---

## Authentication, Guards & RBAC Flow
Our security perimeter uses standard JWT token validation chained with role validation:
1. **Bearer Token Authentication**: The `AuthGuard` extracts the `Authorization: Bearer <token>` header, verifies the signature against `JWT_SECRET`, checks if the user exists and is active, and attaches the payload to `request.user`.
2. **Role-Based Access Control**: The `RolesGuard` reads role metadata from the `@Roles(...)` decorator. It compares the requested roles against `request.user.role`.
   - *Bypass Rule*: Users with the `OWNER` role bypass all guard comparisons, granting them implicit access to all endpoints.
3. **Parameter Parameterization**: The `@CurrentUser()` decorator allows extracting the requester profile cleanly inside controllers.

---

## Tenant Scoped Security (Workspace Isolation)
Tenant-isolation is structurally enforced at the API layer:
- The authenticated user's `workspaceId` is extracted directly from `request.user` on every request.
- Every database query in `UsersService` and `ClientsService` strictly filters records by `workspaceId` (e.g. `prisma.client.findFirst({ where: { id, workspaceId } })`).
- This guarantees that even if a technician attempts to read or mutate a client by passing another client's UUID, the query will fail to return a record, preventing cross-tenant data leaks.

---

## Security Auditing & Sanitization
The system tracks sensitive mutations via the global `AuditService`:
- It exposes a unified `.log()` API to save trail objects in the `AuditLog` table.
- Before committing parameters to the database, a recursive sanitizer scans payload variables. Any keys matching sensitive tags (e.g. `password`, `token`, `secret`, `authorization`, `passwordHash`) are replaced with `[REDACTED]`.
- This ensures that administrative logs are fully secure for external audits.

---

## Modular Monolith NestJS Strategy
The backend is built as a single, cohesive modular monolith. Domain boundaries are strictly separated by NestJS modules (e.g. `AuthModule`, `ClientsModule`, `UsersModule`). This provides high code maintainability while eliminating the network complexity of microservices.

---

## Playwright PDF Pipeline
Playwright Chromium handles complex documents. Because rendering consumes server resources, PDF tasks are queued as BullMQ jobs. The worker loads the mock A4 HTML from `@peanut/documents`, processes it, and uploads the immutable PDF to MinIO object storage.
