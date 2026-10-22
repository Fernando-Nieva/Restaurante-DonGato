#!/bin/sh

set -eu

if [ -z "${APP_KEY:-}" ]; then
    echo "ERROR: APP_KEY no está definida." >&2
    echo "Copiá .env.docker.example a .env o definí APP_KEY antes de levantar los contenedores." >&2
    exit 1
fi

DB_PATH="${DB_DATABASE:-/var/www/html/database/sqlite/database.sqlite}"
DB_DIR="$(dirname "$DB_PATH")"
SEED_MARKER="${DB_DIR}/.seeded"

mkdir -p "$DB_DIR"
touch "$DB_PATH"

php artisan migrate --force

if [ ! -f "$SEED_MARKER" ]; then
    php artisan db:seed --force
    touch "$SEED_MARKER"
fi

php artisan config:cache

exec "$@"
