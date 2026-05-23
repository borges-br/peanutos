# 09 — Env & Deploy Notes

This document provides details for local environment setups and deployments.

## Port Assignments
- **NextJS Panel**: `3000`
- **NestJS REST API**: `3001`
- **Background Worker**: `3002`
- **PostgreSQL**: `5432`
- **Redis Cache**: `6379`
- **MinIO Storage API**: `9000`
- **MinIO Storage Console**: `9001`

---

## Environment Variables for Phase 1 Authentication
Ensure the following variables are correctly populated in `.env`:
```ini
# JWT configuration settings
JWT_SECRET="change-me-in-production-at-least-32-chars-long"
JWT_EXPIRES_IN="15m"
```

---

## Local Docker Services (Compose)
To bootstrap the database layers:
```bash
docker-compose -f infra/docker/docker-compose.yml up -d
```

### PostgreSQL
- **Database Name**: `peanut_db`
- **User**: `peanut_user`
- **Password**: `change-me-in-production`
- **Volume**: `postgres_data` mapping to `/var/lib/postgresql/data`.

### Redis
- **Configuration**: Enforces a strict password handshake (`--requirepass change-me-in-production`).
- **Volume**: `redis_data` mapping to `/data`.

### MinIO
- **Credentials**: Root access via `minio_admin`.
- **Bucket Creation**: A bucket named `peanut-os-documents` must be created in MinIO console or startup script before document generation occurs.
- **Volume**: `minio_data` mapping to `/data`.
