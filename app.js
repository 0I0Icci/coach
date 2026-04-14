const API_BASE_URL = (window.ECHOMIND_API_BASE_URL || "https://echomind-bvix.onrender.com").replace(/\/$/, "");
const TEST_URL = "https://totypes.com";

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

const views = {
  home: document.getElementById("home-view"),
  choice: document.getElementById("choice-view"),
  mbti: document.getElementById("mbti-view"),
  test: document.getElementById("style-test-view"),
  result: document.getElementById("style-result-view"),
  chat: document.getElementById("chat-view"),
};

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
const chatStyleBadge = document.getElementById("chat-style-badge");
const chatMessages = document.getElementById("chat-messages");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatSendButton = document.getElementById("chat-send-button");

const appState = {
  mbtiType: "",
  currentQuestionIndex: 0,
  answers: new Array(communicationQuestions.length).fill(null),
  resultKey: "",
  previousResponseId: "",
  isWaitingForReply: false,
};

function showView(viewName) {
  Object.entries(views).forEach(([name, element]) => {
    const isActive = name === viewName;
    element.classList.toggle("is-active", isActive);
    element.setAttribute("aria-hidden", String(!isActive));
  });
}

function openTestSite() {
  window.open(TEST_URL, "_blank", "noopener,noreferrer");
}

function appendMessage(role, text) {
  const bubble = document.createElement("div");
  bubble.className = `chat-bubble ${role}`;
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setChatPending(isPending, label = "发送") {
  appState.isWaitingForReply = isPending;
  chatSendButton.disabled = isPending;
  chatInput.disabled = isPending;
  chatSendButton.textContent = isPending ? "思考中..." : label;
}

async function requestAssistantReply({ message = "", opening = false }) {
  setChatPending(true);
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message,
        opening,
        mbtiType: appState.mbtiType,
        communicationStyle: appState.resultKey,
        previousResponseId: appState.previousResponseId,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "AI 服务暂时不可用。请稍后再试。");
    }

    appState.previousResponseId = data.responseId || appState.previousResponseId;
    appendMessage("assistant", data.reply);
  } catch (error) {
    appendMessage("assistant", `当前无法连接 AI 服务：${error.message}`);
  } finally {
    setChatPending(false);
  }
}

function seedChat() {
  chatMessages.innerHTML = "";
  const result = resultDescriptions[appState.resultKey];
  chatMbtiBadge.textContent = `MBTI：${appState.mbtiType}`;
  chatStyleBadge.textContent = `风格：${result.label}`;
}

function handleMbtiSelection(type) {
  appState.mbtiType = type;
  mbtiButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.type === type);
  });
  selectionFeedback.textContent = `已选择类型：${type}`;
  appState.currentQuestionIndex = 0;
  appState.answers = new Array(communicationQuestions.length).fill(null);
  renderQuestion();
  showView("test");
}

function updateQuestionNav() {
  const hasPrevious = appState.currentQuestionIndex > 0;
  nextQuestionButton.disabled = !hasPrevious;
  nextQuestionButton.textContent = "回到上一题";
}

function goToNextQuestionOrResult() {
  if (appState.currentQuestionIndex === communicationQuestions.length - 1) {
    showResult();
    return;
  }
  appState.currentQuestionIndex += 1;
  renderQuestion();
}

function renderQuestion() {
  const currentQuestion = communicationQuestions[appState.currentQuestionIndex];
  const currentAnswer = appState.answers[appState.currentQuestionIndex];

  questionCard.classList.remove("is-switching");
  void questionCard.offsetWidth;
  questionCard.classList.add("is-switching");

  questionProgress.textContent = `第 ${appState.currentQuestionIndex + 1} 题 / 共 ${communicationQuestions.length} 题`;
  selectedMbti.textContent = `MBTI：${appState.mbtiType || "未选择"}`;
  questionTitle.textContent = currentQuestion.title;

  questionOptions.innerHTML = currentQuestion.options
    .map((option) => {
      const isSelected = currentAnswer && currentAnswer.key === option.key;
      return `
        <button class="question-option ${isSelected ? "is-selected" : ""}" type="button" data-key="${option.key}">
          <strong>${option.key}</strong>${option.text}
        </button>
      `;
    })
    .join("");

  [...questionOptions.querySelectorAll(".question-option")].forEach((button) => {
    button.addEventListener("click", () => {
      const selectedOption = currentQuestion.options.find((option) => option.key === button.dataset.key);
      appState.answers[appState.currentQuestionIndex] = selectedOption;
      goToNextQuestionOrResult();
    });
  });

  updateQuestionNav();
}

function calculateResult() {
  const counts = {
    "Emotion-first": 0,
    "Logic-first": 0,
    "Action-first": 0,
    Companion: 0,
  };

  appState.answers.forEach((answer) => {
    if (answer) counts[answer.style] += 1;
  });

  const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  appState.resultKey = sortedEntries[0][0];
  return resultDescriptions[appState.resultKey];
}

function showResult() {
  const result = calculateResult();
  resultTitle.textContent = `你的沟通偏好：${result.label}`;
  resultDescription.textContent = result.text;
  showView("result");
}

startButton.addEventListener("click", () => {
  showView("choice");
});

knownTypeButton.addEventListener("click", () => {
  showView("mbti");
});

unknownTypeButton.addEventListener("click", openTestSite);
unknownTypeLink.addEventListener("click", () => {
  showView("choice");
});

mbtiButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleMbtiSelection(button.dataset.type);
  });
});

nextQuestionButton.addEventListener("click", () => {
  if (appState.currentQuestionIndex === 0) return;
  appState.currentQuestionIndex -= 1;
  renderQuestion();
});

startChatButton.addEventListener("click", async () => {
  calculateResult();
  appState.previousResponseId = "";
  seedChat();
  showView("chat");
  await requestAssistantReply({ opening: true });
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text || appState.isWaitingForReply) return;

  appendMessage("user", text);
  chatInput.value = "";
  await requestAssistantReply({ message: text });
});

showView("home");

