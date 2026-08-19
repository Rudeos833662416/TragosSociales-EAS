#!/usr/bin/env bash
set -euo pipefail

# Builds a minimal, self-contained EAS upload context without node_modules.
# Usage: bash scripts/create-eas-build-copy.sh [source-dir] [target-dir]
SOURCE_DIR="${1:-/root/TragosSociales}"
TARGET_DIR="${2:-/root/TragosSociales-EAS}"

if [[ ! -f "$SOURCE_DIR/package.json" || ! -d "$SOURCE_DIR/android" ]]; then
  echo "El origen debe contener package.json y android/: $SOURCE_DIR" >&2
  exit 1
fi

rm -rf "$TARGET_DIR"
mkdir -p "$TARGET_DIR"

tar -C "$SOURCE_DIR" \
  --exclude='./node_modules' \
  --exclude='./.expo' \
  --exclude='./.git' \
  --exclude='./updates' \
  --exclude='./apks' \
  --exclude='./android/.gradle' \
  --exclude='./android/build' \
  --exclude='./android/app/build' \
  --exclude='*.apk' \
  --exclude='*.aab' \
  --exclude='*.zip' \
  -cf - . | tar -C "$TARGET_DIR" -xf -

# EAS only needs a static app config locally. Native Android is already
# committed and contains the exact socialsip://auth/callback intent filter.
mv "$TARGET_DIR/app.config.js" "$TARGET_DIR/app.config.js.disabled"
cat > "$TARGET_DIR/app.json" <<'EOF'
{
  "expo": {
    "name": "Tragos Sociales",
    "slug": "socialsip",
    "owner": "jesus31973479",
    "version": "1.0.0",
    "scheme": "socialsip",
    "android": {
      "package": "com.app.socialsip",
      "scheme": "socialsip",
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [{ "scheme": "socialsip", "host": "auth", "pathPrefix": "/callback" }],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    "extra": {
      "appSubtitle": "time to drink",
      "eas": { "projectId": "f4eb060a-a0e9-4124-9b02-2087982bdd05" },
      "supabaseUrl": "https://cymhbwgxmezrwofkbdqz.supabase.co",
      "supabaseAnonKey": "sb_publishable_V-Tjv6qV2JaEdXyumlGZ8w_HbdPp7iD"
    }
  }
}
EOF

git -C "$TARGET_DIR" init -q
git -C "$TARGET_DIR" config user.name "Tragos Sociales Build"
git -C "$TARGET_DIR" config user.email "build@tragossociales.local"
git -C "$TARGET_DIR" add -A
git -C "$TARGET_DIR" commit -qm "Contexto EAS auditado"

echo "Contexto EAS listo: $TARGET_DIR"
du -sh "$TARGET_DIR"
git -C "$TARGET_DIR" rev-parse --show-toplevel
