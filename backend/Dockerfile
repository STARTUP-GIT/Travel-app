# ==============================================================================
# Multi-stage Dockerfile for Atlas Wanders Backend
# ==============================================================================

# Stage 1: Base image with OpenSSL required by Prisma
FROM node:20-bookworm-slim AS base
WORKDIR /app
# --no-install-recommends keeps the layer lean by excluding suggested packages.
RUN apt-get update && apt-get install -y --no-install-recommends openssl dumb-init \
    && rm -rf /var/lib/apt/lists/*

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

# Build TypeScript to dist/
# The generated client (src/generated/client/*.ts) is compiled into
# dist/src/generated/client/ and is fully contained in dist/.
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

# prisma/ and prisma7.config.ts are required at runtime for 'prisma migrate deploy'
# (run via 'docker compose exec backend npm run db:migrate' during each deployment).
# prisma7.config.ts is the only source of DATABASE_URL for the Prisma CLI since
# schema.prisma intentionally has no url field (Prisma 7 defineConfig pattern).
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma7.config.ts ./

# Assign ownership to non-root node user for security
RUN chown -R node:node /app

USER node

EXPOSE 8080

# Health check: uses node's native fetch (Node 20+) since curl is not installed
# in node:20-bookworm-slim. The /api/health endpoint is defined in src/app.ts.
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:8080/api/health').then(r=>r.ok?process.exit(0):process.exit(1)).catch(()=>process.exit(1))"

CMD ["dumb-init", "node", "dist/server.js"]
