# 22 — Estratégia de Testes e Qualidade

## Unitários

- Cálculo de totais.
- Validação de CNPJ/CPF.
- Formatação de moeda.
- Máquina de estados do chamado.
- Cálculo de SLA.
- HMAC webhook.
- Hash de PDF.

## Integração

- Criar cliente.
- Criar ativo.
- Abrir chamado.
- Encerrar chamado.
- Criar orçamento.
- Criar fatura.
- Criar job PDF.
- Enviar webhook fake.

## E2E

- Login → criar cliente → criar ativo.
- Cliente → abrir chamado → encerrar.
- Orçamento → PDF.
- Fatura → PDF → marcar paga.

## PDF

Testar:

- 1 item.
- Muitos itens.
- Contrato longo.
- Tabela longa.
- Página A4.
- Sem página em branco extra.

## Segurança

- Sem permissão.
- IDOR.
- Rate limit.
- Upload inválido.
- Secret não exibido.
- Logs sem dados sensíveis.
