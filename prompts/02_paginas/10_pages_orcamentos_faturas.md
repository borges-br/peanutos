# Orçamentos e Faturas

## Objetivo

Especificar as páginas e fluxos relacionados a orçamentos e faturas.

## Área 1

Lista e editor de orçamentos com itens, totais, validade, observações e preview PDF.

### Componentes

- Cabeçalho contextual.
- Filtros.
- Tabela ou formulário.
- Estados vazios.
- Estados de erro.
- Ações conforme permissão.

### Critérios de aceite

- Deve respeitar RBAC.
- Deve possuir loading e feedback de erro.
- Deve registrar auditoria em ações críticas quando aplicável.
- Deve usar paginação em listas.

## Área 2

Lista e editor de faturas com emissão, vencimento, PIX, status, pagamento e PDF.

### Componentes

- Cabeçalho contextual.
- Filtros.
- Tabela ou formulário.
- Estados vazios.
- Estados de erro.
- Ações conforme permissão.

### Critérios de aceite

- Deve respeitar RBAC.
- Deve possuir loading e feedback de erro.
- Deve registrar auditoria em ações críticas quando aplicável.
- Deve usar paginação em listas.

## Área 3

Ações por status: rascunho, enviado, aceito, emitida, paga, vencida e cancelada.

### Componentes

- Cabeçalho contextual.
- Filtros.
- Tabela ou formulário.
- Estados vazios.
- Estados de erro.
- Ações conforme permissão.

### Critérios de aceite

- Deve respeitar RBAC.
- Deve possuir loading e feedback de erro.
- Deve registrar auditoria em ações críticas quando aplicável.
- Deve usar paginação em listas.
