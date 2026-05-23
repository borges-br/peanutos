# 01 — Contexto e Regras de Negócio

## Entidade central

O **Cliente** é a entidade central. Quase tudo deve se conectar a ele: contatos, inventário, usuários, chamados, contratos, orçamentos, faturas, documentos e timeline.

```txt
Cliente
├── Contatos
├── Usuários do cliente
├── Inventário
├── Contratos
├── Chamados
├── Orçamentos
├── Faturas
├── Documentos
└── Timeline
```

## Workspace

Mesmo sendo sistema interno, as principais tabelas devem possuir `workspaceId`. No MVP haverá apenas o workspace Borges TI. Isso reduz retrabalho caso o sistema evolua para multiempresa/SaaS.

## Regra: PDF emitido é snapshot

Um PDF emitido para cliente é imutável. Se houver alteração, gerar nova versão/snapshot. Nunca sobrescrever silenciosamente um PDF antigo.

## Regras de cliente

- Cliente pode ser empresa ou pessoa.
- Cliente pode ter múltiplos contatos.
- Cliente pode ter múltiplos endereços.
- Cliente pode estar ativo, inativo, prospect ou arquivado.
- Cliente arquivado não deve perder histórico.

## Regras de inventário

- Todo ativo pertence a um cliente.
- Ativo pode estar vinculado a usuário do cliente.
- Ativo pode ter histórico.
- Ativo pode ter chamados vinculados.
- Ativo pode aparecer em documentação técnica.
- RustDesk ID, IPs internos e observações técnicas são dados sensíveis.
- Senhas de clientes não devem ser armazenadas em texto puro.

## Regras de usuários dos clientes

Usuários dos clientes não são usuários internos do Borges OS. Devem ser tratados como registros de inventário/gestão operacional.

Campos importantes:

- Nome.
- E-mail.
- Departamento.
- Cargo.
- Equipamento principal.
- Permissões de pasta.
- Impressoras.
- Horário de acesso.
- Cota de armazenamento.
- Status.

## Regras de orçamento

Status:

- `DRAFT`.
- `SENT`.
- `ACCEPTED`.
- `REJECTED`.
- `EXPIRED`.
- `CANCELLED`.

Regras:

- Rascunho pode ser editado.
- Orçamento enviado deve preservar PDF.
- Orçamento aceito pode gerar fatura, contrato ou chamado/projeto.
- Orçamento expirado exige renovação.
- Backend calcula totais.

## Regras de fatura

Status:

- `DRAFT`.
- `ISSUED`.
- `SENT`.
- `PAID`.
- `OVERDUE`.
- `CANCELLED`.
- `VOIDED`.

Regras:

- Fatura emitida gera snapshot PDF.
- Fatura paga registra usuário e data.
- Fatura cancelada não deve ser apagada.
- Fatura pode vir de orçamento, contrato ou chamado.
- Fatura vencida pode ser marcada por job.

## Regras de chamados

Status:

- `OPEN`.
- `TRIAGE`.
- `IN_PROGRESS`.
- `WAITING_CLIENT`.
- `WAITING_THIRD_PARTY`.
- `RESOLVED`.
- `CLOSED`.
- `CANCELLED`.

Prioridades:

- `LOW`.
- `MEDIUM`.
- `HIGH`.
- `CRITICAL`.

Regras:

- Não usar status livre.
- Transições inválidas devem ser bloqueadas.
- Cliente é obrigatório.
- Ativo é recomendado.
- Fechamento exige encerramento técnico.
- Chamado fechado gera evento.

## Regras de contrato

- Contrato pode definir SLA.
- Contrato pode definir franquia presencial/remota.
- Contrato pode gerar fatura recorrente.
- Contrato ativo não deve ser editado sem versionamento.
- Aditivo ou alteração relevante gera nova versão.

## Regras de webhooks

- Webhooks são assíncronos.
- Devem usar Event Outbox.
- Envio deve ser feito por worker.
- Payload deve ser assinado com HMAC.
- Falhas devem registrar retry.
- Secret nunca deve ser exibido após salvo.

## Regras de auditoria

Auditar:

- Login e falha de login.
- Criação/edição de cliente.
- Alterações em inventário.
- Emissão de PDFs.
- Alterações financeiras.
- Fechamento de chamados.
- Alterações de contrato.
- Webhooks e configurações.
- Gestão de usuários internos.
