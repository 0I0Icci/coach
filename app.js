const API_BASE_URL = (window.ECHOMIND_API_BASE_URL || "https://echomind-bvix.onrender.com").replace(/\/$/, "");
const TEST_URL = "https://totypes.com";
const STORAGE_KEY = "echomind:user-state:v2";
const MAX_STORED_MESSAGES = 80;
const MAX_GROWTH_RECORDS = 30;

const communicationQuestions = [
  { id: 1, title: "你被领导批评后，心情很差，你更可能：", options: [
    { key: "A", text: "找人聊一聊，吐槽一下", style: "Emotion-first" },
    { key: "B", text: "自己消化，不太想说", style: "Logic-first" },
    { key: "C", text: "一边想一边反复琢磨", style: "Action-first" },
    { key: "D", text: "尽量不去想，转移注意力", style: "Companion" },
  ]},
  { id: 2, title: "当你情绪低落时，你更希望别人：", options: [
    { key: "A", text: "安慰你、理解你", style: "Emotion-first" },
    { key: "B", text: "帮你分析问题", style: "Logic-first" },
    { key: "C", text: "给你具体建议", style: "Action-first" },
    { key: "D", text: "陪你聊点别的", style: "Companion" },
  ]},
  { id: 3, title: "当别人误解你时，你通常会：", options: [
    { key: "A", text: "立刻解释清楚", style: "Emotion-first" },
    { key: "B", text: "有点难受但不太说", style: "Logic-first" },
    { key: "C", text: "反复想这件事", style: "Action-first" },
    { key: "D", text: "觉得算了", style: "Companion" },
  ]},
  { id: 4, title: "如果你和AI聊天，你更希望它：", options: [
    { key: "A", text: "很理解你、会共情", style: "Emotion-first" },
    { key: "B", text: "帮你分析问题", style: "Logic-first" },
    { key: "C", text: "给你行动建议", style: "Action-first" },
    { key: "D", text: "轻松聊天就好", style: "Companion" },
  ]},
  { id: 5, title: "当你倾诉问题时，你更反感：", options: [
    { key: "A", text: "被忽视情绪", style: "Emotion-first" },
    { key: "B", text: "被讲大道理", style: "Logic-first" },
    { key: "C", text: "没有实际建议", style: "Action-first" },
    { key: "D", text: "对话太沉重", style: "Companion" },
  ]},
  { id: 6, title: "你更喜欢别人：", options: [
    { key: "A", text: "慢慢听你说", style: "Emotion-first" },
    { key: "B", text: "快速抓重点", style: "Logic-first" },
    { key: "C", text: "帮你理清逻辑", style: "Action-first" },
    { key: "D", text: "让你轻松一点", style: "Companion" },
  ]},
  { id: 7, title: "面对一件困难的任务，你更可能：", options: [
    { key: "A", text: "想很多才开始", style: "Emotion-first" },
    { key: "B", text: "先做再说", style: "Logic-first" },
    { key: "C", text: "一直拖着", style: "Action-first" },
    { key: "D", text: "看心情", style: "Companion" },
  ]},
  { id: 8, title: "当你犹豫一个选择时，你更希望：", options: [
    { key: "A", text: "被理解你的纠结", style: "Emotion-first" },
    { key: "B", text: "帮你分析利弊", style: "Logic-first" },
    { key: "C", text: "给你一个建议", style: "Action-first" },
    { key: "D", text: "让你自己慢慢想", style: "Companion" },
  ]},
  { id: 9, title: "当你状态不好时，你更希望AI：", options: [
    { key: "A", text: "陪你慢慢聊", style: "Emotion-first" },
    { key: "B", text: "帮你理清问题", style: "Logic-first" },
    { key: "C", text: "推你行动", style: "Action-first" },
    { key: "D", text: "不打扰你", style: "Companion" },
  ]},
  { id: 10, title: "在人际关系中，你更容易：", options: [
    { key: "A", text: "过度在意别人感受", style: "Emotion-first" },
    { key: "B", text: "讲道理", style: "Logic-first" },
    { key: "C", text: "回避冲突", style: "Action-first" },
    { key: "D", text: "看情况", style: "Companion" },
  ]},
  { id: 11, title: "当你和别人发生冲突，你更倾向：", options: [
    { key: "A", text: "修复关系", style: "Emotion-first" },
    { key: "B", text: "讲清对错", style: "Logic-first" },
    { key: "C", text: "避免冲突", style: "Action-first" },
    { key: "D", text: "顺其自然", style: "Companion" },
  ]},
  { id: 12, title: "如果你现在很难受，你更希望AI第一句话是：", options: [
    { key: "A", text: "“听起来你真的很难受”", style: "Emotion-first" },
    { key: "B", text: "“我们一起看看发生了什么”", style: "Logic-first" },
    { key: "C", text: "“你可以试试这样做”", style: "Action-first" },
    { key: "D", text: "“想聊点别的吗？”", style: "Companion" },
  ]},
];

