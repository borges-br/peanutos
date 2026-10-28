# Preservar e migrar imagens e arquivos

O aplicativo passa a usar um filesystem privado: API e worker compartilham o volume Docker `peanut_storage_data`, montado em `/data/storage`. Não há serviço MinIO na nova stack. Em desenvolvimento, o padrão é `<repositorio>/data/storage`; `STORAGE_PATH` permite outro caminho **absoluto**, igual nos dois processos.

Cada objeto fica em `<STORAGE_PATH>/<bucket>/<key>`. Os campos `FileObject.bucket` e `FileObject.key`, os IDs, os links e os relacionamentos permanecem iguais. O armazenamento atende logos, avatares, assinaturas, uploads manuais e PDFs. Os downloads continuam autenticados; não exponha essa pasta no proxy.

Esta escolha simplifica a operação em um servidor. O custo é administrar espaço e backup. Para API/worker em servidores diferentes, ambos precisam acessar o mesmo filesystem persistente; um volume Docker local em cada host não compartilha arquivos.

## 1. Preservar antes de atualizar

Os exemplos abaixo são para Bash em um servidor Linux. Execute a partir do repositório. Use os arquivos de Compose e os nomes de containers/volumes da instalação real; no modo NPM, acrescente também `-f infra/docker/docker-compose.npm.yml` a cada comando de Compose. No Portainer, mantenha o mesmo nome da stack e confirme as montagens antes do redeploy.

1. Coloque o site em manutenção no proxy e interrompa gravações externas. Pare API e worker antigos. Não use `down -v`, `docker volume prune`, exclusão de volumes no Portainer ou limpeza do armazenamento antigo.
2. Registre a versão/imagem dos containers antigos e preserve `.env.production` e as chaves de criptografia em local seguro. Identifique as montagens com `docker inspect peanut-minio` e `docker volume ls`. Não suponha o nome do volume: versões anteriores usavam prefixos diferentes.
3. Com os escritores parados, faça backup do PostgreSQL e do armazenamento. Copie os backups para fora do servidor. Um dump do banco sozinho contém referências, **não os bytes das imagens/PDFs**.

Antes dos comandos de Compose, descubra o projeto da instalação existente. O nome explícito impede criar outro volume de banco por engano:

```bash
STACK_NAME=$(docker inspect peanut-api --format '{{ index .Config.Labels "com.docker.compose.project" }}')
test -n "$STACK_NAME" || { echo "Projeto existente não identificado"; exit 1; }
```

Todos os exemplos usam `-p "$STACK_NAME"`. Confira também o nome real do volume do banco e as redes; o `name:` do Compose novo não deve renomear a instalação existente.

Exemplo para PostgreSQL, sem redirecionamento binário do PowerShell:

```bash
mkdir -p backups
chmod 700 backups
docker compose -p "$STACK_NAME" --env-file .env.production -f infra/docker/docker-compose.production.yml stop api worker
docker exec peanut-postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc -f /tmp/peanut-before-storage.dump'
docker cp peanut-postgres:/tmp/peanut-before-storage.dump ./backups/peanut-before-storage.dump
```

Para uma cópia bruta do volume antigo, pare também o container MinIO durante a cópia. Substitua `VOLUME_ANTIGO_CONFIRMADO` pelo nome verificado em `docker inspect`; confirme que ele existe com `docker volume inspect` antes de montar, pois Docker pode criar um volume vazio se o nome estiver errado.

```bash
docker volume inspect VOLUME_ANTIGO_CONFIRMADO
docker run --rm \
  --mount type=volume,src=VOLUME_ANTIGO_CONFIRMADO,dst=/source,readonly \
  --mount type=bind,src="$PWD/backups",dst=/backup \
  alpine:3.20 tar czf /backup/minio-volume-before-migration.tgz -C /source .
sha256sum backups/peanut-before-storage.dump backups/minio-volume-before-migration.tgz > backups/before-storage.sha256
```

