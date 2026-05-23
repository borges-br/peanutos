# 06 — Design Inicial da API

## Base

```txt
/api/v1
```

## Padrão de lista

```json
{
  "data": [],
  "pagination": { "page": 1, "pageSize": 20, "total": 0, "totalPages": 0 }
}
```

## Padrão de erro

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos.",
    "details": [],
    "requestId": "req_abc123"
  }
}
```

## Auth

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `POST /auth/change-password`

## Clients

- `GET /clients`
- `POST /clients`
- `GET /clients/:id`
- `PATCH /clients/:id`
- `DELETE /clients/:id`
- `GET /clients/:id/timeline`
- `GET /clients/:id/summary`

## Contacts

- `GET /clients/:clientId/contacts`
- `POST /clients/:clientId/contacts`
- `GET /clients/:clientId/contacts/:id`
- `PATCH /clients/:clientId/contacts/:id`
- `DELETE /clients/:clientId/contacts/:id`

## Inventory

- `GET /assets`
- `GET /clients/:clientId/assets`
- `POST /clients/:clientId/assets`
- `GET /clients/:clientId/assets/:assetId`
- `PATCH /clients/:clientId/assets/:assetId`
- `DELETE /clients/:clientId/assets/:assetId`
- `POST /clients/:clientId/assets/:assetId/status`
- `GET /clients/:clientId/assets/:assetId/history`

## Client users

- `GET /clients/:clientId/client-users`
- `POST /clients/:clientId/client-users`
- `GET /clients/:clientId/client-users/:id`
- `PATCH /clients/:clientId/client-users/:id`
- `DELETE /clients/:clientId/client-users/:id`

## Tickets

- `GET /tickets`
- `POST /tickets`
- `GET /tickets/:id`
- `PATCH /tickets/:id`
- `POST /tickets/:id/transition`
- `POST /tickets/:id/comments`
- `POST /tickets/:id/time-entries`
- `POST /tickets/:id/close`
- `POST /tickets/:id/generate-closure-pdf`

## Quotes

- `GET /quotes`
- `POST /quotes`
- `GET /quotes/:id`
- `PATCH /quotes/:id`
- `POST /quotes/:id/send`
- `POST /quotes/:id/accept`
- `POST /quotes/:id/reject`
- `POST /quotes/:id/cancel`
- `POST /quotes/:id/generate-pdf`

## Invoices

- `GET /invoices`
- `POST /invoices`
- `GET /invoices/:id`
- `PATCH /invoices/:id`
- `POST /invoices/:id/issue`
- `POST /invoices/:id/send`
- `POST /invoices/:id/mark-paid`
- `POST /invoices/:id/cancel`
- `POST /invoices/:id/generate-pdf`

## Webhooks

- `GET /webhooks/endpoints`
- `POST /webhooks/endpoints`
- `PATCH /webhooks/endpoints/:id`
- `DELETE /webhooks/endpoints/:id`
- `POST /webhooks/endpoints/:id/test`
- `GET /webhooks/deliveries`
- `POST /webhooks/deliveries/:id/retry`

## Permissões mínimas

`clients.read`, `clients.write`, `inventory.read`, `inventory.write`, `inventory.sensitive_read`, `tickets.read`, `tickets.write`, `tickets.close`, `quotes.read`, `quotes.write`, `invoices.read`, `invoices.write`, `invoices.mark_paid`, `contracts.read`, `contracts.write`, `documents.read`, `documents.write`, `webhooks.manage`, `audit.read`, `settings.manage`, `users.manage`.

## Idempotência

Usar `Idempotency-Key` em criação/emissão de documentos, pagamento, aceite e jobs críticos.
