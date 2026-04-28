#!/bin/bash
# ════════════════════════════════════════════════════════════════
# Script de déploiement Projecter
# ════════════════════════════════════════════════════════════════
# Usage: ./deploy.sh <version>
# Exemple: ./deploy.sh 0.1.0
#
# Pattern standard MSA :
#  1. Vérifie qu'il n'y a pas de changements non commités (DEV)
#  2. Génère un changelog depuis les commits conventionnels
#  3. Bump version dans Projecter_dev/client/package.json
#  4. Tag annoté + push tag + main
#  5. Met à jour CHANGELOG.md
#  6. Si Projecter_prd absent → git clone (1er déploiement)
#  7. Sinon → fetch + checkout du tag
#  8. Applique les configs PRD (.env serveur + client)
#  9. npm install + build client (production)
# 10. Démarre / redémarre les processus PM2 PRD
# ════════════════════════════════════════════════════════════════

set -euo pipefail

# ─────────────────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────────────────

if [ -z "${1:-}" ]; then
    echo "❌ Usage: ./deploy.sh <version>"
    echo "   Exemple: ./deploy.sh 0.1.0"
    exit 1
fi

VERSION="$1"
TAG_NAME="v$VERSION"
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
DEV_DIR="$BASE_DIR/Projecter_dev"
PROD_DIR="$BASE_DIR/Projecter_prd"
PROD_APP_DIR="$PROD_DIR/Projecter_dev"   # structure imbriquée (clone du repo)

REMOTE_URL="https://github.com/vededoo/Projecter.git"

# Ports DEV → PRD (POS 05)
DEV_SERVER_PORT=5054
PRD_SERVER_PORT=5051
DEV_CLIENT_PORT=3054
PRD_CLIENT_PORT=3051
DEV_DB_NAME="Projecter_dev"
PRD_DB_NAME="Projecter_prd"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  📦 Déploiement Projecter v$VERSION"
echo "═══════════════════════════════════════════════════════"
echo ""

# ─────────────────────────────────────────────────────────
# ÉTAPE 0 : Vérifications préliminaires
# ─────────────────────────────────────────────────────────

if [ ! -d "$DEV_DIR" ]; then
    echo "❌ ERREUR: Le répertoire DEV n'existe pas: $DEV_DIR"
    exit 1
fi

cd "$BASE_DIR"
if [ -n "$(git status --porcelain)" ]; then
    echo "⚠️  ATTENTION: Changements non commités dans Projecter :"
    git status --short
    echo ""
    echo "Continuer quand même ? (o/n)"
    read -r response
    if [[ ! "$response" =~ ^([oO][uU][iI]|[oO])$ ]]; then
        echo "Déploiement annulé."
        exit 1
    fi
fi

if git rev-parse "$TAG_NAME" >/dev/null 2>&1; then
    echo "❌ ERREUR: Le tag $TAG_NAME existe déjà."
    echo "   Choisissez une autre version ou supprimez le tag : git tag -d $TAG_NAME"
    exit 1
fi

# ─────────────────────────────────────────────────────────
# ÉTAPE 1 : Génération du changelog
# ─────────────────────────────────────────────────────────

echo "📝 Génération des notes de version..."
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

generate_changelog() {
    local last_tag=$1
    local features="" fixes="" docs="" refactors="" perfs="" styles="" tests="" chores="" others=""
    local commits
    if [ -z "$last_tag" ]; then
        commits=$(git log --pretty=format:"%s" --no-merges)
    else
        commits=$(git log "$last_tag"..HEAD --pretty=format:"%s" --no-merges)
    fi
    while IFS= read -r commit; do
        [ -z "$commit" ] && continue
        if   [[ "$commit" == feat:*    ]] || [[ "$commit" == feature:* ]]; then features="${features}- ${commit#*: }\n"
        elif [[ "$commit" == fix:*     ]] || [[ "$commit" == bugfix:*  ]]; then fixes="${fixes}- ${commit#*: }\n"
        elif [[ "$commit" == docs:*    ]]; then docs="${docs}- ${commit#*: }\n"
        elif [[ "$commit" == refactor:*]]; then refactors="${refactors}- ${commit#*: }\n"
        elif [[ "$commit" == perf:*    ]]; then perfs="${perfs}- ${commit#*: }\n"
        elif [[ "$commit" == style:*   ]]; then styles="${styles}- ${commit#*: }\n"
        elif [[ "$commit" == test:*    ]]; then tests="${tests}- ${commit#*: }\n"
        elif [[ "$commit" == chore:*   ]]; then chores="${chores}- ${commit#*: }\n"
        elif [[ ! "$commit" == *"Déploiement"* ]] && [[ ! "$commit" == *"Restauration"* ]]; then
            others="${others}- ${commit}\n"
        fi
    done <<< "$commits"

    local changelog="# Release $VERSION ($(date '+%Y-%m-%d'))\n\n"
    [ -n "$features"  ] && changelog="${changelog}## ✨ Nouvelles fonctionnalités\n${features}\n"
    [ -n "$fixes"     ] && changelog="${changelog}## 🐛 Corrections\n${fixes}\n"
    [ -n "$docs"      ] && changelog="${changelog}## 📚 Documentation\n${docs}\n"
    [ -n "$refactors" ] && changelog="${changelog}## 🔄 Refactorisation\n${refactors}\n"
    [ -n "$perfs"     ] && changelog="${changelog}## ⚡ Performance\n${perfs}\n"
    [ -n "$styles"    ] && changelog="${changelog}## 🎨 Style\n${styles}\n"
    [ -n "$tests"     ] && changelog="${changelog}## ✅ Tests\n${tests}\n"
    [ -n "$chores"    ] && changelog="${changelog}## 🔧 Maintenance\n${chores}\n"
    [ -n "$others"    ] && changelog="${changelog}## 🔹 Autres changements\n${others}\n"
    echo -e "$changelog"
}

