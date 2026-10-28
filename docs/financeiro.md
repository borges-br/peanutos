# Financeiro: operação e próximas melhorias

## Decisões desta sessão

- O contrato tem mensalidade fixa, adicionais recorrentes com vigência/rateio e pontuais exclusivos da competência.
- O total precisa estar visível no contrato, com a composição e o mês selecionado.
- PDF e email devem ter prévia antes da emissão e do envio.
- Templates ficam no banco, com um padrão do workspace e seleção opcional por contrato. O editor segue a referência do CHÁCARA 8: texto, negrito, links, variáveis e prévia do mesmo renderizador do envio.
- A visão inicial de recebimentos usa o próximo mês calendário, por vencimento, separando projeções, rascunhos, emitidas em aberto e atrasos.
- A integração inicial é ASAAS, com Pix e boleto sugeridos por contrato. A escolha de gerar cobrança é individual por fatura. Não são criadas assinaturas financeiras paralelas no ASAAS.
- Configuração, credenciais e ambiente ficam na interface. A chave mestra de criptografia continua na infraestrutura.
- A integração tem um contrato de adaptador para outros provedores. Outros bancos ainda precisam de implementação e homologação próprias; cadastrar uma URL não os integra automaticamente.

## O que está disponível

### Total e prévia do contrato

O resumo **Total por competência**, no contrato, apresenta mensalidade, adicionais recorrentes, pontuais, descontos e total. Se o mês ainda não tem fatura, apresenta uma projeção pelas regras atuais, incluindo pontuais já lançados para o mês, sem estimar serviços ainda não registrados. Se existe fatura, apresenta seus valores salvos. Regras alteradas não substituem silenciosamente a fatura: o resumo mostra que ela precisa ser atualizada.

**Preparar rascunho e visualizar PDF** cria somente o rascunho e abre sua prévia. Não emite nem envia. Nas competências existentes, a prévia é acessada diretamente. Salve alterações antes de gerar ou atualizar o documento.

### Pontuais realizados em um mês e cobrados no seguinte

Em **Contrato > Itens**, selecione **Pontual · cobrar uma vez**, informe o valor, o mês do serviço e **Cobrar na fatura de**. Exemplo: conserto realizado em outubro, cobrar em novembro. O lançamento aparece no total e na previsão antes do rascunho, entra no PDF daquele mês e não se repete em dezembro. Itens incluídos na mensalidade apenas detalham o preço fixo; adicionais recorrentes repetem durante sua vigência.

Para um rascunho já existente, use **Atualizar itens do contrato** na fatura e confira novamente. A atualização traz também os pontuais lançados no contrato, preserva pontuais avulsos adicionados diretamente na fatura e mantém os documentos emitidos. Um pontual já faturado não pode ser transferido para outro mês pelo cadastro do contrato.

### Templates e envio

Abra **Comercial > Templates de email**. Cadastre nome, assunto e mensagem; o editor oferece negrito, links HTTPS e variáveis para cliente, fatura, contrato, competência, total, vencimento, empresa e fuso. HTML digitado é escapado. A prévia do editor usa dados fictícios e pode ser exibida na largura de celular.

Escolha um template em **Contrato > Recorrência**. Sem escolha específica, o workspace usa seu modelo padrão; sem modelo personalizado, usa o texto de cobrança integrado. Na fatura, **Visualizar email antes do envio** usa os dados e destinatários daquela competência. Visualizar não envia.

Ao conferir, o modelo e os valores são preservados para a cobrança. A edição posterior do template não muda uma conferência existente. Editar o rascunho remove a conferência e sua cópia, exigindo revisão. O HTML final é preservado na primeira tentativa de envio, inclusive para novas tentativas parciais. Um link bancário programado só existe depois da resposta do provedor; a prévia anterior não inventa esse link. O email final e o PDF incluem a página bancária confirmada.

### Previsão por vencimento

Em **Comercial > Recorrência Financeira**, o próximo mês aparece inicialmente; o mês é editável.

| Grupo | Conteúdo |
| --- | --- |
| Contratos a preparar | Mensalidade, adicionais vigentes e pontuais já lançados de competências que vencem no mês, ainda sem fatura. |
| Rascunhos | Valores efetivamente salvos em faturas ainda não emitidas, incluindo pontuais e descontos. |
| Emitidas em aberto | Faturas emitidas e não pagas com vencimento no mês. |
| Vencidos e não pagos | Atrasos até hoje, em uma lista separada. Não são somados automaticamente ao mês futuro. |

