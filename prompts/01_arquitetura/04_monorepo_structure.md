# 04 — Estrutura do Monorepo

```txt
borges-os/
├── apps/
│   ├── web/
│   ├── api/
│   └── worker/
├── packages/
│   ├── db/
│   ├── ui/
│   ├── types/
│   ├── validators/
│   ├── documents/
│   ├── utils/
│   └── config/
├── infra/
│   ├── docker/
│   ├── nginx/
│   └── scripts/
├── docs/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── tsconfig.base.json
```

## apps/web

Next.js, telas administrativas, preview de documentos e consumo da API.

## apps/api

NestJS, módulos de domínio, autenticação, RBAC, auditoria, criação de jobs e APIs REST.

## apps/worker

BullMQ, Playwright, webhooks, jobs recorrentes, importações e tarefas pesadas.

## packages/db

Prisma schema, migrations, seed e Prisma Client.

## packages/types

Tipos compartilhados sem dependência de Prisma Client no frontend.

## packages/validators

Schemas Zod para DTOs e formulários.

## packages/documents

Templates de PDF/HTML, CSS print, componentes de documentos e contratos de dados.

## Regras de importação

- Web não acessa DB direto.
- UI não depende da API.
- Types não depende de Prisma Client.
- Documents não depende do app web.
- Worker pode usar db e documents.

## pnpm-workspace.yaml

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

## turbo.json

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] },
    "lint": { "dependsOn": ["^lint"] },
    "typecheck": { "dependsOn": ["^build"] },
    "test": { "dependsOn": ["^build"], "outputs": ["coverage/**"] },
    "dev": { "cache": false, "persistent": true }
  }
}
```
