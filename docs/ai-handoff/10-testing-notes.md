# 10 — Testing Notes

This document provides verification procedures, diagnostic logs, and manual test strategies for **Phase 2: Client Inventory & Asset Management**.

---

## 1. Automated Build & Compilation checks

To verify that the monorepo builds, typechecks, and complies with standards, execute the following commands in the workspace root:

### 1.1 Complete Clean Build
Compiles all shared packages and applications:
```bash
npx pnpm run build
```
*Result*: **100% Success**. Output files are successfully written in `dist/` and optimized Next.js pages generated cleanly.

### 1.2 TypeScript Static Typecheck
Validates typescript typings across all packages:
```bash
npx pnpm run typecheck
```
*Result*: **100% Success (Zero Errors)**.

### 1.3 Code Standards Linter
Runs ESLint across all monorepo modules:
```bash
npx pnpm run lint
```
*Result*: **100% Success**. All workspaces pass without syntax or formatting errors.

---

## 2. Prisma Database Scopes

To validate the PostgreSQL database schemas and typings:

### 2.1 Prisma Schema Check
```bash
npx prisma validate --schema=packages/db/prisma/schema.prisma
```
*Result*: **Schema is valid 🚀**

### 2.2 Prisma Client Generation
```bash
npx prisma generate --schema=packages/db/prisma/schema.prisma
```
*Result*: **Client Generated successfully**.

---

## 3. Cryptography Envelope Verification

To verify that `AES-256-GCM` encryption is functioning correctly and validating keys:

### 3.1 Verify key generators
Operators can generate safe, local 32-byte keys using Node:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3.2 Key Validation safeguards
- If no key is provided, the API throws: `Chave de criptografia não fornecida (...)`
- If an invalid key is provided (e.g. 10 bytes), the API throws: `Chave de criptografia inválida. A chave deve ter exatamente 32 bytes (...)`
- Payload layout: `v1:gcm:base64(iv):base64(authTag):base64(cipherText)`

---

## 4. Manual Verification Scenarios

Once the database Docker containers are spun up (`docker compose up -d`) and seed is run (`pnpm db:seed`), execute the following manual tests:

### 4.1 Client Users CRUD
- **Route**: `GET /clients/:clientId/users`
- **Action**: Add a new user via dashboard modal at `/dashboard/clients/[id]/users`. Check that:
  - Phone, email, department are saved.
  - Email uniqueness within client is enforced.
  - Scoping by `workspaceId` isolates search results.

### 4.2 Asset Inventory CRUD
- **Route**: `/dashboard/inventory` and `/dashboard/clients/[id]/inventory`
- **Action**: Create an asset notebook NB-ACME-002.
  - Fill specifications.
  - Put a credentials password inside `sensitiveDataEncrypted`.
  - Validate that saving works, and inspection in DB shows the encrypted envelope `v1:gcm:...` instead of raw text.

### 4.3 Click-to-Reveal Credentials
- **Action**: Access the asset detail sheet at `/dashboard/clients/[id]/assets/[assetId]`.
  - Click **"Reveal Credenciais Confidenciais"**.
  - Check that a warning notice displays, and credentials display correctly.
  - Check that a `SECURITY_ALERT` audit log is created on the server, and the history registers `SENSITIVE_DATA_REVEALED`.
  - Verify that closing the modal or switching screens clears the decrypted text from memory completely.

### 4.4 Internal Technical Notes
- **Action**: Write a technical note.
  - Try writing: "A senha do switch é 1234". The validator must reject the note, indicating that passwords should be saved in the encrypted envelope.
  - Write a normal comment like: "Limpeza física realizada no rack". Note must be added and listed instantly.
