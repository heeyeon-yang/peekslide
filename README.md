# PeekSlide

Figma/PDF 슬라이드를 훑어보고(전체/파트별), 발표 모드에서 페이지 넘김 없이 애니메이션 효과를 줄 수 있는 정적 사이트. 여러 프로젝트(PDF)를 한 사이트에서 관리합니다.

## 명령
- `npm run convert -- <이름>` : `projects/<이름>/source.pdf`를 PNG로 변환하고 `pages.json`의 total을 갱신 (파트는 처음 한 번만 PDF 북마크로 생성)
- `npm run sync` : `projects/*/pages.json`을 합쳐 `data/decks.js` 생성
- `npm run dev` : 개발 서버 (편집 모드는 이 PC의 localhost에서만 열림)
- `npm run build` : 공개 프로젝트만 `dist/`로 복사

## 프로젝트 폴더
```
projects/<이름>/
  source.pdf        (git 제외)
  password.txt      (git 제외, 있으면 비밀번호 창)
  pages.json        기준 데이터
  slides/1.png ...  convert가 생성
  layers/*.png      애니메이션용 부품 이미지 (선택)
  video/*           영상 (선택)
```

## pages.json
- `title`, `desc`, `accent`("#ff3f8c" 형식, 비우면 기본 분홍), `publish`(false면 배포 제외)
- `parts`: `[{ id, title, desc, range: [시작, 끝] }]` (PDF 페이지 번호)
- `groups`: `[[4,5,6],[9,10]]` 연속 페이지를 한 슬라이드로 묶음. 스페이스를 누를 때마다 다음 페이지 그림으로 부드럽게 바뀌고, 목록에는 하나(마지막 상태)로 보입니다.
- `pages[번호]`: `title`, `qa`, `links`, `video`, `layers`, `steps`
  - 묶음 슬라이드의 `title`, `qa`, `links`는 첫 페이지 번호에 적고, `steps`와 `layers`는 해당 그림의 페이지 번호에 적습니다.

### steps (스페이스/→ 한 번에 한 단계)
```
"steps": [
  { "box": [[x, y, w, h]] },
  { "box": [[...], [...]], "dim": 0.7, "round": 20, "ring": true, "ringW": 3 },
  { "show": ["a", "b"] },
  { "hide": ["a"], "flow": [{ "points": [[x,y],[x,y],[x,y]], "r": 40, "dot": true }] }
]
```
- `box`: 그 영역만 밝게, 나머지는 어둡게. 단계가 바뀌면 영역이 부드럽게 이동합니다.
- `dim`(어둡기 0~0.95, 기본 0.62), `round`(모서리 둥글기, 기본 14), `ring`(테두리 표시), `ringW`(테두리 굵기, 기본 3)
- `show` / `hide`: `layers`의 id를 나타내거나 숨김.
- `flow`: 점들을 따라 선이 그려지고 점선이 흐릅니다. 색은 포인트 색(accent)을 따라갑니다.
  - `w` 굵기(기본 3), `dash` 점선 길이(0이면 실선, 기본 10), `gap` 간격(기본 8), `color`("#rrggbb", 없으면 포인트 색)
  - `r` 꺾이는 모서리의 둥글기(px, 0이면 각진 모서리). 선 자체는 직선입니다.
  - `line: false`면 선을 숨기고 점만 움직임
  - `dot: true`면 점이 경로를 따라 움직임. `dotR` 크기(기본 5), `dots` 개수, `dur` 한 바퀴 시간(초)
- 좌표는 1920x1080 기준이며 Figma 프레임 좌표와 같습니다.

### layers (Figma에서 내보낸 부품 이미지)
```
"layers": [
  { "id": "a", "src": "layers/a.png", "rect": [x, y, w, h], "anim": "up" }
]
```
- `anim`: `fade`(기본), `up`, `down`, `left`, `right`, `zoom`, `wipe`
- 투명 배경 PNG를 권장합니다.

## 편집 모드 (localhost 전용)
슬라이드에서 `E`로 엽니다. 오른쪽 패널의 버튼으로 조작합니다.
- 단계: 번호 버튼으로 이동, ＋ 새 단계, ◀ ▶ 순서 바꾸기, 복제, 삭제. 한 단계에 박스와 선을 여러 개 담을 수 있습니다.
- 박스: "박스 그리기"를 켜고 슬라이드를 드래그하면 발표 때처럼 그 부분이 밝아집니다. 모서리 둥글기만 조절합니다.
- 선: "선 그리기"로 점을 찍고 "선 완료". 굵기, 실선/점선, 꺾이는 모서리 둥글기, 색, 움직이는 점을 설정하고, 흰 점을 드래그해 휘게 만듭니다.
- 미리보기(스페이스), 되돌리기(Z), 저장(S). 저장하지 않고 닫으면 확인창이 나옵니다.
- "코드 보기"에서 저장될 `"steps"`를 확인하고 복사할 수 있습니다.
배포된 사이트에서는 열리지 않습니다.

## 키
←/→/Space 이동, P 발표 모드, Q Q&A, T 테마, Esc 종료
