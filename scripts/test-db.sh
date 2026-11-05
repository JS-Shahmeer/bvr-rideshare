#!/usr/bin/env bash
# Applies supabase/migrations to a throwaway local Postgres (with stand-ins for
# Supabase's auth schema and roles) and runs supabase/tests/*.test.sql.
set -euo pipefail
cd "$(dirname "$0")/.."
PGBIN=${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}
DIR=$(mktemp -d)
PORT=${PGPORT_TEST:-54329}
trap 'as_pg "$PGBIN/pg_ctl" -D "$DIR" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DIR"' EXIT
# Postgres refuses to run as root; in containers, run the server as postgres.
as_pg() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
[ "$(id -u)" = 0 ] && chown postgres "$DIR"
as_pg "$PGBIN/initdb" -D "$DIR" -U postgres -A trust >/dev/null
as_pg "$PGBIN/pg_ctl" -D "$DIR" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" start -w >/dev/null
run() { psql -X -q -v ON_ERROR_STOP=1 -h "$DIR" -p "$PORT" -U postgres -d postgres "$@"; }
run -f supabase/tests/supabase-stubs.sql 2>&1 | grep -v -e wal_level -e "HINT:" || true
for f in supabase/migrations/*.sql; do run -f "$f"; done
for t in supabase/tests/*.test.sql; do echo "# $t"; run -f "$t" 2>&1 | sed -n 's/^psql:.*NOTICE:  //p; s/^NOTICE:  //p; /ERROR/p'; done
