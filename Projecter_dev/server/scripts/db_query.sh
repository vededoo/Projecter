#!/usr/bin/env bash
# Wrapper psql avec timeout pour éviter de bloquer le terminal.
# Usage : ./db_query.sh "SELECT * FROM projects LIMIT 5;" [timeout_seconds]
set -euo pipefail
SQL="${1:-}"
TIMEOUT="${2:-5}"
DB="${PGDATABASE:-Projecter_dev}"
if [[ -z "$SQL" ]]; then
  echo "Usage: $0 \"SELECT ...\" [timeout_seconds]" >&2
  exit 2
fi
# /usr/bin/timeout sur Linux ; gtimeout (coreutils) ou perl fallback sur macOS
if command -v gtimeout >/dev/null 2>&1; then
  TO="gtimeout $TIMEOUT"
elif command -v timeout >/dev/null 2>&1; then
  TO="timeout $TIMEOUT"
else
  TO="perl -e 'alarm shift; exec @ARGV' $TIMEOUT"
fi
eval $TO psql -d "$DB" -c "\"$SQL\"" -P pager=off
