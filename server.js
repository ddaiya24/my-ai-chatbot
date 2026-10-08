// 로컬 개발용 서버: 정적 파일(public)과 API를 함께 제공합니다.
const path = require("path");
const express = require("express");
const app = require("./app");

app.use(express.static(path.join(__dirname, "public")));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
