# 04 — Pending Features

This document maps all the remaining features for the development of **Peanut OS**, organized by phases.

---

## 🔐 Phase 1: Authentication & Client Management
- **NextJS / NestJS Login**: Session authentication with HTTP-only cookies.
- **RBAC Policy**: Route permissions matching roles (`OWNER`, `ADMIN`, `TECHNICIAN`, `FINANCIAL`, `READ_ONLY`).
- **Audit Logging**: Application-level action tracking inside PostgreSQL.
- **Clients CRUD**: Management of client entities and related primary contacts.
- **Client Users**: Registry of client users, departments, and specific technical rules.

---

## 🖥️ Phase 2: Technical Asset Inventory
- **Asset CRUD**: Centralized hardware & software inventory modules (Notebooks, Servers, VPNs, etc.).
- **Asset Assignment**: Link physical workstations and printers to specific Client Users.
- **Sensitive Data Cryptographic Envelope**: Real symmetric application-level envelope encryption (AES-256-GCM) inside `@peanut/utils` to secure server passwords, remote desktop connections, and passwords.

---

## 🎫 Phase 3: Ticketing & SLA Engine
- **Ticket Workflow**: Strict state-machine routing (`OPEN` -> `IN_PROGRESS` -> `RESOLVED` -> `CLOSED`).
- **SLA Tracking**: Responding and starting timers against specific contracted schedules.
- **Technical Comments**: Auditable internal and external support log commentary.
- **Closure Module**: Formal Ticket Closures documenting root causes, resolution hours, and technician logs.

---

## 💳 Phase 4: Financial & PDF Engine
- **Quotes**: Multi-item commercial estimates, validity dates, and customer sign-off hooks.
- **Invoices**: Invoicing schedules linked to active contracts, tickets, or quotes.
- **PDF Playwright Render**: Chromium isolated worker compiling Invoices, Quotes, and Ticket Closures to A4 snapshots and writing files to MinIO/S3 private buckets.

---

## 📜 Phase 5: SLA Contracts
- **Contracts**: Customer subscription parameters, included monthly hours, onsite allowance, and billing day integrations.

---

## 🔗 Phase 6: Outbox Events & Webhooks
- **Transactional Outbox Event Dispatcher**: Background worker sending HMAC SHA-256 signed JSON payloads to automated n8n workflows.
- **Webhook Registry**: Manage n8n target webhook URLs and trace delivery reports.
