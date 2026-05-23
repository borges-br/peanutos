# Borges OS — Pacote de Especificação para Claude AI

**Gerado em:** 2026-05-23  
**Projeto:** Borges OS  
**Uso previsto:** especificação técnica, funcional e operacional para orientar Claude AI na implementação do sistema interno da Borges TI.

## Objetivo do pacote

Este pacote reúne documentos Markdown para orientar uma IA de desenvolvimento na construção de um sistema próprio para a Borges TI, acessado inicialmente por `https://app.borgesti.com`.

O sistema deve centralizar clientes, inventário, usuários dos clientes, chamados, contratos, orçamentos, faturas, documentação técnica, geração de PDFs A4, auditoria e webhooks para n8n.

## Stack definida

| Camada | Decisão |
| --- | --- |
| Monorepo | pnpm workspaces + Turborepo |
| Frontend | Next.js + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | NestJS modular monolith, preferencialmente com Fastify adapter |
| Banco | PostgreSQL |
| ORM | Prisma |
| Filas | Redis + BullMQ |
| PDF | Playwright/Chromium sempre em worker dedicado |
| Storage | MinIO/S3-compatible |
| Deploy | Docker Compose via Portainer |
| Proxy | NGINX Proxy Manager |
| Automação | Webhooks assinados para n8n |

## Decisões incorporadas do diagnóstico crítico

- O Playwright deve rodar em worker isolado, com concorrência limitada.
- O sistema deve começar como interno, mas usar `workspaceId` desde o início para reduzir retrabalho futuro.
- Inventário é módulo central, não observação dentro do cliente.
- Chamados devem usar máquina de estados, não status livre.
- PDFs emitidos são snapshots imutáveis.
- Webhooks devem usar Event Outbox + BullMQ + assinatura HMAC.
- Dados sensíveis de inventário devem ter classificação e possibilidade de criptografia em nível de aplicação.
- Não armazenar senhas de clientes em texto puro; usar referências de credencial.
- Portal do cliente e SaaS multi-tenant completo ficam fora do MVP.

## Ordem recomendada de leitura

1. `00_contexto/00_project_vision.md`
2. `00_contexto/01_contexto_regras_negocio.md`
3. `00_contexto/02_decisoes_pendencias.md`
4. `01_arquitetura/03_system_architecture.md`
5. `01_arquitetura/04_monorepo_structure.md`
6. `01_arquitetura/05_database_model.md`
7. `01_arquitetura/06_api_design.md`
8. `02_paginas/07_ui_pages_overview.md`
9. Arquivos em `03_modulos/`
10. Arquivos em `04_entrega/`
11. `99_prompts_claude/00_master_prompt.md`

## Regra para o Claude AI

Antes de implementar código, a IA deve ler os documentos, identificar decisões pendentes e não inventar comportamento crítico sem registrar como pendência.
