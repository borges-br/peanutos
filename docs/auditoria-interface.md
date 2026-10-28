# Auditoria e evolução da interface — 28/10/2026

## Direção de produto

Priorizar o trabalho: encontrar um cliente, atender, lançar um serviço e conferir a cobrança. O visual usa superfícies azul-petróleo, destaque menta, iluminação discreta e tipografia local. A navegação agrupa tarefas, permite fixar favoritos e apresenta somente ações disponíveis ao perfil. Tabelas continuam úteis para comparar registros; o inventário começa por clientes e abre a tabela depois da escolha.

Não foram adicionadas métricas ilustrativas para preencher espaço. Foram removidos o horário fixo e o ambiente fictício do rodapé, o módulo/licença ilustrativos e contagens administrativas sem fonte.

## Revisão pelas dez heurísticas de Nielsen

| Critério                      | Problema encontrado                                         | Correção e evidência                                                                                                                                            |
| ----------------------------- | ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Estado visível             | Busca sem resposta; modelos sem indicação de edição         | Busca mostra carregamento, falha e resultados; editor distingue alterações pendentes, salvando e salvo; loading/error de rota; botões mostram espera.           |
| 2. Linguagem do trabalho      | Pontuais confundidos com mensalidade; nomenclatura técnica  | Três tipos de cobrança; mês do serviço separado de mês da fatura; modelos de email/PDF; previsão de recebimentos; mensagens de erro sem detalhes de servidor.   |
| 3. Controle e liberdade       | Alterações de modelos podiam se perder; controles sem saída | Descartar, aviso ao trocar modelo/sair, desfazer/refazer no editor, Esc na busca, restauração da aparência, filtros removíveis.                                 |
| 4. Consistência               | Preto/cinza fixos, componentes e títulos divergentes        | Tokens comuns, navegação única, títulos corretos, estados e foco compartilhados nas páginas. PDF mantém a apresentação de documento.                            |
| 5. Prevenção de erros         | Conserto oferecido como recorrência; resultado incoerente   | Pontual tem realização/cobrança obrigatórias; servidor e banco validam os meses; competência única; cobrança emitida protege o lançamento original.             |
| 6. Reconhecimento             | Tudo dependia de memorizar o menu                           | Busca por intenção/sinônimos, nomes e números; favoritos; clientes com contrato primeiro; inventário por cliente; variáveis inseridas por nomes compreensíveis. |
| 7. Eficiência e flexibilidade | Sem atalhos funcionais ou preferências                      | Ctrl/Cmd K, setas/Enter, destinos ordenados por uso na busca, menu Criar real, favoritos, cor, densidade, contraste, texto e movimento.                         |
| 8. Estética e síntese         | Parede de explicações e botões de variáveis                 | Editor visual com ações agrupadas, prévia de email, organização por cliente, remoção de recursos decorativos/inativos e textos de implementação.                |
| 9. Recuperação de erros       | Erro genérico sem caminho de retorno                        | Tentar novamente, formulários mantêm o conteúdo, erro de prévia separado do erro ao salvar, conflitos de versão continuam protegidos.                           |
| 10. Ajuda contextual          | Ajuda do topo não fazia nada                                | Ajuda e atalhos acessíveis sob demanda; nomes claros; guias financeiros e esta auditoria no repositório.                                                        |

As heurísticas orientam uma revisão qualitativa; não constituem uma certificação automática. O relatório distingue inspeção de código, testes automatizados e validação visual. A varredura cobre as 49 páginas encontradas, incluindo entrada e configuração inicial; isso não equivale a testar todas as combinações de dados e permissões de todos os formulários.

## Escopo transversal e funcional

- Estrutura compartilhada: barra superior, navegação, favoritos, busca, rodapé, foco, contraste, tokens, botões, campos, tabelas, estados vazios e erros.
- Telas com reorganização específica: início, clientes, inventário, contrato/itens/resumo, modelos de email, aparência, preferências de notificações, perfil, configurações e atalhos do cadastro do cliente.
- Chamados, ordens de serviço, orçamentos, faturas, documentos, modelos de PDF, automações, auditoria e páginas internas recebem os componentes e aparência compartilhados. Seus processos de negócio existentes foram preservados.
- `node scripts/audit-interface.cjs` enumera páginas e candidatos a botões sem ação; é uma inspeção estática, não prova de que todo botão está correto. Resultado em `data/qa/ui-audit/source-audit.json`.
- Testes com PostgreSQL descartável: outubro → novembro, preparo concorrente sem duplicação, atualização explícita do rascunho, dezembro sem repetição, imutabilidade depois da emissão, isolamento e busca real.
- Testes no navegador com dados sintéticos: contratos/faturas, editor e prévias, grupos de clientes, inventários, busca pelo teclado, preferências persistentes, permissões e dimensões móveis. As capturas ficam em `data/qa/contract-billing/`.

## Pontuais

`Pontual · cobrar uma vez` registra mês do serviço e mês da cobrança. Um serviço de outubro pode entrar na fatura de novembro sem alterar a mensalidade. A prévia e a previsão consideram esse lançamento antes do rascunho. O rascunho existente exige atualização explícita dos itens e nova conferência; uma fatura emitida permanece preservada. Chamado/O.S. continuam opcionais na fatura.

## Busca e personalização

A busca combina um catálogo local de intenções/sinônimos para telas e ações com busca textual em português no PostgreSQL, aproximação de flexões/prefixos e identificação literal. Consulta clientes, equipamentos, chamados, contratos, ordens, orçamentos, faturas e itens do contrato, respeitando permissões e empresa. Não envia cadastros a um serviço de IA externo e não interpreta consultas analíticas livres como um assistente conversacional.

Preferências visuais, favoritos e uso da busca são individuais, salvos neste navegador por empresa/usuário. Configurações de negócio continuam no banco. O modo noturno permanece; não foi introduzido um tema claro incompleto. Transições discretas usam a referência de modal do transitions.dev e respeitam redução de movimento do dispositivo e a preferência da aplicação. Fontes e ícones são servidos localmente com suas licenças.

## Brainstorm e próxima revisão

| Evolução                                               | Ganho                                                                | Critério para avançar                                                                                                 |
| ------------------------------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Testes com o usuário nas cinco tarefas mais frequentes | Identificar pontos de hesitação reais                                | Medir sucesso e tempo de execução, sem presumir que a nova aparência resolve tudo.                                    |
| Central de trabalho por cliente                        | Abrir contrato, equipamento, chamado e recebimento no mesmo contexto | Usar os atalhos e permissões existentes, preservar retorno aos filtros.                                               |
| Preferências entre dispositivos                        | Continuar a organização pessoal em outro computador                  | Migrar preferências para o perfil no banco sem transformar escolhas pessoais em globais.                              |
| Busca vetorial opcional                                | Encontrar descrições muito diferentes do termo digitado              | Avaliar necessidade com consultas reais, custo, privacidade e relevância; manter navegação e busca local disponíveis. |
| Edição contextual e ações em lote                      | Reduzir abertura de telas para tarefas repetidas                     | Só após controlar seleção, confirmação e recuperação das ações.                                                       |

## Referências

- [Heurísticas de Nielsen — NN/g](https://www.nngroup.com/articles/ten-usability-heuristics/)
- [UI UX Pro Max — orientação de acessibilidade, navegação e design](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- [Transitions.dev — modal, tokens e redução de movimento](https://github.com/Jakubantalik/transitions.dev/blob/main/skills/transitions-dev/06-modal.md)
- [Tiptap — editor visual React](https://tiptap.dev/docs/editor/getting-started/install/react)
