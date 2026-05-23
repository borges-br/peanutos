# 05 — Known Issues

This document records all known issues, limitations, and architectural pending points observed during development.

## Development Warnings

### 🔐 Sensitive Data Cripto Stub (Phase 0)
- **Warning**: The `encryptSensitiveData` and `decryptSensitiveData` helpers in `@peanut/utils` are currently stubs utilizing simple Base64 conversions. 
- **Impact**: Do not use this configuration in environments holding live customer secrets until secure symmetric cryptographies (AES-256-GCM) are integrated (slated for Phase 2).

### 🌐 S3 MinIO TLS (Phase 0)
- **Warning**: The MinIO config template inside `.env.example` lists `S3_USE_SSL=false` and connects via plaintext port `9000` to local containers.
- **Impact**: Secure environments will require overriding variables to enforce strict HTTPS connections.

## Newly Discovered in Phase 1

### 🧪 Local Docker Desktop Service Permissions (Windows)
- **Warning**: Starting the local Docker daemon service `com.docker.service` directly from command line/PowerShell via `Start-Service` throws Access Denied errors unless running in fully elevated Administrator privileges.
- **Workaround**: Start Docker Desktop manually as a user process from Windows (using the taskbar/desktop shortcut). It can take up to 2-3 minutes to mount WSL virtual engines and initialize port bindings on port 5432.

### ⚠️ Missing ESLint Dependency in apps/api
- **Warning**: Executing `pnpm run lint` across the monorepo fails on the `peanut-api` workspace. The script `"lint": "eslint \"{src,apps,libs,test}/**/*.ts\" --fix"` crashes because `eslint` and its configs are omitted from the package's local `devDependencies`.
- **Impact**: Code compiles and typechecks 100% green via `pnpm run typecheck`, but the ESLint linter will not run until the next agent configures ESLint dependencies.