Preserve também a imagem antiga disponível no servidor/cache/registry confiável. Uma cópia bruta pode depender da mesma versão do servidor, configuração, discos do conjunto e chaves de criptografia para recuperação. Ela não substitui uma exportação lógica dos objetos.

## 2. Escolher a origem dos arquivos

| Situação | Caminho de recuperação |
| --- | --- |
| API S3 antiga ainda acessível | Usar o modo `s3` abaixo, com credenciais somente de leitura. Se parou o servidor para backup, religue apenas esse serviço para copiar. |
| Existe exportação lógica dos objetos | Usar `directory`, com árvore `exportacao/<bucket>/<key>` contendo os bytes originais. |
| Só existe o volume bruto do MinIO | Preservar o volume e recuperar uma cópia isolada com uma versão compatível já disponível. Exportar os objetos pela API S3 ou ferramenta de recuperação apropriada. Não montar o volume bruto como o novo diretório de arquivos. |
| Não existem objetos, exportação nem backup | O banco não consegue reconstruir imagens e documentos originais. Não declarar a migração concluída; recuperar a origem antes de remover qualquer evidência. |

Não copie diretórios internos como `.minio.sys` ou `xl.meta` para a pasta nova como se fossem arquivos finais. Não edite caminhos no banco para mascarar arquivos ausentes.

## 3. Preparar a versão nova sem reabrir o site

Publique/construa as imagens com este código, fixe a tag de implantação e preserve a versão anterior para rollback. Carregar somente o novo Compose com imagens antigas não troca a implementação de armazenamento.

Suba PostgreSQL/Redis, execute o migrator com a nova imagem e mantenha API/worker parados até terminar a cópia. A migração de banco adiciona `Workspace.timeZone`; não altera registros de arquivos.

```bash
docker compose -p "$STACK_NAME" --env-file .env.production -f infra/docker/docker-compose.production.yml up -d postgres redis
docker compose -p "$STACK_NAME" --env-file .env.production -f infra/docker/docker-compose.production.yml run --rm migrator
```

O Compose novo monta o mesmo volume na API e no worker. As imagens inicializam `/data/storage` para o usuário `node` (UID/GID 1000). Uma restauração feita como root deve corrigir a propriedade para `1000:1000`, mantendo a pasta privada. Não altere o nome do volume depois da cópia.

## 4. Copiar e verificar

A pasta de relatórios montada em `/backup` precisa ser gravável pelo UID 1000, sem ficar pública. No servidor, após os backups, ajuste com `sudo chown 1000:1000 backups` e mantenha `chmod 700 backups` (ou uma ACL equivalente). A exportação de origem precisa permitir leitura a esse usuário. Não aplique permissões abertas como `777`.

O utilitário percorre **todos os FileObjects**, de todos os workspaces e buckets, incluindo arquivos históricos ainda registrados. Ele confere tamanho e SHA-256 antes e depois da gravação. Pode ser retomado: objetos já válidos são verificados e ignorados; objetos divergentes não são sobrescritos. Não muda o banco, não apaga a origem e retorna código de saída diferente de zero se houver falhas. O relatório contém os IDs/caminhos que falharam e deve ficar privado.

### Origem S3 acessível

Crie um arquivo temporário protegido, por exemplo `backups/migration.env`, **fora do versionamento**, com:

```dotenv
MIGRATION_S3_ENDPOINT=https://ENDPOINT_ANTIGO_ACESSIVEL
MIGRATION_S3_REGION=us-east-1
MIGRATION_S3_ACCESS_KEY=CREDENCIAL_DE_LEITURA
MIGRATION_S3_SECRET_KEY=SEGREDO_DE_LEITURA
MIGRATION_S3_FORCE_PATH_STYLE=true
```

Não use `localhost` para apontar de dentro do container ao servidor antigo. Use um endpoint alcançável na rede Docker ou uma URL protegida. Não publique o bucket na internet para migrar.

```bash
chmod 600 backups/migration.env
docker compose -p "$STACK_NAME" --env-file .env.production -f infra/docker/docker-compose.production.yml \
  run --rm --no-deps --env-from-file backups/migration.env \
  -v "$PWD/backups:/backup" api \
  node scripts/migrate-storage.cjs --source=s3 --report=/backup/storage-migration-report.json
```

