# Context: website/. Build args bake NEXT_PUBLIC_* into the client bundle.
# Runtime secrets (DATABASE_URL, CLERK_SECRET_KEY) come from --env-file.
# Shared VPS: keep heap and install concurrency low so Pinara/Marymore stay up.

FROM node:24-alpine AS deps
WORKDIR /app
ENV CI=1 HUSKY=0 NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
COPY scripts/docker-slim-package.mjs ./scripts/docker-slim-package.mjs
RUN node scripts/docker-slim-package.mjs \
 && npm install --ignore-scripts --no-audit --no-fund --maxsockets=3

FROM node:24-alpine AS build
WORKDIR /app
ENV CI=1 HUSKY=0 NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_SENTRY_DISABLED=true
ENV NODE_OPTIONS=--max-old-space-size=1536
ENV UV_THREADPOOL_SIZE=2
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY . .

ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_LOGGING_LEVEL=info
ARG NEXT_PUBLIC_SCHOOL_URL=
# Env.ts validates these at `next build`; real values are injected at runtime.
ARG CLERK_SECRET_KEY=build-placeholder
ARG DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build

ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_LOGGING_LEVEL=$NEXT_PUBLIC_LOGGING_LEVEL \
    NEXT_PUBLIC_SCHOOL_URL=$NEXT_PUBLIC_SCHOOL_URL \
    CLERK_SECRET_KEY=$CLERK_SECRET_KEY \
    DATABASE_URL=$DATABASE_URL

RUN test -n "$NEXT_PUBLIC_APP_URL" \
 && test -n "$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" \
 && npm run build:next \
 && rm -rf node_modules/.cache .next/cache

FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_SENTRY_DISABLED=true
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NODE_OPTIONS=--max-old-space-size=384

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/migrations ./migrations
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# After COPY so this does not run in parallel with `deps` npm install.
RUN npm install -g drizzle-kit@0.31.10 --omit=dev --no-audit --no-fund \
 && chmod +x docker-entrypoint.sh \
 && chown nextjs:nodejs docker-entrypoint.sh drizzle.config.ts \
 && chown -R nextjs:nodejs migrations

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
