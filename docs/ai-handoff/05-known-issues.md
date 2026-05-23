# 05 — Known Issues

This document records all known issues, limitations, and architectural pending points observed during **Phase 0**.

## Development Warnings

### 🔐 Sensitive Data Cripto Stub
- **Warning**: The `encryptSensitiveData` and `decryptSensitiveData` helpers in `@peanut/utils` are currently stubs utilizing simple Base64 conversions. 
- **Impact**: Do not use this configuration in environments holding live customer secrets until secure symmetric cryptographies (AES-256-GCM) are integrated.

### 🌐 S3 MinIO TLS
- **Warning**: The MinIO config template inside `.env.example` lists `S3_USE_SSL=false` and connects via plaintext port `9000` to local containers.
- **Impact**: Secure environments will require overriding variables to enforce strict HTTPS connections.

### 🧪 Database Connection Readiness
- **Warning**: Local database docker services must be fully spun up and initial migrations applied before workspaces are started, or else NestJS boot sequences will timeout/fail when attempting DB handshakes.
- **Resolution**: Future agents must ensure `docker-compose` containers are running and migrations executed.
