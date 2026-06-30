#!/bin/bash
# ════════════════════════════════════════════════════════════════
# Déploiement Projecter — utilise la lib MSA partagée
# ════════════════════════════════════════════════════════════════
# Usage: ./deploy.sh <version>
# Exemple: ./deploy.sh 1.1.3
#
# La logique vit dans Shared/scripts/deploy-{lib,app}.sh.
# Ce fichier ne contient que la configuration spécifique à Projecter.
# ════════════════════════════════════════════════════════════════

set -euo pipefail

if [ -z "${1:-}" ]; then
    echo "❌ Usage: ./deploy.sh <version>"
    echo "   Exemple: ./deploy.sh 1.1.3"
    exit 1
fi

source /Users/ldurpel/Development/Projects/Shared/scripts/deploy-app.sh

deploy_app \
    --name        "Projecter" \
    --dev-subdir  "Projecter_dev" \
    --prd-subdir  "Projecter_prd" \
    --version     "$1" \
    --pm2         "projecter_prd_server,projecter_prd_client" \
    --preserve    "storage,logs,server/.env,client/.env" \
    --build-client \
    --migrate     "PGDATABASE=Projecter_prd npm run migrate" \
    --port-summary "client 3054/3051 · server 5054/5051 · URL https://msa.hopto.org:6051"
