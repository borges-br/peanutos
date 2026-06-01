# Deploy de producao com Docker

![Docker](https://img.shields.io/badge/runtime-Docker-2496ED?logo=docker&logoColor=white)
![GHCR](https://img.shields.io/badge/registry-GHCR-181717?logo=github&logoColor=white)
![Caddy](https://img.shields.io/badge/reverse_proxy-Caddy-1F88C0)
![NGINX Proxy Manager](https://img.shields.io/badge/reverse_proxy-NGINX_Proxy_Manager-009639?logo=nginx&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL-4169E1?logo=postgresql&logoColor=white)

Este guia prepara o Peanut OS para rodar online em dominio proprio, usando imagens publicadas automaticamente pelo GitHub Actions. Voce pode operar com Caddy embutido ou com NGINX Proxy Manager externo.

## Visao rapida

```mermaid
flowchart LR
  Dev["Push / PR"] --> Actions["GitHub Actions"]
  Actions --> Filter["Detecta pacotes alterados"]
  Filter --> Web["peanut-web"]
  Filter --> API["peanut-api"]
  Filter --> Worker["peanut-worker"]
  Filter --> Migrator["peanut-migrator"]
  Web --> GHCR["GitHub Container Registry"]
  API --> GHCR
  Worker --> GHCR
  Migrator --> GHCR
  GHCR --> Server["Servidor Docker"]
  Server --> Proxy["Caddy ou NGINX Proxy Manager"]
  Proxy --> Next["Web Next.js"]
  Proxy --> Nest["API NestJS"]
  Nest --> PG["PostgreSQL"]
  Nest --> Redis["Redis"]
  Nest --> S3["MinIO / S3"]
  Worker --> PG
  Worker --> Redis
  Worker --> S3
```

## Imagens publicadas

O workflow `.github/workflows/publish-images.yml` publica imagens separadas para cada parte do monorepo.

| Imagem | Docker target | Quando rebuilda | Funcao |
| --- | --- | --- | --- |
| `peanut-web` | `web` | Mudancas em `apps/web`, `packages/ui`, `packages/types`, `packages/utils`, `packages/validators` ou arquivos comuns | Interface Next.js |
| `peanut-api` | `api` | Mudancas em `apps/api`, Prisma, documentos, tipos, utils, validators ou arquivos comuns | API NestJS/Fastify |
| `peanut-worker` | `worker` | Mudancas em `apps/worker`, Prisma, documentos, tipos, utils ou arquivos comuns | Filas BullMQ, PDF e webhooks |
| `peanut-migrator` | `migrator` | Mudancas em `packages/db` ou arquivos comuns | Executa `prisma migrate deploy` |

> [!TIP]
> Em pull requests as imagens sao apenas buildadas. Em `main`, `master` ou tags `v*`, elas tambem sao publicadas no GHCR.

## Pipeline otimizado

O build evita refazer tudo a cada push por tres camadas:

| Otimizacao | Onde fica | Resultado pratico |
| --- | --- | --- |
| Path filter | `dorny/paths-filter` | So cria matrix para imagens afetadas |
| BuildKit cache | `cache-from/to: type=gha` | Reaproveita camadas Docker por servico |
| pnpm cache mount | `RUN --mount=type=cache,id=pnpm-store` | Reaproveita download de dependencias |
| Turbo filter | `pnpm turbo run build --filter=<servico>...` | Compila o app e suas dependencias reais |

## Preparar GitHub

1. Confirme que o repo pode publicar pacotes:
   - `Settings > Actions > General > Workflow permissions`
   - Marque `Read and write permissions`

2. Opcionalmente configure a variavel do repo:

| Variavel GitHub | Quando usar | Valor sugerido |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | API em dominio separado | `https://api.example.com/api/v1` |

Se web e API rodam no mesmo dominio via Caddy, deixe sem configurar. A imagem usa `/api/v1`.

## Preparar servidor

Requisitos:

| Recurso | Minimo sugerido |
| --- | --- |
| Docker Engine | 24+ |
| Docker Compose plugin | 2.20+ |
| CPU | 2 vCPU |
| RAM | 2 GB minimo, 4 GB recomendado |
| Disco | 20 GB+ para banco, objetos e imagens |
| DNS | Registro `A` apontando para o servidor |

No servidor:

```bash
mkdir -p /opt/peanut-os
cd /opt/peanut-os
```

Copie estes arquivos do repositorio para o servidor:

```txt
infra/docker/docker-compose.production.yml
infra/docker/docker-compose.npm.yml
infra/caddy/Caddyfile
.env.production.example
```

Depois crie o arquivo real:

```bash
cp .env.production.example .env.production
nano .env.production
```

> [!WARNING]
> Nunca use os valores `change-me` em producao. Gere segredos reais antes do primeiro `up`.

## Variaveis obrigatorias

### Dominio e imagens

| Variavel | Obrigatoria | Exemplo | Para que serve |
| --- | --- | --- | --- |
| `PEANUT_DOMAIN` | Sim | `app.example.com` | Dominio publico atendido pelo Caddy |
| `ACME_EMAIL` | Sim | `admin@example.com` | E-mail usado pelo Let's Encrypt |
| `NEXT_PUBLIC_WEB_URL` | Sim | `https://app.example.com` | URL publica da interface |
| `NEXT_PUBLIC_API_URL` | Sim | `/api/v1` | URL que o browser usa para chamar a API |
| `CORS_ORIGIN` | Sim | `https://app.example.com` | Origem aceita pela API |
| `PEANUT_IMAGE_REGISTRY` | Sim | `ghcr.io` | Registry Docker |
| `PEANUT_IMAGE_NAMESPACE` | Sim | `borges-br/peanutos` | Namespace das imagens no GHCR, sempre com `owner/repository` |
| `PEANUT_IMAGE_TAG` | Sim | `latest` ou `sha-abc123` | Tag que o Compose deve baixar |
| `NPM_NETWORK` | So NPM | `npm_proxy` | Rede Docker externa compartilhada com o NGINX Proxy Manager |

> [!IMPORTANT]
> O namespace precisa incluir o nome do repositorio. Para este projeto, use `PEANUT_IMAGE_NAMESPACE=borges-br/peanutos`. Se usar apenas `borges-br`, o Docker tentara baixar `ghcr.io/borges-br/peanut-web:latest`, que nao e o caminho publicado pelo workflow.

## Escolher proxy reverso

| Modo | Use quando | Arquivos Compose | Portas 80/443 |
| --- | --- | --- | --- |
| Caddy | O Peanut OS deve gerenciar TLS e proxy sozinho | `docker-compose.production.yml` | Publicadas pelo `peanut-caddy` |
| NGINX Proxy Manager | Voce ja usa NPM para dominios e certificados | `docker-compose.production.yml` + `docker-compose.npm.yml` | Continuam com o NPM |

> [!TIP]
> Nos dois modos, mantenha `NEXT_PUBLIC_API_URL=/api/v1`. Isso deixa web e API no mesmo dominio e simplifica CORS.

### Banco e cache

| Variavel | Obrigatoria | Exemplo | Para que serve |
| --- | --- | --- | --- |
| `POSTGRES_USER` | Sim | `peanut_user` | Usuario do PostgreSQL |
| `POSTGRES_PASSWORD` | Sim | `use-um-segredo-forte` | Senha do PostgreSQL |
| `POSTGRES_DB` | Sim | `peanut_db` | Banco principal |
| `REDIS_PASSWORD` | Sim | `use-um-segredo-forte` | Senha do Redis/BullMQ |

> [!IMPORTANT]
> Se a senha do Postgres tiver `@`, `:`, `/`, `?` ou `#`, use uma senha URL-safe ou edite `DATABASE_URL` manualmente com a senha codificada.

### Seguranca

| Variavel | Obrigatoria | Exemplo | Para que serve |
| --- | --- | --- | --- |
| `JWT_SECRET` | Sim | 32+ caracteres aleatorios | Assinatura do access token |
| `REFRESH_TOKEN_SECRET` | Sim | 32+ caracteres aleatorios | Assinatura do refresh token |
| `APP_ENCRYPTION_KEY` | Sim | base64 de 32 bytes | Criptografia de dados sensiveis |
| `APPLICATION_ENCRYPTION_KEY` | Temporaria | hex de 64 chars | Compatibilidade com rotinas existentes |
| `WEBHOOK_SIGNING_SECRET` | Sim | segredo forte | HMAC dos webhooks enviados |
| `WEBHOOK_ENCRYPTION_KEY` | Sim | 32+ caracteres | Protecao de segredos de webhook |

Gerar chave de criptografia:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Arquivos e PDF

| Variavel | Obrigatoria | Exemplo | Para que serve |
| --- | --- | --- | --- |
| `S3_ACCESS_KEY` | Sim | `minio_admin` | Usuario do MinIO/S3 |
| `S3_SECRET_KEY` | Sim | senha forte | Senha/chave do MinIO/S3 |
| `S3_BUCKET` | Sim | `peanut-os-documents` | Bucket de documentos |
| `S3_REGION` | Sim | `us-east-1` | Regiao S3 |
| `S3_FORCE_PATH_STYLE` | Sim | `true` | Necessario para MinIO |
| `S3_AUTO_CREATE_BUCKET` | Opcional | `true` | Cria bucket automaticamente no self-host |
| `PDF_MAX_CONCURRENCY` | Opcional | `1` | Concorrencia do worker de PDF |
| `API_BODY_LIMIT_BYTES` | Opcional | `26214400` | Limite de upload JSON/base64 |

### Agendadores

| Variavel | Obrigatoria | Exemplo | Para que serve |
| --- | --- | --- | --- |
| `WEBHOOK_SCHEDULER_TIMEZONE` | Opcional | `America/Sao_Paulo` | Timezone dos jobs recorrentes |
| `WEBHOOK_INVOICE_DUE_SOON_HOURS` | Opcional | `72` | Janela padrao de fatura a vencer |
| `WEBHOOK_CONTRACT_ENDING_SOON_DAYS` | Opcional | `15` | Janela padrao de contrato acabando |
| `WEBHOOK_TICKET_FEEDBACK_HOURS_AFTER_RESOLVED` | Opcional | `24` | Delay para feedback apos resolucao |
| `BILLING_SCHEDULE_CRON` | Opcional | `0 2 * * *` | Rotina de agenda financeira |

## Primeiro deploy com Caddy

1. Login no GHCR:

```bash
docker login ghcr.io
```

Se o pacote GHCR estiver privado, use um Personal Access Token com permissao `read:packages`:

```bash
echo "$GHCR_PAT" | docker login ghcr.io -u SEU_USUARIO --password-stdin
```

> [!IMPORTANT]
> Se o deploy for feito pelo Portainer, configure tambem o registry dentro do Portainer. O `docker login` feito no terminal pode nao ser usado pela stack quando o pull e disparado pela interface.

### Portainer + GHCR privado

Se os packages estiverem privados no GitHub Container Registry:

1. Crie um Personal Access Token no GitHub com permissao `read:packages`.
2. No Portainer, adicione um registry:

| Campo | Valor |
| --- | --- |
| Registry type | Custom registry |
| Name | `ghcr.io` |
| Registry URL | `ghcr.io` |
| Username | Seu usuario GitHub |
| Password | PAT com `read:packages` |

3. No deploy da stack, selecione esse registry/autenticacao para que o Portainer consiga puxar `ghcr.io/borges-br/peanutos/*`.

Alternativa simples: tornar os packages publicos no GitHub em `Packages > Package settings > Change visibility > Public`.

2. Baixar imagens:

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml pull
```

3. Subir aplicacao:

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml up -d
```

O servico `migrator` roda automaticamente como um job de inicializacao. Ele aplica as migracoes pendentes, encerra com status `0`, e so entao `peanut-api` e `peanut-worker` iniciam. E normal ele aparecer como `Exited` no Docker/Portainer depois do deploy.

4. Validar:

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml ps
curl https://app.example.com/api/v1/health
```

## Primeiro deploy com NGINX Proxy Manager

Use este modo se o NPM ja esta publicado nas portas `80` e `443` do servidor.

1. Criar uma rede compartilhada com o NPM:

```bash
docker network create npm_proxy
docker network connect npm_proxy <nome-do-container-do-npm>
```

Se sua rede ja existir com outro nome, ajuste:

```env
NPM_NETWORK=nome_da_sua_rede
```

2. Baixar imagens:

```bash
docker compose --env-file .env.production \
  -f infra/docker/docker-compose.production.yml \
  -f infra/docker/docker-compose.npm.yml \
  pull
```

3. Subir aplicacao sem Caddy:

```bash
docker compose --env-file .env.production \
  -f infra/docker/docker-compose.production.yml \
  -f infra/docker/docker-compose.npm.yml \
  up -d
```

O servico `migrator` roda automaticamente como um job de inicializacao. Ele aplica as migracoes pendentes, encerra com status `0`, e so entao `peanut-api` e `peanut-worker` iniciam. E normal ele aparecer como `Exited` no Docker/Portainer depois do deploy.

4. Configurar o Proxy Host no NPM:

| Tela do NPM | Valor |
| --- | --- |
| Domain Names | `app.example.com` |
| Scheme | `http` |
| Forward Hostname / IP | `peanut-web` |
| Forward Port | `3000` |
| Websockets Support | Ativado |
| SSL Certificate | Solicitar ou selecionar certificado |
| Force SSL | Ativado |

Em `Custom locations`, adicione:

| Campo | Valor |
| --- | --- |
| Location | `/api/v1` |
| Scheme | `http` |
| Forward Hostname / IP | `peanut-api` |
| Forward Port | `3001` |

5. Validar:

```bash
curl https://app.example.com/api/v1/health
```

## Atualizar producao

### Caddy

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml pull
docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml up -d
docker image prune -f
```

### NGINX Proxy Manager

```bash
docker compose --env-file .env.production \
  -f infra/docker/docker-compose.production.yml \
  -f infra/docker/docker-compose.npm.yml \
  pull
docker compose --env-file .env.production \
  -f infra/docker/docker-compose.production.yml \
  -f infra/docker/docker-compose.npm.yml \
  up -d
docker image prune -f
```

## Build local de imagens

```bash
docker buildx build -f infra/docker/Dockerfile --target web -t peanut-web:local .
docker buildx build -f infra/docker/Dockerfile --target api -t peanut-api:local .
docker buildx build -f infra/docker/Dockerfile --target worker -t peanut-worker:local .
docker buildx build -f infra/docker/Dockerfile --target migrator -t peanut-migrator:local .
```

Para web com API em dominio separado:

```bash
docker buildx build \
  -f infra/docker/Dockerfile \
  --target web \
  --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api/v1 \
  -t peanut-web:local .
```

## Reset completo de producao

> [!CAUTION]
> Isto apaga banco, Redis e midia local do MinIO.

```bash
docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml down -v
```

Para NPM:

```bash
docker compose --env-file .env.production \
  -f infra/docker/docker-compose.production.yml \
  -f infra/docker/docker-compose.npm.yml \
  down -v
```

Depois repita o primeiro deploy.

## Checklist operacional

| Check | Comando |
| --- | --- |
| Containers rodando com Caddy | `docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml ps` |
| Containers rodando com NPM | `docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml -f infra/docker/docker-compose.npm.yml ps` |
| Logs da API | `docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml logs -f api` |
| Logs do worker | `docker compose --env-file .env.production -f infra/docker/docker-compose.production.yml logs -f worker` |
| Healthcheck | `curl https://app.example.com/api/v1/health` |
| Espaco em disco | `docker system df` |
| Limpar imagens antigas | `docker image prune -f` |

## Troubleshooting GHCR

| Erro | Causa comum | Como resolver |
| --- | --- | --- |
| `denied` em `ghcr.io/borges-br/peanut-web` | Namespace sem o nome do repositorio | Use `PEANUT_IMAGE_NAMESPACE=borges-br/peanutos` |
| `unauthorized` em `ghcr.io/borges-br/peanutos/peanut-web` | Pacote privado ou servidor/Portainer sem login no GHCR | Configure o registry `ghcr.io` no Portainer com PAT `read:packages`, rode `docker login ghcr.io`, ou torne os packages publicos |
| `unauthorized` em `ghcr.io/borges-br/peanutos/peanut-worker` | Mesmo problema de autenticacao, mas em outra imagem da stack | A correcao e global: autenticar o registry ou publicar todos os packages |
| `manifest unknown` | Tag ainda nao publicada | Rode o workflow `Publish Docker images`, aguarde concluir e confira se a tag existe |

Para conferir manualmente:

```bash
docker manifest inspect ghcr.io/borges-br/peanutos/peanut-web:latest
```

## Portas

| Porta | Servico | Publica? |
| --- | --- | --- |
| `80` | Caddy HTTP/ACME | Sim |
| `443` | Caddy HTTPS | Sim |
| `80/443` | NGINX Proxy Manager | Sim, somente no modo NPM |
| `3000` | Web Next.js | Nao, interno |
| `3001` | API NestJS | Nao, interno |
| `5432` | PostgreSQL | Nao, interno |
| `6379` | Redis | Nao, interno |
| `9000` | MinIO API | Nao, interno |
| `9001` | MinIO Console | Nao, interno |

## Observacoes importantes

> [!IMPORTANT]
> O `peanut-web` recebe `NEXT_PUBLIC_API_URL` no build. A imagem padrao usa `/api/v1`, ideal para dominio unico com Caddy ou NGINX Proxy Manager. Se quiser `api.example.com`, publique a imagem web com o build arg correto.

> [!WARNING]
> Nao rode `pnpm db:seed` em producao. O seed cria dados e credenciais ficticias para desenvolvimento.

> [!TIP]
> Para deploys pequenos e frequentes, prefira tags `sha-*` geradas pelo workflow. Use `latest` apenas quando quiser acompanhar sempre o ultimo build da branch principal.
