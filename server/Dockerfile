# ─── Stage 0: Development (hot reload) ───────────────────────────────────────
FROM node:24-alpine AS dev

RUN apk upgrade --no-cache \
 && apk add --no-cache python3 make g++

WORKDIR /app

ENV HUSKY=0 CI=1
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

EXPOSE 3001

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]

# ─── Stage 1: Install dependencies ───────────────────────────────────────────
FROM node:24-alpine AS deps

# Patch base image CVEs, then install native module build tools
RUN apk upgrade --no-cache \
 && apk add --no-cache python3 make g++

WORKDIR /app

ENV HUSKY=0 CI=1
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ─── Stage 2: Build ───────────────────────────────────────────────────────────
FROM node:24-alpine AS builder

RUN apk upgrade --no-cache

WORKDIR /app

ENV HUSKY=0 CI=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npx prisma generate \
 && npm run build \
 && npm prune --omit=dev

# ─── Stage 3: Production ──────────────────────────────────────────────────────
FROM node:24-alpine AS production

ENV NODE_ENV=production

RUN apk upgrade --no-cache

WORKDIR /app

RUN addgroup -g 1001 -S nodejs \
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
