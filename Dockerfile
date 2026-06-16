FROM node:20-bookworm-slim AS base

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN pnpm install --frozen-lockfile

FROM base AS build

COPY --from=deps /app/node_modules /app/node_modules
COPY . .

RUN pnpm --filter @medisxime/backend build

FROM node:20-bookworm-slim AS runtime

ENV NODE_ENV=production

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json

RUN pnpm install --prod --frozen-lockfile

COPY --from=build /app/apps/backend/dist ./apps/backend/dist
COPY --from=build /app/packages/shared-types ./packages/shared-types

WORKDIR /app/apps/backend

EXPOSE 8080

CMD ["node", "dist/index.js"]