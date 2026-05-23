# 00 — Current State

This document outlines the real, verified technical state of **Peanut OS** as of the conclusion of **Phase 2 (Client Inventory & Asset Management)** on **May 23, 2026**.

## What Exists in the Repository

- **Monorepo Structure**: Fully configured `pnpm workspaces` monorepo using Turborepo.
- **Root Setup**:
  - `pnpm-workspace.yaml` defining workspaces: `apps/*` and `packages/*`.
  - `turbo.json` with pipeline build orchestration.
  - `package.json` mapping dependencies and script shortcuts (`pnpm dev`, `pnpm build`, `pnpm db:generate`, etc.).
  - `tsconfig.base.json` defining strict TypeScript guidelines.
  - `.env` and `.env.example` templates containing symmetric AES-256-GCM keys.
- **Shared Packages (`packages/`)**:
  - `@peanut/db`: Full PostgreSQL relational data schemas mapped in Prisma (`prisma/schema.prisma`), including the new `ClientUser.workspaceId`, `AssetHistory` and `AssetNote` models. Fully compiled to `dist/`.
  - `@peanut/ui`: Base React components including standard custom `Button`.
  - `@peanut/types`: Common business models, status enums, and expanded `AssetType` and `AssetStatus` definitions.
  - `@peanut/validators`: Zod validator schemas for Login, Clients, Client Contacts, Users, and the newly added `ClientUser`, `Asset`, `AssetNote`, and `SensitiveData` schemas.
  - `@peanut/documents`: Base HTML generator for rendering immutable A4 documents.
  - `@peanut/utils`: Base formatting utilities and robust AES-256-GCM symmetric envelope encryption/decryption functions (`encryptString`, `decryptString`, `encryptSensitiveData`, `decryptSensitiveData`).
  - `@peanut/config`: Extensible base configurations for CJS/ESM.
- **Apps (`apps/`)**:
  - `apps/web`: Next.js 14 App Router dashboard shell, housing:
    - `/login`: Premium dark glassmorphic interface with validations.
    - `/dashboard`: Layout sidebar and overview cards.
    - `/dashboard/clients`: Searchable customer list.
    - `/dashboard/clients/[id]`: Detail tabs, Contact CRUD, Client Users panel, and Client Assets list.
    - `/dashboard/inventory`: Central technical assets dashboard with advanced multi-field search and filters.
    - `/dashboard/clients/[id]/assets/[assetId]`: Dynamic specs card, history timeline, inline notes, and secure click-to-reveal credentials overlay.
  - `apps/api`: NestJS Fastify adapter backend monolith, housing:
    - `/auth`: Bearer token JWT state and RolesGuard/RBAC.
    - `/audit`: Global sanitization logger stripping passwords and GCM sensitive payloads.
    - `/users`: Internal tenant-isolated users CRUD.
    - `/clients`: Isolated customer directory.
    - `/client-users`: Isolated end-users database under `/clients/:clientId/users`.
    - `/inventory`: Global and client asset registers, assignments, technical notes, and audited `/reveal-sensitive-data`.
  - `apps/worker`: BullMQ isolated worker daemon.

## What is Functional & Verified

- **Monorepo Dependency Imports**: Code imports across workspaces compile and resolve without errors.
- **ESLint Stabilization**: Fully resolved missing backend ESLint dependencies. `npx pnpm run lint` passes across all 10 packages cleanly.
- **Prisma Schema Validation**: Syntactically 100% valid using `npx prisma validate`.
- **Workspace Build status**: Verified compilation output 100% green using `turbo run build` across all monorepo packages.
- **NextJS Static Generation**: Compiled successfully under Next.js server component optimization rules.
- **TypeScript Core Verification**: Verified 100% successful via `turbo run typecheck`.

## What is Pending Validation / Execution

- **Active Docker DB connection**: Local Docker daemon service has startup permissions restrictions. Applying actual db migrations requires a running PostgreSQL container.

## Last Completed Milestone

- **Phase 2 — Client Inventory & Asset Management**.
