# Circuito: identidade original do Peanut OS

A identidade Circuito é o padrão para empresas sem personalização aplicada. O símbolo aprovado integra a silhueta de um peanut no espaço negativo; a interface usa azul, superfícies discretas, Geist e componentes com cantos de 4 px. As ilustrações aparecem no login e no primeiro uso dos módulos, preservando o espaço das telas operacionais.

As imagens do [README](../../README.md) são capturas do frontend compilado com autenticação e dados fictícios interceptados pelo teste. São telas implementadas, não os mockups da exploração anterior.

## O que a empresa pode alterar

Em **Aparência → Marca da empresa**, proprietários e administradores podem salvar um rascunho, conferir as prévias e aplicar uma versão à empresa.

| Elemento | Controle |
| --- | --- |
| Assinaturas e símbolos | Biblioteca e imagens para fundo claro/escuro. As imagens próprias têm prioridade; o uso dos arquivos originais Peanut OS pode ser desativado. |
| Favicon | Imagem própria da biblioteca. Sem escolha, usa o símbolo da empresa ou o favicon original quando autorizado. |
| Fontes, cores e componentes | Tipografia, paletas por tema, contorno dos campos, cores de status, densidade, espaçamento, cantos, sombra, botões, campos e tabelas. |
| Navegação | Sidebar compacta/expandida, dimensões, agrupamentos, tratamento do item ativo e estilo/peso dos ícones. |
| Login | Composição, logo, símbolo, título, mensagens e arte própria para cada tema. A arte pode ser removida. |
| Primeiro uso | Família Circuito, nenhuma ilustração ou imagens próprias por módulo e tema: clientes, inventário, chamados, contratos, faturas e documentos. |
| Documentos | Logo, fonte, hierarquia, margens, alinhamento e cores dos documentos gerados. |
| Emails | Ativação da identidade, logo, imagens públicas e composição. A assinatura pessoal continua separada no perfil do usuário. |

Os novos controles de mídia ficam na aba **Identidade**, em **Arquivos, favicon e ilustrações**. As cores de status e o contorno dos campos ficam em **Cores e interface**. As preferências de leitura continuam em **Minha visualização**.

Ao mudar o nome para uma marca própria, o editor desativa o fallback de logos Peanut OS. As artes de apresentação e de primeiro uso têm seleções independentes: a empresa pode mantê-las, substituí-las ou removê-las.

O desenho dos processos, a estrutura da navegação, os significados dos status e as ações disponíveis são compartilhados. A marca não muda permissões ou regras de negócio. Não é necessário criar uma cópia da aplicação para personalizar uma empresa.

## Preservação das instalações existentes

- Nenhum registro, upload ou versão histórica é regravado pela atualização.
- Configurações antigas sem os novos campos recebem valores neutros durante a leitura: sem ilustrações adicionais, sem fallback de logo Peanut OS e sem substituição das cores de status.
- Uma marca publicada continua sendo a identidade aplicada, inclusive se tiver o mesmo nome do produto. O novo padrão não sobrescreve essa publicação.
- Os dados antigos de marca e logo no workspace continuam disponíveis para documentos. Eles também impedem a inclusão automática da marca original em documentos e emails de empresas já identificadas.
- Documentos e mensagens congelados preservam os seus snapshots. Alterar a aparência afeta as próximas gerações.
- A configuração continua em JSON com normalização de campos opcionais. Esta mudança não adiciona migração de banco.

## Arquivos e exposição pública

Os arquivos originais servidos pelo frontend estão em `apps/web/public/brand/peanut-os/v1/`: logos claro/escuro em SVG e PNG, símbolos, ícones, favicon SVG/ICO, arte do login e doze ilustrações SVG. São arquivos estáticos, sem scripts ou recursos remotos. O ICO inclui resoluções de 16 a 256 px.

O lettering dos logos está em curvas, independente das fontes instaladas. A interface e os documentos usam fontes locais. A marca inclui uma reconstrução vetorial revisada do conceito aprovado. A pasta pública contém os arquivos usados pela aplicação; os estudos e comparações anteriores não fazem parte da distribuição.

O worker/API têm uma cópia embutida do logo claro para documentos, verificada contra o SVG do frontend. Ao revisar a marca no futuro, crie uma nova pasta de versão e preserve `v1`: emails históricos podem referenciar seus PNGs públicos.

Imagens próprias são identificadas por UUID da biblioteca da empresa, com validação de pertencimento no servidor. Favicon e arte próprios do login só recebem cópias públicas na publicação com login personalizado habilitado. As imagens dos estados vazios permanecem privadas. Emails continuam usando a publicação explícita de seus próprios arquivos. SVG animado, WebM e código fornecido pelo usuário não são aceitos pelo controle de mídia.

O login compartilhado continua usando a vinculação existente da instalação: uma única empresa ou `PUBLIC_BRAND_WORKSPACE_ID`. Sem uma marca pública habilitada, aparece o login original Peanut OS. As URLs de email exigem `NEXT_PUBLIC_WEB_URL` público e válido; em produção, HTTPS.

## Verificação e preparação de release

Builds necessários: validators, utils, documents, db, API, worker e frontend. O Dockerfile existente inclui a pasta pública e os pacotes compartilhados; atualize os três serviços da aplicação juntos. Não é preciso alterar volumes, variáveis ou dados das empresas por causa da identidade.

Comandos de verificação local:

```sh
pnpm test:branding
pnpm test:product-brand
node tests/run-branding-postgres.cjs --public-brand
pnpm test:product-brand:ui
node tests/circuito-documents.cjs
pnpm test:contract-billing
pnpm test:storage-timezone
pnpm test:invoice-layout
```

Os testes de PostgreSQL criam e removem um banco descartável, limitado ao loopback; não usam a base da instalação. O teste de interface inicia o frontend compilado e intercepta as APIs com dados fictícios. Ele cobre claro/escuro, 320/390/1440 px, ausência de overflow, primeiro uso versus busca vazia, marca antiga e publicação dos novos controles. As evidências locais ficam em `data/qa/circuito-release/`, fora do Git.

Os testes locais não comprovam entrega SMTP, configuração de proxy, cache de um navegador de usuário ou execução na VPS. Antes da publicação, siga o [procedimento de atualização existente](../deployment/portainer-update.md), com backup e conferência na instalação de destino. Este trabalho prepara a mudança local e não executa deploy.
