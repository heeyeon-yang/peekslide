# 폴더 구조

```
index.html          관람 앱 셸 (편집 참조 없음)
css/                관람 스타일 (편집 스타일은 dev/edit.css 로 이동)
js/app.js           관람 전용. 편집은 window.PS.edit 훅으로만 연결
data/decks.js       sync가 생성 (git 제외 권장)
projects/<이름>/    pages.json(원본), slides/ video/ layers/ source.pdf
dev/                로컬 전용, dist에 복사 안 됨
  edit.js           편집기 (Vite serve가 주입)
  edit.css          편집 패널 스타일 (#ep, body.edit 등을 여기로)
  save-handler.mjs  /__save 핸들러 (scripts/ 에서 이동)
scripts/            sync / build / convert(로컬) / verify-dist(CI)
infra/              Terraform (다음 단계)
.github/workflows/  ci.yml (지금), deploy.yml (다음 단계)
```
