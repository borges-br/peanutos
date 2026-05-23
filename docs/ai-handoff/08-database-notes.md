# 08 — Database Notes

This document captures relational database schema architectures of **Peanut OS**.

## Model Principles
- **UUID Keys**: Every table uses a UUID primary key to support future scalability.
- **workspaceId Logical Tenancy**: Main business tables (`users`, `clients`, `assets`, `tickets`, `quotes`, `invoices`, `contracts`, `file_objects`, `generated_documents`, `outbox_events`, `audit_logs`) are related to the `Workspace` entity via `workspaceId`.
- **Soft Deletes**: Defer actual purging of critical business logs, utilizing `deletedAt` timestamps.

---

## Critical Entity Mappings

### `Workspace`
- Act as the primary boundary for resource separation.

### `User`
- Holds a strict `@default(READ_ONLY)` role enum and hashes customer credentials using bcrypt.

### `Client` & `ClientUser`
- Mapped as one-to-many. `ClientUser` represents physical end-users within a client's company (e.g. employees of Acme).

### `Asset`
- Holds structural specs for workstation telemetry. Sensitive properties (like access credentials) map to `sensitiveDataEncrypted`.

### `Ticket`
- Relates a Client, a specific ClientUser, and an affected Asset, assigning them to a technician User.

### `GeneratedDocument`
- Linked directly to a `FileObject` key in MinIO. It is designed to act as an immutable snapshot of historical financial interactions.
