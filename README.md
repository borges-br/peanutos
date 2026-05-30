# Peanut OS

[![Next.js](https://img.shields.io/badge/Next.js-14-000000?logo=nextdotjs)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma)](https://www.prisma.io/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](docs/deployment/production-docker.md)
[![GHCR](https://img.shields.io/badge/GHCR-auto_publish-181717?logo=github&logoColor=white)](.github/workflows/publish-images.yml)
[![pnpm](https://img.shields.io/badge/pnpm-workspace-F69220?logo=pnpm&logoColor=white)](https://pnpm.io/)

![Peanut OS overview](docs/assets/peanut-os-hero.svg)

Peanut OS e uma plataforma web para gestao operacional de prestadores de servicos de TI. O projeto combina CRM tecnico, contratos, faturas, orcamentos, ordens de servico, inventario, documentos A4, webhooks e filas de background em um monorepo TypeScript.

> [!NOTE]
> Estado atual: MVP funcional em evolucao, com setup local, imagens Docker de producao e publicacao automatica via GitHub Actions.

## O que ja existe

| Area | Estado | Destaques |
| --- | --- | --- |
| Autenticacao e RBAC | Implementado | Setup inicial, login JWT, perfis `OWNER`, `ADMIN`, `FINANCIAL`, `TECHNICIAN`, `READ_ONLY` |
| Clientes | Implementado | Cadastro, contatos, status, detalhes e relacionamento com contratos/chamados |
| Inventario | Implementado | Ativos, atribuicoes, dados sensiveis criptografados e auditoria |
| Chamados | Implementado | SLA, comentarios, apontamento de tempo, categorias e politicas configuraveis |
| Contratos | Implementado | Itens recorrentes, historico, cotas e base para agenda financeira |
| Faturas | Implementado | Itens editaveis antes da emissao, custos internos, preview A4 e PDF |
| Orcamentos | Implementado | Servicos, materiais, custo/venda, status, preview e PDF |
| Ordens de servico | Implementado | Fluxo operacional, responsavel, agenda, itens e PDF |
| Documentos | Implementado | Central com upload manual, MinIO/S3, filtros e downloads |
| Webhooks | Implementado | Eventos assinados, disparo por filas e gatilhos configuraveis |
| Deploy | Implementado | Dockerfile multi-target, Compose de producao, Caddy, NGINX Proxy Manager e GHCR |

## Arquitetura

```mermaid
flowchart LR
  Web["apps/web<br/>Next.js"] --> API["apps/api<br/>NestJS Fastify"]
  API --> DB[("PostgreSQL<br/>Prisma")]
  API --> Redis[("Redis<br/>BullMQ")]
  API --> S3[("MinIO / S3<br/>Documentos")]
  Worker["apps/worker<br/>PDF + jobs"] --> Redis
  Worker --> DB
  Worker --> S3
  API --> Webhooks["n8n / HTTP webhooks"]
```

## Monorepo

```txt
peanutos/
|-- apps/
|   |-- web/              # Next.js dashboard
|   |-- api/              # NestJS modular monolith
|   `-- worker/           # BullMQ, PDF, SLA, webhooks
|-- packages/
|   |-- db/               # Prisma schema, migrations, seed
|   |-- documents/        # Templates HTML/A4 e renderizacao PDF
|   |-- types/            # Tipos compartilhados
|   |-- ui/               # Componentes React compartilhados
|   |-- utils/            # Formatadores e criptografia
|   `-- validators/       # Schemas Zod
|-- infra/
|   |-- docker/           # Compose local/producao e Dockerfile
|   |-- caddy/            # Reverse proxy TLS para dominio proprio
|   `-- nginx/            # Referencia local antiga
`-- docs/
    |-- deployment/       # Guias de deploy
    `-- architecture/     # Notas de arquitetura
```

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Backend | NestJS 10, Fastify |
| Banco | PostgreSQL 16, Prisma 5 |
| Filas | Redis 7, BullMQ |
| PDFs | Playwright Chromium |
| Storage | MinIO ou qualquer S3 compativel |
| Monorepo | pnpm workspaces, Turborepo |
| Deploy | Docker, GHCR, Caddy ou NGINX Proxy Manager |

## Comecar localmente

Pre-requisitos:

| Ferramenta | Versao sugerida |
| --- | --- |
| Node.js | 20 LTS |
| pnpm | 9.1.1 |
| Docker Desktop | Atual |

```powershell
cd C:\Github\peanutos
cp .env.example .env
pnpm install
docker compose -f infra\docker\docker-compose.yml up -d
pnpm db:generate
pnpm db:migrate
pnpm dev
```

URLs locais:

| Servico | URL |
| --- | --- |
| Web | http://localhost:3000 |
| API | http://localhost:3001/api/v1 |
| MinIO Console | http://localhost:9001 |

> [!TIP]
> Em banco zerado, o app redireciona para `/setup` para criar o primeiro workspace e usuario administrador.

## Comandos uteis

| Comando | Uso |
| --- | --- |
| `pnpm dev` | Sobe web, API, worker e packages em watch mode |
| `pnpm build` | Build completo do monorepo |
| `pnpm db:generate` | Gera Prisma Client |
| `pnpm db:migrate` | Aplica migrations em desenvolvimento |
| `pnpm db:migrate:deploy` | Aplica migrations em producao |
| `pnpm db:seed` | Popula dados ficticios de desenvolvimento |
| `docker compose -f infra\docker\docker-compose.yml up -d` | Sobe Postgres, Redis e MinIO locais |
| `docker compose -f infra\docker\docker-compose.yml down -v` | Zera banco, Redis e MinIO locais |

## Deploy online

O projeto ja inclui:

| Arquivo | Funcao |
| --- | --- |
| [`infra/docker/Dockerfile`](infra/docker/Dockerfile) | Dockerfile multi-target para `web`, `api`, `worker` e `migrator` |
| [`infra/docker/docker-compose.production.yml`](infra/docker/docker-compose.production.yml) | Stack self-hosted com app, Postgres, Redis, MinIO e Caddy |
| [`infra/docker/docker-compose.npm.yml`](infra/docker/docker-compose.npm.yml) | Override para NGINX Proxy Manager, sem publicar Caddy |
| [`infra/caddy/Caddyfile`](infra/caddy/Caddyfile) | TLS automatico e proxy por dominio |
| [`.github/workflows/publish-images.yml`](.github/workflows/publish-images.yml) | Publicacao automatica no GHCR com path filtering |
| [`.env.production.example`](.env.production.example) | Template de variaveis de producao |
| [`docs/deployment/production-docker.md`](docs/deployment/production-docker.md) | Guia completo de deploy |

> [!IMPORTANT]
> As imagens GHCR deste repo ficam em `ghcr.io/borges-br/peanutos/<servico>`. Em producao, configure `PEANUT_IMAGE_NAMESPACE=borges-br/peanutos`; usar apenas `borges-br` faz o Docker procurar imagens no caminho errado.

Resumo do fluxo:

```mermaid
sequenceDiagram
  participant Dev as Push
  participant GH as GitHub Actions
  participant Reg as GHCR
  participant VPS as Docker Server
  Dev->>GH: altera web/api/worker/db
  GH->>GH: detecta paths afetados
  GH->>Reg: publica somente imagens necessarias
  VPS->>Reg: docker compose pull
  VPS->>VPS: migrator aplica Prisma migrations
  VPS->>VPS: app sobe atras do Caddy ou NPM
```

Leia o guia: [Deploy de producao com Docker](docs/deployment/production-docker.md).

## Variaveis principais

| Grupo | Variaveis |
| --- | --- |
| Branding | `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_COMPANY_NAME`, `NEXT_PUBLIC_SUPPORT_EMAIL` |
| URLs | `NEXT_PUBLIC_WEB_URL`, `NEXT_PUBLIC_API_URL`, `CORS_ORIGIN` |
| Banco | `DATABASE_URL`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` |
| Cache/Fila | `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` |
| Seguranca | `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `APP_ENCRYPTION_KEY` |
| Storage | `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` |
| Worker | `PDF_MAX_CONCURRENCY`, `BILLING_SCHEDULE_CRON`, `WEBHOOK_SCHEDULER_TIMEZONE` |

## Seguranca

> [!IMPORTANT]
> Nunca versionar `.env`, senhas, tokens, chaves reais, dados de clientes ou PDFs reais.

> [!WARNING]
> `pnpm db:seed` e apenas para desenvolvimento. Nao rode seed em producao.

Boas praticas do projeto:

- White-label: usar variaveis de ambiente e configuracoes de workspace para marca.
- RBAC: preservar verificacoes de perfil em APIs e telas sensiveis.
- Auditoria: registrar acoes relevantes, principalmente dados sensiveis, documentos e status financeiros.
- Documentos: PDFs gerados devem ser imutaveis e versionados no storage.

## Links internos

| Documento | Link |
| --- | --- |
| Arquitetura | [`docs/architecture/overview.md`](docs/architecture/overview.md) |
| Deploy Docker | [`docs/deployment/production-docker.md`](docs/deployment/production-docker.md) |
| Handoff tecnico | [`docs/ai-handoff/`](docs/ai-handoff/) |
| Compose local | [`infra/docker/docker-compose.yml`](infra/docker/docker-compose.yml) |
| Compose producao | [`infra/docker/docker-compose.production.yml`](infra/docker/docker-compose.production.yml) |
| Compose NPM | [`infra/docker/docker-compose.npm.yml`](infra/docker/docker-compose.npm.yml) |

## Licenca

Projeto privado em desenvolvimento.