const resultDescriptions = {
  "Emotion-first": { label: "共情型", text: "你更需要被理解和情绪支持。我们会用更温和、倾听式的方式和你交流。" },
  "Logic-first": { label: "分析型", text: "你更在意事情被看清和梳理。我们会用更清晰、结构化的方式和你交流。" },
  "Action-first": { label: "行动型", text: "你更希望对话能推动改变。我们会更直接地给出步骤感和行动建议。" },
  Companion: { label: "陪伴型", text: "你更偏好低压力、陪伴感强的交流。我们会用更轻柔、不逼迫的方式和你交流。" },
};

const cognitiveFunctionDescriptions = {
  Ne: { name: "外倾直觉 Ne", theme: "可能性与联想", text: "关注变化、联想、灵感和新的可能路径。状态好时带来创造力，压力下容易发散过度。" },
  Ni: { name: "内倾直觉 Ni", theme: "洞察与方向", text: "关注底层趋势、意义和长期方向。状态好时能看见核心，压力下可能过度预判。" },
  Se: { name: "外倾感觉 Se", theme: "当下与行动", text: "关注现实刺激、身体感受和即时行动。状态好时让人落地，压力下可能冲动或逃避感受。" },
  Si: { name: "内倾感觉 Si", theme: "经验与稳定", text: "关注熟悉经验、身体记忆和秩序。状态好时提供安全感，压力下可能困在旧模式。" },
  Te: { name: "外倾思维 Te", theme: "效率与结构", text: "关注目标、资源、结果和执行路径。状态好时推动进展，压力下可能过度控制。" },
  Ti: { name: "内倾思维 Ti", theme: "逻辑与拆解", text: "关注概念准确性、内部逻辑和问题拆解。状态好时清晰，压力下可能陷入反复分析。" },
  Fe: { name: "外倾情感 Fe", theme: "关系与回应", text: "关注氛围、他人感受和关系协调。状态好时善于连接，压力下容易过度迎合。" },
  Fi: { name: "内倾情感 Fi", theme: "价值与真实", text: "关注内在感受、个人价值和真实边界。状态好时很有自我感，压力下容易独自承受。" },
};

const cognitiveStacks = {
  ENFP: ["Ne", "Fi", "Te", "Si", "Ni", "Fe", "Ti", "Se"], INFP: ["Fi", "Ne", "Si", "Te", "Fe", "Ni", "Se", "Ti"],
  ENFJ: ["Fe", "Ni", "Se", "Ti", "Fi", "Ne", "Si", "Te"], INFJ: ["Ni", "Fe", "Ti", "Se", "Ne", "Fi", "Te", "Si"],
  ENTP: ["Ne", "Ti", "Fe", "Si", "Ni", "Te", "Fi", "Se"], INTP: ["Ti", "Ne", "Si", "Fe", "Te", "Ni", "Se", "Fi"],
  ENTJ: ["Te", "Ni", "Se", "Fi", "Ti", "Ne", "Si", "Fe"], INTJ: ["Ni", "Te", "Fi", "Se", "Ne", "Ti", "Fe", "Si"],
  ESFP: ["Se", "Fi", "Te", "Ni", "Si", "Fe", "Ti", "Ne"], ISFP: ["Fi", "Se", "Ni", "Te", "Fe", "Si", "Ne", "Ti"],
  ESTP: ["Se", "Ti", "Fe", "Ni", "Si", "Te", "Fi", "Ne"], ISTP: ["Ti", "Se", "Ni", "Fe", "Te", "Si", "Ne", "Fi"],
  ESTJ: ["Te", "Si", "Ne", "Fi", "Ti", "Se", "Ni", "Fe"], ISTJ: ["Si", "Te", "Fi", "Ne", "Se", "Ti", "Fe", "Ni"],
  ESFJ: ["Fe", "Si", "Ne", "Ti", "Fi", "Se", "Ni", "Te"], ISFJ: ["Si", "Fe", "Ti", "Ne", "Se", "Fi", "Te", "Ni"],
};

