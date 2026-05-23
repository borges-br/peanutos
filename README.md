# Peanut OS 🥜

Peanut OS is a professional, high-performance web platform designed for the operational, technical, and commercial management of IT Service Providers. Initially conceptualized as a robust system for **Borges TI**, it is designed from the ground up with a white-label architecture to support custom branding, and a logical database model that prepares the schema for future multi-tenant operations.

> [!WARNING]
> **Project Status**: **Initial Development Stage (Fase 0 - Foundation)**. 
> This is a professional developer portfolio project under active development. Core modules are planned and stubbed but not yet functionally complete.

---

## 🛠️ The Tech Stack

- **Monorepo & Task Orchestration**: `pnpm workspaces` + [Turborepo](https://turbo.build/)
- **Frontend**: [Next.js 14 (App Router)](https://nextjs.org/) + TypeScript + Tailwind CSS + shadcn/ui
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

### Implemented Foundation (Phase 0)
- [x] Monorepo & workspaces setup with `pnpm workspaces` & `turbo.json`.
- [x] Shared packages configured (`@peanut/db`, `@peanut/ui`, `@peanut/types`, `@peanut/validators`, `@peanut/documents`, `@peanut/utils`).
- [x] Initial relational PostgreSQL database schema with logical `workspaceId` column for future tenant-isolation.
- [x] Seed script populated with 100% fictive developer data (e.g. Acme Tech).
- [x] Docker Compose environment for local DB dependency orchestrations.
- [x] NestJS + Fastify base controller and Next.js Landing page importing shared packages successfully.

### Planned Modules (Next Phases)
- [ ] **Phase 1**: Authentication, cookie-based Session/JWT management, and basic RBAC (`OWNER`, `ADMIN`, `TECHNICIAN`, `FINANCIAL`, `READ_ONLY`).
- [ ] **Phase 2**: Client & Contacts CRUD and Technical Asset Inventory management (with application-level cryptographic envelope stubs).
- [ ] **Phase 3**: Ticketing & SLA Engine (SLA timer state machines, technical comments).
- [ ] **Phase 4**: Financial Quotes, Invoices, and Playwright Worker PDF Render Engine.
- [ ] **Phase 5**: IT Contracts, SLAs, and recurring subscription fees.
- [ ] **Phase 6**: Outbox Event dispatcher and secure HMAC signed webhooks to n8n.

---

## 💻 Local Development Setup

### Prerequisites
- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Docker Desktop (for local DB dependencies)

### Quick Start
1. **Clone the repository and go to the root**:
   ```bash
   cd C:\Github\peanutos
   ```

2. **Copy the Environment variables template**:
   ```bash
   cp .env.example .env
   ```

3. **Install all monorepo dependencies**:
   ```bash
   pnpm install
   ```

4. **Spin up local databases and storage**:
   ```bash
   docker-compose -f infra/docker/docker-compose.yml up -d
   ```

5. **Initialize your database schema and seed mock data**:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   pnpm db:seed
   ```

6. **Launch all workspaces in hot-reload development mode**:
   ```bash
   pnpm dev
   ```
   - Frontend Panel: `http://localhost:3000`
   - Backend API: `http://localhost:3001/api/v1/health`

---

## 🛡️ Security Guidelines for Contributors (including AIs)
1. **White-Label First**: Never hardcode "Borges OS" or specific company names in layout code. Use context variables or `process.env.NEXT_PUBLIC_BRAND_NAME`.
2. **No Real Data**: The repository is prepared to go public on GitHub. Never commit real CPF, CNPJ, phone numbers, client data, or SMTP credentials.
3. **No improvising Cryptography**: Always use the stub helpers inside `@peanut/utils` for sensitive asset strings, preparing for robust application-level envelope encryption.
4. **Never commit `.env` files**: All secret configurations must remain local-only. Keep `.env.example` updated with mock parameters.
