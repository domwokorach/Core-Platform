#!/usr/bin/env bash
# Safe LOCAL reset + reseed of the FICTIONAL development database with GBP opening-balance journals.
# Destroys the local Postgres volume. Never run against anything but the docker-compose dev database.
set -euo pipefail
cd "$(dirname "$0")/.."
read -r -p "This DELETES the local FINIX dev database and reseeds fictional GBP data. Type 'reset' to continue: " ok
[ "$ok" = "reset" ] || { echo "Aborted."; exit 1; }
docker compose rm -sfv postgres
docker volume rm -f "$(basename "$PWD")_finix_pg" 2>/dev/null || true
docker compose up -d postgres
echo "Postgres is starting. Now start the API with the dev profile; Flyway recreates the schema and seeds GBP data:"
echo "  cd backend && mvn spring-boot:run -Dspring-boot.run.profiles=dev"
