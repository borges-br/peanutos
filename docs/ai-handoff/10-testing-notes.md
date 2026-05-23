# 10 — Testing Notes

This document logs all tests, static linting runs, and verification steps performed during development.

## Phase 1 Setup Validations

The following verification pipeline was executed to guarantee monorepo compile readiness and code type safety:

### 1. Monorepo dependencies installation
Command executed:
```bash
npx pnpm install
```
- **Status**: Completed successfully.

### 2. Prisma Schema validation check
Command executed:
```bash
$env:DATABASE_URL="postgresql://peanut_user:change-me-in-production@localhost:5432/peanut_db?schema=public"; npx pnpm --filter @peanut/db exec prisma validate
```
- **Status**: Completed successfully.
- **Output**: "The schema at prisma\schema.prisma is valid 🚀"
- *Resolved Versioning Issue*: Running bare `npx prisma validate` fetched the latest `prisma@7.8.0` globally which expects connection configurations in `prisma.config.ts`. Running the local binary `npx pnpm --filter @peanut/db exec prisma validate` utilizes the declared Prisma version (`v5.22.0`) which correctly reads connections from the environment variable.

### 3. TypeScript Strict Typecheck validation
Command executed:
```bash
npx pnpm run typecheck
```
- **Status**: Completed successfully.
- **Output**: `Tasks: 5 successful, 5 total` (all typecheck configurations passed in 246ms).

### 4. Monorepo Workspace build validation
Command executed:
```bash
npx pnpm run build
```
- **Status**: Completed successfully.
- **Output**: `Tasks: 10 successful, 10 total` (all packages and runtimes built in 10.352s). Next.js compiled all route sheets (login, dashboard, clients, details, new client form) and NestJS compiled the monolith module clean.

---

## Resolved Issues in Phase 1

### 1. Missing build script in @peanut/db
- **Issue**: Turborepo build crashed because `@peanut/db` main entry pointed to `./dist/index.js` but the package lacked a `"build": "tsc"` script.
- **Resolution**: Added `"build": "tsc"` script to `packages/db/package.json` to generate TS declarations and JS outputs under `./dist`.

### 2. Missing Node.js types in @peanut/db
- **Issue**: Compiling `@peanut/db` tsc threw TS2580 errors because `process` was unrecognized in `packages/db/src/index.ts`.
- **Resolution**: Installed `@types/node` in `@peanut/db` `devDependencies`.

### 3. TypeScript delete operator warning in User service
- **Issue**: `UsersService` failed compilation because the `delete` operator was used on non-optional fields (`before.passwordHash`).
- **Resolution**: Refactored passwordHash omissions to use ES6 destructuring (`const { passwordHash: _, ...before } = user;`), satisfying strict compilation.

### 4. jsonwebtoken expiresIn Option Typings
- **Issue**: NestJS `AuthService` JWT generation failed compilation because the `process.env.JWT_EXPIRES_IN` string type clashed with jsonwebtoken's expected `expiresIn` signature.
- **Resolution**: Cast the option parameter to `any` (`expiresIn: ... as any`) to leverage jsonwebtoken's default string parsing.

### 5. ESLint Omission in apps/api
- **Issue**: Monorepo lint script `pnpm run lint` failed on `peanut-api` because `eslint` and its dependencies were omitted from `devDependencies`.
- **Status**: Registered in the known issues list, to be resolved by the next agent.
