# 03 — Implemented Features

This document details all implemented and fully functional features in **Peanut OS** up to the conclusion of **Phase 3 (Helpdesk, Ticketing & SLA Foundation)** on **May 23, 2026**.

---

## 1. Authentication, RBAC & Client Management (Phase 1)
- Stateless JWT login and logout under Bearer tokens.
- `GET /auth/me` endpoints checking active operator roles.
- Dynamic RBAC permissions supporting `OWNER`, `ADMIN`, `TECHNICIAN`, `FINANCIAL`, and `READ_ONLY` roles.
- Safe-locks preventing active operators from deactivating the last active `OWNER`.
- Scoped tenant-isolated customer database and contact lists.
- Global audit log tracker sanitizing password hashes.

---

## 2. ESLint Static Analysis Verification (Phase 2)
- Added NestJS and TypeScript ESLint configurations in `apps/api` and `apps/web`.
- Stabilized package dependencies, making monorepo lints 100% build-green and compliant.

---

## 3. Real Symmetric Envelope Cryptography (Phase 2)
- Upgraded the cryptographic envelope in `@peanut/utils` from Base64 stubs to standard corporate-grade AES-256-GCM.
- Securely reads keys from `APP_ENCRYPTION_KEY` or `APPLICATION_ENCRYPTION_KEY`.
- Strictly validates key sizes to exactly 32-bytes, supporting base64, hex, and raw text.
- Standardized the output envelope: `v1:gcm:base64(iv):base64(authTag):base64(cipherText)`.

---

## 4. Client Users Directory (Phase 2)
- Created full CRUD REST endpoints:
  - `GET /clients/:clientId/users` (Paginated list, searchable, and workspace-scoped).
  - `GET /clients/:clientId/users/:userId` (Get specific end user).
  - `POST /clients/:clientId/users` (Add new end user, validated with Zod).
  - `PATCH /clients/:clientId/users/:userId` (Edit end user specs).
  - `PATCH /clients/:clientId/users/:userId/status` (Toggle active/inactive status).
- Enforced role-based access control, allowing OWNER, ADMIN, and TECHNICIAN to mutate records.
- Tracked creation, update, and status mutation audits.

---

## 5. Technical Asset Inventory (Phase 2)
- Created global and client-specific asset CRUD endpoints under NestJS (`/assets` and `/clients/:clientId/assets`).
- Supports advanced multi-field search (name, hostname, serial, assetTag, location) and filters by type, client, and status.
- Automatically encrypts sensitive credentials on Swtiches/Servers writes utilizing GCM encryption.
- Enabled soft-deletion by changing asset status to `RETIRED`.

---

## 6. Physical Equipment Assignments (Phase 2)
- Built dedicated `/assign` and `/unassign` endpoints to link assets to specific client end users.
- Automatically registers assignment transitions in asset histories and audit logs.

---

## 7. Life-Cycle History & Notes Log (Phase 2)
- Automated history log logging events: `ASSET_CREATED`, `ASSET_UPDATED`, `STATUS_CHANGED`, `ASSIGNED`, `UNASSIGNED`, `NOTE_ADDED`, `SENSITIVE_DATA_UPDATED`, `SENSITIVE_DATA_REVEALED`.
- Securely masks all sensitive credentials in histories.
- Developed internal technical notes (`/notes`) with Zod validators and keyword checkers to reject plain text passwords.

---

## 8. Secure Click-to-Reveal overlay (Phase 2)
- Dedicated, audited endpoint `POST /reveal-sensitive-data` allowing OWNER, ADMIN, and TECHNICIAN to view decrypted switch/server passwords.
- Strictly registers reveal events in history and security alerts, masking the actual secret in audit logs.
- Renders warning notices in the frontend dashboard overlay, holding decrypted credentials solely in temp memory.

---

## 9. Next.js Dashboard Interfaces (Phase 2)
- **Central Inventory View (`/dashboard/inventory`)**: Central list of all hardware/software assets in the workspace, searchable and filterable.
- **Client Users Manager (`/dashboard/clients/[id]/users`)**: Tab shell displaying end users list, active status badges, linked assets count, and addition/editing modals.
- **Client Inventory Tab (`/dashboard/clients/[id]/inventory`)**: Tab shell displaying client assets, quick actions, and creation modal.
- **Asset Details Sheet (`/dashboard/clients/[id]/assets/[assetId]`)**: Spec cards, dynamic technical comments board, visual history timeline, and click-to-reveal credential overlays.

---

## 10. Helpdesk, Ticketing & SLA Foundation (Phase 3)
- **Central Helpdesk Board (`/dashboard/tickets`)**: High-performance dashboard displaying support tickets, text searching, quick status/client/technician selectors, and color-coded SLA alerts.
- **New Incident Form (`/dashboard/tickets/new`)**: Premium form equipped with cascading dropdowns that load contacts, end-users, and technical assets on client selection. Uses client-side Zod validation.
- **Support Detail Sheet (`/dashboard/tickets/[ticketId]`)**: Visual split layout rendering descriptions, timeline logs, visual audit trails, assignment controls, and state selectors.
- **Client-Specific Tickets (`/dashboard/clients/[id]/tickets`)**: Scoped list detailing tickets and SLA targets belonging exclusively to a client.
- **Centralized Ticket State Machine**: Restricts status updates strictly to authorized, logical transitions (e.g. blocking reopenings, protecting closures), enforced at service level.
- **Incremental Human-Readable Numbering**: Automatically registers tickets with incremental tracking numbers (`TCK-000001`, `TCK-000002`) in transactional writes.
- **SLA Calculation Service**: isolated SLA policy calculator computing response and resolution targets using fallback standard constants (e.g. Critical 15m, High 1h, Low 4h) or database records.
- **Comments Sanitization Safeguard**: Case-insensitive password keyword scanner rejecting plaintext credentials in ticket notes, skipping audit trails for safety.
- **Visibility-Controlled Notes**: Support for internal confidential notes (padlock badge, yellow layout) vs. public comments.
- **Technical Hour Logs**: Time logs tracking faturable working hours. Automatically checks for positive durations (`startedAt < endedAt`).
- **SLA Monitor Daemon (BullMQ)**: Background monitor sweeping active tickets, logging SLA warning countdowns and breaches. Connection error bypasses keep worker robust if Redis is offline.
