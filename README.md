# AI 챗봇 (Express + OpenAI gpt-4o-mini)

이전 대화 내용을 기억하는 간단한 AI 챗봇입니다. 데이터베이스 없이 대화 기록을 브라우저(sessionStorage)에 보관하고, 메시지를 보낼 때마다 기록 전체를 서버로 함께 보내 문맥을 유지합니다.

## 폴더 구조

```
chatbot/
├── api/index.js      # Vercel 서버리스 함수 진입점
├── app.js            # Express 앱 (/api/chat 라우트)
├── server.js         # 로컬 개발 서버 (정적 파일 + API)
├── public/           # 프론트엔드 (HTML/CSS/JS)
├── vercel.json       # /api/* → api/index.js 라우팅
└── .env.example
```

## 로컬 실행

```bash
npm install
cp .env.example .env    # .env 파일에 OPENAI_API_KEY 입력
npm start               # http://localhost:8080
```

## Vercel 배포

1. GitHub에 push한 뒤 Vercel에서 프로젝트를 Import 하거나, `npx vercel` 실행
2. Vercel 프로젝트 Settings → Environment Variables에 `OPENAI_API_KEY` 추가
3. 배포 (`npx vercel --prod`)

`public/` 폴더는 정적 파일로, `api/index.js`는 서버리스 함수로 자동 배포됩니다.

## 설정

`app.js` 상단에서 변경할 수 있습니다.

- `MAX_HISTORY`: 모델에 보낼 최근 메시지 수 (기본 20)
- `SYSTEM_PROMPT`: 챗봇의 성격/역할
