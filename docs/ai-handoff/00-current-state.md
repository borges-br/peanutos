# 00 — Current State

This document outlines the real, verified technical state of **Peanut OS** as of the conclusion of **Phase 3 (Helpdesk, Ticketing & SLA Foundation)** on **May 23, 2026**.

## What Exists in the Repository

- **Monorepo Structure**: Fully configured `pnpm workspaces` monorepo using Turborepo.
- **Root Setup**:
  - `pnpm-workspace.yaml` defining workspaces: `apps/*` and `packages/*`.
  - `turbo.json` with pipeline build orchestration.
  - `package.json` mapping dependencies and script shortcuts (`pnpm dev`, `pnpm build`, `pnpm db:generate`, etc.).
  - `tsconfig.base.json` defining strict TypeScript guidelines.
  - `.env` and `.env.example` templates containing symmetric AES-256-GCM keys.
- **Shared Packages (`packages/`)**:
  - `@peanut/db`: Full PostgreSQL relational data schemas mapped in Prisma (`prisma/schema.prisma`), updated for Phase 3 to support enums (`TicketPriority` critical, `TicketStatus` triage/cancelled, `TicketChannel`), expand `Ticket` and `TicketComment` models with SLA/visibility fields, and define new models `SlaPolicy`, `TicketHistory` and `TicketTimeEntry`. Fully compiled to `dist/`.
  - `@peanut/ui`: Base React components including standard custom `Button`.
  - `@peanut/types`: Common business models, status enums, and expanded interfaces for SlaPolicy, Ticket, TicketComment, TicketHistory, and TicketTimeEntry.
  - `@peanut/validators`: Zod validator schemas for Login, Clients, Client Contacts, Users, ClientUsers, Assets, and the newly added `ticketCreateSchema`, `ticketUpdateSchema`, `ticketStatusUpdateSchema`, `ticketAssignSchema`, `ticketCommentCreateSchema`, `ticketTimeEntryCreateSchema`, `slaPolicyCreateSchema`, and `slaPolicyUpdateSchema`.
  - `@peanut/documents`: Base HTML generator for rendering immutable A4 documents.
  - `@peanut/utils`: Base formatting utilities and robust AES-256-GCM symmetric envelope encryption/decryption functions.
  - `@peanut/config`: Extensible base configurations for CJS/ESM.
- **Apps (`apps/`)**:
  - `apps/web`: Next.js 14 App Router dashboard shell, housing:
    - `/login`: Premium dark glassmorphic interface with validations.
    - `/dashboard`: Layout sidebar with new "Chamados" nav item.
    - `/dashboard/clients`: Searchable customer list.
    - `/dashboard/clients/[id]`: Detail tabs, Company details, Contact CRUD, active technical inventory links, and active support tickets links.
    - `/dashboard/clients/[id]/tickets`: Client-specific tickets dashboard list with filters.
    - `/dashboard/inventory`: Central technical assets dashboard.
    - `/dashboard/tickets`: Central helpdesk tickets board, equipped with filters (status, client, priority, technician), text search, and color-coded SLA countdown/breach badges.
    - `/dashboard/tickets/new`: Incidents creator form with cascading dropdown selectors (populates contacts, users, and assets as soon as a client is selected), backed by client-side Zod validators.
    - `/dashboard/tickets/[ticketId]`: Ticket details card, internal confidential notes (padlock icon / yellow tint) vs. public comments chat stream, technical time logging logs (durationMinutes auto-calculated), visual audit logs timeline, technician re-assigners, and state machine transition action selectors.
  - `apps/api`: NestJS monolith, housing:
    - `/auth`: Bearer token JWT state and RolesGuard/RBAC.
    - `/users`: Internal users CRUD list, now allowing TECHNICIANS to read user lists for re-assignments.
    - `/audit`: Global sanitization logger stripping passwords, credentials and comments text.
    - `/clients` and `/client-users`: Isolated customer directories.
    - `/inventory`: Workspace-isolated technical asset registers.
    - `/tickets` (NEW Module): Managing tenant-isolated tickets operations, cascaded validations, custom/fallback SLA computing services (`sla.service.ts`), state transition constraint machines (`ticket-state-machine.ts`), Visiblity filters, time entries logger, and comment term filters (password/secret blocks).
  - `apps/worker`: BullMQ background worker daemon, housing `pdfWorker`, `webhookWorker` and the new `slaMonitorWorker` which sweeps unresolved tickets to log SLA breach alerts. Includes connection `'error'` events to safely bypass offline Redis local connections.

## What is Functional & Verified

- **Monorepo Dependency Imports**: Code imports across workspaces compile and resolve without errors.
- **ESLint Stabilization**: lint checks pass across all 10 packages cleanly.
- **Prisma Schema Validation**: Syntactically 100% valid using `npx prisma validate`.
- **TypeScript Core Verification**: Verified 100% successful via `turbo run typecheck`.
- **Workspace Build status**: Verified compilation output 100% green using `turbo run build` across all monorepo packages, NextJS static pages, NestJS controllers, and BullMQ worker.

## What is Pending Validation / Execution

- **Active Docker DB connection**: Local Docker daemon service is offline in local developer environment. Applying actual database migrations and seeding requires an active running PostgreSQL container. Prisma schema generated types successfully offline, compile checks are green.

## Last Completed Milestone

- **Phase 3 — Helpdesk, Ticketing & SLA Foundation**.
