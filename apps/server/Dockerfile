# ===================================
# Calendraft Backend - Dockerfile
# Multi-stage build for optimized production image
# ===================================

# Stage 1: Install dependencies
FROM oven/bun:1.3.1-alpine AS deps

WORKDIR /app

# Copy all package files for workspace resolution
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

# Install dependencies
RUN bun install

# -----------------------------------
# Stage 2: Build
FROM oven/bun:1.3.1-alpine AS builder

WORKDIR /app

# Copy everything from deps
COPY --from=deps /app/node_modules ./node_modules

# Copy source code (including config package needed for tsconfig)
COPY package.json bun.lock turbo.json ./
COPY packages ./packages
COPY apps/server ./apps/server

# Create empty .env file for Prisma config (actual values come from runtime env)
RUN mkdir -p apps/server && touch apps/server/.env

# Link workspace packages for Prisma to find @calendraft/config
RUN mkdir -p node_modules/@calendraft && \
    ln -s /app/packages/config node_modules/@calendraft/config

# Generate Prisma client
RUN cd packages/db && bun x prisma generate

# Build all packages and server
RUN bun run build

# -----------------------------------
# Stage 3: Production runtime
FROM oven/bun:1.3.1-alpine AS runner

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bunjs

# Copy node_modules and packages (needed for runtime)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# Create workspace links for runtime module resolution
RUN mkdir -p node_modules/@calendraft && \
    ln -s /app/packages/config node_modules/@calendraft/config && \
    ln -s /app/packages/core node_modules/@calendraft/core && \
    ln -s /app/packages/schemas node_modules/@calendraft/schemas && \
    ln -s /app/packages/ics-utils node_modules/@calendraft/ics-utils && \
    ln -s /app/packages/db node_modules/@calendraft/db && \
    ln -s /app/packages/auth node_modules/@calendraft/auth && \
    ln -s /app/packages/api node_modules/@calendraft/api

# Copy built server
COPY --from=builder /app/apps/server/dist ./apps/server/dist
COPY --from=builder /app/apps/server/package.json ./apps/server/

# Set ownership for non-root user
RUN chown -R bunjs:nodejs /app

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Switch to non-root user
USER bunjs

WORKDIR /app/apps/server

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

CMD ["bun", "run", "start"]
