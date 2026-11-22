#!/bin/sh
set -e
# App DB is Prisma on danika-api. Do not run drizzle-kit on boot — a global
# install cannot load drizzle-orm and it crash-loops the marketing site.
echo "Starting website..."
exec "$@"
