# THE DETAIL — Vendor Magic Search

가구 거래처 AI 검색 도구. 이미지 또는 텍스트로 검색하면 OpenAI GPT-4o가 등록된 거래처에서 제품을 찾아줍니다.

## 주요 기능

- **이미지 검색** — 드래그앤드롭, 파일 선택, Ctrl+V 붙여넣기
- **텍스트 검색** — 검색어 + 카테고리 필터 (의자, 테이블, 소파 등)
- **거래처 선택** — 31개 거래처 중 원하는 곳만 골라서 검색
- **갤러리/리스트** — 검색 결과 뷰 전환
- **거래처 관리** — UI에서 거래처 추가/삭제

## 시작하기

```bash
npm install
# .env 파일에 OPENAI_API_KEY 입력
npm run dev
```

`http://localhost:5173` 접속

## 기술 스택

- React 18 + TypeScript + Vite
- OpenAI GPT-4o
- Vercel 서버리스 함수 (API 프록시)

## 배포

Vercel에 GitHub 레포 연결 후 `OPENAI_API_KEY` 환경변수 설정.
