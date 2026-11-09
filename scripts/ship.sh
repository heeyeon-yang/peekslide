#!/usr/bin/env bash
set -euo pipefail

MSG="${1:-}"
[ -n "$MSG" ] || { echo "사용법: bash scripts/ship.sh \"커밋 메시지\""; exit 1; }

branch=$(git rev-parse --abbrev-ref HEAD)
[ "$branch" = "main" ] || { echo "main이 아닙니다 (현재: $branch)"; exit 1; }

git pull --rebase --autostash origin main
npm run build
node scripts/verify-dist.mjs

git add -A
if git diff --cached --quiet; then
  echo "커밋할 변경이 없습니다."
  exit 0
fi

echo "---- 커밋될 파일 ----"
git status --short
read -r -p "push 할까요? (y/N) " ok
[[ "$ok" =~ ^[yY]$ ]] || { echo "중단 (git add 는 된 상태, 취소: git reset)"; exit 1; }

git commit -m "$MSG"
git push origin main
echo "push 완료 → https://github.com/heeyeon-yang/peekslide/actions"