const stackPositionLabels = ["主导功能", "辅助功能", "第三功能", "劣势功能", "对立功能", "批判功能", "盲点功能", "魔鬼功能"];

const views = {
  login: document.getElementById("login-view"), home: document.getElementById("home-view"), choice: document.getElementById("choice-view"),
  mbti: document.getElementById("mbti-view"), test: document.getElementById("style-test-view"), result: document.getElementById("style-result-view"),
  chat: document.getElementById("chat-view"), profile: document.getElementById("profile-view"),
};

const appNav = document.getElementById("app-nav");
const startButton = document.getElementById("start-button");
const knownTypeButton = document.getElementById("known-type-button");
const unknownTypeButton = document.getElementById("unknown-type-button");
const unknownTypeLink = document.getElementById("unknown-type-link");
const mbtiButtons = [...document.querySelectorAll(".mbti-card")];
const selectionFeedback = document.getElementById("selection-feedback");
const questionCard = document.getElementById("question-card");
const questionProgress = document.getElementById("question-progress");
const selectedMbti = document.getElementById("selected-mbti");
const questionTitle = document.getElementById("question-title");
const questionOptions = document.getElementById("question-options");
const nextQuestionButton = document.getElementById("next-question-button");
const resultTitle = document.getElementById("result-title");
const resultDescription = document.getElementById("result-description");
const startChatButton = document.getElementById("start-chat-button");
const chatMbtiBadge = document.getElementById("chat-mbti-badge");
const chatStateBadge = document.getElementById("chat-state-badge");
const chatStyleBadge = document.getElementById("chat-style-badge");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatSendButton = document.getElementById("chat-send-button");
const authForm = document.getElementById("auth-form");
const authEmail = document.getElementById("auth-email");
const authSubmit = document.getElementById("auth-submit");
const authStatus = document.getElementById("auth-status");
const cloudStatus = document.getElementById("cloud-status");
const logoutButton = document.getElementById("logout-button");
const navChatButton = document.getElementById("nav-chat");
const navProfileButton = document.getElementById("nav-profile");
const profileChatButton = document.getElementById("profile-chat-button");
const profileMbti = document.getElementById("profile-mbti");
const profileStyle = document.getElementById("profile-style");
const functionStackSummary = document.getElementById("function-stack-summary");
const functionStack = document.getElementById("function-stack");
const functionDetail = document.getElementById("function-detail");
const growthList = document.getElementById("growth-list");

const appState = {
  mbtiType: "", currentQuestionIndex: 0, answers: new Array(communicationQuestions.length).fill(null), resultKey: "",
  previousResponseId: "", isWaitingForReply: false, conversationHistory: [], growthRecords: [],
  sessionState: null,
};

const cloudState = { client: null, user: null, enabled: false, ready: false };

function showView(viewName) {
  Object.entries(views).forEach(([name, element]) => {
    const isActive = name === viewName;
    element.classList.toggle("is-active", isActive);
    element.setAttribute("aria-hidden", String(!isActive));
  });
  appNav.classList.toggle("is-hidden", viewName === "login" || !cloudState.user);
}

function openTestSite() { window.open(TEST_URL, "_blank", "noopener,noreferrer"); }
function hasSavedProfile() { return Boolean(appState.mbtiType && appState.resultKey && resultDescriptions[appState.resultKey]); }
function getCognitiveStack(type = appState.mbtiType) { return cognitiveStacks[type] || []; }

function normalizeStoredHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.filter((message) => message && ["user", "assistant"].includes(message.role) && typeof message.content === "string")
    .map((message) => ({ role: message.role, content: message.content.trim() })).filter((message) => message.content).slice(-MAX_STORED_MESSAGES);
}

