# ===================================
# Calendraft Frontend - Dockerfile
# Multi-stage build: Bun for deps/build, Nginx for serving
# ===================================

# Stage 1: Build application
FROM oven/bun:1.3.1-alpine AS builder

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

# Copy source code
COPY packages ./packages
COPY apps/web ./apps/web
COPY turbo.json ./

# Link workspace packages for module resolution
RUN mkdir -p node_modules/@calendraft && \
    ln -s /app/packages/config node_modules/@calendraft/config && \
    ln -s /app/packages/core node_modules/@calendraft/core && \
    ln -s /app/packages/schemas node_modules/@calendraft/schemas && \
    ln -s /app/packages/ics-utils node_modules/@calendraft/ics-utils && \
    ln -s /app/packages/react-utils node_modules/@calendraft/react-utils && \
    ln -s /app/packages/api node_modules/@calendraft/api && \
    ln -s /app/packages/auth node_modules/@calendraft/auth && \
    ln -s /app/packages/db node_modules/@calendraft/db

# Build arguments for environment variables (Vite compiles these at build time)
ARG VITE_SERVER_URL=http://localhost:3000
ARG VITE_SENTRY_DSN=
ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN

# Build the frontend (use vite from apps/web/node_modules)
RUN cd apps/web && ./node_modules/.bin/vite build

# -----------------------------------
# Stage 2: Production with Nginx
FROM nginx:1.27-alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/calendraft.conf

# Copy built assets from builder
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