Se a versão de Compose não oferecer `--env-from-file`, exporte temporariamente as variáveis `MIGRATION_S3_*` na sessão e repasse-as com `run -e MIGRATION_S3_ENDPOINT -e MIGRATION_S3_REGION -e MIGRATION_S3_ACCESS_KEY -e MIGRATION_S3_SECRET_KEY -e MIGRATION_S3_FORCE_PATH_STYLE ...`. Nunca grave essas credenciais no frontend ou em logs.

### Origem em uma exportação lógica

Exemplo: `/srv/peanut-export/peanut-documents/<workspace>/logos/imagem.png`.

```bash
docker compose -p "$STACK_NAME" --env-file .env.production -f infra/docker/docker-compose.production.yml \
  run --rm --no-deps -v /srv/peanut-export:/export:ro -v "$PWD/backups:/backup" api \
  node scripts/migrate-storage.cjs --source=directory --source-dir=/export --report=/backup/storage-migration-report.json
```

### Verificação independente do destino

```bash
docker compose -p "$STACK_NAME" --env-file .env.production -f infra/docker/docker-compose.production.yml \
  run --rm --no-deps -v "$PWD/backups:/backup" api \
  node scripts/migrate-storage.cjs --source=verify --report=/backup/storage-migration-report-verify.json
```

Confirme `failed: 0` e a contagem `verified` correspondente aos registros do banco. Um relatório vazio só indica sucesso completo se o banco realmente não contiver arquivos. Verificação não recupera objetos faltantes.

Em desenvolvimento, após gerar Prisma e compilar `@peanut/db` e `@peanut/utils`, os mesmos modos estão disponíveis por `pnpm --filter peanut-api storage:migrate --source=verify`. O SDK S3 existe somente no utilitário de migração; o aplicativo não usa S3.

## 5. Conferir e reabrir

1. Inicie as imagens novas de API/worker/web. Configure o fuso em **Configurações > Geral** e recarregue as sessões abertas.
2. Confira logo, avatar, assinatura, um anexo manual e PDFs antigos de fatura/orçamento/O.S., respeitando as permissões de cada perfil.
3. Envie um arquivo novo e gere um PDF com logo/assinatura. Reinicie/recrie API e worker e confirme os downloads dos arquivos antigos e novos.
4. Reabra o site somente após verificar o relatório e esses fluxos. Mantenha o backup, banco e imagem antigos durante a janela de recuperação acordada.
5. Remova as credenciais temporárias da sessão/arquivo protegido após a migração. As antigas variáveis `S3_*` podem ser retiradas da configuração operacional quando a cópia estiver validada.

## Backup e restauração contínuos

Pare gravações em API/worker para obter um par consistente de dump PostgreSQL e arquivo do volume `peanut_storage_data`. Para copiar o volume novo, use o mesmo comando `tar` da etapa 1, agora com `src=peanut_storage_data`. Salve checksums, data e versão da aplicação junto ao backup. Faça cópia fora do host e teste restauração periodicamente.

Restaure banco e volume juntos em ambiente isolado, com os mesmos nomes/caminhos de objetos e propriedade `1000:1000`. Rode `--source=verify` contra o banco restaurado, confira os fluxos da etapa 5 e só então planeje a troca de ambiente. Não restaure por cima de um ambiente em uso.

Para rollback **antes de reabrir gravações**, volte às imagens/Compose antigos e ao armazenamento antigo preservado. A coluna nova de fuso tem valor padrão e não exige apagar dados para voltar. **Depois de aceitar novos uploads**, um rollback simples apontaria para uma origem que não contém esses arquivos: pause novamente e planeje a reconciliação ou restauração do par completo. Não elimine registros novos para simular sucesso.

Referências: [volumes e backup no Docker](https://docs.docker.com/engine/storage/volumes/), [GetObject no SDK oficial AWS](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/GetObjectCommand/).
