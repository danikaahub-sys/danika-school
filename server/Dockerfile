# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:24-alpine AS deps

WORKDIR /app
ENV HUSKY=0 CI=1 NODE_OPTIONS=--max-old-space-size=1024
COPY package.json package-lock.json ./
# Compilers only exist in this RUN layer; apk del drops them from the image.
RUN apk upgrade --no-cache \
 && apk add --no-cache python3 make g++ \
 && npm ci --ignore-scripts --maxsockets=3 \
 && apk del python3 make g++

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

WORKDIR /app
ENV HUSKY=0 CI=1 NODE_OPTIONS=--max-old-space-size=1024
RUN apk upgrade --no-cache
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate \
 && npm run build \
 && npm prune --omit=dev

# ─── Stage 3: Production ──────────────────────────────────────────────────────
FROM node:24-alpine AS production

ENV NODE_ENV=production
ENV NODE_OPTIONS=--max-old-space-size=384

WORKDIR /app
RUN apk upgrade --no-cache \
 && addgroup -g 1001 -S nodejs \
 && adduser -S nestjs -u 1001 -G nodejs

COPY --from=builder --chown=nestjs:nodejs /app/dist              ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules      ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma            ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/prisma.config.ts  ./prisma.config.ts
COPY --chown=nestjs:nodejs package.json             ./
COPY --chown=nestjs:nodejs docker-entrypoint.sh     ./

RUN chmod +x docker-entrypoint.sh

USER nestjs

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/main"]
