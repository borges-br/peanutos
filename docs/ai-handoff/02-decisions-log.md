# 02 — Decisions Log

This document records the key architectural, design, and coding decisions made during **Phase 2: Client Inventory & Asset Management**.

---

## 1. ESLint Monorepo Stabilization
- **Context**: Executing `pnpm run lint` was throwing package dependency errors because ESLint packages and configurations were omitted in `apps/api` and `apps/web`.
- **Decision**: Added standard NestJS linting dependencies (`eslint`, `@typescript-eslint/eslint-plugin`, `@typescript-eslint/parser`, `eslint-config-prettier`, `eslint-plugin-prettier`) as local devDependencies in `apps/api/package.json`, and added a basic `.eslintrc.js` config file. Additionally, added `eslint` and `eslint-config-next` to `apps/web/package.json` devDependencies and created `apps/web/.eslintrc.json` to prevent interactive CLI configurations from blocking Turborepo runs.
- **Rationale**: Keeps linting standards extremely clean, uniform, and fully functional under Turborepo orchestrations without rewriting the entire monorepo setup.

---

## 2. Multi-Tenant Database Schema Extensions
- **Context**: The `ClientUser` model lacked `workspaceId`, making direct multi-tenant scoping difficult, and models for logging equipment life-cycle history and technical notes were missing.
- **Decision**:
  - Added `workspaceId String @db.Uuid` to `ClientUser` in `schema.prisma` and mapped it to Workspace to ensure strict isolation.
  - Added `phone String? @db.VarChar(30)` to `ClientUser` to capture direct contact details.
  - Mapped a dedicated `AssetHistory` model to log creation, updates, notes additions, assignments, and secure credential reveals.
  - Mapped a dedicated `AssetNote` model to support internal technical comments.
  - Expanded `AssetType` and `AssetStatus` enums with all necessary types and statuses.
- **Rationale**: Mapped proper relations in Prisma to enable highly efficient, queryable, and structurally integral multi-tenancy.

---

## 3. Cryptographic Envelope Envelope (AES-256-GCM)
- **Context**: Legacies stubs were utilizing unsafe Base64 conversions for sensitive information.
- **Decision**: Replaced all base64 stubs in `@peanut/utils` (`packages/utils/src/index.ts`) with a secure symmetric crypto implementation. Standardized on `AES-256-GCM` algorithm using native Node.js `crypto`.
- **Envelope Format**: `v1:gcm:base64(iv):base64(authTag):base64(cipherText)`
- **Key Resolution**: Supported both `APP_ENCRYPTION_KEY` and `APPLICATION_ENCRYPTION_KEY` environment variables. Enforced robust key validation (requiring exactly 32-bytes, parsed from raw, hex, or base64 strings) and threw detailed errors on invalid configuration.
- **Rationale**: Prevents storing raw credentials on disk, providing state-of-the-art corporate cryptography envelope compliance.

---

## 4. Secure click-to-reveal credentials overlay
- **Context**: Exposing decrypted switcher or server passwords in general API payloads or holding them in persistent localStorage/sessionStorage/cookies exposes the provider's clients to leaks.
- **Decision**:
  - Developed a dedicated, highly audited endpoint `POST /clients/:clientId/assets/:assetId/reveal-sensitive-data` to handle credential decryption on-demand.
  - Exposes secrets exclusively to authenticated `OWNER`, `ADMIN`, or `TECHNICIAN` roles.
  - Automatically logs the reveal event in the asset history and registers a `SECURITY_ALERT` audit event on the server, masking the actual secret.
  - Returns credentials solely in memory, ensuring they are cleared instantly on modal close or unmount in the frontend dashboard.
- **Rationale**: Completely isolates sensitive operations, guaranteeing maximum visual and logical security.
