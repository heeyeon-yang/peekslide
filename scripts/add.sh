#!/usr/bin/env bash
set -euo pipefail
NAME="${1:-}"; PDF="${2:-}"
[ -n "$NAME" ] && [ -n "$PDF" ] || { echo '사용법: bash scripts/add.sh 이름 "PDF경로"'; exit 1; }
[ -f "$PDF" ] || { echo "PDF를 찾을 수 없어요: $PDF"; exit 1; }
P="projects/$NAME"
[ ! -e "$P/pages.json" ] || { echo "이미 있는 프로젝트예요: $NAME (다른 이름을 쓰세요)"; exit 1; }

git pull --rebase --autostash origin main
npm run convert -- "$NAME" "$PDF"

# 공개로 전환: publish=true, 슬라이드가 Git에 올라가도록 .gitignore에서 slides/ 줄 제거
node -e 'const fs=require("fs"),f=process.argv[1],d=JSON.parse(fs.readFileSync(f,"utf8"));d.publish=true;fs.writeFileSync(f,JSON.stringify(d,null,2)+"\n")' "$P/pages.json"
[ ! -f "$P/.gitignore" ] || sed -i '/^slides\/\?\r\?$/d' "$P/.gitignore"

npm run sync
bash scripts/ship.sh "add project $NAME"
