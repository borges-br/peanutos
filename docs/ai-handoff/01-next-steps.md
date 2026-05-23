# 01 — Next Steps

This document outlines the priority checklist for the next AI agent to execute during **Phase 3: Ticketing & SLA Foundation**.

## Phase 3 Execution Checklist

### 1. Database Migrations
- [ ] Spin up the Docker Compose PostgreSQL container manually.
- [ ] Apply the Prisma schema migrations for Phase 2 and Phase 3:
  ```bash
  npx pnpm --filter @peanut/db prisma migrate dev --name phase_2_and_3
  ```
- [ ] Seed the database using `pnpm db:seed` to verify mock technical assets, client end users, and notes exist locally.

### 2. SLA & Priority Engine
- [ ] Review ticket urgency rules and response/resolution SLAs in `schema.prisma`.
- [ ] Build a priority engine matching priority levels (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) with SLA deadlines.
- [ ] Automatically calculate `slaDueFirstResponseAt` and `slaDueStartAt` on ticket writes.

### 3. Ticketing API (NestJS Monolith)
- [ ] Create `TicketsModule` in `apps/api/src/tickets/` managing the `Ticket` and `TicketComment` models.
- [ ] Expose REST endpoints:
  - `GET /tickets` (Global dashboard list, searchable, paginated, and status-filtered).
  - `GET /clients/:clientId/tickets` (Client-specific tickets).
  - `POST /clients/:clientId/tickets` (Create new ticket linking contact, client user, and asset).
  - `GET /tickets/:ticketId` (Retrieve ticket details, comments, and lifecycle logs).
  - `POST /tickets/:ticketId/comments` (Add internal or client-facing comments).
  - `PATCH /tickets/:ticketId/status` (Update ticket status and record SLA completion metrics).

### 4. Background SLA Monitor (BullMQ)
- [ ] Implement SLA monitoring tasks in `apps/worker`.
- [ ] Periodically check for approaching SLA breach events.
- [ ] Dispatch background warnings to the technical logs or console if a ticket is about to breach its priority deadlines.

### 5. Next.js Support Panels (Next.js `/dashboard`)
- [ ] Add `/dashboard/tickets` navigation to the sidebar.
- [ ] Build a Helpdesk board `/dashboard/tickets/page.tsx` displaying cards/tables of tickets, priority indicators, and SLA warning icons.
- [ ] Build a sleek ticket creation form, enabling operators to choose the Client, then dynamically search and select Client Contacts, Client Users, and Assets.
- [ ] Build a rich ticket details view at `/dashboard/tickets/[id]`, including:
  - Chat-like conversation stream displaying internal vs. public comments.
  - Sidebar displaying linked client information, active asset details (with quick link to asset specs), and SLA timers.
  - Close Ticket form capturing resolution summaries and technical hours.
