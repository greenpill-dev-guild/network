FROM oven/bun:1.3.10-alpine AS build

WORKDIR /app

COPY package.json bun.lock tsconfig.json tsconfig.base.json tsconfig.scripts.json ./
COPY packages/admin/package.json packages/admin/package.json
COPY packages/agent/package.json packages/agent/package.json
COPY packages/agent/tsconfig.json packages/agent/tsconfig.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/shared/tsconfig.json packages/shared/tsconfig.json
COPY packages/website/package.json packages/website/package.json
COPY packages/workspace/package.json packages/workspace/package.json

RUN bun install --frozen-lockfile --linker hoisted

COPY packages/agent/src packages/agent/src
COPY packages/shared/src packages/shared/src

RUN bun run build:packages

FROM oven/bun:1.3.10-alpine AS deps

WORKDIR /app

COPY package.json bun.lock ./
COPY packages/admin/package.json packages/admin/package.json
COPY packages/agent/package.json packages/agent/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/website/package.json packages/website/package.json
COPY packages/workspace/package.json packages/workspace/package.json

RUN bun install --frozen-lockfile --production --filter @greenpill-network/agent --linker hoisted

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=deps /app/node_modules ./node_modules
COPY package.json bun.lock ./
COPY packages/agent/package.json ./packages/agent/package.json
COPY packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/agent/dist ./packages/agent/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist

EXPOSE 8080

CMD ["node", "packages/agent/dist/server.js"]
