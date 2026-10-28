# syntax=docker/dockerfile:1.7

ARG NODE_VERSION=20-bookworm-slim

FROM node:${NODE_VERSION} AS base

ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:${PATH}" \
    CI="true" \
    NEXT_TELEMETRY_DISABLED="1"

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl dumb-init \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable \
  && corepack prepare pnpm@9.1.1 --activate

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/db/package.json packages/db/package.json
COPY packages/documents/package.json packages/documents/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY packages/utils/package.json packages/utils/package.json
COPY packages/validators/package.json packages/validators/package.json

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
  pnpm install --frozen-lockfile

FROM deps AS source
COPY . .

FROM source AS api-builder
RUN pnpm --filter @peanut/db generate
RUN pnpm turbo run build \
  --filter=@peanut/db \
  --filter=@peanut/documents \
  --filter=@peanut/types \
  --filter=@peanut/utils \
  --filter=@peanut/validators
RUN pnpm --filter peanut-api build
RUN pnpm --filter peanut-api deploy --prod /prod/api
RUN set -eux; \
  src="$(find /app/node_modules/.pnpm -path '*/node_modules/.prisma/client' -type d | head -n 1)"; \
  dest="$(find /prod/api/node_modules/.pnpm -path '*/node_modules/.prisma' -type d | head -n 1)"; \
  rm -rf "${dest}/client"; \
  cp -R "${src}" "${dest}/client"

FROM source AS worker-builder
RUN pnpm --filter @peanut/db generate
RUN pnpm turbo run build \
  --filter=@peanut/db \
  --filter=@peanut/documents \
  --filter=@peanut/types \
  --filter=@peanut/utils
RUN pnpm --filter peanut-worker build
RUN pnpm --filter peanut-worker deploy --prod /prod/worker
RUN set -eux; \
  src="$(find /app/node_modules/.pnpm -path '*/node_modules/.prisma/client' -type d | head -n 1)"; \
  dest="$(find /prod/worker/node_modules/.pnpm -path '*/node_modules/.prisma' -type d | head -n 1)"; \
  rm -rf "${dest}/client"; \
  cp -R "${src}" "${dest}/client"

FROM source AS web-builder
ARG NEXT_PUBLIC_API_URL=/api/v1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_STANDALONE=true
RUN pnpm turbo run build \
  --filter=@peanut/types \
  --filter=@peanut/ui \
  --filter=@peanut/utils \
  --filter=@peanut/validators
RUN pnpm --filter peanut-web build

FROM source AS migrator-builder
RUN pnpm --filter @peanut/db generate
RUN pnpm turbo run build --filter=@peanut/db

FROM base AS api
ENV NODE_ENV=production \
    PORT_API=3001
WORKDIR /app
COPY --from=api-builder --chown=node:node /prod/api ./
RUN mkdir -p /data/storage && chown node:node /data/storage
EXPOSE 3001
USER node
CMD ["dumb-init", "node", "dist/main"]

FROM base AS worker
ENV NODE_ENV=production \
    PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app
COPY --from=worker-builder --chown=node:node /prod/worker ./
RUN pnpm exec playwright install --with-deps chromium \
  && mkdir -p /data/storage \
  && chown -R node:node /app /ms-playwright /data/storage
USER node
CMD ["dumb-init", "node", "dist/main"]

FROM base AS web
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=web-builder --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=web-builder --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3000
USER node
CMD ["dumb-init", "node", "apps/web/server.js"]

FROM base AS migrator
ENV NODE_ENV=production
WORKDIR /app
COPY --from=migrator-builder /app ./
CMD ["dumb-init", "pnpm", "db:migrate:deploy"]
