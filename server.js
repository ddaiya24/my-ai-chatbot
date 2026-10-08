// 로컬 개발용 서버 (Vercel에서는 app.js를 직접 사용)
const app = require("./app");

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
