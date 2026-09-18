# Multi-stage production Dockerfile for CloudPulse AI (TypeScript)
FROM node:22-alpine AS build
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY scripts/ ./scripts/
COPY src/ ./src/
RUN npm run build

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3002
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3002}/api/health || exit 1
CMD ["node", "dist/server.js"]
