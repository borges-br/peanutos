# Identidade no login e nos emails

A configuração fica em **Aparência → Marca da empresa → Login / Emails**. O fluxo existente de biblioteca, rascunho, publicação e histórico é preservado.

## Login

O login pode usar cartão central ou marca ao lado do formulário, com logo, cores e fontes da identidade publicada. O título e a mensagem são editáveis. No celular, utiliza o símbolo compacto. A prévia oferece os formatos de computador e celular, sem realizar autenticação.

A rota anônima `/api/v1/public/branding/login` devolve apenas a identidade pública necessária à tela; não inclui contatos cadastrais, rodapé de documentos, histórico ou identificadores internos da empresa. Quando não existe identidade habilitada, o produto mantém a página padrão.

Em uma instalação com um único workspace, a marca é resolvida automaticamente. Com vários workspaces, o operador deve definir `PUBLIC_BRAND_WORKSPACE_ID`; sem esse vínculo, o login permanece neutro. Um administrador de outra empresa não consegue escolher a marca da instalação pela requisição pública.

## Emails

É possível selecionar a logo, sua largura, alinhamento e respiro, além da descrição curta. A paleta vem da identidade clara da empresa. O corpo usa Arial/Helvetica para manter a leitura nos clientes de email.

Até oito imagens da biblioteca podem ser liberadas para o corpo das mensagens. A logo do cabeçalho também aparece na seleção do editor. O seletor **Imagem da empresa** insere uma imagem no conteúdo visual; imagens de outras empresas e URLs externas não aprovadas são recusadas pela API.

Prévia do modelo, prévia da fatura e envio SMTP usam o mesmo gerador de HTML. A conferência de uma cobrança congela a aparência e as imagens junto do modelo. Conteúdos anteriormente renderizados continuam preservados.

## Imagens públicas

Somente as imagens selecionadas para esses canais são preparadas em PNG. A biblioteca conserva os originais. Os prefixos XML de SVGs são normalizados apenas na cópia usada pelo rasterizador; não são regravados no original.

A preparação gera arquivos privados. Os registros são ativados na mesma transação que publica a marca. Uma publicação rejeitada por revisão desatualizada não libera imagens. A prévia de um rascunho pode incorporar o PNG sem torná-lo público.

A rota `/api/v1/public/brand-assets/{id}/{sha256}.png` entrega o PNG sem autenticação, com hash no endereço, ETag e cache imutável. As URLs absolutas usam `NEXT_PUBLIC_WEB_URL`, exigindo HTTPS em produção. Nenhuma URL é construída a partir de um cabeçalho Host fornecido pelo cliente.

As versões já publicadas de imagens são mantidas para que emails antigos continuem exibindo a apresentação aprovada. A rota privada `/files` continua exigindo autenticação. A implantação deve preservar o banco e o volume de arquivos, como nas outras entregas do sistema.

## Validação e limites

Há testes com PostgreSQL descartável para publicação atômica, acesso anônimo ao PNG, isolamento entre empresas, privacidade da configuração pública, preservação de imagens após rebranding e equivalência entre prévia e renderização de entrega. A regressão de cobrança utiliza SMTP de captura no loopback; não envia mensagens reais.

A prévia no navegador representa o HTML produzido pelo sistema. Ela não equivale a homologação em todas as versões de Gmail, Outlook ou outros leitores, que podem aplicar suas próprias regras de exibição.
