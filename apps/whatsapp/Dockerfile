# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/whatsapp/package.json ./apps/whatsapp/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/shared ./packages/shared
COPY apps/whatsapp ./apps/whatsapp
RUN pnpm --filter @agenda/shared build
RUN pnpm --filter @agenda/whatsapp build
RUN pnpm --filter @agenda/whatsapp deploy --prod /prod/whatsapp

FROM base AS runner
ENV NODE_ENV=production
COPY --from=build /prod/whatsapp /app
WORKDIR /app
CMD ["node", "dist/main.js"]
