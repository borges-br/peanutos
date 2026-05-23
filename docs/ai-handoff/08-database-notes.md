# 08 — Database Notes

This document captures relational database schema architectures of **Peanut OS**.

## Model Principles
- **UUID Keys**: Every table uses a UUID primary key to support future scalability.
- **workspaceId Logical Tenancy**: Main business tables (`users`, `clients`, `assets`, `tickets`, `quotes`, `invoices`, `contracts`, `file_objects`, `generated_documents`, `outbox_events`, `audit_logs`) are related to the `Workspace` entity via `workspaceId`.
- **Soft Deletes**: Defer actual purging of critical business logs, utilizing `deletedAt` timestamps.

---

## Phase 1 Status
The relational database models defined in `packages/db/prisma/schema.prisma` already housed complete structural properties for all Phase 1 features.
- We successfully validated the database schemas using local Prisma `v5.22.0` engines.
- **No migrations or database changes were required** during Phase 1.
- Updated `packages/db/prisma/seed.ts` to replace the weak seed password with a stronger, temporary development password: `ChangeMe123!`. The password is saved as a secure, pre-computed bcrypt hash: `$2b$10$aPtlplAqQ63c8I1GKjQDI.xMC9x3uqAhPH0LOiO33Ow6EqmiudVx6`.

---

## Critical Entity Mappings

### `Workspace`
- Act as the primary boundary for resource separation.

### `User`
- Holds a strict `@default(READ_ONLY)` role enum and hashes customer credentials using bcrypt.

### `Client` & `ClientUser`
- Mapped as one-to-many. `ClientUser` represents physical end-users within a client's company (e.g. employees of Acme).

### `ClientContact`
- Mapped as one-to-many with `Client`. Houses parameters for contact names, emails, and phones, with a unique `isPrimary` Boolean field that determines communication routing.

### `Asset`
- Holds structural specs for workstation telemetry. Sensitive properties (like access credentials) map to `sensitiveDataEncrypted`.

### `Ticket`
- Relates a Client, a specific ClientUser, and an affected Asset, assigning them to a technician User.

### `GeneratedDocument`
- Linked directly to a `FileObject` key in MinIO. It is designed to act as an immutable snapshot of historical financial interactions.