CHANGELOG=$(generate_changelog "$LAST_TAG")
TAG_MESSAGE=$(echo -e "Release Projecter v$VERSION\n\n$CHANGELOG\n\nDate: $(date '+%Y-%m-%d %H:%M:%S')\nDéployé par: $(git config user.name 2>/dev/null || echo 'unknown')")

echo -e "\n==== CHANGELOG ====\n"
echo -e "$CHANGELOG"
echo -e "===================\n"

# ─────────────────────────────────────────────────────────
# ÉTAPE 2 : Bump version + tag + push
# ─────────────────────────────────────────────────────────

PKG_FILE="$DEV_DIR/client/package.json"
if [ -f "$PKG_FILE" ]; then
    echo "📦 Mise à jour de la version dans client/package.json..."
    sed -i '' "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$VERSION\"/" "$PKG_FILE"
    git add "$PKG_FILE"
    git diff --cached --quiet && echo "   ℹ️  Version déjà à $VERSION" || git commit -m "chore: bump version to $VERSION"
fi

echo "🏷️  Création du tag $TAG_NAME..."
current_branch=$(git rev-parse --abbrev-ref HEAD)
if [ "$current_branch" != "main" ]; then
    echo "⚠️  Basculement sur main (actuellement sur $current_branch)..."
    git checkout main
fi

git tag -a "$TAG_NAME" -m "$TAG_MESSAGE"
git push origin "$TAG_NAME"
git push origin main
echo "✅ Tag $TAG_NAME créé et poussé"

# ─────────────────────────────────────────────────────────
# ÉTAPE 3 : Mise à jour CHANGELOG.md
# ─────────────────────────────────────────────────────────

echo "📄 Mise à jour du CHANGELOG.md..."
CHANGELOG_FILE="$DEV_DIR/CHANGELOG.md"
{
    echo "# Changelog"
    echo ""
    echo "## [$VERSION] - $(date '+%Y-%m-%d')"
    echo ""
    echo -e "$CHANGELOG" | sed '/^# Release/d; /^$/d'
    echo ""
    if [ -f "$CHANGELOG_FILE" ]; then
        tail -n +3 "$CHANGELOG_FILE"
    fi
} > "$CHANGELOG_FILE.tmp"
mv "$CHANGELOG_FILE.tmp" "$CHANGELOG_FILE"

git add "$CHANGELOG_FILE"
git commit -m "docs: mise à jour du CHANGELOG pour v$VERSION" || true
git push origin main || true

# ─────────────────────────────────────────────────────────
# ÉTAPE 4 : Préparer Projecter_prd
# ─────────────────────────────────────────────────────────

if [ ! -d "$PROD_DIR" ]; then
    echo "📥 Premier déploiement : clonage de $REMOTE_URL → Projecter_prd..."
    cd "$BASE_DIR"
    git clone "$REMOTE_URL" Projecter_prd
fi

echo "🔄 Mise à jour de Projecter_prd vers $TAG_NAME..."
cd "$PROD_DIR"
if [ -n "$(git status --porcelain)" ]; then
    echo "💾 Sauvegarde des modifications locales de PRD..."
    git stash
fi
git fetch --tags
sleep 1
git checkout "$TAG_NAME"
echo "✅ Projecter_prd sur $TAG_NAME"

# ─────────────────────────────────────────────────────────
# ÉTAPE 5 : Configurations PRD
# ─────────────────────────────────────────────────────────

echo "⚙️  Application des configurations de production..."