A fatura vinculada à competência substitui sua projeção. Competências pagas, canceladas ou ignoradas não são projetadas novamente. Emissões com vencimento no mês seguinte são consideradas pelo vencimento. Faturas antigas vinculadas a um contrato, mas sem competência identificada, geram alerta e suprimem uma projeção adicional ambígua; o sistema não presume que uma fatura avulsa seja uma mensalidade histórica.

Previsão não significa entrada confirmada. Os valores após materiais não são lucro: não descontam todas as despesas ou impostos. O quadro bancário separa bruto, tarifas conhecidas e líquido informado pelo provedor. Não some esses valores novamente às faturas pagas: representam detalhamentos dos mesmos recebimentos.

## Configuração do ASAAS

Somente OWNER/ADMIN configuram as credenciais. OWNER/ADMIN/FINANCIAL podem revisar faturas e solicitar/conferir cobranças.

1. Em **Configurações > Integrações > Cobranças bancárias**, selecione **Sandbox** e salve sua chave daquele ambiente.
2. Defina um token de webhook diferente da chave de API, com 32–255 caracteres sem espaços. Salve-o na configuração e cadastre o mesmo valor no ASAAS. Campos vazios preservam as credenciais; elas não são devolvidas pela API.
3. Use **Testar autenticação salva**. O teste faz uma consulta e não cria cliente, cobrança ou movimentação. Não comprova recebimento do webhook.
4. Na configuração de webhooks do ASAAS do mesmo ambiente, cadastre a URL mostrada na interface, o token e os eventos mostrados. A URL precisa responder diretamente por HTTPS; não use redirecionamento. O header recebido é `asaas-access-token`.
5. Habilite a conexão. Configure no contrato a forma sugerida, Pix ou boleto. Isso não agenda cobranças sozinho.
6. Use um cliente fictício e uma fatura de teste. Selecione a conexão e a forma em cada fatura. No rascunho, **Programar cobrança na emissão** grava uma intenção, sem chamar o ASAAS, e remove a conferência anterior. É possível remover essa programação antes de emitir. Confira novamente após a escolha.
7. Ao emitir a fatura, o worker cria a cobrança escolhida. Também é possível gerar individualmente a cobrança de uma fatura já emitida. Nesta versão, o vencimento precisa estar vigente; uma renegociação de vencidos exige revisão do financeiro.
8. Uma cobrança de produção programada precisa ter geração/link confirmados antes do PDF definitivo e do email automático. Falhas ficam na fatura e pausam esse envio. Uma cobrança criada depois de um PDF/email já finalizado não reescreve o documento histórico nem dispara outro email sozinha; seu link permanece acessível na fatura.
9. Confira valores, CPF/CNPJ, Pix/boleto, URL de pagamento e webhook no Sandbox. Simulações não alteram a baixa da fatura real, não entram no livro de recebimentos reais e não colocam links de Sandbox nos documentos reais.
10. Só depois homologue uma operação controlada com a conexão de produção. Sandbox e produção têm credenciais e tokens separados. Nenhuma chave é colocada no Git ou em uma nova variável de ambiente.

Novos clientes criados por esta integração têm notificações do ASAAS desabilitadas, pois o PeanutOS controla o email. Clientes já existentes na conta não têm suas preferências alteradas: confira as notificações desses cadastros para evitar mensagens paralelas.

## Conciliação e falhas

