# Configurações pela interface e migração da `.env`

As opções de negócio são persistidas por workspace no PostgreSQL. Somente OWNER/ADMIN podem consultar ou alterar SMTP e operação. A API usa o workspace da sessão; alterações geram auditoria. A migration `20261027020000_workspace_operational_settings` é aditiva e preserva os registros existentes.

| Configuração | Onde administrar | Padrão inicial |
| --- | --- | --- |
| Servidor, porta, TLS, usuário, senha, remetente e resposta | Configurações > Integrações > Servidor de email (SMTP) | Desativado |
| Duração da sessão | Configurações > Operação | 45 minutos |
| Aviso de fatura a vencer | Configurações > Operação, também disponível em Webhooks | 72 horas; preserva o valor já cadastrado |
| Aviso de encerramento de contrato | Configurações > Operação | 15 dias |
| Feedback após resolução de chamado | Configurações > Operação | 24 horas |
| Intervalo de verificação de alertas | Configurações > Operação | 60 minutos |
| Limite de tentativas de webhook | Configurações > Operação | 5, incluindo a primeira tentativa |
| Tempo limite de webhook | Configurações > Operação | 10.000 ms |
| Fuso e identidade/documentos da empresa | Configurações > Geral / Empresa | Valores existentes |

SMTP aceita STARTTLS ou TLS direto, com validação de certificados. Senhas são criptografadas com AES-256-GCM e não voltam ao navegador, aos registros de auditoria ou à fila de testes. Campo vazio preserva a senha; a remoção é explícita e exige desativar o envio se houver usuário configurado. Para relay sem autenticação, deixe o usuário vazio e restrinja o relay no servidor SMTP.

Salvar e testar são operações separadas. **Testar conexão salva** verifica conexão e autenticação no worker e não envia email. Isso não comprova que o provedor aceita o remetente nem a entrega na caixa de entrada. Um teste deixa de valer quando a configuração muda. Alterações simultâneas de SMTP são recusadas pela revisão do registro; recarregue antes de tentar salvar novamente.

O worker lê a configuração atual de cada empresa ao processar um envio. SMTP desativado, incompleto ou com chave inválida pausa pendências sem gastar tentativas; após a correção, elas voltam ao processamento. Envios já iniciados podem terminar. Antes de ativar ou trocar o SMTP, confira as cobranças aprovadas pendentes e seus destinatários. A fila mensal verifica datas a cada minuto; o intervalo de alertas não adia a emissão mensal. O limite de tentativas é copiado para novas entregas de webhook; testes manuais de webhook fazem uma tentativa. A duração de sessão vale na próxima emissão/renovação de token, sem revogar tokens emitidos.

## O que permanece no ambiente

- Conexões com PostgreSQL/Redis, domínios, URLs, CORS, portas, imagens/rede do Docker e ambiente de execução.
- `JWT_SECRET`, `APP_ENCRYPTION_KEY` e `WEBHOOK_ENCRYPTION_KEY`: chaves necessárias para carregar dados protegidos e validar sessões. `APPLICATION_ENCRYPTION_KEY` permanece como compatibilidade quando explicitamente usada em uma instalação antiga.
- `STORAGE_PATH`, `API_BODY_LIMIT_BYTES`, `PDF_MAX_CONCURRENCY` e `WEBHOOK_MAX_CONCURRENCY`: recursos e limites dos processos compartilhados.

API e worker precisam da mesma chave de criptografia, válida com 32 bytes. Preserve as chaves junto ao backup protegido do banco. Não gere outra chave para resolver um erro em uma instalação com dados criptografados: isso torna as credenciais e os dados anteriores ilegíveis. A configuração SMTP fica em tabela separada e não é incluída nas consultas comuns de workspace.

## Preservar e importar configurações de uma instalação existente

O código novo não lê SMTP nem regras operacionais da `.env`. Os templates e o Compose já foram limpos. O arquivo `.env` privado existente não é apagado nem reescrito automaticamente: ele pode ser a única cópia das credenciais antigas.

