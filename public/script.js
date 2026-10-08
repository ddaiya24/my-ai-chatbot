const messagesEl = document.getElementById("messages");
const form = document.getElementById("chat-form");
const input = document.getElementById("input");
const sendBtn = document.getElementById("send-btn");
const newChatBtn = document.getElementById("new-chat-btn");
const listEl = document.getElementById("conversation-list");
const emptyListEl = document.getElementById("empty-list");
const sidebar = document.getElementById("sidebar");
const backdrop = document.getElementById("sidebar-backdrop");

const STORAGE_KEY = "gomdori-conversations";
const CURRENT_KEY = "gomdori-current";
const GREETING = "안녕! 나는 곰도리야 🐻\n궁금한 거 있으면 뭐든지 물어봐 🍯";

// 대화 목록은 DB 대신 브라우저(localStorage)에 보관합니다.
// 각 대화: { id, title, messages: [{ role, content }], updatedAt }
let conversations = loadConversations();
let currentId = loadCurrentId();
let loading = false;

renderList();
renderMessages();

/* ---------- 저장/불러오기 ---------- */
function loadConversations() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function loadCurrentId() {
  try {
    const id = localStorage.getItem(CURRENT_KEY);
    return conversations.some((c) => c.id === id) ? id : null;
  } catch {
    return null;
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    if (currentId) localStorage.setItem(CURRENT_KEY, currentId);
    else localStorage.removeItem(CURRENT_KEY);
  } catch {
    // 저장 실패는 무시 (메모리상의 기록은 유지됨)
  }
}

function getCurrent() {
  return conversations.find((c) => c.id === currentId) || null;
}

/* ---------- 사이드바 목록 ---------- */
function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

function renderList() {
  listEl.innerHTML = "";
  const sorted = [...conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  emptyListEl.hidden = sorted.length > 0;

  sorted.forEach((conv) => {
    const li = document.createElement("li");
    li.className = "conversation-item" + (conv.id === currentId ? " active" : "");

    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.className = "conversation-open";
    openBtn.addEventListener("click", () => selectConversation(conv.id));

    const title = document.createElement("span");
    title.className = "conversation-title";
    title.textContent = conv.title;
    const date = document.createElement("span");
    date.className = "conversation-date";
    date.textContent = formatDate(conv.updatedAt);
    openBtn.append(title, date);

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "conversation-delete";
    delBtn.setAttribute("aria-label", "대화 삭제");
    delBtn.textContent = "🗑";
    delBtn.addEventListener("click", () => deleteConversation(conv.id));

    li.append(openBtn, delBtn);
    listEl.appendChild(li);
  });
}

function selectConversation(id) {
  if (loading) return;
  currentId = id;
  save();
  renderList();
  renderMessages();
  closeSidebar();
}

function deleteConversation(id) {
  if (loading) return;
  const conv = conversations.find((c) => c.id === id);
  if (!conv || !confirm(`"${conv.title}" 대화를 삭제할까요?`)) return;
  conversations = conversations.filter((c) => c.id !== id);
  if (currentId === id) {
    currentId = null;
    renderMessages();
  }
  save();
  renderList();
}

function startNewChat() {
  if (loading) return;
  currentId = null; // 첫 메시지를 보낼 때 목록에 추가됨
  save();
  renderList();
  renderMessages();
  closeSidebar();
  input.focus();
}

/* ---------- 메시지 화면 ---------- */
function renderMessages() {
  messagesEl.innerHTML = "";
  addMessage("assistant", GREETING);
  const conv = getCurrent();
  if (conv) conv.messages.forEach((m) => addMessage(m.role, m.content));
}

function addMessage(role, text) {
  const wrap = document.createElement("div");
  wrap.className = `message ${role}`;
  if (role !== "user") wrap.appendChild(createAvatar());
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;
  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return wrap;
}

function createAvatar() {
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = "🐻";
  return avatar;
}

function showTyping() {
  const wrap = document.createElement("div");
  wrap.className = "message assistant typing";
  wrap.appendChild(createAvatar());
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML = '<span class="dot">🐾</span><span class="dot">🐾</span><span class="dot">🐾</span>';
  wrap.appendChild(bubble);
  messagesEl.appendChild(wrap);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return wrap;
}

function setLoading(value) {
  loading = value;
  sendBtn.disabled = value;
  input.disabled = value;
  document.body.classList.toggle("is-loading", value);
}

/* ---------- 전송 ---------- */
async function sendMessage(text) {
  let conv = getCurrent();
  if (!conv) {
    conv = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      title: text.length > 24 ? text.slice(0, 24) + "…" : text,
      messages: [],
      updatedAt: Date.now(),
    };
    conversations.push(conv);
    currentId = conv.id;
  }

  conv.messages.push({ role: "user", content: text });
  conv.updatedAt = Date.now();
  save();
  renderList();
  addMessage("user", text);
  setLoading(true);
  const typing = showTyping();

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conv.messages }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 404) {
      throw new Error("API 서버를 찾을 수 없어요. `npm start`로 서버를 실행한 뒤 http://localhost:8080 으로 접속해 주세요.");
    }
    if (!res.ok) throw new Error(data.error || `요청 실패 (${res.status})`);

    conv.messages.push({ role: "assistant", content: data.reply });
    conv.updatedAt = Date.now();
    save();
    typing.remove();
    addMessage("assistant", data.reply);
  } catch (err) {
    typing.remove();
    // 실패한 사용자 메시지는 기록에서 제거해 다음 요청에 영향을 주지 않도록 함
    conv.messages.pop();
    if (conv.messages.length === 0) {
      conversations = conversations.filter((c) => c.id !== conv.id);
      currentId = null;
    }
    save();
    addMessage("error", `앗, 곰도리가 잠깐 졸았나 봐요 😢\n${err.message}`);
  } finally {
    setLoading(false);
    renderList();
    input.focus();
  }
}

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text || loading) return;
  input.value = "";
  autoResize();
  sendMessage(text);
});

// Enter: 전송, Shift+Enter: 줄바꿈 (한글 조합 중에는 무시)
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    form.requestSubmit();
  }
});

function autoResize() {
  input.style.height = "auto";
  input.style.height = `${input.scrollHeight}px`;
}
input.addEventListener("input", autoResize);

/* ---------- 사이드바 열고 닫기 (모바일) ---------- */
function openSidebar() {
  sidebar.classList.add("open");
  backdrop.classList.add("show");
}

function closeSidebar() {
  sidebar.classList.remove("open");
  backdrop.classList.remove("show");
}

newChatBtn.addEventListener("click", startNewChat);
document.getElementById("open-sidebar-btn").addEventListener("click", openSidebar);
document.getElementById("close-sidebar-btn").addEventListener("click", closeSidebar);
backdrop.addEventListener("click", closeSidebar);
