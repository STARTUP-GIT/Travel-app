# ==============================================================================
# Multi-stage Dockerfile for Atlas Wanders Backend
# ==============================================================================

# Stage 1: Base image with OpenSSL required by Prisma
FROM node:20-bookworm-slim AS base
WORKDIR /app
RUN apt-get update && apt-get install -y openssl dumb-init && rm -rf /var/lib/apt/lists/*

# Stage 2: Install dependencies and build project
FROM base AS builder
WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./
RUN npm ci

# Copy Prisma schema and configuration to generate client
COPY prisma ./prisma
COPY prisma7.config.ts tsconfig.json ./
RUN npm run db:generate

# Copy application source code
COPY server.ts ./
COPY src ./src

# Build TypeScript to dist
RUN npm run build

# Remove development dependencies to keep final image slim
RUN npm prune --omit=dev

# Stage 3: Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080

# Copy runtime files from builder
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma7.config.ts ./

# Assign ownership to non-root node user for security
RUN chown -R node:node /app

USER node

EXPOSE 8080

CMD ["dumb-init", "node", "dist/server.js"]

