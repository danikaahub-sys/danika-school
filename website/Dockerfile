# Context: website/. Build args bake NEXT_PUBLIC_* into the client bundle.
# Runtime secrets (DATABASE_URL, CLERK_SECRET_KEY) come from --env-file.

FROM node:24-alpine AS deps
WORKDIR /app
ENV CI=1 HUSKY=0 NEXT_TELEMETRY_DISABLED=1
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

FROM node:24-alpine AS build
WORKDIR /app
ENV CI=1 HUSKY=0 NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_SENTRY_DISABLED=true
ENV NODE_OPTIONS=--max-old-space-size=4096
COPY --from=deps /app/node_modules ./node_modules
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

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs \
 && npm install -g drizzle-kit@0.31.10

COPY --from=build /app/public ./public
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build /app/migrations ./migrations
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh \
 && chown nextjs:nodejs docker-entrypoint.sh drizzle.config.ts \
 && chown -R nextjs:nodejs migrations

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "server.js"]
