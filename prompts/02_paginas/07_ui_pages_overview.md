# 07 — Visão Geral das Páginas

## Layout base

```txt
Topbar: busca global, usuário, notificações
Sidebar: Dashboard, Clientes, Inventário, Chamados, Orçamentos, Faturas, Contratos, Documentos, Relatórios, Automações, Configurações
Conteúdo: tabelas, formulários, detalhes e previews
```

## Rotas

- `/login`
- `/dashboard`
- `/clientes`
- `/clientes/novo`
- `/clientes/[id]`
- `/clientes/[id]/timeline`
- `/clientes/[id]/inventario`
- `/clientes/[id]/usuarios`
- `/inventario`
- `/chamados`
- `/chamados/novo`
- `/chamados/[id]`
- `/chamados/[id]/encerramento`
- `/orcamentos`
- `/orcamentos/novo`
- `/orcamentos/[id]`
- `/orcamentos/[id]/preview`
- `/faturas`
- `/faturas/nova`
- `/faturas/[id]`
- `/faturas/[id]/preview`
- `/contratos`
- `/documentos`
- `/automacoes/webhooks`
- `/usuarios`
- `/auditoria`
- `/configuracoes`

## Componentes comuns

- `AppShell`.
- `Sidebar`.
- `Topbar`.
- `Breadcrumbs`.
- `DataTable`.
- `StatusBadge`.
- `PriorityBadge`.
- `SlaIndicator`.
- `Timeline`.
- `AttachmentList`.
- `A4PreviewFrame`.
- `MoneyInput`.
- `CnpjInput`.
- `ClientSelect`.
- `AssetSelect`.

## Dashboard

Cards:

- Chamados abertos.
- Chamados críticos.
- Faturas vencidas.
- Faturas a vencer.
- Orçamentos pendentes.
- Contratos vencendo.
- Ativos em manutenção.
- Últimas atividades.

## Busca global

Deve encontrar cliente, CNPJ, hostname, RustDesk ID, número de chamado, orçamento, fatura e contrato.
