# Fuso horário e documentos

O fuso fica em `Workspace.timeZone`, com identificador IANA (por exemplo, `America/Sao_Paulo`, `America/Manaus`, `Europe/Lisbon`) ou `UTC`. O padrão inicial é `America/Sao_Paulo`. Ele é alterado em **Configurações > Geral > Fuso Horário** por OWNER/ADMIN. Os demais perfis podem consultar. A API valida o valor, limita a alteração ao workspace autenticado e grava auditoria na mesma transação.

Não há variável de ambiente de fuso. A configuração do sistema operacional/container não define a data impressa. Execute o migrator antes de iniciar as versões novas.

| Fluxo | Comportamento |
| --- | --- |
| Prévia HTML e PDF de fatura | Emissão, vencimento e rodapé usam a mesma regra de formatação. |
| Prévia HTML e PDF de orçamento | Emissão, validade e rodapé usam a mesma regra de formatação. |
| Prévia HTML e PDF de O.S. | Criação e agendamento/conclusão usam o fuso; o agendamento inclui o horário. |
| Rodapé | Exibe a data/hora de geração e o identificador do fuso. |
| Metadados do PDF novo | Registram o fuso usado na emissão. |
| Documentos existentes e uploads manuais | Conteúdo preservado. Um PDF já emitido não muda ao trocar o fuso. |
| Contratos/relatórios | O renderer compartilhado aceita o fuso; a aplicação atual só automatiza PDFs de fatura, orçamento e O.S. Documentos enviados manualmente não são reinterpretados. |
| Interface | Formata datas/horários usando o fuso recebido na sessão, inclusive a central de documentos. Sessões antigas atualizam no foco, na renovação periódica ou ao recarregar. |
| Webhooks e banco | Instantes permanecem em UTC/ISO; as comparações de dia/mês no worker usam o fuso do workspace. |

Datas civis sem horário (vencimento, validade e datas contratuais) não devem perder um dia por conversão de UTC. O sistema anterior enviava esses campos como meia-noite UTC. Essa representação histórica é preservada para esses campos. Horários reais, como criação, geração e agendamento de O.S., são convertidos ao fuso escolhido. O formulário de agendamento informa o fuso e converte o horário local para UTC; horários inexistentes em uma transição de horário de verão são rejeitados. Em horários repetidos de fim de horário de verão, a conversão usa a primeira solução encontrada, de forma determinística.

As rotinas periódicas consultam o fuso atual do workspace em cada execução. O worker consulta um relógio técnico a cada minuto em UTC; a verificação de alertas usa o intervalo definido em Configurações > Operação (padrão: 60 minutos). A troca do fuso não reescreve PDFs ou eventos financeiros já persistidos. Webhooks de vencimento e renovação podem ter atraso de até o intervalo de consulta.

## Conferência após implantar

1. Salve `America/Sao_Paulo` e recarregue a tela. Confira a persistência; tente alterar com perfil sem permissão e confirme o bloqueio.
2. Gere prévia e PDF dos três tipos e confira o fuso no rodapé. Em instantes próximos à meia-noite UTC, São Paulo deve mostrar o dia anterior, quando aplicável.
3. Troque para `UTC` ou `Asia/Tokyo` e emita novas versões. A data/hora de emissão deve mudar de acordo com o fuso; um vencimento digitado como data civil deve conservar o dia.
4. Confira agendamento de O.S. em um navegador cujo fuso seja diferente: o horário escolhido deve corresponder ao fuso indicado no formulário e nos documentos.
5. Baixe o PDF antigo: seus bytes e seu conteúdo devem permanecer iguais.

Os testes automatizados em `tests/storage-timezone.test.cjs` cobrem conversões, limites de dia, arquivos privados, migração/verificação e os emissores de prévias/PDF com banco, filas e motor de PDF simulados. A conferência acima continua necessária no ambiente implantado.

A fila de [cobrança mensal dos contratos](contract-billing.md) consulta a programação a cada minuto. A primeira emissão congela os dados usados no PDF; regenerações conservam o fuso e o conteúdo dessa emissão.
