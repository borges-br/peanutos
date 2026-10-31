# White-label: revisão local 2

Atualização: 31/10/2026. Nenhuma publicação, implantação, alteração de dados reais ou commit. A BORGES é um cenário de revisão; seus arquivos não foram fixados no produto.

## Onde revisar

- Galeria atual: `data/qa/branding-v2/revisao.html`.
- Prints: `data/qa/branding-v2/*.png`.
- PDFs: `output/pdf/branding-v2/` — proposta, relatório curto e relatório extenso.
- Evidências: `data/qa/branding-v2/ui-results.json`, `postgres-results.json`, `postgres-tests.log` e `validation.json`.
- A revisão de 30/10 continua em `data/qa/branding/revisao.html` como registro da etapa anterior.

## Configuração da marca

**Configurações → Marca e aparência** concentra a identidade por empresa. OWNER e ADMIN podem editar; os demais perfis recebem somente a identidade aplicada.

- Nome, descrição, logos e símbolos para fundos claros e escuros; uploads individuais, sem importação de ZIP.
- Tema claro, escuro ou do dispositivo; paletas próprias; densidade, cantos, sombras e espaçamento.
- Presets Essencial, Institucional e Operação, preservando nome, fontes da marca, imagens, paletas e identidade documental. Os componentes e a hierarquia podem ser ajustados depois.
- Tipografia separada para interface, títulos e dados; tamanho base, peso e espaçamento das letras. Geist e Source Sans 3 são locais; fonte do dispositivo, títulos serifados e dados monoespaçados são opções específicas.
- Botões preenchidos ou de contorno, formatos de cantos, campos delineados ou preenchidos, altura dos campos e tabelas discretas, alternadas ou com divisórias marcadas.
- Conteúdo centralizado com limite ou fluido; limite em px e altura do cabeçalho no computador.
- Desfazer/refazer durante a edição; rascunho separado da identidade em uso; histórico e restauração para rascunho.

A prévia mantém a configuração aplicada intacta até a ação de aplicar à empresa. Os controles não aceitam CSS ou JavaScript arbitrários. As preferências individuais de leitura ampliada e alto contraste continuam disponíveis.

## Marca e navegação

- Sidebar compacta ou expandida, com largura e limites do logo em px, respiro, alinhamento e altura mínima da área da marca.
- No compacto, nome e descrição podem ser ocultados. Os títulos dos grupos do menu também são opcionais.
- Seleção suave, marcador lateral ou seleção sólida; ícones com contorno ou preenchimento e peso ajustável.
- Paleta independente da sidebar, permitindo conteúdo claro e lateral escura. Textos, seleção e imagem são resolvidos pelo fundo de sua própria área.
- Cabeçalho e menu do celular sempre usam o símbolo compacto. A assinatura permanece restrita ao computador.
- A fonte variável dos ícones contém apenas os 18 símbolos de navegação usados, cerca de 11 KB. Outros ícones mantêm a fonte existente. Origem e licença acompanham o arquivo.

## Biblioteca e edição de imagens

- SVG, PNG, JPEG e WebP até 2 MB; busca por nome e seleção de aplicações independentes.
- Recorte, proporção, zoom, limite de resolução, giro de 90° e espelhamento de imagens raster.
- Ao editar um novo envio, o original é salvo antes da variação; cada variação referencia sua origem. Uma tentativa posterior não precisa reenviar o original já preservado.
- SVGs não são rasterizados. A validação XML centralizada aceita namespaces, como os arquivos originais da BORGES, e verifica elementos, atributos decodificados e referências locais.
- O envio aceita SVG estático e autocontido. Scripts, animações, HTML/imagens embutidas, DTDs, estilos externos e referências externas são recusados. PNG/JPEG/WebP são alternativas para outras composições.

## Documentos

