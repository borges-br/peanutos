# 20 — Deploy Docker/Portainer

## Serviços

- web.
- api.
- worker.
- postgres.
- redis.
- minio.
- backup futuro.

## Domínio

- `https://app.borgesti.com` no MVP.
- `https://api.borgesti.com` opcional.

## docker-compose conceitual

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    volumes: [postgres_data:/var/lib/postgresql/data]
    networks: [internal]

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    networks: [internal]

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    restart: unless-stopped
    volumes: [minio_data:/data]
    networks: [internal]

  api:
    image: ghcr.io/borges-br/borges-os-api:latest
    restart: unless-stopped
    env_file: [.env]
    depends_on: [postgres, redis, minio]
    networks: [internal, npm_proxy]

  worker:
    image: ghcr.io/borges-br/borges-os-worker:latest
    restart: unless-stopped
    env_file: [.env]
    depends_on: [postgres, redis, minio]
    networks: [internal]

  web:
    image: ghcr.io/borges-br/borges-os-web:latest
    restart: unless-stopped
    env_file: [.env]
    depends_on: [api]
    networks: [internal, npm_proxy]

volumes:
  postgres_data:
  minio_data:

networks:
  internal:
  npm_proxy:
    external: true
```

## NGINX Proxy Manager

Proxy host:

- Domain: `app.borgesti.com`.
- Forward: `web:3000`.
- SSL: Let's Encrypt.
- Force SSL: Yes.

## Backups

- PostgreSQL dump diário.
- MinIO sync diário.
- Backup externo criptografado.
- Teste de restore mensal.

## Checklist

- [ ] DNS configurado.
- [ ] SSL ativo.
- [ ] Volumes persistentes.
- [ ] `.env` fora do Git.
- [ ] Banco não exposto.
- [ ] Redis não exposto.
- [ ] MinIO privado.
- [ ] Healthchecks.
- [ ] Backup e restore testados.
