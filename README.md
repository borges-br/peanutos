# Peanut OS 🥜

Peanut OS is a professional, high-performance web platform designed for the operational, technical, and commercial management of IT Service Providers. Initially conceptualized as a robust system for **Borges TI**, it is designed from the ground up with a white-label architecture to support custom branding, and a logical database model that prepares the schema for future multi-tenant operations.

> [!NOTE]
> **Project Status**: **Phase 4 Complete in code (Contracts & Recurring Billing Foundation)**.
> Contracts, line items, contract history, quota enforcement, contract-aware SLA selection, financial MRR endpoints, recurring billing schedule events, BullMQ billing scheduler foundation, and the contracts/financial dashboard screens are implemented and build-green. The Phase 4 Prisma schema validates, but the local Prisma migration could not be generated/applied because the schema engine failed against the local PostgreSQL connection; see `docs/ai-handoff/08-database-notes.md`.

---

## 🛠️ The Tech Stack

- **Monorepo & Task Orchestration**: `pnpm workspaces` + [Turborepo](https://turbo.build/)
- **Frontend**: [Next.js 14 (App Router)](https://nextjs.org/) + TypeScript + Tailwind CSS + Vanilla CSS Layouts
- **Backend API**: [NestJS](https://nestjs.com/) Modular Monolith (Fastify Adapter)
- **Database ORM**: PostgreSQL + [Prisma](https://www.prisma.io/)
- **Background Jobs & Queues**: Redis + [BullMQ](https://bullmq.io/)
- **Immutable PDF Generator**: Playwright / Chromium (isolated worker thread)
- **Object Storage**: MinIO / S3-compatible attachment storage
- **Automation / Integrations**: HMAC Signed Webhooks for n8n

---

## 📁 Repository Structure

```txt
peanutos/
├── apps/
│   ├── web/           # Next.js Frontend Admin Panel (App Router) [Port 3000]
│   ├── api/           # NestJS Fastify Modular Monolith Backend API [Port 3001]
│   └── worker/        # BullMQ isolated Background Queue Worker [Port 3002]
├── packages/
│   ├── db/            # Prisma Schema, relational models, and mock seeding
│   ├── ui/            # Shared Design System React UI Components
│   ├── types/         # Domain TypeScript types shared across apps & packages
│   ├── validators/    # Shared Zod validation schemas for forms & API DTOs
│   ├── documents/     # Playwright HTML templates for print-ready PDFs
│   ├── utils/         # Encryption stubs and formatting helpers
│   └── config/        # Shared ESLint/Prettier/TypeScript configurations
├── infra/
│   ├── docker/        # Local Docker Compose setup (Postgres, Redis, MinIO)
│   └── nginx/         # Local Reverse Proxy specs for local domains
└── docs/
    ├── architecture/  # Architectural design sheets and data flows
    └── ai-handoff/    # Protocol folder for multi-agent coordination
```

---

## 🚦 Features & Roadmap

### Implemented Modules

#### Foundation (Phase 0)
- [x] Monorepo & workspaces setup with `pnpm workspaces` & `turbo.json`.
- [x] Shared packages configured (`@peanut/db`, `@peanut/ui`, `@peanut/types`, `@peanut/validators`, `@peanut/documents`, `@peanut/utils`).
- [x] Initial relational PostgreSQL database schema with logical `workspaceId` column for future tenant-isolation.
- [x] Docker Compose environment for local DB dependency orchestrations.
- [x] NestJS + Fastify base controller and Next.js Landing page importing shared packages successfully.

#### Authentication & Client Management (Phase 1)
- [x] Stateless JWT token-based Session Authentication.
- [x] Unified Role-Based Access Controls (RBAC) with guards supporting `READ_ONLY`, `FINANCIAL`, `TECHNICIAN`, `ADMIN`, and `OWNER` roles.
- [x] Scoped logical tenancy (`workspaceId`) on all database queries.
- [x] Safe workspace User CRUD with deactivation safeguards for `OWNER` accounts.
- [x] Customers CRUD with multi-field search, pagination, and status badge filters.
- [x] Client Contacts CRUD with validation checks and single-primary contact toggling limits.
- [x] Beautiful dark glassmorphic Next.js pages: `/login`, `/dashboard`, `/dashboard/clients`, `/dashboard/clients/new`, `/dashboard/clients/[id]` detail tabs.

#### Client Inventory & Asset Management (Phase 2)
- [x] Hardware & Software Inventory: Notebooks, Servers, Routers, Printers, Firewalls, VMs, Cloud Services, Software Licenses, and VPNs.
- [x] Registry of Client Users: isolations, status toggles, and equipment assignments.
- [x] Secure symmetric envelope cryptography (`AES-256-GCM`) via `@peanut/utils` and environment variables validations.
- [x] Internal technical comments board rejecting plain text passwords.
- [x] Full visual history logs for hardware life-cycles (creation, specs edits, assignments, credential reveals).
- [x] Audited click-to-reveal credentials overlay for technical operators, leaving no credentials in local storage/session or logs.
- [x] Sleek, responsive Next.js technical sheets: `/dashboard/inventory`, `/dashboard/clients/[id]/users`, `/dashboard/clients/[id]/inventory`, and detailed `/dashboard/clients/[id]/assets/[assetId]` spec views.

#### Helpdesk, Ticketing & SLA Foundation (Phase 3)
- [x] Incidents board `/dashboard/tickets` with advanced search, page paginators, client/priority/technician dropdown filters, and SLA remaining timers.
- [x] Creation forms `/dashboard/tickets/new` loading cascading contacts, users, and assets dynamically based on Client selection, backed by client-side Zod validators.
- [x] Split detailed panel `/dashboard/tickets/[ticketId]` mapping technical descriptions, communications timeline (Padlock notes vs. public chat), working time logs, re-assignment controls, and state transitions.
- [x] Centralized ticket status state machines protecting ticket lifecycles against invalid status updates.
- [x] Automatic SLA Policy calculations computing response/resolution deadlines using fallback approved policy hours.
- [x] Plaintext password checker rejecting un-audited credentials in ticket comments case-insensitively.
- [x] Time logging tracking faturable working hours with start/end duration positive checks.
- [x] BullMQ background SLA worker sweeping unresolved tickets and logging breach warnings.
- [x] Client tickets view `/dashboard/clients/[id]/tickets` scoping list under the client detail tab.

### Planned Modules (Next Phases)
- [x] **Phase 4**: Contracts, quota validations, billing schedule foundation, monthly MRR financials dashboard, and background billing scheduler worker.
- [ ] **Phase 5**: Quotes, invoices, and PDF foundation.
- [ ] **Phase 6**: Outbox Event dispatcher and secure HMAC signed webhooks to n8n.

---

## 💻 Local Development Setup

### Prerequisites
- Node.js >= 18.0.0
- pnpm >= 9.1.1
- Docker Desktop (for local DB dependencies)

### Local Developer Credentials (Seed)
Once seeded, the database contains the following mock administrator credentials:
- **Username / E-mail**: `admin@example.com`
- **Password**: `ChangeMe123!`

> [!WARNING]
> **CRITICAL SECURITY NOTE**: The credentials above are strictly fictive developer parameters for local homologation and development. **NEVER** use these credentials in a live or production environment!

### Quick Start
1. **Clone the repository and go to the root**:
   ```bash
   cd C:\Github\peanutos
   ```

2. **Copy the Environment variables template**:
   ```bash
   cp .env.example .env
   ```

3. **Generate your local 32-byte encryption key**:
   Generate a secure, random key using:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   Copy the generated base64 string and paste it into the `APP_ENCRYPTION_KEY="..."` variable in your newly created local `.env` file.

4. **Install all monorepo dependencies**:
   ```bash
   pnpm install
   ```

5. **Spin up local databases and storage**:
   ```bash
   docker-compose -f infra/docker/docker-compose.yml up -d
   ```

6. **Initialize your database schema and seed mock data**:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   pnpm db:seed
   ```

7. **Launch all workspaces in hot-reload development mode**:
   ```bash
   pnpm dev
   ```
   - Frontend Panel: `http://localhost:3000`
   - Backend API: `http://localhost:3001/api/v1`

---

## 🛡️ Security Guidelines for Contributors (including AIs)
1. **White-Label First**: Never hardcode "Borges OS" or specific company names in layout code. Use context variables or `process.env.NEXT_PUBLIC_BRAND_NAME`.
2. **No Real Data**: The repository is prepared to go public on GitHub. Never commit real CPF, CNPJ, phone numbers, client data, or SMTP credentials.
3. **No improvising Cryptography**: Always use the stub helpers inside `@peanut/utils` for sensitive asset strings, preparing for robust application-level envelope encryption in Phase 2.
4. **Never commit `.env` files**: All secret configurations must remain local-only. Keep `.env.example` updated with mock parameters.