- Identidade compartilhada entre proposta, relatório, orçamento, fatura e OS; prévias existentes e snapshots do worker usam a mesma identidade publicada.
- Fonte independente para corpo e títulos, tamanhos em pontos, assinatura, alinhamento, margens, estilo e rodapé. Geist e Source Sans 3 ficam incorporadas no HTML/PDF, sem rede externa.
- Os modelos A4 existentes também recebem a fonte e o tamanho do título configurados, inclusive nos blocos que usavam tipografia inline.
- **Documentos → Relatórios e propostas** oferece conteúdo por seções, vínculo com cliente, orçamento opcional para propostas, revisão e finalização.
- A finalização preserva HTML, fontes, imagens, conteúdo e preços daquele momento. Uma alteração posterior da marca não reescreve o documento finalizado.
- Impressão / salvar PDF funciona pelo navegador. A geração persistente dos novos documentos no worker ainda é uma etapa de continuidade.

## Validação

Foram executados localmente:

| Verificação | Resultado e limite |
|---|---|
| Configuração, HTTP e SVG | 22 testes: limites, permissões, presets, compatibilidade com identidades v1 anteriores, fontes, contraste e SVG estático. Persistência simulada nos testes HTTP. |
| PostgreSQL descartável | 8 integrações: 14 migrations desde banco vazio, isolamento, permissões, ativos, revisão, escritores simultâneos, normalização sem reescrever histórico e documentos imutáveis. |
| Cobrança | 15 testes; SMTP capturado em loopback, sem envio externo. |
| Armazenamento e fuso | 12 testes; banco, filas e navegador do worker simulados. Consistência entre identidade da API e snapshot do worker verificada. |
| Navegador | 11 cenários no frontend compilado; marca, arquivos e documentos elaborados passam pelos controllers Nest reais e pelo PostgreSQL descartável. Login e respostas dos módulos comerciais existentes usam fixtures. |
| Configurações existentes | Regressão de navegador com API fictícia. |
| PDFs | Proposta e relatório curtos, além de relatório extenso; verificação de páginas A4, texto, renderização e fontes incorporadas. |

Builds de frontend, API, worker e pacotes compartilhados passaram. Permanecem avisos de lint sobre Hooks e uso de `img`; não são falhas de compilação.

O banco QA usa `postgres:16-alpine`, nome de container aleatório, label verificada, porta de loopback e armazenamento tmpfs. O container é removido ao terminar. A migração **não foi aplicada ao banco da aplicação** e não houve alteração de configuração ou volumes do Docker.

O frontend e os endpoints testados se integram nesse ambiente isolado. Isso não constitui homologação completa de produção, teste real de autenticação, operação de filas ou validação de todas as rotas comerciais.

## Reproduzir

Com os pacotes e a API compilados:

```powershell
pnpm test:branding
pnpm test:branding:postgres
```

Para repetir a revisão visual com controllers e banco reais:

```powershell
pnpm --filter peanut-web build
node tests/run-branding-postgres.cjs --ui
node tests/build-branding-review.cjs
# Renderizar os três PDFs com Poppler em data/qa/branding-v2/pdf/.
python tests/check-branding-delivery.py --extended
```

A revisão visual requer os quatro SVGs e o PNG de exemplo fornecidos pelo usuário em `data/qa/branding/assets/`. Esses ativos são fixtures privadas de revisão; os testes unitários de SVG não dependem deles. O runner recusa URLs de banco fora do alvo QA.

## Continuidade

1. Revisar os estilos, densidade, proporções e documentos com o usuário. Manter símbolo e assinatura disponíveis como escolhas.
2. Integrar os novos documentos ao worker e à biblioteca de PDFs emitidos, preservando o snapshot finalizado. Homologar documentos extensos com conteúdo real representativo, tabelas longas e requisitos de paginação.
3. Resolver a identidade antes do login por domínio/instalação; não selecionar um workspace arbitrário. Depois, estender a marca a login, favicon e emails.
4. Evoluir catálogo de fontes, paginação da biblioteca e novos componentes conforme a revisão. Upload de fontes próprias ainda não faz parte desta etapa.

Os modelos de website do kit não foram incorporados ao ERP. Nenhuma proposta foi enviada, nenhum serviço foi realizado e nenhuma empresa real recebeu a configuração dos testes.
