# Atualizar pelo Git no Portainer

Esta atualização troca o armazenamento antigo por um volume privado compartilhado, adiciona migrations e leva configurações operacionais para o banco. **Na primeira atualização, gerar as imagens não conclui a migração dos arquivos.** Preserve o ambiente atual até verificar a cópia. Este roteiro se aplica a Docker Standalone; Swarm exige planejamento específico de volumes, rede e migrations.

## Antes do redeploy

1. Abra a execução **Publish Docker images** no GitHub Actions. Confirme sucesso de **Build web**, **Build api**, **Build worker** e **Build migrator**, todos no mesmo commit.
2. Use a mesma tag imutável nas quatro imagens: `sha-<sete-primeiros-caracteres-do-commit>`. O workflow também publica `master` e `latest` quando o push ocorre na branch padrão, mas essas tags mudam em publicações futuras.
3. Na stack existente, registre repositório, referência Git, caminhos de Compose, variáveis, redes, imagens e montagens atuais. Preserve o nome da stack e os volumes reais do PostgreSQL/Redis. Desative temporariamente atualizações GitOps automáticas durante a migração.
4. Preserve as chaves `JWT_SECRET`, `APP_ENCRYPTION_KEY`/alias legado e `WEBHOOK_ENCRYPTION_KEY`, sem substituí-las pelos exemplos. Não apague as variáveis SMTP antigas até importar ou recadastrar e conferir as configurações.
5. Siga o [guia de preservação dos arquivos](storage-migration.md): pare gravações, faça backup consistente de banco e objetos e copie os dados para `peanut_storage_data`. Os relatórios devem indicar zero falhas e a quantidade esperada de registros verificados.

Uma resposta HTTP 200 em `/minio/health/ready` indica que o servidor de objetos responde, mas não comprova que todos os arquivos existem. Confira também as montagens do MinIO e valide tamanho/SHA-256 de cada objeto com o utilitário. Só o volume bruto, sem exportação lógica, não pode ser montado como o armazenamento novo. Não use exclusão de volumes, `down -v`, `volume prune` ou limpeza de serviços antigos nesta etapa.

## Preparação em duas etapas

Enquanto a stack antiga está preservada e os escritores estão parados, use um checkout administrativo dos arquivos novos, com o **mesmo projeto Compose**, rede e nomes reais de volumes. Execute as novas migrations e a cópia/verificação com containers temporários, sem iniciar os novos escritores. Os comandos completos e as opções de origem S3/exportação estão no [guia de armazenamento](storage-migration.md). Verifique que `docker compose config` aponta para o banco existente e para o volume de destino planejado; não execute comandos com nomes de projeto presumidos.

O importador de configurações também pode ser executado com a imagem da API, que contém `scripts/import-env-settings.cjs`. Forneça o UUID explícito do workspace e um arquivo legado protegido, montado somente para leitura; primeiro simule e depois use `--apply`. A importação mantém SMTP desativado. Consulte [configurações por workspace](workspace-settings.md). Mantenha os arquivos com credenciais fora do Git e dos logs.

## Configuração da stack Git

Em **Stacks > sua stack > Edit stack settings** (o nome pode variar conforme a versão):

- Repositório: `https://github.com/borges-br/peanutos`.
- Referência: `refs/heads/master`, ou uma referência de release que contenha o commit desejado.
- Compose principal: `infra/docker/docker-compose.production.yml`.
- Se já usa NGINX Proxy Manager, preserve também `infra/docker/docker-compose.npm.yml` e o valor real de `NPM_NETWORK`. Não habilite o Caddy em paralelo nas portas 80/443 do NPM.
- `PEANUT_IMAGE_REGISTRY=ghcr.io`.
- `PEANUT_IMAGE_NAMESPACE=borges-br/peanutos`.
- `PEANUT_IMAGE_TAG=sha-<commit7>`, igual para os quatro serviços.
- Preserve domínio, CORS, senhas do banco/Redis e chaves mestras. O Compose define `STORAGE_PATH=/data/storage` para API e worker.

Se uma imagem exigir autenticação, cadastre o GHCR em **Registries** com acesso de leitura aos pacotes; um login feito apenas no terminal não garante que o Portainer use a mesma credencial. Confira as montagens: API e worker devem usar o mesmo `peanut_storage_data`; PostgreSQL deve continuar com seu volume anterior. Se o nome antigo difere do Compose, ajuste a referência do volume antes de atualizar.

Depois de concluir backup, migrations, cópia e verificação, use **Pull and redeploy**, habilite **Re-pull image and redeploy** e confirme **Update**. Não escolha limpeza/prune dos serviços antigos durante a migração. Não desconecte a stack do Git para tentar atualizar.

## Verificação após atualizar

1. Aguarde o término real da implantação. Aceitar a solicitação no Portainer não comprova sucesso.
2. `migrator` deve terminar com **Exited (0)**; isso é esperado. Confira o log de migrations. Se terminar com outro código, mantenha a manutenção e corrija a causa antes de prosseguir.
3. PostgreSQL e Redis devem estar saudáveis. Web, API e worker devem estar em execução, sem reinício contínuo. Verifique a tag/digest efetivamente usada por cada container, e não apenas o texto do Compose.
4. Teste a saúde da API, autenticação, logo/avatar, PDF antigo e anexo antigo. Gere prévia e PDF novo, envie um arquivo de homologação e confira que os bytes permanecem após recriar API/worker.
5. Confira fuso, identidade e SMTP pela interface. Teste conexão SMTP, depois homologue uma cobrança com destinatários internos antes de ativar clientes reais. Cobranças existentes exigem configuração e conferência por competência.
6. Reabra o atendimento depois dessas verificações. Preserve os backups e o armazenamento antigo durante a janela de recuperação.

## Se falhar

Não apague volumes nem repita redeploys enquanto a implantação anterior ainda estiver em andamento. Confira qual imagem e qual erro estão nos logs. Uma página de saúde não comprova acesso aos arquivos nem conclusão da migração. Antes de aceitar novas gravações, é possível retornar ao conjunto antigo preservado; depois de novos uploads/cobranças, rollback exige reconciliar banco e arquivos em conjunto. Voltar somente a tag pode deixar dados novos inacessíveis.

Referências oficiais: [editar stack Git e redeploy no Portainer](https://docs.portainer.io/user/docker/stacks/edit), [volumes e backup no Docker](https://docs.docker.com/engine/storage/volumes/).
