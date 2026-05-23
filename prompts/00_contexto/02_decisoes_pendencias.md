# 02 — Decisões, Pendências e Pontos de Atenção

## Decisões confirmadas

| Decisão | Status |
|---|---|
| Monorepo pnpm + Turborepo | Confirmada |
| Next.js no frontend | Confirmada |
| NestJS modular monolith no backend | Confirmada |
| PostgreSQL + Prisma | Confirmada com cautela em consultas complexas |
| Redis + BullMQ | Confirmada |
| Playwright para PDF | Confirmada, mas isolado em worker |
| MinIO/S3 | Confirmada |
| Docker Compose/Portainer | Confirmada |
| Webhooks HMAC para n8n | Confirmada |
| Inventário como módulo central | Confirmada |

## Pendências de decisão

| ID | Tema | Decisão pendente | Recomendação inicial |
|---|---|---|---|
| D001 | Nome final | Borges OS ou outro | Manter Borges OS provisório |
| D002 | Auth | JWT, sessão ou híbrido | Cookie HTTP-only com sessão/JWT curto |
| D003 | Numeração | Formato definitivo | Sequência por tipo e ano |
| D004 | SLA | Feriados e pausas | Começar com horário comercial simples |
| D005 | Criptografia | Quais campos no MVP | Criptografar secrets/webhooks e sensitiveData |
| D006 | Portal cliente | Quando iniciar | Fora do MVP |
| D007 | Importação inventário | Fase exata | Após CRUD estável |
| D008 | Coletor automático | Agente/script | Futuro |
| D009 | E-mail | SMTP simples ou n8n | SMTP simples + n8n futuro |
| D010 | NFS-e | Implementar ou não | Fora do MVP |

## Pontos de atenção

### Escopo

O sistema é grande. Evitar iniciar todos os módulos ao mesmo tempo. Seguir roadmap por fases.

### Segurança

O inventário conterá dados sensíveis de clientes. RBAC, auditoria, storage privado e logs sanitizados são obrigatórios.

### PDF

Playwright consome recursos. Usar worker dedicado, concorrência 1 no início e versão fixada da imagem.

### Prisma

Evitar includes profundos. Usar paginação e selects explícitos. Criar índices desde o início.

### Multi-tenant futuro

Não implementar SaaS no MVP, mas usar `workspaceId` nas entidades principais.

## Perguntas antes de codar

1. O formato atual de número de orçamento/fatura deve ser mantido exatamente?
2. Fatura pode ter pagamento parcial?
3. Chamado pode ser fechado sem ativo vinculado?
4. Franquia presencial será por visita, hora ou chamado?
5. Quem poderá ver dados financeiros?
6. Quem poderá ver campos sensíveis de inventário?
7. Documentação técnica será por blocos, Markdown ou ambos?
8. Qual será o e-mail SMTP de envio?
9. Backups serão enviados para Wasabi/S3?
10. O sistema ficará em VPS única ou servidor próprio?
