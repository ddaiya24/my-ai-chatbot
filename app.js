require("dotenv").config();
const path = require("path");
const express = require("express");
const OpenAI = require("openai");

const MODEL = "gpt-4o-mini";
const MAX_HISTORY = 20; // 최근 메시지 몇 개까지 모델에 보낼지
const MAX_CONTENT_LENGTH = 4000; // 메시지 하나당 최대 글자 수
const SYSTEM_PROMPT = `너는 '곰도리'라는 이름의 귀여운 곰돌이야. 사용자의 오랜 단짝 친구처럼 대화해.

[말투 규칙 - 반드시 지켜]
- 처음부터 끝까지 항상 반말만 써. 존댓말(~요, ~습니다, ~세요)은 절대 쓰지 마.
- 사용자가 존댓말을 쓰거나 대화가 길어져도, 설명이나 정보 전달을 할 때도 반말을 유지해.
- 친구한테 말하듯 다정하고 귀엽게 말해. 예: "그거 완전 좋은 생각이다!", "음~ 내가 알려줄게!", "걱정 마, 같이 해 보자 🐾"
- "~했어?", "~하자!", "~거든!", "~지롱" 같은 친근한 어미를 자연스럽게 섞어.
- 🐻🍯🐾💛 같은 이모지는 한 답변에 한두 개 정도만 자연스럽게 넣어.

[성격]
- 꿀을 좋아하고, 따뜻하고, 사용자를 진심으로 응원해 주는 친구야.
- 사용자가 힘들어 보이면 먼저 공감하고 위로해 줘.

[답변 내용]
- 말투는 귀엽게 해도 내용은 정확하고 실제로 도움이 되게 해.
- 쓸데없이 길게 늘어놓지 말고, 필요한 만큼만 쉽게 설명해.
- 모르는 건 아는 척하지 말고 솔직하게 "그건 나도 잘 모르겠어 🐻"라고 말해.
- 사용자가 한국어가 아닌 언어로 말하면 그 언어로, 그 언어의 친근한 친구 말투로 답해.`;

const PUBLIC_DIR = path.join(__dirname, "public");

const app = express();
app.use(express.json({ limit: "1mb" }));
// 로컬에서 정적 파일 제공 (Vercel에서는 public/ 폴더를 CDN이 대신 제공)
app.use(express.static(PUBLIC_DIR));

let client;
function getClient() {
  if (!client) client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

// 클라이언트가 보낸 대화 기록을 검증하고 정리
function sanitizeMessages(messages) {
  if (!Array.isArray(messages)) return null;
  const cleaned = messages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim() !== ""
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT_LENGTH) }))
    .slice(-MAX_HISTORY);
  if (cleaned.length === 0 || cleaned[cleaned.length - 1].role !== "user") return null;
  return cleaned;
}

app.post("/api/chat", async (req, res) => {
  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({ error: "서버에 OPENAI_API_KEY가 설정되지 않았습니다." });
  }

  const messages = sanitizeMessages(req.body?.messages);
  if (!messages) {
    return res.status(400).json({ error: "올바른 메시지 형식이 아닙니다." });
  }

  try {
    const completion = await getClient().chat.completions.create({
      model: MODEL,
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      temperature: 0.7,
    });
    const reply = completion.choices[0]?.message?.content ?? "";
    res.json({ reply });
  } catch (err) {
    console.error("OpenAI API error:", err);
    const status = err.status && err.status < 600 ? err.status : 500;
    res.status(status).json({ error: "AI 응답을 가져오는 중 오류가 발생했습니다." });
  }
});

// 첫 화면: Vercel에서 "/" 요청이 Express로 들어와도 index.html을 보여 줌
app.get("/", (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

// Vercel은 app.js를 Express 앱 진입점으로 사용합니다.
module.exports = app;
