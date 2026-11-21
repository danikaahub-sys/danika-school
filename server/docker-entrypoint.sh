#!/bin/sh
set -e

# Client is generated at image build. Re-generating on every start spikes RAM
# on a shared VPS.
echo "Running database migrations..."
npm run db:migrate-prod

echo "Starting application..."
exec "$@"
