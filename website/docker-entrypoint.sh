#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Running drizzle migrations..."
  drizzle-kit migrate
fi

echo "Starting website..."
exec "$@"
