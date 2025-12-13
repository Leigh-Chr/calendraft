# syntax=docker/dockerfile:1
# ===================================
# Calendraft Frontend - Dockerfile
# Optimized multi-stage build for production
# ===================================

# Stage 1: Build application
# Using specific version tag instead of :latest for reproducibility
FROM oven/bun:1.3.1-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
# (this layer is cached until package files change)
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

# Copy source code (separate layer - changes more frequently)
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

# Build arguments for Vite environment variables (compiled at build time)
ARG VITE_SERVER_URL=http://localhost:3000
ARG VITE_SENTRY_DSN=
ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV VITE_SENTRY_DSN=$VITE_SENTRY_DSN
ENV NODE_ENV=production

# Build the frontend (production mode)
RUN cd apps/web && NODE_ENV=production ./node_modules/.bin/vite build

# -----------------------------------
# Stage 2: Production with Nginx (minimal ~25MB image)
# Using nginx-unprivileged for security best practices (non-root user)
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runner

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY apps/web/nginx.conf /etc/nginx/conf.d/calendraft.conf

# Copy only the built static assets (no node_modules, no source)
COPY --from=builder --chown=101:101 /app/apps/web/dist /usr/share/nginx/html

# Create necessary directories with correct permissions
RUN mkdir -p /var/cache/nginx/client_temp \
    /var/cache/nginx/proxy_temp \
    /var/cache/nginx/fastcgi_temp \
    /var/cache/nginx/uwsgi_temp \
    /var/cache/nginx/scgi_temp \
    /var/run && \
    chown -R 101:101 /var/cache/nginx /var/run /usr/share/nginx/html

# nginx-unprivileged runs as user 101 (nginx)
# No need to set USER as it's already non-root

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