function serializeAnswers() { return appState.answers.map((answer) => answer ? { key: answer.key, style: answer.style } : null); }
function hydrateAnswers(storedAnswers = []) {
  appState.answers = communicationQuestions.map((question, index) => {
    const storedAnswer = storedAnswers?.[index];
    return question.options.find((option) => option.key === storedAnswer?.key) || null;
  });
}

function normalizeGrowthRecords(records) {
  if (!Array.isArray(records)) return [];
  return records.map((record) => ({
    id: record.id || crypto.randomUUID?.() || String(Date.now()), title: record.title || "一次新的梳理",
    summary: record.summary || "你完成了一次情绪和行动的整理。", focusFunction: record.focusFunction || "",
    createdAt: record.createdAt || record.created_at || new Date().toISOString(),
  })).slice(0, MAX_GROWTH_RECORDS);
}

function loadStoredState() {
  try {
    const storedState = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    appState.mbtiType = typeof storedState.mbtiType === "string" ? storedState.mbtiType : "";
    appState.resultKey = resultDescriptions[storedState.resultKey] ? storedState.resultKey : "";
    appState.conversationHistory = normalizeStoredHistory(storedState.conversationHistory);
    appState.growthRecords = normalizeGrowthRecords(storedState.growthRecords);
    appState.sessionState = storedState.sessionState || null;
    hydrateAnswers(storedState.answers);
  } catch (error) { console.warn("Unable to load saved EchoMind state.", error); }
}

function saveStoredState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      mbtiType: appState.mbtiType, resultKey: appState.resultKey, answers: serializeAnswers(),
      conversationHistory: appState.conversationHistory.slice(-MAX_STORED_MESSAGES),
      growthRecords: appState.growthRecords.slice(0, MAX_GROWTH_RECORDS),
      sessionState: appState.sessionState,
      updatedAt: new Date().toISOString(),
    }));
  } catch (error) { console.warn("Unable to save EchoMind state.", error); }
}

function updateAuthUi(message = "") {
  if (!cloudState.enabled) {
    authStatus.textContent = "云端登录未配置";
    cloudStatus.textContent = "请先完成 Supabase 配置";
    authSubmit.disabled = true;
    return;
  }
  if (cloudState.user) {
    authStatus.textContent = `已登录：${cloudState.user.email || "内测用户"}`;
    cloudStatus.textContent = message || "正在进入你的成长空间";
    return;
  }
  authStatus.textContent = "请先登录";
  cloudStatus.textContent = message || "登录后进入人格判断和成长记录空间";
  authSubmit.disabled = false;
}

