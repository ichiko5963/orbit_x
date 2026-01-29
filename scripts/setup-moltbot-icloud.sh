#!/usr/bin/env bash
set -euo pipefail

# iCloud Drive の実体パス（Finderの「iCloud Drive」と同じ場所）
ICLOUD="$HOME/Library/Mobile Documents/com~apple~CloudDocs"

# Moltbot 用のルートフォルダ名（必要なら変更OK）
ROOT_NAME="Moltbot"

# フォルダ作成先
ROOT="$ICLOUD/$ROOT_NAME"

# iCloud Drive が有効かチェック
if [[ ! -d "$ICLOUD" ]]; then
  echo "ERROR: iCloud Drive のフォルダが見つかりません: $ICLOUD"
  echo "対処: システム設定 → Apple ID → iCloud → iCloud Drive をONにしてから再実行してください。"
  exit 1
fi

# Moltbot 作業場を作成（再実行してもOK）
mkdir -p "$ROOT"/{inbox,outbox,deliverables,assets,logs}
mkdir -p "$ROOT"/memory/{daily,attachments,index}

# 長期メモリ（ルートに置く）
if [[ ! -f "$ROOT/MEMORY.md" ]]; then
  cat > "$ROOT/MEMORY.md" << 'EOF'
# Moltbot Long-term Memory

## User Preferences

## Important Decisions

## Key Contacts

## Ongoing Projects

EOF
fi

# 今日のデイリーログ（追記前提）
TODAY="$(date +%F)"
if [[ ! -f "$ROOT/memory/daily/$TODAY.md" ]]; then
  cat > "$ROOT/memory/daily/$TODAY.md" << EOF
# $TODAY

## Notes

EOF
fi

# README（運用ルールの最小セット）
if [[ ! -f "$ROOT/README.md" ]]; then
  cat > "$ROOT/README.md" << 'EOF'
# Moltbot Shared Workspace (iCloud)

- inbox/        : 人間 → Moltbot に渡すもの
- outbox/       : Moltbot → 人間 に返すもの
- deliverables/ : 最終成果物
- assets/       : 素材（画像・PDFなど）
- logs/         : 共有したいログのみ（大量ログは避ける）
- MEMORY.md     : 長期メモリ（重要事項の集約）
- memory/daily/ : 日次メモ（追記式）
EOF
fi

# 使いやすいようにホーム直下へシンボリックリンク（任意だが便利）
ln -sfn "$ROOT" "$HOME/$ROOT_NAME"

echo "DONE: Moltbot workspace created."
echo "Path: $ROOT"
echo "Shortcut: ~/$ROOT_NAME"
echo
echo "Next check:"
echo "  open \"$ROOT\""
echo "  ls -la \"$ROOT\""
