const profileForm = document.getElementById("profile-form");
const profileResult = document.getElementById("profile-result");
const emotionBars = document.getElementById("emotion-bars");
const coachResponse = document.getElementById("coach-response");
const analyzeButton = document.getElementById("analyze-button");
const storyInput = document.getElementById("story-input");
const chipButtons = [...document.querySelectorAll(".chip")];
const moodButtons = [...document.querySelectorAll(".mood")];

const emotionBase = ["快乐", "悲伤", "厌恶", "恐惧", "愤怒"];

const profileTemplates = {
  reflective: {
    title: "观察型内省者",
    description:
      "你通常先在内在世界整理情绪，再决定是否向外表达。更适合先被理解，再被引导行动。",
    traits: [
      "可能的 MBTI 倾向: INFJ / INFP / INTJ",
      "九型关注点: 自我一致性、安全感、意义感",
      "推荐陪伴风格: 温柔映照 + 结构澄清",
    ],
    coachTone: "温柔、安静、带一点洞察感",
  },
  grounded: {
    title: "稳定型协调者",
    description:
      "你在关系和环境中很敏锐，容易先照顾整体氛围。适合用有安全感、可落地的方式陪伴你。",
    traits: [
      "可能的 MBTI 倾向: ISFJ / ESFJ / ISFP",
      "九型关注点: 关系稳定、被需要、内在和谐",
      "推荐陪伴风格: 共情安抚 + 温和落地",
    ],
    coachTone: "细腻、支持性强、不过度逼迫",
  },
  strategic: {
    title: "行动型重建者",
    description:
      "你在压力里会本能地寻找掌控点，希望快速恢复秩序。适合清晰、真诚、能转化为行动的反馈。",
    traits: [
      "可能的 MBTI 倾向: ENTJ / ESTJ / ENFJ",
      "九型关注点: 效率、影响力、可控感",
      "推荐陪伴风格: 直接理解 + 目标重建",
    ],
    coachTone: "清晰、坚定、帮助你回到掌控感",
  },
};

function chooseProfile(data) {
  if (data.decision === "logic" || data.motivation === "impact" || data.stress === "control") {
    return profileTemplates.strategic;
  }

  if (data.decision === "harmony" || data.stress === "seek_support" || data.energy === "social") {
    return profileTemplates.grounded;
  }

  return profileTemplates.reflective;
}

function renderProfile(profile) {
  profileResult.innerHTML = `
    <h3>${profile.title}</h3>
    <p>${profile.description} 教练会采用${profile.coachTone}的对话风格。</p>
    <ul>${profile.traits.map((item) => `<li>${item}</li>`).join("")}</ul>
  `;
}

function scoreEmotion(text, selectedMood, profile) {
  const content = `${selectedMood} ${text}`.trim();
  const score = {
    快乐: 8,
    悲伤: 18,
    厌恶: 10,
    恐惧: 22,
    愤怒: 16,
  };

  const keywordMap = {
    快乐: ["开心", "轻松", "庆幸", "感激", "希望", "期待"],
    悲伤: ["失望", "难过", "委屈", "失去", "哭", "沮丧"],
    厌恶: ["反感", "恶心", "讨厌", "排斥", "不舒服", "压抑"],
    恐惧: ["焦虑", "害怕", "担心", "不安", "紧张", "失控"],
    愤怒: ["生气", "愤怒", "烦", "气死", "不公平", "被否定"],
  };

  Object.entries(keywordMap).forEach(([emotion, keywords]) => {
    keywords.forEach((keyword) => {
      if (content.includes(keyword)) {
        score[emotion] += 12;
      }
    });
  });

  if (profile.title === "行动型重建者") {
    score.愤怒 += 6;
    score.恐惧 += 4;
  }

  if (profile.title === "观察型内省者") {
    score.悲伤 += 8;
    score.恐惧 += 8;
  }

  if (profile.title === "稳定型协调者") {
    score.悲伤 += 6;
    score.厌恶 += 4;
  }

  if (selectedMood === "开心") {
    score.快乐 += 26;
  }

  if (selectedMood === "愤怒") {
    score.愤怒 += 24;
  }

  if (selectedMood === "悲伤" || selectedMood === "失落") {
    score.悲伤 += 20;
  }

  if (selectedMood === "焦虑") {
    score.恐惧 += 24;
  }

  const total = Object.values(score).reduce((sum, value) => sum + value, 0);
  return emotionBase.map((emotion) => ({
    name: emotion,
    value: Math.round((score[emotion] / total) * 100),
  }));
}

