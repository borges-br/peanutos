# Login e emails com a identidade da empresa

## Versão publicada

- Commit das imagens: `94f6f7a748af4f7b358d8572bab0d24c4ff99a21`.
- API, web, worker e migrator: `sha-94f6f7a`.
- Compilação: [GitHub Actions 41499810932](https://github.com/borges-br/peanutos/actions/runs/41499810932), quatro imagens concluídas com sucesso.
- Instalação: `https://evo.borgesti.com`, stack `peanutos-infra`, Portainer 102, revisão 14.
- Migração aditiva: `20261102120000_public_brand_images`; 15 migrações no conjunto validado.
- Marca BORGES publicada na versão 4, com login dividido e identidade de email habilitada. As demais configurações publicadas e de rascunho foram comparadas e preservadas.

## Preservação da instalação

As imagens foram baixadas pelo registro autenticado já existente no Portainer. O rasterizador PNG foi executado na imagem Linux da API com a assinatura SVG aprovada, antes da atualização.

O backup consistente de PostgreSQL e armazenamento foi verificado antes da migração, com pausa breve da API e worker. Os hashes de oito tabelas de negócio permaneceram iguais após a migração e a verificação dos arquivos passou. A atualização foi aplicada pelo editor do Portainer.

A verificação final confirmou as novas revisões das cinco referências de imagem, API saudável, serviços sem reinícios, migrator e storage-check concluídos, volumes preservados e arquivo de variáveis do Portainer idêntico. PostgreSQL e Redis mantiveram seus containers. Backups e relatórios completos permanecem em diretório privado; não são versionados.

## Verificação funcional

- 54 testes aprovados: 25 de configuração, segurança, SVG e editor; 15 de cobrança e SMTP de captura; 14 com PostgreSQL descartável, incluindo os novos canais públicos.
- Builds de web, API, worker e pacotes compartilhados concluídos; a compilação Docker também passou em Linux.
- Imagens públicas retornaram PNG, ETag, cache imutável e resposta 304; os SVGs originais continuaram exigindo autenticação.
- As rotas privadas de aparência e biblioteca de email recusaram acesso anônimo.
- Revisão no Microsoft Edge da configuração publicada, login real e modelo mensal existente com prévia HTML.
- Login em 320 e 390 pixels: símbolo compacto visível e nenhuma rolagem horizontal.
- HTML de email em 390 pixels: logo pública carregada e nenhuma rolagem horizontal.
- Inserção de imagem pelo seletor do editor e presença da mesma URL na prévia HTML. A inserção de teste foi revertida, sem salvar ou alterar o modelo existente.

Os testes não enviaram mensagens reais. A inspeção do HTML no navegador não representa homologação em todos os leitores de email.

As evidências visuais e o HTML demonstrativo com dados fictícios estão em `output/revisao-login-email-borges/` e os registros de QA em `data/qa/communication-release-20261102/`, ambos fora do git.

## Operação e recuperação

Os controles ficam em **Aparência → Marca da empresa → Login / Emails**. O modelo existente recebe o cabeçalho automaticamente; o seletor de imagens do editor permite acrescentar conteúdo visual no corpo quando necessário.

Para desfazer apenas a apresentação, desabilite o canal correspondente e publique uma nova versão da marca, ou restaure uma versão pelo histórico e revise antes de aplicar. As imagens já publicadas são mantidas para emails antigos. A migração é aditiva e compatível com as imagens anteriores; uma reversão de aplicação deve usar as referências anteriores da stack preservada, sem apagar a nova tabela ou volumes.

O comportamento e o vínculo explícito de marca para instalações com várias empresas estão descritos em [login-email-branding.md](../product/login-email-branding.md).
