#!/usr/bin/env bash
set -euo pipefail
NAME="${1:-}"; TITLE="${2:-}"
[ -f "projects/$NAME/pages.json" ] && [ -n "$TITLE" ] || { echo '사용법: bash scripts/title.sh 프로젝트이름 "새 제목"'; exit 1; }
case "$TITLE" in *'<'*|*'>'*) echo "제목에 < > 는 쓸 수 없어요"; exit 1;; esac

git pull --rebase --autostash origin main
node -e 'const fs=require("fs"),f=process.argv[1],d=JSON.parse(fs.readFileSync(f,"utf8"));d.title=process.argv[2];fs.writeFileSync(f,JSON.stringify(d,null,2)+"\n")' "projects/$NAME/pages.json" "$TITLE"
npm run sync
bash scripts/ship.sh "title: $NAME"
