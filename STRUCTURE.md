# 폴더 구조

```
index.html            관람 앱 셸 (편집 코드 참조 없음)
css/                  관람 스타일 (tokens / app / fx)
js/
  app.js              관람 전용. 편집은 window.PS.edit 훅으로만 연결
  admin.js            관리자 로그인과 토큰(PS.admin). 로그인 후에만 편집기를 불러옴
dev/                  편집기 원본. 로컬(npm run dev)과 관리자 화면에서 사용
  edit.js             슬라이드 효과 편집기, 관리자 푸터, 파트 편집 창
  edit.css            편집 패널 스타일
  save-handler.mjs    로컬 /__save 핸들러. 검증 규칙의 기준 (Lambda도 동일하게 유지)
projects/<이름>/
  pages.json          페이지별 설정 원본 (제목, steps, qa, links 등)
  slides/             슬라이드 이미지 1.png, 2.png ...
  .gitignore          convert가 만듦. add.sh가 publish 시 slides/ 차단을 해제
scripts/
  add.sh              새 프로젝트 올리기: pull → convert → 공개 처리 → sync → ship
  title.sh            프로젝트 제목 변경
  ship.sh             커밋과 push (push 직전에 한 번 더 pull)
  convert.mjs         PDF → 슬라이드 이미지 + pages.json (로컬 전용)
  sync.mjs            projects/ → data/decks.js 생성
  build.mjs           dist/ 생성. dev/edit.* 를 dist/admin/ 으로 복사
  verify-dist.mjs     빌드 결과 검증 (CI)
assets/
  fonts/              Pretendard, Paperlogy
  slides/, video/     예전 단일 덱용 폴더
.github/workflows/
  ci.yml              CI
  deploy.yml          배포 (GitHub Actions)
vite.config.mjs       Vite 설정 (npm run dev / build)
README.md, README.ko.md
```

## 데이터 흐름

```
PDF ─convert→ projects/<이름>/{slides, pages.json} ─sync→ data/decks.js ─build→ dist/
```

## 참고

- `data/decks.js`는 sync가 만들며 git에 올리지 않습니다.
- 관리자 저장은 서버(Lambda `peekslide-admin-api`)가 main에 직접 커밋합니다. 로컬 작업 전에 `git pull --rebase origin main`을 하세요.
- Lambda 코드는 저장소에 없고 AWS 콘솔에서만 관리합니다. 수정 후 콘솔에서 직접 Deploy해야 하며 `deploy.yml`과는 별개입니다.
- `convert`를 단독으로 실행하면 프로젝트가 `publish:false`로 만들어져 사이트에 보이지 않습니다. 올릴 때는 `add.sh`를 쓰세요.