async function initCloudMemory() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/config`);
    const config = await response.json();
    if (!config?.supabase?.enabled || !window.supabase) { updateAuthUi(); return; }
    cloudState.enabled = true;
    cloudState.client = window.supabase.createClient(config.supabase.url, config.supabase.anonKey);
    const { data } = await cloudState.client.auth.getSession();
    cloudState.user = data.session?.user || null;
    cloudState.ready = true;
    cloudState.client.auth.onAuthStateChange(async (_event, session) => {
      cloudState.user = session?.user || null;
      updateAuthUi();
      if (cloudState.user) { await loadCloudState(); enterApp(); } else { showView("login"); }
    });
    updateAuthUi();
    if (cloudState.user) { await loadCloudState(); enterApp(); } else { showView("login"); }
  } catch (error) {
    cloudState.enabled = false;
    updateAuthUi("云端同步暂时不可用");
    console.warn("Unable to initialize cloud memory.", error);
  }
}

async function loadCloudState() {
  if (!cloudState.client || !cloudState.user) return;
  const { data: profile } = await cloudState.client.from("user_profiles").select("mbti_type, communication_style, test_answers").eq("user_id", cloudState.user.id).maybeSingle();
  const { data: messages } = await cloudState.client.from("chat_messages").select("role, content").eq("user_id", cloudState.user.id).order("created_at", { ascending: false }).limit(MAX_STORED_MESSAGES);
  const { data: growth } = await cloudState.client.from("growth_records").select("id, title, summary, signals, created_at").eq("user_id", cloudState.user.id).order("created_at", { ascending: false }).limit(MAX_GROWTH_RECORDS);
  if (profile) {
    appState.mbtiType = profile.mbti_type || appState.mbtiType;
    appState.resultKey = resultDescriptions[profile.communication_style] ? profile.communication_style : appState.resultKey;
    hydrateAnswers(profile.test_answers || []);
  } else if (hasSavedProfile()) { await saveCloudProfile(); }
  if (Array.isArray(messages) && messages.length > 0) appState.conversationHistory = normalizeStoredHistory([...messages].reverse());
  if (Array.isArray(growth) && growth.length > 0) appState.growthRecords = normalizeGrowthRecords(growth.map((item) => ({
    id: item.id, title: item.title, summary: item.summary, focusFunction: item.signals?.focusFunction, created_at: item.created_at,
  })));
  saveStoredState();
}

async function saveCloudProfile() {
  if (!cloudState.client || !cloudState.user || !appState.mbtiType) return;
  const stack = getCognitiveStack();
  await cloudState.client.from("user_profiles").upsert({
    user_id: cloudState.user.id, mbti_type: appState.mbtiType, communication_style: appState.resultKey || null,
    test_answers: serializeAnswers(), cognitive_stack: stack, updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
}

async function saveCloudMessage(role, content) {
  if (!cloudState.client || !cloudState.user || !content) return;
  await cloudState.client.from("chat_messages").insert({ user_id: cloudState.user.id, role, content, mbti_type: appState.mbtiType || null, communication_style: appState.resultKey || null });
}

async function saveCloudGrowthRecord(record) {
  if (!cloudState.client || !cloudState.user) return;
  await cloudState.client.from("growth_records").insert({
    user_id: cloudState.user.id, title: record.title, summary: record.summary,
    signals: { focusFunction: record.focusFunction, mbtiType: appState.mbtiType, communicationStyle: appState.resultKey },
  });
}

function enterApp() {
  updateProfileView();
  if (hasSavedProfile()) { seedChat({ preserveHistory: true }); showView("chat"); } else { showView("home"); }
}

function appendMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderStoredMessages() { chatMessages.innerHTML = ""; appState.conversationHistory.forEach((message) => appendMessage(message.role, message.content)); }
function setChatPending(isPending, label = "发送") { appState.isWaitingForReply = isPending; chatSendButton.disabled = isPending; chatInput.disabled = isPending; chatSendButton.textContent = isPending ? "思考中..." : label; }

function createGrowthRecord(userText, assistantText) {
  const stack = getCognitiveStack();
  const focusFunction = stack[0] || "";
  const fn = cognitiveFunctionDescriptions[focusFunction];
  const session = appState.sessionState;
  const stateLabel = session?.state || "emotion_intake";
  const stateNames = { emotion_intake: "情绪接收", source_exploration: "来源探索", pattern_reflection: "模式觉察", action_integration: "行动整合" };
  const stateName = stateNames[stateLabel] || "自我理解";
  const topic = session?.topic ? `围绕“${session.topic}”` : "";
  const needInfo = session?.core_need ? `（核心需求：${session.core_need.slice(0, 30)}）` : "";
  const summary = topic
    ? `${topic}${needInfo}——当前处于${stateName}阶段，有了新的觉察。`
    : `你把“${userText.slice(0, 20)}${userText.length > 20 ? "..." : ""}”带进了对话，进入${stateName}阶段，获得了一次围绕${fn?.theme || "自我理解"}的整理。`;
  const turn = session?.total_turns || 0;
  const title = turn > 4 && session?.state === "action_integration" ? "完成一轮深度成长" : "一次新的梳理";
  return { id: crypto.randomUUID?.() || String(Date.now()), title, summary, focusFunction, createdAt: new Date().toISOString() };
}

async function requestAssistantReply({ message = "", opening = false }) {
  setChatPending(true);
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        opening,
        user_id: cloudState.user?.id || null,
        mbtiType: appState.mbtiType,
        communicationStyle: appState.resultKey,
        cognitiveStack: getCognitiveStack(),
        history: appState.conversationHistory,
        session_state: appState.sessionState,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "AI 服务暂时不可用。请稍后再试。");
    appState.previousResponseId = data.responseId || appState.previousResponseId;
    appState.sessionState = data.session_state || appState.sessionState;
    updateChatStateBadge();
    appendMessage("assistant", data.reply);
    appState.conversationHistory.push({ role: "assistant", content: data.reply });
    if (!opening && message) {
      const record = createGrowthRecord(message, data.reply);
      appState.growthRecords.unshift(record);
      appState.growthRecords = appState.growthRecords.slice(0, MAX_GROWTH_RECORDS);
      saveCloudGrowthRecord(record).catch((error) => console.warn("Unable to save growth record.", error));
      updateProfileView();
    }
    saveStoredState();
  } catch (error) { appendMessage("assistant", `当前无法连接 AI 服务：${error.message}`); }
  finally { setChatPending(false); }
}

function seedChat({ preserveHistory = false } = {}) {
  if (!preserveHistory) { chatMessages.innerHTML = ""; appState.conversationHistory = []; appState.sessionState = null; }
  const result = resultDescriptions[appState.resultKey];
  chatMbtiBadge.textContent = `MBTI：${appState.mbtiType}`;
  chatStateBadge.textContent = '状态：等待开始';
  chatStateBadge.className = 'chat-badge chat-badge-state';
  chatStyleBadge.textContent = `风格：${result?.label || "未识别"}`;
  if (preserveHistory) { renderStoredMessages(); updateChatStateBadge(); }
}

function updateChatStateBadge() {
  const session = appState.sessionState;
  if (!session || !session.state) {
    chatStateBadge.textContent = '状态：等待开始';
    chatStateBadge.className = 'chat-badge chat-badge-state';
    return;
  }
  const stateNames = {
    emotion_intake: '情绪接收',
    source_exploration: '来源探索',
    pattern_reflection: '模式觉察',
    action_integration: '行动整合',
  };
  const label = stateNames[session.state] || session.state;
  const slowSuffix = session.slow_mode ? ' · 慢' : '';
  chatStateBadge.textContent = `状态：${label}${slowSuffix}`;
  chatStateBadge.className = `chat-badge chat-badge-state ${session.state}${session.slow_mode ? ' slow-mode' : ''}`;
}

function updateProfileView() {
  profileMbti.textContent = `MBTI：${appState.mbtiType || "未选择"}`;
  profileStyle.textContent = `沟通偏好：${resultDescriptions[appState.resultKey]?.label || "未识别"}`;
  const stack = getCognitiveStack();
  functionStackSummary.textContent = stack.length ? `${appState.mbtiType} 的八维排序：${stack.join(" · ")}` : "选择 MBTI 后会显示你的功能排序。";
  functionStack.innerHTML = stack.map((fn, index) => `<button class="function-chip" type="button" data-function="${fn}" data-index="${index}"><strong>${fn}</strong><span>${stackPositionLabels[index]}</span></button>`).join("");
  [...functionStack.querySelectorAll(".function-chip")].forEach((button) => button.addEventListener("click", () => showFunctionDetail(button.dataset.function, Number(button.dataset.index))));
  if (stack[0]) showFunctionDetail(stack[0], 0);
  growthList.innerHTML = appState.growthRecords.length ? appState.growthRecords.map((record) => `<article class="growth-card"><span>${new Date(record.createdAt).toLocaleDateString("zh-CN")}</span><h4>${record.title}</h4><p>${record.summary}</p></article>`).join("") : `<p class="section-note">完成一次对话后，这里会记录你的成长变化。</p>`;
}

function showFunctionDetail(fn, index) {
  const detail = cognitiveFunctionDescriptions[fn];
  if (!detail) return;
  functionDetail.innerHTML = `<strong>${detail.name} · ${stackPositionLabels[index]}</strong><p>${detail.text}</p>`;
}

function handleMbtiSelection(type) {
  appState.mbtiType = type;
  mbtiButtons.forEach((button) => button.classList.toggle("is-selected", button.dataset.type === type));
  selectionFeedback.textContent = `已选择类型：${type}`;
  appState.currentQuestionIndex = 0;
  appState.answers = new Array(communicationQuestions.length).fill(null);
  appState.resultKey = ""; appState.conversationHistory = []; appState.growthRecords = [];
  saveStoredState(); saveCloudProfile(); renderQuestion(); showView("test");
}

function updateQuestionNav() { nextQuestionButton.disabled = appState.currentQuestionIndex === 0; nextQuestionButton.textContent = "回到上一题"; }
function goToNextQuestionOrResult() { if (appState.currentQuestionIndex === communicationQuestions.length - 1) { showResult(); return; } appState.currentQuestionIndex += 1; renderQuestion(); }

function renderQuestion() {
  const currentQuestion = communicationQuestions[appState.currentQuestionIndex];
  const currentAnswer = appState.answers[appState.currentQuestionIndex];
  questionCard.classList.remove("is-switching"); void questionCard.offsetWidth; questionCard.classList.add("is-switching");
  questionProgress.textContent = `第 ${appState.currentQuestionIndex + 1} 题 / 共 ${communicationQuestions.length} 题`;
  selectedMbti.textContent = `MBTI：${appState.mbtiType || "未选择"}`;
  questionTitle.textContent = currentQuestion.title;
  questionOptions.innerHTML = currentQuestion.options.map((option) => `<button class="question-option ${currentAnswer?.key === option.key ? "is-selected" : ""}" type="button" data-key="${option.key}"><strong>${option.key}</strong>${option.text}</button>`).join("");
  [...questionOptions.querySelectorAll(".question-option")].forEach((button) => button.addEventListener("click", () => { appState.answers[appState.currentQuestionIndex] = currentQuestion.options.find((option) => option.key === button.dataset.key); saveStoredState(); saveCloudProfile(); goToNextQuestionOrResult(); }));
  updateQuestionNav();
}

function calculateResult() {
  const counts = { "Emotion-first": 0, "Logic-first": 0, "Action-first": 0, Companion: 0 };
  appState.answers.forEach((answer) => { if (answer) counts[answer.style] += 1; });
  appState.resultKey = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  saveStoredState(); saveCloudProfile(); return resultDescriptions[appState.resultKey];
}

function showResult() { const result = calculateResult(); resultTitle.textContent = `你的沟通偏好：${result.label}`; resultDescription.textContent = result.text; showView("result"); }

startButton.addEventListener("click", () => { if (hasSavedProfile()) { seedChat({ preserveHistory: true }); showView("chat"); return; } showView("choice"); });
knownTypeButton.addEventListener("click", () => showView("mbti"));
unknownTypeButton.addEventListener("click", openTestSite);
unknownTypeLink.addEventListener("click", () => showView("choice"));
mbtiButtons.forEach((button) => button.addEventListener("click", () => handleMbtiSelection(button.dataset.type)));
nextQuestionButton.addEventListener("click", () => { if (appState.currentQuestionIndex === 0) return; appState.currentQuestionIndex -= 1; renderQuestion(); });
startChatButton.addEventListener("click", async () => { calculateResult(); appState.previousResponseId = ""; seedChat(); saveStoredState(); await saveCloudProfile(); showView("chat"); await requestAssistantReply({ opening: true }); });
chatForm.addEventListener("submit", async (event) => { event.preventDefault(); const text = chatInput.value.trim(); if (!text || appState.isWaitingForReply) return; appendMessage("user", text); appState.conversationHistory.push({ role: "user", content: text }); saveStoredState(); chatInput.value = ""; await requestAssistantReply({ message: text }); });

authForm.addEventListener("submit", async (event) => { event.preventDefault(); if (!cloudState.client) return; const email = authEmail.value.trim(); if (!email) return; authSubmit.disabled = true; cloudStatus.textContent = "正在发送登录链接..."; const { error } = await cloudState.client.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href.split("#")[0] } }); authSubmit.disabled = false; cloudStatus.textContent = error ? `发送失败：${error.message}` : "登录链接已发送，请打开邮箱完成登录"; });
logoutButton.addEventListener("click", async () => { if (!cloudState.client) return; await cloudState.client.auth.signOut(); cloudState.user = null; updateAuthUi("已退出登录"); showView("login"); });
navChatButton.addEventListener("click", () => { if (hasSavedProfile()) { seedChat({ preserveHistory: true }); showView("chat"); } else showView("home"); });
navProfileButton.addEventListener("click", () => { updateProfileView(); showView("profile"); });
profileChatButton.addEventListener("click", () => { seedChat({ preserveHistory: true }); showView("chat"); });

loadStoredState();
showView("login");
initCloudMemory();