function renderBars(rows) {
  emotionBars.innerHTML = rows
    .map(
      (row) => `
        <div class="emotion-row">
          <span>${row.name}</span>
          <div class="bar-track">
            <div class="bar-fill" style="width: ${row.value}%"></div>
          </div>
          <strong>${row.value}%</strong>
        </div>
      `
    )
    .join("");
}

function topEmotions(scores) {
  return [...scores].sort((a, b) => b.value - a.value).slice(0, 2);
}

function buildCoachReply(profile, scores, story) {
  const [first, second] = topEmotions(scores);
  const text = story.trim();
  const shortStory = text ? `你提到“${text.slice(0, 44)}${text.length > 44 ? "..." : ""}”` : "你现在正在经历一段不轻松的时刻";

  const toneMap = {
    观察型内省者:
      `我会先陪你把感受说清楚，不急着下结论。${shortStory}，这件事之所以让你卡住，往往不是因为你脆弱，而是因为它触碰到了你很在意的部分。`,
    稳定型协调者:
      `我想先让你知道，你的感受是可以被接住的。${shortStory}，你可能一边在消化自己的情绪，一边又在顾虑关系和氛围，所以会更累。`,
    行动型重建者:
      `我们先不急着责备自己，而是把局面看清楚。${shortStory}，你可能最难受的地方在于事情脱离了预期，让你一下子失去了掌控感。`,
  };

  const calmTipMap = {
    快乐: "允许这份轻松多停留一会儿，别急着否定自己的好状态。",
    悲伤: "先给自己 3 次慢呼吸，把“我很难受”换成“我正在经历难受”。",
    厌恶: "和让你不舒服的刺激稍微拉开一点距离，先把身体放回安全区。",
    恐惧: "先确认此刻真正发生的事实，再区分想象中的最坏结果。",
    愤怒: "先别急着证明谁对谁错，先照顾被冒犯和被压迫的那部分自己。",
  };

  return `${toneMap[profile.title]}

你的情绪里当前最明显的是${first.name}和${second.name}。这通常意味着，表面上你感受到的是一种主情绪，但底层可能同时夹杂着另一种没有被看见的需求。

此刻最重要的不是立刻解决全部问题，而是先恢复一点点稳定感: ${calmTipMap[first.name]}

等情绪稍微落下来后，你可以只做一个很小的动作:
1. 写下一句“这件事真正刺痛我的是什么”
2. 分清“事实”与“我对事实的解释”
3. 只决定今天的一小步，而不是一次解决人生

如果你愿意，这个产品下一步可以继续追问你: 你最害怕失去的是什么，你最希望被理解的又是什么。`;
}

let currentProfile = profileTemplates.reflective;
let currentMood = "焦虑";

chipButtons.forEach((chip) => {
  chip.addEventListener("click", () => {
    chipButtons.forEach((button) => button.classList.remove("selected"));
    chip.classList.add("selected");
  });
});

moodButtons.forEach((button) => {
  button.addEventListener("click", () => {
    moodButtons.forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    currentMood = button.dataset.mood;
  });
});

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(profileForm);
  const answers = Object.fromEntries(formData.entries());
  currentProfile = chooseProfile(answers);
  renderProfile(currentProfile);
});

analyzeButton.addEventListener("click", () => {
  const scores = scoreEmotion(storyInput.value, currentMood, currentProfile);
  renderBars(scores);
  coachResponse.textContent = buildCoachReply(currentProfile, scores, storyInput.value);
});

renderProfile(currentProfile);
renderBars(scoreEmotion("", currentMood, currentProfile));
