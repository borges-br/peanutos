# Paginação das faturas

O gerador prioriza uma página A4 com texto legível. A política vale para faturas comuns e de contratos.

1. Aguarda fontes e imagens antes de medir o conteúdo real.
2. Tenta o espaçamento normal; depois, se necessário, reduz espaços e organiza identificação e fechamento em colunas. Não aplica escala nem reduz os tamanhos de fonte para forçar uma página.
3. Se ainda não couber, divide a tabela por linhas, repete o cabeçalho e identifica cada continuação com número da fatura, cliente e vencimento.
4. Mantém resumo financeiro e pagamento juntos quando há espaço. Se ocuparem uma página separada, usa um fechamento próprio, com total em destaque. As páginas anteriores indicam a página exata do total, descontos e pagamento, conforme os blocos habilitados.
5. Preserva descrições e observações extensas, dividindo o texto quando ele exceder uma folha, sem repetir valores numéricos dos itens.

`packages/documents/src/invoice-pagination.ts` contém a função DOM compartilhada. O worker executa `prepareDocumentPage` antes de gerar o PDF. A prévia executa a mesma paginação pelo documento do iframe, mantendo seu sandbox sem permissão para scripts. Mudanças em `packages/documents` também acionam o build da imagem web.

As regras de rateio e os valores não foram alterados. Itens configurados com `proration=NONE` não recebem a mensagem automática “sem rateio”. Somente itens explicitamente configurados com `DAILY` exibem seu rateio. A apresentação também remove aquela mensagem de snapshots antigos, preservando as informações dos rateios diários já registrados.

O layout passa a valer para novas gerações e prévias. PDFs já armazenados continuam imutáveis; solicitar uma nova geração produz outra versão. Nenhum envio de e-mail, alteração de valor, atualização em massa ou migração de banco é necessário para essa mudança.

## Verificação

```powershell
pnpm --filter @peanut/db build
pnpm --filter @peanut/documents build
pnpm test:invoice-layout
pnpm test:contract-billing:pdf
```

Os testes usam dados fictícios em Chromium real. Verificam uma página com seis itens, continuação financeira, descontos, preservação de 80 itens, texto maior que uma folha, blocos opcionais e compatibilidade com os demais documentos. Os PDFs, HTML e medidas ficam em `data/qa/invoice-pagination`. A conferência com Poppler/PyMuPDF valida a quantidade real de páginas e os limites físicos; a inspeção das imagens verifica leitura e aparência.
