# Atualização de identidade e PDF de orçamentos

## Publicação

- Código: [`d409715`](https://github.com/borges-br/peanutos/commit/d4097150716ae600a052dcc609eb5c74aa15af39).
- Imagens: `sha-d409715` para API, frontend, worker e migrator; a verificação de armazenamento usa a mesma imagem da API.
- [GitHub Actions 41681468347](https://github.com/borges-br/peanutos/actions/runs/41681468347): quatro imagens compiladas e publicadas com sucesso.
- Instalação atualizada pelo editor da stack `peanutos-infra`, no Portainer, revisão 17.

A release reúne a nova identidade padrão do produto e as correções de orçamento desenvolvidas em paralelo. O README foi reescrito para apresentar as funções do sistema, com capturas demonstrativas e links para a documentação de instalação.

## Alterações

- Identidade padrão com novos logos, símbolos, favicon e ilustrações, mantendo a personalização por empresa.
- Controles em Aparência para favicon, arte do login, textos, imagens de primeiro uso e cores de status.
- Termos e condições de orçamentos paginados dentro da área útil do A4.
- Data de emissão calculada na geração de cada PDF, no fuso da empresa.
- Nome do PDF de orçamento sem sufixo de versão. O histórico interno continua preservado.
- Rodapé oficial do orçamento somente no fim da última página.

## Conferência da instalação

Antes da atualização, foi feito backup consistente de PostgreSQL e arquivos com API e worker parados. O dump foi conferido com `pg_restore --list`, o arquivo de armazenamento com `gzip -t`, e ambos tiveram seus hashes verificados. Os backups completos e os registros operacionais permanecem em diretório privado na VPS.

A comparação da configuração persistida pelo Portainer confirmou apenas a troca das cinco referências de imagem. O arquivo de variáveis permaneceu idêntico. Montagens dos volumes foram preservadas, assim como os containers de PostgreSQL e Redis.

Após o deploy, API, frontend e worker estavam em execução, sem reinícios. A API estava saudável; migrator e verificação de armazenamento terminaram com código zero. As rotas públicas responderam normalmente, e as rotas privadas de sessão e aparência continuaram recusando acesso anônimo.

As contagens e os hashes de 13 tabelas foram iguais antes e depois da atualização, incluindo marcas, arquivos e documentos existentes. A sessão autenticada manteve o nome, as imagens e a fonte da marca BORGES. A identidade original Peanut OS não substituiu essa personalização.

Como verificação funcional posterior, um orçamento existente foi gerado novamente pelo sistema online. O download usou o nome sem versão. As três páginas foram renderizadas e inspecionadas: os 19 itens dos termos estavam completos, a data de emissão correspondia ao dia da nova geração e o rodapé apareceu somente na terceira página, com o horário dessa geração. Essa ação acrescentou um registro ao histórico normal de PDFs; os arquivos anteriores foram preservados. Nenhum email ou cobrança foi enviado como teste.

## Testes

- 68 testes locais aprovados de identidade, permissões, SVG, cobrança, armazenamento, fuso e paginação de faturas/orçamentos.
- 19 testes anteriores com PostgreSQL descartável aprovados para publicação de marca, isolamento de imagens e compatibilidade de configurações antigas.
- Frontend compilado conferido em claro/escuro e 320/390/1440 px; 15 capturas, sem erros de JavaScript ou overflow nas telas avaliadas.
- Compilação das quatro imagens em Linux concluída no GitHub Actions.

Os dados e PDFs reais usados na conferência não foram enviados ao repositório. As capturas do README usam somente dados fictícios.

## Recuperação

O backup guarda o Compose anterior e suas variáveis. A versão anterior das imagens era `sha-03e7609`. Esta release não adiciona migrações; uma reversão da aplicação deve preservar os volumes e os documentos gerados depois da atualização. Siga o [procedimento de atualização e recuperação](portainer-update.md), sem apagar dados ou recriar os volumes.
