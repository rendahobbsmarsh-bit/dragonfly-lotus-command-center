#!/usr/bin/env bash
set -euo pipefail

echo "🪷 DragonFly Updater"
echo "This updater foundation is installed."
echo "Future update packages can be installed with:"
echo
echo "  bash dragonfly-update.sh /path/to/DragonFly_Update.zip"
echo

if [ "${1:-}" = "" ]; then
  exit 0
fi

PACKAGE="$1"
[ -f "$PACKAGE" ] || { echo "❌ Update package not found: $PACKAGE"; exit 1; }

REPO="$(git rev-parse --show-toplevel 2>/dev/null || true)"
[ -n "$REPO" ] || { echo "❌ Run inside the DragonFly repository."; exit 1; }
cd "$REPO"

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "❌ Commit or discard tracked-file changes before updating."
  exit 1
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
unzip -q -o "$PACKAGE" -d "$TMP"

for f in index.html 404.html app.js cloud-sync.js styles.css service-worker.js manifest.webmanifest README.md; do
  [ -f "$TMP/$f" ] && cp -p "$TMP/$f" "$REPO/$f"
done

git add index.html 404.html app.js cloud-sync.js styles.css service-worker.js manifest.webmanifest README.md
if git diff --cached --quiet; then
  echo "ℹ️ No changed live files were found in that package."
  exit 0
fi

VERSION="$(grep -oE '>V[0-9]+(\.[0-9]+)?<' index.html | head -1 | tr -d '<>' || true)"
git commit -m "DragonFly Lotus ${VERSION:-update}"
git push

echo "✅ Update committed and pushed."
echo "➡️ Wait for GitHub Actions to turn green, then hard-refresh once."
