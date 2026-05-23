# 02 — Decisions Log

This document records the architectural and technical design decisions made during the development of **Peanut OS**.

---

## Phase 3 — Helpdesk, Ticketing & SLA Foundation

### 1. SLA Policy Calculations (Simple Calendar Minutes)
- **Decision**: Deadlines for response, technical start, and overall resolution are computed strictly using **simple calendar minutes** rather than complex business hour calendars.
- **Rationale**: Keeps the implementation simple and highly testable for this first foundation phase, without expending excessive tokens or complexity on business hour calendar mappings.
- **Future Evolution**: The `businessHoursOnly` boolean flag is successfully added to the `SlaPolicy` schema and persists in the database to allow seamless future calendar calculations.

### 2. Visiblity Levels for Technical Comments
- **Decision**: Stored comments support two distinct visibility scopes: `INTERNAL` (technicians/admin only) and `CLIENT_VISIBLE_FUTURE` (for future client portals).
- **Rationale**: Since the Client Portal does not exist in Phase 3, we default visibility to `INTERNAL` in all comments while keeping types and schemas ready for client-exposed notes in subsequent portal development.

### 3. Centralized Ticket Status State Machine
- **Decision**: Transition pathways are evaluated inside a single module helper `apps/api/src/tickets/ticket-state-machine.ts` rather than being spread inside controllers or UI buttons.
- **Rationale**: Centralizes transition rules, making status lifecycles extremely robust, easily testable, and protected against manual API patches bypassing state rules.
- **Enforced State Flow**:
  - `OPEN` -> `TRIAGE` | `IN_PROGRESS` | `CANCELLED`
  - `TRIAGE` -> `IN_PROGRESS` | `CANCELLED`
  - `IN_PROGRESS` -> `WAITING_CLIENT` | `WAITING_THIRD_PARTY` | `RESOLVED` | `CANCELLED`
  - `WAITING_CLIENT` -> `IN_PROGRESS`
  - `WAITING_THIRD_PARTY` -> `IN_PROGRESS`
  - `RESOLVED` -> `CLOSED`
- Reopening closed or cancelled tickets is strictly blocked in Phase 3.

### 4. Credentials Safeguard (Comment Content Blocker)
- **Decision**: Comments containing plaintext words like `senha`, `password`, `token`, `secret`, `api_key`, `credential`, or `authorization` are rejected with a user-friendly API error and blocked from database storage.
- **Rationale**: Prevents accidental plaintext password logging in database comments. Decrypted technical asset credentials must only be stored inside encrypted specs fields and viewed using the audited Click-to-Reveal overlay.
- **Auditing**: Rejections are handled at controller level and *never* recorded in audit trails to avoid logging leaked sensitive content.

### 5. Offline Database Compilation Strategy
- **Decision**: Since Docker PostgreSQL is offline in local developer environments, migrations were skipped at database write level, but Prisma schema type safety is 100% generated using `prisma generate`.
- **Rationale**: Guarantees typechecker safety and compiler integrity, allowing the entire Turborepo workspace to build green while documenting the database startup constraint.
