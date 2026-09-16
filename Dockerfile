# ==============================================================================
# Multi-Cloud Production Dockerfile for CloudPulse AI
# Compatible with: AWS App Runner / ECS, Google Cloud Run, Azure Container Apps,
# and Kubernetes (EKS / GKE / AKS).
# ==============================================================================

# Stage 1: Dependencies
FROM node:22-alpine AS dependencies
WORKDIR /app

RUN apk add --no-cache libc6-compat
COPY package.json ./
RUN npm install --omit=dev --ignore-scripts

# Stage 2: Runtime
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3002

COPY --from=dependencies /app/node_modules ./node_modules
COPY package.json ./
COPY src/ ./src/

USER node
EXPOSE 3002

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3002}/api/health || exit 1

CMD ["node", "src/server.js"]
