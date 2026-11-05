# PeekSlide

Figma/PDF 슬라이드를 훑어보고(전체/파트별), 발표 모드로 넘기며 클릭 하이라이트를 줄 수 있는 정적 사이트.

## 실행
폴더에서 `py -m http.server` 후 localhost:8000. index.html을 바로 열어도 동작합니다.

## 폰트
`assets/fonts/`에 아래 4개 파일을 넣습니다.
- PretendardVariable.woff2 (Pretendard-1.3.9/web/variable/woff2/)
- Paperlogy-4Regular.ttf, Paperlogy-5Medium.ttf, Paperlogy-7Bold.ttf

## 슬라이드
- 이미지: `assets/slides/1.png, 2.png ...` (경로 패턴은 `img`에서 변경)
- 파트와 PDF 범위: `data/slides.js`의 `parts[].range: [시작, 끝]`
- 페이지별 설정은 `pages[번호]`에 추가
  - `title`: 목록에 표시할 제목
  - `steps`: 클릭마다 하이라이트할 영역. `{ box: [[x, y, 너비, 높이], ...] }` (1920x1080 기준)
  - `qa`: `[{ q, a }]`
  - `links`: `[{ label, url }]`
  - `video`: `{ kind: "youtube", id }` 또는 `{ kind: "file", src, rect: [x, y, w, h] }`

## 색
`css/tokens.css`

## 키
←/→/Space 이동, P 발표 모드, Q Q&A, T 테마, Esc 종료
