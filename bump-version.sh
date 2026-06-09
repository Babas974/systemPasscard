#!/bin/bash
# bump-version.sh
# Incremente la version des deux apps d'un coup.
# Usage: ./bump-version.sh 0.2.0 0.0.2 2
#        $1 = version desktop (ex: 0.2.0)
#        $2 = version Android (ex: 0.0.2)
#        $3 = versionCode Android (entier, ex: 2)

set -e

if [ "$#" -ne 3 ]; then
  echo "Usage: $0 <version_desktop> <version_android> <versionCode_android>"
  echo "Exemple: $0 0.2.0 0.0.2 2"
  exit 1
fi

DESKTOP_VERSION="$1"
ANDROID_VERSION="$2"
ANDROID_CODE="$3"

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== Mise a jour des versions ==="
echo "Desktop Tauri : $DESKTOP_VERSION"
echo "Android       : $ANDROID_VERSION (code $ANDROID_CODE)"
echo ""

# 1. Cargo.toml
sed -i "s/^version = \".*\"/version = \"$DESKTOP_VERSION\"/" \
  "$ROOT/dashboard-app/app/src-tauri/Cargo.toml"
echo "[OK] dashboard-app/app/src-tauri/Cargo.toml"

# 2. tauri.conf.json
sed -i "s/\"version\": \".*\"/\"version\": \"$DESKTOP_VERSION\"/" \
  "$ROOT/dashboard-app/app/src-tauri/tauri.conf.json"
echo "[OK] dashboard-app/app/src-tauri/tauri.conf.json"

# 3. package.json Android
sed -i "s/\"version\": \".*\"/\"version\": \"$ANDROID_VERSION\"/" \
  "$ROOT/appCollege/package.json"
echo "[OK] appCollege/package.json"

# 4. build.gradle Android
GRADLE="$ROOT/appCollege/android/app/build.gradle"
if [ -f "$GRADLE" ]; then
  sed -i "s/versionCode [0-9]\+/versionCode $ANDROID_CODE/" "$GRADLE"
  sed -i "s/versionName \".*\"/versionName \"$ANDROID_VERSION\"/" "$GRADLE"
  echo "[OK] appCollege/android/app/build.gradle"
else
  echo "[WARN] build.gradle non trouve, modifie-le manuellement"
fi

echo ""
echo "=== Versions mises a jour ==="
grep -E '"version"|version =' \
  "$ROOT/dashboard-app/app/src-tauri/Cargo.toml" \
  "$ROOT/dashboard-app/app/src-tauri/tauri.conf.json" \
  "$ROOT/appCollege/package.json" | head -3
