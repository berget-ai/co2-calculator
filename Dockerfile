# Multi-stage build for static site
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/co2-calculator/package.json ./packages/co2-calculator/
COPY apps/demo/package.json ./apps/demo/

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/co2-calculator/ ./packages/co2-calculator/
COPY apps/demo/ ./apps/demo/

# Build packages and app
RUN pnpm --filter @berget/co2-calculator build
RUN pnpm --filter @berget/co2-calculator-demo build

# Production stage - nginx
FROM nginx:alpine

# Copy built static files
COPY --from=builder /app/apps/demo/dist /usr/share/nginx/html

# Copy nginx config
COPY apps/demo/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1