# server/.env
if [ -f "$PROD_APP_DIR/server/.env" ]; then
    sed -i '' "s/NODE_ENV=development/NODE_ENV=production/" "$PROD_APP_DIR/server/.env" || true
    sed -i '' "s/PORT=$DEV_SERVER_PORT/PORT=$PRD_SERVER_PORT/" "$PROD_APP_DIR/server/.env" || true
    sed -i '' "s/PGDATABASE=$DEV_DB_NAME/PGDATABASE=$PRD_DB_NAME/" "$PROD_APP_DIR/server/.env" || true
    sed -i '' "s|Projecter_dev/storage|Projecter_prd/Projecter_dev/storage|g" "$PROD_APP_DIR/server/.env" || true
    sed -i '' "s|Projecter_dev/logs|Projecter_prd/Projecter_dev/logs|g" "$PROD_APP_DIR/server/.env" || true
    sed -i '' "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://msa.hopto.org:60051,https://msa.hopto.org:6051,http://localhost:3051|" "$PROD_APP_DIR/server/.env" || true
elif [ -f "$DEV_DIR/server/.env" ]; then
    echo "   📋 Copie server/.env depuis dev..."
    cp "$DEV_DIR/server/.env" "$PROD_APP_DIR/server/.env"
    sed -i '' "s/NODE_ENV=development/NODE_ENV=production/" "$PROD_APP_DIR/server/.env"
    sed -i '' "s/PORT=$DEV_SERVER_PORT/PORT=$PRD_SERVER_PORT/" "$PROD_APP_DIR/server/.env"
    sed -i '' "s/PGDATABASE=$DEV_DB_NAME/PGDATABASE=$PRD_DB_NAME/" "$PROD_APP_DIR/server/.env"
    sed -i '' "s|Projecter_dev/storage|Projecter_prd/Projecter_dev/storage|g" "$PROD_APP_DIR/server/.env"
    sed -i '' "s|Projecter_dev/logs|Projecter_prd/Projecter_dev/logs|g" "$PROD_APP_DIR/server/.env"
    sed -i '' "s|CORS_ORIGINS=.*|CORS_ORIGINS=https://msa.hopto.org:60051,https://msa.hopto.org:6051,http://localhost:3051|" "$PROD_APP_DIR/server/.env"
fi

# client/.env
if [ -f "$PROD_APP_DIR/client/.env" ]; then
    sed -i '' "s/PORT=$DEV_CLIENT_PORT/PORT=$PRD_CLIENT_PORT/" "$PROD_APP_DIR/client/.env" || true
elif [ -f "$DEV_DIR/client/.env" ]; then
    echo "   📋 Copie client/.env depuis dev..."
    cp "$DEV_DIR/client/.env" "$PROD_APP_DIR/client/.env"
    sed -i '' "s/PORT=$DEV_CLIENT_PORT/PORT=$PRD_CLIENT_PORT/" "$PROD_APP_DIR/client/.env"
fi

echo "✅ Configurations PRD appliquées :"
echo "   - server/.env : NODE_ENV=production, PORT=$PRD_SERVER_PORT, DB=$PRD_DB_NAME"
echo "   - client/.env : PORT=$PRD_CLIENT_PORT, API→/api (via Caddy)"

# ─────────────────────────────────────────────────────────
# ÉTAPE 6 : npm install + build client
# ─────────────────────────────────────────────────────────

echo ""
echo "📦 Installation des dépendances serveur..."
cd "$PROD_APP_DIR/server"
npm install --production 2>&1 | tail -1

echo "🔨 Build du client pour la production..."
cd "$PROD_APP_DIR/client"
echo "🧹 Nettoyage des caches..."
rm -rf node_modules/.cache tsconfig.tsbuildinfo .tsbuildinfo build

npm install --legacy-peer-deps
npm run build

if [ $? -ne 0 ]; then
    echo "❌ ERREUR: Le build du client a échoué."
    exit 1
fi
echo "✅ Build du client réussi !"

# ─────────────────────────────────────────────────────────
# ÉTAPE 7 : Redémarrer PM2 de production
# ─────────────────────────────────────────────────────────

echo ""
echo "🔄 (Re)démarrage des services PM2 de production..."
cd "$BASE_DIR"

for process in projecter_prd_server projecter_prd_client; do
    if pm2 describe "$process" >/dev/null 2>&1; then
        pm2 restart "$process"
        echo "   ✅ $process redémarré"
    else
        pm2 start ecosystem.config.js --only "$process"
        echo "   ✅ $process démarré"
    fi
done
pm2 save

# ─────────────────────────────────────────────────────────
# RÉSUMÉ
# ─────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ Déploiement Projecter v$VERSION terminé !"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 Résumé :"
echo "   🏷️  Tag     : $TAG_NAME"
echo "   📂 DEV     : PORT=$DEV_CLIENT_PORT (client) / $DEV_SERVER_PORT (server) / DB=$DEV_DB_NAME"
echo "   📂 PRD     : PORT=$PRD_CLIENT_PORT (client) / $PRD_SERVER_PORT (server) / DB=$PRD_DB_NAME"
echo "   🌐 URL PRD : https://msa.hopto.org:6051"
echo ""
echo "💡 Prochaine étape : tester en production"
echo "   curl -k https://msa.hopto.org:6051/api/health"
echo ""
