# 03 — Arquitetura Técnica

## Visão geral

Arquitetura com frontend Next.js, API NestJS, worker BullMQ, PostgreSQL, Redis e MinIO/S3.

```mermaid
flowchart TB
    User[Usuário interno] --> NPM[NGINX Proxy Manager]
    NPM --> Web[apps/web Next.js]
    Web --> API[apps/api NestJS]
    API --> DB[(PostgreSQL)]
    API --> Redis[(Redis)]
    API --> S3[(MinIO/S3)]
    API --> Outbox[OutboxEvent]
    Worker[apps/worker BullMQ] --> Redis
    Worker --> DB
    Worker --> S3
    Worker --> PDF[Playwright/Chromium]
    Worker --> N8N[n8n Webhooks]
```

## Serviços

| Serviço | Responsabilidade |
|---|---|
| web | Interface administrativa |
| api | Regras de negócio, autenticação, API REST |
| worker | PDFs, webhooks, jobs e importações |
| postgres | Banco relacional |
| redis | Fila e cache leve |
| minio | Arquivos, PDFs e anexos |

## Modular monolith

O backend deve ser monólito modular para reduzir complexidade operacional. Microserviços são prematuros para o MVP.

Módulos sugeridos:

```txt
auth, users, roles, clients, contacts, inventory, client-users,
contracts, quotes, invoices, tickets, documents, files,
webhooks, audit, settings, health
```

## Fluxo de PDF

```mermaid
sequenceDiagram
    participant U as Usuário
    participant A as API
    participant Q as BullMQ
    participant W as Worker
    participant P as Playwright
    participant S as MinIO
    participant DB as PostgreSQL
    U->>A: Solicita PDF
    A->>DB: Registra solicitação
    A->>Q: Enfileira job
    A-->>U: Retorna jobId
    W->>DB: Busca dados
    W->>P: Renderiza HTML A4
    P-->>W: PDF
    W->>S: Salva arquivo
    W->>DB: Registra GeneratedDocument
```

## Fluxo de webhook

```mermaid
sequenceDiagram
    participant A as API
    participant DB as PostgreSQL
    participant Q as BullMQ
    participant W as Worker
    participant N as n8n
    A->>DB: Ação de negócio
    A->>DB: Cria OutboxEvent
    A->>Q: Enfileira dispatch
    W->>N: POST assinado HMAC
    W->>DB: Registra delivery
```

## Segurança base

- HTTPS.
- Cookie HTTP-only preferencial.
- RBAC.
- Auditoria.
- Rate limit.
- Storage privado.
- URLs assinadas para download.
- Secrets fora do Git.
- Logs sanitizados.

## Escalabilidade futura

Escalar primeiro workers, depois API/web. Separar PDF engine se volume crescer.
