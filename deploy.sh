#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

echo "==> Pulling latest code..."
git clean -fd directus/snapshots/
git checkout -- directus/snapshots/ 2>/dev/null || true
git pull

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm use 22

echo "==> Applying Directus schema..."
cd "$REPO_DIR/directus"
npm install --silent
SNAPSHOT=$(ls snapshots | sort | tail -1)
node_modules/.bin/directus schema apply "./snapshots/$SNAPSHOT" --yes
pm2 restart dm-cupboards-directus

echo "==> Building Next.js app..."
cd "$REPO_DIR/app"
npm install --silent
npm run build
pm2 restart dm-cupboards-app

pm2 save

echo ""
echo "==> Deploy complete."
pm2 status