1. Faça backup protegido do banco, da `.env`/variáveis do Portainer e das chaves mestras. Aplique as migrations e use versões correspondentes de API, worker e web. Mantenha o envio automático desativado até conferir o resultado.
2. Escolha explicitamente o UUID do workspace. A importação nunca escolhe automaticamente uma empresa nem replica uma conta SMTP entre empresas.
3. Em uma cópia administrativa com as dependências e pacotes compilados, execute a simulação na raiz do repositório. O ambiente atual deve apontar para o banco desejado e fornecer a chave mestra; o arquivo indicado é a origem dos valores antigos. O comando consulta o banco, valida limites e não grava:

```bash
node apps/api/scripts/import-env-settings.cjs --workspace=UUID-DO-WORKSPACE --file=/caminho-protegido/env-legado
```

4. Confira o destino antes de repetir com `--apply`:

```bash
node apps/api/scripts/import-env-settings.cjs --workspace=UUID-DO-WORKSPACE --file=/caminho-protegido/env-legado --apply
```

A importação criptografa a senha, grava auditoria e mantém o SMTP **desativado**. Operação e SMTP são gravados na mesma transação. Nenhum email é enviado e o arquivo de origem é preservado. Se o workspace já tiver configuração SMTP, a importação é recusada para evitar sobrescrita; ajuste pela interface. Duração antiga aceita minutos, horas ou dias dentro dos limites atuais. Cron personalizado precisa ser convertido manualmente para o intervalo pela interface; não é convertido silenciosamente.

5. Confira os campos na interface, teste a conexão e homologue com destinatários internos. A senha será indicada como cadastrada, sem exibição de seu conteúdo. Revise cobranças pendentes antes de ativar o envio.
6. Somente após a conferência, remova da configuração ativa do servidor os nomes abaixo. Mantenha o backup protegido conforme sua política de retenção. Nunca copie credenciais para este guia, Git, relatórios ou variáveis `NEXT_PUBLIC_*`.

Variáveis substituídas: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`/`SMTP_PASSWORD`, `SMTP_FROM`/`SMTP_FROM_EMAIL`, `JWT_EXPIRES_IN`, `WEBHOOK_INVOICE_DUE_SOON_HOURS`/`WEBHOOK_INVOICE_DUE_SOON_DAYS`, `WEBHOOK_CONTRACT_ENDING_SOON_DAYS`, `WEBHOOK_TICKET_FEEDBACK_HOURS_AFTER_RESOLVED`, `WEBHOOK_MAX_ATTEMPTS`, `WEBHOOK_TIMEOUT_MS`, `BILLING_SCHEDULE_CRON`.

Variáveis sem implementação efetiva também removidas dos templates: `NEXT_PUBLIC_BRAND_NAME`, `NEXT_PUBLIC_COMPANY_NAME`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `REFRESH_TOKEN_SECRET`, `REFRESH_TOKEN_EXPIRES_IN`, `COOKIE_SECURE`, `COOKIE_DOMAIN`, `PORT_WEB`, `PORT_WORKER`, `WEBHOOK_SIGNING_SECRET` e `LOG_LEVEL`. A assinatura dos webhooks usa o segredo de cada endpoint cadastrado, protegido por `WEBHOOK_ENCRYPTION_KEY`.

## Validação

As suítes `test:settings:postgres` e `test:settings:ui` cobrem senha criptografada, preservação/substituição/remoção, concorrência, auditoria, isolamento, permissões, duração real do token, teste sem envio, importação e formulários em desktop/mobile. O runner PostgreSQL aplica todas as migrations em um container descartável, restrito a loopback; não usa o banco da aplicação. A suíte de cobrança também verifica pausa e retomada por configuração SMTP.

Esses testes locais não confirmam configuração do provedor nem operação no servidor publicado. A atualização não foi implantada automaticamente e nenhuma credencial real foi importada ou testada.
