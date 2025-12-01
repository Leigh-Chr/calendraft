# syntax=docker/dockerfile:1
# ===================================
# Calendraft Backend - Dockerfile
# Optimized multi-stage build for production
# ===================================

# Stage 1: Build
FROM oven/bun:1.3.1-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package.json bun.lock ./
COPY packages/config/package.json ./packages/config/
COPY packages/core/package.json ./packages/core/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/ics-utils/package.json ./packages/ics-utils/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/api/package.json ./packages/api/
COPY packages/react-utils/package.json ./packages/react-utils/
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/

# Install dependencies (cached until package files change)
RUN bun install --frozen-lockfile

# Copy source code
COPY package.json bun.lock turbo.json ./
COPY packages ./packages
COPY apps/server ./apps/server

# Create empty .env for Prisma config
RUN mkdir -p apps/server && touch apps/server/.env

# Link workspace packages for build
RUN mkdir -p node_modules/@calendraft && \
    ln -s /app/packages/config node_modules/@calendraft/config

# Generate Prisma client
RUN cd packages/db && bun x prisma generate

# Build server and ALL its dependencies
RUN ./node_modules/.bin/turbo build --filter=server...

# -----------------------------------
# Stage 2: Production runtime
FROM oven/bun:1.3.1-alpine AS runner

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bunjs

# Copy package files for production install
COPY package.json bun.lock ./
COPY packages/config/package.json ./packages/config/
COPY packages/core/package.json ./packages/core/
COPY packages/schemas/package.json ./packages/schemas/
COPY packages/db/package.json ./packages/db/
COPY packages/auth/package.json ./packages/auth/
COPY packages/api/package.json ./packages/api/
COPY apps/server/package.json ./apps/server/
# Include web package.json for workspace resolution (needed by bun)
COPY apps/web/package.json ./apps/web/
COPY packages/ics-utils/package.json ./packages/ics-utils/
COPY packages/react-utils/package.json ./packages/react-utils/

# Install production dependencies (skip prepare scripts like husky)
RUN bun install --frozen-lockfile --production --ignore-scripts

# Copy config package (no dist, just tsconfig)
COPY --from=builder /app/packages/config ./packages/config

# Copy built packages needed by server (api -> auth, core, db, schemas)
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/schemas/dist ./packages/schemas/dist
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/db/prisma ./packages/db/prisma
COPY --from=builder /app/packages/db/prisma.config.ts ./packages/db/prisma.config.ts
COPY --from=builder /app/packages/auth/dist ./packages/auth/dist
COPY --from=builder /app/packages/api/dist ./packages/api/dist

# Copy built server
COPY --from=builder /app/apps/server/dist ./apps/server/dist

# Create workspace links for packages used at runtime
RUN mkdir -p node_modules/@calendraft && \
    ln -s /app/packages/config node_modules/@calendraft/config && \
    ln -s /app/packages/core node_modules/@calendraft/core && \
    ln -s /app/packages/schemas node_modules/@calendraft/schemas && \
    ln -s /app/packages/db node_modules/@calendraft/db && \
    ln -s /app/packages/auth node_modules/@calendraft/auth && \
    ln -s /app/packages/api node_modules/@calendraft/api

# Set ownership
RUN chown -R bunjs:nodejs /app

ENV NODE_ENV=production
ENV PORT=3000

USER bunjs
WORKDIR /app/apps/server

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["bun", "run", "start"]
