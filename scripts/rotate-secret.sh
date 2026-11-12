#!/usr/bin/env bash
# Deliberate, explicit rotation of one dev secret. Never run implicitly.
#   bash scripts/rotate-secret.sh postgres | keycloak-admin | session
# postgres        new POSTGRES_PASSWORD applied to the running database (data kept), .env updated, backend restarted
# keycloak-admin  new KC_BOOTSTRAP_ADMIN_PASSWORD set on the Keycloak 'admin' user, .env updated
# session         new FINIX_SESSION_SECRET (all application sessions signed with the old one stop being valid)
set -euo pipefail
umask 077
cd "$(dirname "$0")/.."
ENV_FILE=".env"
die() { echo "rotate-secret: $*" >&2; exit 1; }
command -v openssl >/dev/null || die "openssl is required"
[ -f "$ENV_FILE" ] || die "no $ENV_FILE; run scripts/setup-env.sh first"
value_of() { grep -E "^$1=" "$ENV_FILE" | tail -n1 | cut -d= -f2-; }
write_env() {                                                       # write_env NAME VALUE (atomic)
  local t; t="$(mktemp "$ENV_FILE.XXXXXX")"
  grep -Ev "^$1=" "$ENV_FILE" > "$t" || true
  printf '%s=%s\n' "$1" "$2" >> "$t"; chmod 600 "$t"; mv "$t" "$ENV_FILE"
}
new="$(openssl rand -hex 32)"
case "${1:-}" in
  postgres)
    user="$(value_of POSTGRES_USER)"
    printf "ALTER USER \"%s\" PASSWORD '%s';\n" "$user" "$new" | docker compose exec -T postgres psql -U "$user" -d postgres -v ON_ERROR_STOP=1 -q >/dev/null
    write_env POSTGRES_PASSWORD "$new"
    # Only a containerised API that is already running is restarted (to re-read the value); nothing new is started.
    if [ -n "$(docker compose -f docker-compose.yml -f docker-compose.full.yml ps -q backend 2>/dev/null)" ]; then
      docker compose -f docker-compose.yml -f docker-compose.full.yml up -d --no-deps --force-recreate backend >/dev/null
    fi
    echo "POSTGRES_PASSWORD rotated. Restart a locally run API so it reads the new value." ;;
  keycloak-admin)
    old="$(value_of KC_BOOTSTRAP_ADMIN_PASSWORD)"; user="$(value_of KC_BOOTSTRAP_ADMIN_USERNAME)"
    docker compose exec -T -e "OLD=$old" -e "NEW=$new" -e "U=$user" keycloak sh -c '
      /opt/keycloak/bin/kcadm.sh config credentials --server http://localhost:8080 --realm master --user "$U" --password "$OLD" >/dev/null &&
      /opt/keycloak/bin/kcadm.sh set-password -r master --username "$U" --new-password "$NEW"' >/dev/null
    write_env KC_BOOTSTRAP_ADMIN_PASSWORD "$new"
    echo "Keycloak admin password rotated." ;;
  session)
    write_env FINIX_SESSION_SECRET "$new"
    echo "FINIX_SESSION_SECRET rotated; restart the web app. Existing sessions signed with the old secret are invalidated." ;;
  *) die "usage: rotate-secret.sh postgres | keycloak-admin | session" ;;
esac
