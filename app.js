const TEST_URL = "https://totypes.com";

const views = {
  home: document.getElementById("home-view"),
  choice: document.getElementById("choice-view"),
  mbti: document.getElementById("mbti-view"),
};

const startButton = document.getElementById("start-button");
const knownTypeButton = document.getElementById("known-type-button");
const unknownTypeButton = document.getElementById("unknown-type-button");
const unknownTypeLink = document.getElementById("unknown-type-link");
const backToChoiceButton = document.getElementById("back-to-choice");
const mbtiButtons = [...document.querySelectorAll(".mbti-card")];
const selectionFeedback = document.getElementById("selection-feedback");

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

function handleMbtiSelection(type) {
  mbtiButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.type === type);
  });

  selectionFeedback.textContent = `已选择类型：${type}。这里已经预留好后续接入 AI 对话的扩展入口。`;
  console.log("Selected MBTI:", type);
}

startButton.addEventListener("click", () => {
  showView("choice");
});

knownTypeButton.addEventListener("click", () => {
  showView("mbti");
});

unknownTypeButton.addEventListener("click", openTestSite);
unknownTypeLink.addEventListener("click", openTestSite);

backToChoiceButton.addEventListener("click", () => {
  showView("choice");
});

mbtiButtons.forEach((button) => {
  button.addEventListener("click", () => {
    handleMbtiSelection(button.dataset.type);
  });
});

showView("home");
