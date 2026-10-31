# White-label: publicação de 31/10/2026

Publicação concluída na instalação existente em `https://evo.borgesti.com`, mantendo a stack sob gerenciamento do Portainer. A revisão final da stack é 13.

## Imagens publicadas

| Serviço | Imagem |
| --- | --- |
| API e verificação de arquivos | `peanut-api:sha-6df56a8` |
| Worker | `peanut-worker:sha-6df56a8` |
| Migrator | `peanut-migrator:sha-6df56a8` |
| Interface | `peanut-web:sha-787dfa3` |

Namespace: `ghcr.io/borges-br/peanutos`. Builds verificados: [base da personalização](https://github.com/borges-br/peanutos/actions/runs/41222635945) e [unificação da aparência e avatares](https://github.com/borges-br/peanutos/actions/runs/41226475667).

## Resultado

- A identidade BORGES foi enviada e aplicada pela API autenticada. Os quatro SVGs aprovados foram preservados byte a byte; os dados cadastrais e o rodapé existente foram preservados nessa aplicação.
- A configuração continua editável por empresa, com biblioteca de imagens, ajustes de imagens, fontes, cores, componentes, navegação, prévias e histórico. Não há identidade BORGES fixa no código do produto.
- A navegação tem uma única entrada **Aparência**. Administradores encontram **Marca da empresa** e **Minha visualização** na mesma tela; os demais usuários acessam suas preferências pessoais.
- As duas URLs anteriores encaminham para a nova tela. Atalhos fixados antigos são normalizados e deduplicados. O rascunho da marca permanece aberto ao alternar entre as seções.
- Sidebar e topo exibem a foto autenticada do perfil, com iniciais como alternativa quando não há foto. O painel também reconhece o formato de total retornado pela API de chamados.
- A publicação inicial da marca criou a versão 1. A versão 3 estava em uso na conferência visual final e foi preservada durante a atualização exclusiva da interface.

## Preservação e verificação

Antes da migração, API e worker foram pausados para produzir backup consistente do PostgreSQL e dos arquivos. Foram verificados o índice do dump, a integridade gzip e os checksums dos arquivos de backup. Esses checks não equivalem a um ensaio de restauração.

A migração `20261030190000_workspace_visual_identity` acrescentou quatro tabelas. As oito tabelas existentes conferidas antes e depois da migração mantiveram contagens e fingerprints idênticos. A instalação terminou com 14 migrações aplicadas e a verificação dos arquivos armazenados concluída.

Na conferência final, às 18:02 UTC:

- API com health `UP`; PostgreSQL e Redis saudáveis; serviços sem reinícios automáticos.
- Migrator e verificação de arquivos com saída zero.
- Variáveis de ambiente do Portainer idênticas byte a byte e volumes preservados.
- Na segunda atualização, somente o container web foi recriado; API, worker, PostgreSQL e Redis mantiveram seus IDs.
- A rota da identidade publicada recusou acesso anônimo com HTTP 401.

Validação da interface: build de produção e dois testes de modelos da UI aprovados; conferência local com API fictícia para permissões, teclado, preservação do rascunho e alternativa sem foto. A conta de leitura não solicitou o editor administrativo e os testes locais não publicaram configurações. A etapa anterior de validação da base está descrita em [white-label-local-review.md](../white-label-local-review.md).

Na sessão real de produção foram conferidos a entrada única, as duas fotos carregadas, as larguras de 320 e 390 px sem rolagem horizontal, o símbolo compacto de 40 px no celular e as prévias A4 de proposta e relatório. As cinco prévias de documentos também foram verificadas pela API. Isso não constitui homologação de todos os fluxos comerciais.

Evidências privadas locais: `data/qa/branding-release-20261031/`, incluindo galeria, screenshots, resultados da aplicação, conferência dos serviços e testes manuais. Backups e configuração anterior permanecem na pasta protegida da publicação no servidor. Nenhuma credencial, foto pessoal ou cópia de banco foi adicionada ao repositório.

## Limites desta etapa

A resolução pública da marca na tela de login e a aplicação da identidade aos emails permanecem para uma etapa posterior. Propostas e relatórios novos oferecem impressão e salvamento em PDF pelo navegador; a geração persistente desses novos documentos pelo worker ainda não foi implementada. Esta publicação não enviou emails nem executou pagamentos.
