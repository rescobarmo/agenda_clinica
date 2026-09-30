# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/database/package.json ./packages/database/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/database ./packages/database
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN pnpm --filter @agenda/database generate
RUN pnpm --filter @agenda/database build
RUN pnpm --filter @agenda/shared build
RUN pnpm --filter @agenda/api build
RUN pnpm --filter @agenda/api deploy --prod /prod/api

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /prod/api /app
WORKDIR /app
EXPOSE 4000
CMD ["node", "dist/main.js"]
