# Context: school/. VITE_API_URL is baked into the SPA at build time.
FROM node:24-alpine AS build
WORKDIR /app
ENV CI=1 NODE_OPTIONS=--max-old-space-size=768
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY scripts/docker-slim-package.mjs ./scripts/docker-slim-package.mjs
RUN node scripts/docker-slim-package.mjs \
 && pnpm install --no-frozen-lockfile --network-concurrency 2
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN test -n "$VITE_API_URL" \
 && pnpm run build \
 && rm -rf node_modules

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
