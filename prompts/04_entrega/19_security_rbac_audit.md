# 19 — Segurança, RBAC, Auditoria e LGPD

## Dados sensíveis

- CNPJ/CPF.
- Contatos.
- Valores financeiros.
- Contratos.
- Hostnames.
- IPs internos.
- RustDesk IDs.
- Topologia de rede.
- Permissões de usuários.
- Anexos.
- Referências de credenciais.

## Papéis

- OWNER.
- ADMIN.
- TECHNICIAN.
- FINANCIAL.
- READ_ONLY.

## Permissões

- `clients.read/write/delete`.
- `inventory.read/write/sensitive_read`.
- `tickets.read/write/close`.
- `quotes.read/write/approve`.
- `invoices.read/write/mark_paid`.
- `contracts.read/write`.
- `documents.read/write`.
- `webhooks.manage`.
- `audit.read`.
- `settings.manage`.
- `users.manage`.

## Regras

- Hash forte de senha.
- Rate limit no login.
- Cookie HTTP-only preferencial.
- Nunca logar senha, token ou secret.
- Storage privado.
- URL assinada para download.
- Webhook secret criptografado.
- Logs sanitizados.
- Auditoria em ações sensíveis.

## Auditoria obrigatória

- Login/falha.
- Alteração de cliente.
- Alteração de inventário.
- Emissão de PDF.
- Alteração financeira.
- Fechamento de chamado.
- Alteração de contrato.
- Configuração de webhook.
- Alteração de usuário/permissão.

## Checklist MVP

- [ ] HTTPS.
- [ ] RBAC.
- [ ] Auditoria.
- [ ] Rate limit.
- [ ] Storage privado.
- [ ] Secrets fora do Git.
- [ ] Backups.
- [ ] Logs sanitizados.