- O mesmo evento de webhook pode chegar mais de uma vez. A entrada usa chave única por conexão/evento e só confirma HTTP 200 após a gravação. O worker consulta o estado atual no ASAAS antes da baixa; não usa o valor recebido no POST como verdade financeira.
- `CONFIRMED` indica pagamento confirmado com saldo ainda não disponibilizado. `RECEIVED` confirma o recebimento disponível e permite a baixa automática em produção. Datas financeiras usam o fuso do workspace.
- Uma referência estável identifica cada cobrança. Timeout ou resposta inconclusiva grava **Confirmação pendente**, sem repetir o POST automaticamente. **Conciliar situação no provedor** tenta localizar a cobrança pela referência; confira também o painel do ASAAS. Se não houver resposta conclusiva, mantenha a revisão humana e não gere outra cobrança às cegas.
- Vários cadastros para o mesmo CPF/CNPJ, diferenças de valor/cliente/vencimento/referência ou estornos parciais ficam em revisão, sem baixa falsa.
- Um estorno integral desfaz o recebimento anterior e reabre a fatura. Isso não cancela o compromisso comercial sozinho: se a dívida foi cancelada, o financeiro deve cancelar a fatura. Tarifas/líquido de estorno não confirmados são apresentados como pendentes de conferência, não estimados como lucro.
- Uma cobrança bancária de produção ativa impede marcar a fatura como paga ou cancelada apenas localmente. Concilie o recebimento ou cancele a cobrança no provedor e sincronize, evitando deixar um meio de pagamento ativo para uma fatura descartada.
- Falhas de webhook têm tentativas limitadas e ficam registradas. Confira também os logs/fila no ASAAS; há conciliação manual na fatura. Nenhum estorno, transferência de saldo ou pagamento de despesa é iniciado automaticamente.

## Implantação e validação

Aplique `20261028010000_financial_email_templates` e `20261028020000_financial_gateway` com backup antes de iniciar a nova API/worker. As migrations são aditivas; não habilitam gateways nem criam cobranças em registros antigos. Preserve a chave mestra e o volume de arquivos.

Os testes locais usam PostgreSQL descartável e respostas ASAAS simuladas, além do navegador e PDFs sintéticos. Eles não substituem homologação com chave Sandbox, webhook público, credenciais de produção ou entrega real na caixa postal. Não houve criação de cobrança real ou envio a clientes durante a validação.

Referências oficiais: [criar cobrança](https://docs.asaas.com/reference/criar-nova-cobranca), [listar clientes](https://docs.asaas.com/reference/listar-clientes), [criar cliente e notificações](https://docs.asaas.com/reference/criar-novo-cliente), [eventos de cobrança](https://docs.asaas.com/docs/webhook-para-cobrancas), [receber webhooks](https://docs.asaas.com/docs/receba-eventos-do-asaas-no-seu-endpoint-de-webhook).

## Brainstorm priorizado

| Prioridade | Evolução | Benefício concreto | Custo e cuidado |
| --- | --- | --- | --- |
| 1 | Central de contas a receber por cliente, saldo, cobrança, baixa e estorno | Reduz o trabalho de descobrir quem deve e quais ações faltam. | Consolidar pagamentos parciais, recebimentos manuais e gateway no mesmo histórico, com estorno auditável. |
| 1 | Painel de exceções de integração e conciliação | Evita cobranças travadas sem ação visível. | Ações de recuperação precisam confirmar o estado externo antes de permitir nova criação. |
| 1 | Inadimplência por faixas de atraso e régua de cobrança configurável | Prioriza cobranças e reduz esquecimentos. | Lembretes precisam de revisão dos destinatários, pausa por cliente e bloqueio após pagamento. Não ativar mensagens retroativas em lote. |
| 2 | Contas a pagar, fornecedores, categorias e centros de custo | Permite prever saídas e compreender margem por cliente/contrato. | Começar pelo lançamento/aprovação; pagar no banco é uma ação distinta, com controle próprio. |
| 2 | Fluxo de caixa previsto versus realizado | Mostra pressão de caixa antes do vencimento. | Exige saldos de abertura, entradas/saídas, transferências entre contas e separação entre competência e caixa. |
| 2 | Conciliação por extrato OFX/CSV | Atende bancos ainda sem adaptador e reduz baixas manuais. | Sugerir correspondências e confirmar ambiguidades; não dar baixa apenas por coincidência de valor. |
| 2 | Reajustes de contrato com data de vigência e simulação | Evita alterações manuais em cada mensalidade. | Exige histórico do acordo, regra de arredondamento e preservação das faturas emitidas. |
| 3 | Resultado por cliente, contrato e serviço | Identifica serviços que consomem margem. | Precisa de custos e horas confiáveis; não rotular receita líquida de tarifas como lucro. |
| 3 | Novos bancos, cartão hospedado e portal do cliente | Amplia os meios e reduz atendimento manual. | Homologar cada adaptador e webhook; cartão deve usar o fluxo hospedado do provedor. |

A próxima entrega recomendada é **central de contas a receber com saldo e histórico de pagamentos/estornos**, seguida do painel de exceções. Contas a pagar e fluxo de caixa vêm depois: sem uma base consistente de recebimentos, os indicadores ficariam incompletos.
