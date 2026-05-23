# 00 — Visão Geral do Projeto

## Nome provisório

**Borges OS**. O nome representa um sistema operacional interno para gestão técnica, comercial e documental da Borges TI.

## Resumo executivo

A Borges TI hoje utiliza documentos manuais, HTML/CSS e planilhas para controlar orçamentos, faturas, contratos, inventário e documentação técnica. O Borges OS deve substituir esse fluxo por uma aplicação web interna com backend, banco relacional, geração de PDF A4, controle de chamados, inventário técnico, auditoria e automações.

## Problema atual

| Problema | Consequência |
|---|---|
| Documentos editados manualmente | Alto risco de erro e retrabalho |
| Inventário espalhado | Perda de controle sobre ativos, usuários e acessos |
| Chamados sem fluxo formal | Dificuldade de medir SLA e histórico técnico |
| Faturas e orçamentos sem banco | Baixa rastreabilidade comercial |
| Documentação técnica estática | Risco de versão desatualizada |
| Ausência de auditoria | Dificuldade de apurar alterações críticas |

## Objetivo principal

Criar uma aplicação web própria, segura e escalável para centralizar a operação da Borges TI.

## Objetivos secundários

- Padronizar documentos comerciais e técnicos.
- Gerar PDFs A4 profissionais e versionados.
- Controlar inventário por cliente.
- Formalizar abertura e encerramento de chamados.
- Vincular chamados a ativos, contratos e SLA.
- Controlar faturas, vencimentos e pagamento.
- Preparar webhooks para n8n.
- Permitir múltiplos usuários internos.
- Preparar base para portal do cliente no futuro.

## Público inicial

- Nathan Borges / Owner.
- Técnicos internos futuros.
- Usuários financeiros futuros.
- Administradores internos.

## Escopo do MVP

- Login.
- RBAC básico.
- Clientes e contatos.
- Inventário e usuários dos clientes.
- Chamados e encerramento.
- Orçamentos e faturas.
- PDF A4 de orçamento, fatura e encerramento.
- Auditoria.
- Storage S3/MinIO.
- Deploy Docker/Portainer.

## Fora do MVP

- Portal do cliente.
- Multi-tenant/SaaS completo.
- NFS-e.
- Assinatura digital.
- Coletor automático de inventário.
- Cofre de senhas próprio.
- App mobile.
- Integração profunda com AD/Microsoft 365.

## Princípios de produto

1. Cliente é o centro da operação.
2. Inventário é a base técnica.
3. Documento emitido não é sobrescrito.
4. Auditoria deve existir desde o começo.
5. Automatizar apenas depois de registrar corretamente.
6. Segurança antes de conveniência.
7. MVP pequeno, fundação forte.

## Critérios de sucesso do MVP

- Criar cliente real.
- Cadastrar inventário real.
- Abrir e encerrar chamado.
- Gerar orçamento PDF.
- Gerar fatura PDF.
- Salvar documentos no storage.
- Registrar auditoria.
- Rodar em Docker via Portainer.
