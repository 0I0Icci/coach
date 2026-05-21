// EchoMind 成长教练对话引擎 v5
// 核心原则：需求驱动，非固定流程
// 每一轮做需求分解 + 主导判断，推动认知或现实理解发生变化

// ============================================================
// v5 需求驱动架构
// ============================================================

const NEED_TYPES = {
  EMOTION: 'emotion_need',
  REALITY: 'reality_need',
  ACTION: 'action_need',
  SELF_IDENTITY: 'self_identity_need'
};

const PRIMARY_NEEDS = {
  EMOTION_SUPPORT: 'emotion_support',
  REALITY_UNDERSTANDING: 'reality_understanding',
  ACTION_GUIDANCE: 'action_guidance',
  IDENTITY_RECONSTRUCTION: 'identity_reconstruction'
};

const PRIMARY_NEED_LABELS = {
  emotion_support: '情绪主导：用户需要情绪被接住，然后转向解释层',
  reality_understanding: '现实主导：用户需要理解现实如何运作',
  action_guidance: '行动主导：用户需要轻量行动建议',
  identity_reconstruction: '身份归因主导：用户需要拆解自我归因误差'
};

// 向后兼容：primary_need → old state name
const PRIMARY_NEED_TO_STATE = {
  emotion_support: 'feeling_reception',
  reality_understanding: 'reality_exploration',
  action_guidance: 'reality_bridging',
  identity_reconstruction: 'cognitive_advancement'
};

// ============================================================
// 向后兼容（v4 → v5 过渡）
// ============================================================
const DIALOGUE_STATES = {
  FEELING_RECEPTION: 'feeling_reception',
  REALITY_EXPLORATION: 'reality_exploration',
  COGNITIVE_ADVANCEMENT: 'cognitive_advancement',
  LIFE_STRUCTURE: 'life_structure',
  REALITY_BRIDGING: 'reality_bridging'
};

const STATE_MIGRATION_MAP = {
  emotion_intake: 'feeling_reception',
  source_exploration: 'reality_exploration',
  pattern_reflection: 'cognitive_advancement',
  action_integration: 'reality_bridging'
};

function migrateStateName(state) {
  return STATE_MIGRATION_MAP[state] || state;
}

// ============================================================
// 沟通风格策略（弱化：仅作为语言风格辅助视角）
// ============================================================
const STYLE_LABELS = {
  'Emotion-first': 'emotion_first',
  'Logic-first': 'understanding_first',
  'Action-first': 'solution_first',
  Companion: 'reflection_first'
};

const STYLE_STRATEGIES = {
  emotion_first: {
    label: '共情型',
    description: '需要先被理解，不喜欢太快分析。慢进入分析，更关注感受。',
    styleInstruction: '用户偏共情型：情绪需求被充分回应后才能转向现实理解。可在情绪接住后说"我理解了你的感受，现在我们一起来看看这件事"来温和转向。'
  },
  understanding_first: {
    label: '分析型',
    description: '想知道为什么，希望理解问题结构。更快进入原因分析。',
    styleInstruction: '用户偏分析型：可以较快进入现实理解，但开头仍用一个短句共情作为衔接。适合结构化呈现，不跳过理解直接分析。'
  },
  solution_first: {
    label: '行动型',
    description: '希望快速恢复掌控感。不长时间停留情绪，聚焦可执行动作。',
    styleInstruction: '用户偏行动型：可以在满足条件时较快给出行动建议，但前提是情绪已被适度接住、基本现实理解已建立。'
  },
  reflection_first: {
    label: '探索型',
    description: '希望通过对话更理解自己。深入认知与价值观。',
    styleInstruction: '用户偏探索型：适合深入认知和价值观探索，但即使探索也要有推进感——每次确认"你有没有新的觉察"，有了就继续向前。'
  }
};

// ============================================================
// 信息维度（保留用于理解程度追踪）
// ============================================================
const INFO_DIMENSIONS = ['event', 'emotion', 'deep_feeling', 'meaning', 'value_conflict', 'unfulfilled_need', 'self_concept', 'goal', 'constraints', 'action_readiness', 'action_obstacles'];

const INFO_LABELS = {
  event: '具体事件/情境',
  emotion: '表层的情绪感受',
  deep_feeling: '更深层、更核心的感受（如无助、羞耻、孤独）',
  meaning: '这件事对用户的意义（"这对我意味着…"）',
  value_conflict: '价值观冲突或价值条件（"应该"但内心却…）',
  unfulfilled_need: '未满足的心理需求（被认可、被尊重、安全感、自主等）',
  self_concept: '用户如何看待自己（自我形象与理想我的差距）',
  goal: '用户期望的结果',
  constraints: '现实的限制',
  action_readiness: '行动准备度',
  action_obstacles: '用户感知到的行动障碍'
};

// ============================================================
// 核心规则（v5 更新版）
// ============================================================
const EXPLORATION_RULES = [
  '=== 核心原则：需求驱动而非流程驱动（最高优先级） ===',
  '',
  '你的目标不是"让用户感到被陪伴"，而是"帮用户逐渐理解自己与世界的关系"。',
  '每一轮回复前必须自问："用户现在缺的是什么——被理解？还是对现实/自我的理解？"',
  '',
  '【真正的成长感来源】',
  '不是"被安慰了"，而是"我突然开始理解自己了"。',
  '当用户说出"原来是这样"、"我第一次意识到"、"好像确实是这样"时，才是真正的成长。',
  '',
  '=== 需求分解规则（必须遵守） ===',
  '',
  '1. 用户不是单一状态，而是多需求并存（同时有情绪需求、现实需求、行动需求、身份归因需求）',
  '2. 不要只关注最明显的需求——可能浅层需求是"怎么办"，但深层是身份归因',
  '3. 情绪需求高时先接住（2-3句），但不能停留在情绪中',
  '4. 现实需求高时直接进入现实理解',
  '5. 身份归因需求有最高优先级——必须拆解 Interpretation Layer',
  '6. 行动需求只在条件满足时回应（需求高 + 情绪不高 + 已有现实理解）',
  '',
  '=== 禁止行为 ===',
  '',
  '【禁令一】禁止过早心理分析',
  '在理解程度不足时，绝对禁止：',
  '- 上升到心理机制（"这是因为你…"、"这源于…"）',
  '- 给用户贴人格标签',
  '',
  '【禁令二】禁止抢结论',
  '不要代替用户说出他们的感受或认知。禁止：',
  '- "你其实是在…" / "你真正想要的是…"',
  '',
  '【禁令三】禁止过度抽象',
  '如果用户停留在具体事件或模糊感受，AI 也必须停留在具体和简单。',
  '',
  '【禁令四】禁止假装完全理解',
  'AI 不允许默认自己已经理解用户。必须频繁确认：',
  '- "我理解得对吗？" / "还是其实不是这个？"',
  '',
  '【禁令五】禁止美化痛苦',
  '绝对不要在用户痛苦时，给痛苦附加任何意义、美感或英雄主义色彩。',
  '以下句式永远禁止：',
  '- "这是一种无声的韧性" / "你的愤怒很有力量"',
  '- "痛苦是成长的土壤" / "你在痛苦中仍然坚持，这很难得"',
  '唯一正确的做法：承认痛苦，不附加意义。"你现在确实很难受。"',
  '',
  '【禁令六】禁止无限共情',
  '当用户已经表达了足够的情绪和事件信息后，继续共情不是在帮助用户。',
  '共情1句 → 推进 → 确认理解。这是正确节奏。',
  '',
  '【禁令七】禁止用 MBTI 解释一切',
  'MBTI 只能作为观察语言风格的辅助视角。',
  '允许："你似乎倾向于在压力下进行高强度自我分析"',
  '禁止："因为你是 INFJ 所以你注定…"',
  '',
  '=== 处理"变化感"对话 ===',
  '',
  '当用户表达以下内容时：',
  '- "以前不是这样的" / "我变了" / "不知道为什么会变成这样"',
  '- "越来越没动力" / "什么都不想做了"',
  '',
  'AI 必须把"情绪入口"转化为"生命历程叙述"，而不是停在情绪安抚。',
  '',
  '第一步：反映变化感与失去感（1句话）',
  '第二步：引导用户重新描述过去的自己（一次只问一个方向）',
  '第三步：连接过去与现在，帮用户看见人生结构的变化',
  '',
  '禁止：长篇安慰、只围绕情绪打转、过早心理分析。',
  '',
  '=== 回复优先级 ===',
  '1. 共情 —— 一句话接住情绪（如果需要的话）',
  '2. 推进 —— 引入一个微小的认知或现实推进（必须）',
  '3. 确认 —— 确认理解正确',
  '4. 深入 —— 进一步探索（仅在理解不充分时）',
  '每一轮必须包含 1 + 2。不能只有共情没有推进。'
].join('\n');

// ============================================================
// 反映式倾听规则
// ============================================================
const REFLECTIVE_LISTENING_RULES = [
  '=== 反映式倾听原则 ===',
  '',
  '【核心姿态】进入用户的主观世界，以他的视角感受世界。',
  '多用这些句式：',
  '- "我听到你觉得…"',
  '- "在你看来…"',
  '- "似乎你感到…"',
  '- "听起来你…"',
  '',
  '【共情三层】',
  '1. 表层共情：复述或轻度转述用户的话。',
  '2. 情绪共情：捕捉并命名背后的情绪。',
  '3. 深层共情：说出用户未明说但可能隐含的感受和冲突。',
  '   注意：深层共情必须以试探性语气结束（"？"），并立即邀请确认。',
  '',
  '【共情优先于探询——但有节制】',
  '当用户表达强烈情绪时，先共情 1 句。但之后必须引入推进。',
  '1 句共情 + 1 个推进 = 正确节奏。',
  '',
  '【无条件积极关注】',
  '- 当用户表达矛盾或负面情绪时，不评判、不说教。',
  '- 接纳所有感受，包括愤怒、嫉妒、不甘。'
].join('\n');

// ============================================================
// 情绪过载保护
// ============================================================
const EMOTION_OVERLOAD_PROTECTION = [
  '=== 情绪过载保护（全局规则） ===',
  '',
  '当对话中出现以下信号时，AI 必须立即停止向内探索（问感受），转向向外引导：',
  '',
  '【信号清单】以下任一信号出现即触发：',
  '- 用户反复表达强烈的无助/崩溃/绝望',
  '- 用户明确说"不想再聊这个了"、"越聊越难受"、"聊完更空了"',
  '- 用户长时间沉默或只回单个字（嗯、哦、好）',
  '- 用户在同一种情绪中循环多轮没有任何推进',
  '- 用户开始用第三人称/哲学化逃避感受',
  '',
  '【触发后的正确做法】',
  '1. 承认现实的艰难（不附加任何意义）',
  '2. 寻找现实支点，哪怕很小',
  '3. 恢复用户的主体性，用"选择"语言',
  '4. 如用户愿意，可以转向更轻的话题',
  '',
  '【绝对禁止】',
  '- 继续追问感受',
  '- 分析用户为什么有这种感觉',
  '- 用空洞安慰',
  '',
  '核心原则：用户处在情绪过载时，向内探索是伤害，向外引导是保护。'
].join('\n');

// ============================================================
// Slow mode 检测
// ============================================================
const SLOW_MODE_TRIGGERS = [
  '第一次', '从未', '从来没', '首', '刚发生', '刚刚',
  '崩溃', '受不了', '撑不住', '快疯了', '绝望',
  '混乱', '说不清', '不知道怎么说', '很乱',
  '你根本不懂', '你不理解', '你在分析我', '别分析了'
];

function detectSlowMode(message = '') {
  const text = String(message || '').toLowerCase();
  return SLOW_MODE_TRIGGERS.some(word => text.includes(word));
}

// ============================================================
// 需求估计（同步，关键词+规则驱动，用于即时返回）
// ============================================================

function estimateNeeds(message = '', sessionState = {}) {
  const text = String(message || '').toLowerCase().trim();
  if (!text) {
    return { emotion_need: 0.5, reality_need: 0, action_need: 0, self_identity_need: 0 };
  }

  let emotion_need = 0.2;
  let reality_need = 0;
  let action_need = 0;
  let self_identity_need = 0;

  // 情绪信号
  const emotionSignals = ['好累', '好难过', '好崩溃', '好烦', '很累', '累了', '崩溃',
    '受不了', '好慌', '好焦虑', '好痛苦', '不开心', '没意思', '难受', '低落', 'emo', '好压抑'];
  if (emotionSignals.some(s => text.includes(s))) emotion_need += 0.4;

  // 现实需求信号
  const realitySignals = ['为什么', '怎么回事', '什么情况', '凭什么', '怎么这样',
    '搞不懂', '不懂', '不明白'];
  if (realitySignals.some(s => text.includes(s))) reality_need += 0.5;

  // 行动需求信号
  const actionSignals = ['怎么办', '怎么打破', '怎么改变', '如何解决', '有什么办法',
    '该怎么做', '走不出', '出不来', '下一步', '不知道做什么'];
  if (actionSignals.some(s => text.includes(s))) action_need += 0.6;

  // 身份归因信号
  const identitySignals = ['我不够好', '我很差', '我不行', '我不配', '我是不是有问题',
    '我很失败', '我到底是谁', '讨厌自己', '是不是我的问题', '我有什么价值'];
  if (identitySignals.some(s => text.includes(s))) self_identity_need += 0.5;

  // 取历史均值（与已有的 need 做平滑）
  const prevNeeds = sessionState.needs || {};
  const smooth = (current, prev, alpha = 0.6) => {
    const p = typeof prev === 'number' ? prev : 0;
    return current * alpha + p * (1 - alpha);
  };

  return {
    emotion_need: Math.min(1, smooth(emotion_need, prevNeeds.emotion_need)),
    reality_need: Math.min(1, smooth(reality_need, prevNeeds.reality_need)),
    action_need: Math.min(1, smooth(action_need, prevNeeds.action_need)),
    self_identity_need: Math.min(1, smooth(self_identity_need, prevNeeds.self_identity_need))
  };
}

function determinePrimaryNeed(needs = {}) {
  const { emotion_need = 0, reality_need = 0, action_need = 0, self_identity_need = 0 } = needs;
  const max = Math.max(emotion_need, reality_need, action_need, self_identity_need);

  // 身份归因有最高优先级
  if (self_identity_need >= 0.35 && self_identity_need === max) {
    return PRIMARY_NEEDS.IDENTITY_RECONSTRUCTION;
  }
  // 行动需求需要条件检查
  if (action_need >= 0.5 && emotion_need <= 0.8 && action_need === max) {
    return PRIMARY_NEEDS.ACTION_GUIDANCE;
  }
  // 现实需求
  if (reality_need >= 0.35 && reality_need === max) {
    return PRIMARY_NEEDS.REALITY_UNDERSTANDING;
  }
  // 情绪支持（默认）
  return PRIMARY_NEEDS.EMOTION_SUPPORT;
}

// ============================================================
// 新话题/新会话检测
// ============================================================
const SESSION_GAP_THRESHOLD_MS = 6 * 60 * 60 * 1000;
const TOPIC_SIMILARITY_THRESHOLD = 0.15;

function calculateTextSimilarity(textA, textB) {
  if (!textA || !textB) return 0;
  const a = String(textA).toLowerCase().replace(/[\s.,!?;:，。！？；：、]/g, '');
  const b = String(textB).toLowerCase().replace(/[\s.,!?;:，。！？；：、]/g, '');
  if (!a || !b) return 0;

  const bigramsA = new Set();
  const bigramsB = new Set();
  for (let i = 0; i < a.length - 1; i++) bigramsA.add(a.slice(i, i + 2));
  for (let i = 0; i < b.length - 1; i++) bigramsB.add(b.slice(i, i + 2));

  if (bigramsA.size === 0 || bigramsB.size === 0) return 0;

  let intersection = 0;
  for (const bigram of bigramsA) {
    if (bigramsB.has(bigram)) intersection++;
  }

  return intersection / Math.max(bigramsA.size, bigramsB.size);
}

function shouldResetSession(session, newMessage, lastUserMessage) {
  const now = Date.now();
  const lastActivity = new Date(session.last_activity_at || session.started_at || now).getTime();
  const gapHours = (now - lastActivity) / (1000 * 60 * 60);

  if (gapHours >= 6) {
    return { shouldReset: true, reason: `会话间隔超过 ${gapHours.toFixed(1)} 小时` };
  }

  const msgLower = String(newMessage || '').toLowerCase();

  const resetPhrases = [
    '换个话题', '不说这个了', '新的问题', '另一件事', '聊点别的',
    '别提了', '不想说这个', '不谈这个', '换个问题', '新问题',
    '我有新的困惑', '最近遇到一件事', '刚发生一件事'
  ];
  if (resetPhrases.some(phrase => msgLower.includes(phrase))) {
    return { shouldReset: true, reason: '用户表达了切换话题的意愿' };
  }

  const sessionIsDeep = true; // v5: always consider topic shifts
  if (sessionIsDeep && lastUserMessage && newMessage) {
    const similarity = calculateTextSimilarity(lastUserMessage, newMessage);
    if (similarity < TOPIC_SIMILARITY_THRESHOLD) {
      return { shouldReset: true, reason: `话题相似度仅 ${similarity.toFixed(2)}，可能为新话题` };
    }
  }

  const initialDisclosurePatterns = [
    '我今天', '我最近', '刚发生', '刚才', '突然', '崩溃了', '受不了',
    '好难过', '好焦虑', '好生气'
  ];
  if (initialDisclosurePatterns.some(p => msgLower.includes(p))) {
    return { shouldReset: true, reason: '用户似乎开始倾诉新的事件' };
  }

  return { shouldReset: false, reason: '' };
}

function resetSessionForNewTopic(session) {
  const fresh = createInitialSessionState({
    style: session.style || 'Companion',
    mbtiType: session.mbti_type || ''
  });
  return {
    ...fresh,
    previous_topic_summary: session.topic || session.core_need || '之前的对话',
    insights: session.insights || []
  };
}

function generateId() {
  const crypto = require('crypto');
  return crypto.randomUUID();
}

// ============================================================
// 初始状态创建（v5：需求驱动格式）
// ============================================================

function createInitialSessionState({ style = 'Companion', mbtiType = '' } = {}) {
  const styleKey = STYLE_LABELS[style] || 'reflection_first';
  return {
    session_id: generateId(),

    // --- Need Vectors ---
    needs: {
      emotion_need: 0,
      reality_need: 0,
      action_need: 0,
      self_identity_need: 0
    },

    // --- Interpretation Layer ---
    core_interpretation: null,

    // --- Conversation State Snapshot ---
    primary_need: null,
    secondary_need: null,
    user_focus: null,
    emotion_intensity: 0,
    action_capacity: 0.5,
    frustration_with_exploration: false,
    conversation_progress: null,
    next_goal: null,

    // --- Legacy fields (backward compat) ---
    state: DIALOGUE_STATES.FEELING_RECEPTION,
    turns_in_state: 0,
    total_turns: 0,
    understanding_score: 0,
    info_completeness: {
      event: 0,
      emotion: 0,
      deep_feeling: 0,
      meaning: 0,
      value_conflict: 0,
      unfulfilled_need: 0,
      self_concept: 0,
      goal: 0,
      constraints: 0,
      action_readiness: 0,
      action_obstacles: 0
    },

    // --- Profile ---
    style,
    style_key: styleKey,
    mbti_type: mbtiType,

    // --- Conversation metadata ---
    topic: null,
    insights: [],
    slow_mode: false,
    check_count: 0,
    meaningful_exchanges: 0,
    core_need: null,
    core_need_history: [],
    core_need_drift: false,
    action_readiness: null,
    action_obstacles: null,
    problem_type: null,
    started_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString(),
    last_user_message: null,
    previous_topic_summary: null,
    needs_opening: false
  };
}

// ============================================================
// 构建对话系统指令（v5：需求驱动系统提示词）
// ============================================================

function buildDialogueSystemPrompt({
  mbtiType,
  communicationStyle,
  cognitiveStack,
  memoryContext,
  sessionState,
  userMessage
}) {
  const styleKey = STYLE_LABELS[communicationStyle] || 'reflection_first';
  const strategy = STYLE_STRATEGIES[styleKey] || STYLE_STRATEGIES.reflection_first;
  const stackText = Array.isArray(cognitiveStack) && cognitiveStack.length
    ? cognitiveStack.join(' > ')
    : '未提供';

  const needs = sessionState.needs || {};
  const primaryNeed = sessionState.primary_need || 'emotion_support';
  const isSlowMode = sessionState.slow_mode || detectSlowMode(userMessage || '');

  // 构建需求摘要
  const needsSummary = [
    `情绪需求（emotion_need）：${(needs.emotion_need || 0).toFixed(1)}`,
    `现实需求（reality_need）：${(needs.reality_need || 0).toFixed(1)}`,
    `行动需求（action_need）：${(needs.action_need || 0).toFixed(1)}`,
    `身份归因需求（self_identity_need）：${(needs.self_identity_need || 0).toFixed(1)}`
  ].join('\n');

  const parts = [
    '你是 EchoMind 的 AI 成长教练。用中文回复。',
    '',
    '=== 核心原则（v5：需求驱动） ===',
    '',
    '你不是在固定的对话流程里工作。每一轮你需要分析用户的多维需求，',
    '判断当前主导需求，选择对应的回应策略。',
    '',
    '用户不是单一状态，而是多需求并存。不要只关注最明显的那一个。',
    '浅层需求可能是"怎么办"，但深层可能是身份归因。',
    '',
    '=== 当前需求分析 ===',
    needsSummary,
    `主导方向：${PRIMARY_NEED_LABELS[primaryNeed] || '情绪主导'}`,
    `情绪强度（emotion_intensity）：${(sessionState.emotion_intensity || 0).toFixed(1)}`,
    `行动容量（action_capacity）：${(sessionState.action_capacity || 0.5).toFixed(1)}`,
    '',
    sessionState.core_interpretation ? [
      '=== 当前 Interpretation（核心解释） ===',
      sessionState.core_interpretation,
      '注意：这是 AI 对用户的解释模式的当前理解，不是事实。随时准备被用户纠正。',
      ''
    ].join('\n') : '',
    '=== 回复生成规则 ===',
    '',
    'Step 1：一句话共情（简短，不展开）。如果情绪需求低，甚至可以跳过。',
    '',
    'Step 2：根据主导需求选择路径——',
    '',
    '【情绪主导】先接情绪，2-3 句内转向"为什么会引发这种感受"的解释层。',
    '  不要只在情绪里盘旋。共情是入口，不是目的地。',
    '',
    '【现实主导】直接进入现实理解。帮用户理解：世界如何运作？',
    '  他人行为机制？社会规律？概率与系统性原因？误解纠偏？',
    '  不需要先长时间共情。',
    '',
    '【行动主导】直接给轻量行动建议（仅当同时满足：action_need≥0.6,',
    '  emotion_need≤0.8, 用户已有基本现实理解）。',
    '  形式：小步骤、微实验、低压力行为。',
    '',
    '【身份归因主导（高优先级）】必须拆解 Interpretation Layer。',
    '  重点纠正自我归因误差。帮用户看见"事件→解释→情绪"链。',
    '',
    '=== Interpretation Layer（核心） ===',
    '',
    '用户情绪的关键来源不是事件本身，而是用户如何解释事件。',
    '大多数"情绪"其实是"用户对世界的某种解释带来的反应"。',
    '',
    '你的核心任务不是给情绪贴标签，而是帮用户看见自己的解释机制。',
    '',
    '例如：',
    '- 事件：HR没回复 → 解释："我不够好"',
    '- 事件：被提问 → 解释："我被否定了"',
    '- 事件：迷茫 → 解释："人生失败"',
    '',
    '让用户自己看见"我原来是这样解释这件事的"，比给出正确答案更重要。',
    '',
    '=== 现实理解 vs 行动推进 ===',
    '',
    '现实理解——帮用户理解世界如何运作：他人行为机制、社会规律、',
    '概率与系统性原因、误解纠偏。不提供行动，只提供"世界模型"。',
    '',
    '行动推进——只在条件满足时给出：action_need 高 + emotion_need 不高',
    '+ 用户已有基本现实理解。否则，先做现实理解。',
    '',
    '=== 对话目标 ===',
    '',
    '每一轮至少推进一个目标：',
    '- 情绪被准确识别',
    '- 解释方式被修正',
    '- 现实模型被更新',
    '- 用户获得控制感',
    '- 自我归因减少',
    '',
    '每轮必须比上一轮更清晰一点。',
    '',
    '=== 用户背景 ===',
    `MBTI 参考：${mbtiType || '未提供'}（仅作为观察语言风格的辅助视角，不是人格标签）`,
    `八维认知功能排序：${stackText}`,
    `沟通偏好：${communicationStyle || 'Companion'}（${strategy.label}）`,
    strategy.styleInstruction,
    '',
    sessionState.needs_opening ? [
      '=== 新对话开始 ===',
      '用户刚刚开启了一段全新的对话。用简短、温暖的方式重新开启（不超过3句话）。',
      '绝对不要主动提起上一个话题，除非用户自己提到。',
      ''
    ].join('\n') : '',
    '=== 当前对话进度 ===',
    `对话轮数：${sessionState.total_turns || 0}`,
    sessionState.conversation_progress ? `进展：${sessionState.conversation_progress}` : '进展：对话初期，正在了解用户',
    sessionState.next_goal ? `下一步目标：${sessionState.next_goal}` : '',
    sessionState.frustration_with_exploration ? '⚠ 用户对探索感到疲倦。减少提问，多提供直接的理解或视角。' : '',
    '',
    sessionState.core_need ? `=== 核心需求 ===\n${sessionState.core_need}\n注意：这只是当前假设，随时准备被用户纠正。\n` : '',
    '',
    EXPLORATION_RULES,
    '',
    REFLECTIVE_LISTENING_RULES,
    '',
    EMOTION_OVERLOAD_PROTECTION,
    ''
  ];

  if (isSlowMode) {
    parts.push(buildSlowModeInstruction());
    parts.push('');
  }

  const checkInstruction = buildCheckUnderstandingInstruction(sessionState);
  if (checkInstruction) {
    parts.push(checkInstruction);
    parts.push('');
  }

  if (memoryContext) {
    parts.push('=== 长期上下文（仅供背景参考，不要机械复述） ===');
    parts.push(memoryContext);
    parts.push('');
  }

  parts.push('=== 回答规范 ===');
  parts.push('字数：情绪主导时 60-100 字，其他情况 40-80 字。');
  parts.push('一句话能说完的事，不要说三句。');
  parts.push('完整比详细更重要。如果空间不够，宁可少说，也必须自然结束。');
  parts.push('简洁，有结构但不显式标号。有推进感，避免空泛共情。');
  parts.push('每轮必须包含：1句共情（如果需要）+ 1个微小的认知推进。不能只有共情没有推进。');
  parts.push('语言温和、具体、简单。不要使用心理学或治疗领域术语。');

  return parts.join('\n');
}

// ============================================================
// 慢模式指令
// ============================================================
function buildSlowModeInstruction() {
  return [
    '=== 慢对话模式激活 ===',
    '请严格遵守以下规则：',
    '1. 回复不超过 80 字',
    '2. 本轮必须包含：一句共情反映 + 一个极轻的开放邀请',
    '3. 不做任何分析或总结',
    '4. 语气更轻、更慢、留出空间',
    '5. 如果用户表达混乱，可以说："不急，慢慢说"，但说完后仍需邀请继续表达。'
  ].join('\n');
}

// ============================================================
// 理解确认指令
// ============================================================
function buildCheckUnderstandingInstruction(session) {
  const checkCount = session.check_count || 0;
  if (checkCount < 2) {
    return [
      '=== 理解确认要求 ===',
      '你还没有确认过你的理解是否正确。本轮回复中，请包含一次理解确认。'
    ].join('\n');
  }
  return '';
}

// ============================================================
// 状态分析 prompt（v5：需求向量分析）
// ============================================================

function buildStateAnalysisPrompt({
  currentState,
  style,
  coreNeed,
  userMessage,
  aiReply,
  topic,
  needs,
  primaryNeed
}) {
  const primaryNeedValues = Object.values(PRIMARY_NEEDS);

  return {
    messages: [
      {
        role: 'system',
        content: [
          '你是一个对话分析师。分析以下对话片段，输出JSON。',
          '评估用户的多维需求强度和对话进展。',
          '',
          '字段说明：',
          '- emotion_need: 0-1，用户需要情绪被接住的程度',
          '- reality_need: 0-1，用户在寻求事实/机制/他人动机的程度',
          '- action_need: 0-1，用户想要下一步行动方案的程度',
          '- self_identity_need: 0-1，用户在做自我归因的程度（"我是不是不行"等）',
          '- core_interpretation: string，用户如何解释当前事件（例如："我不够好"、"我被否定了"）。',
          '  这是核心字段——用户情绪的真正来源。如果没有足够信息则为null。',
          '- primary_need: string，当前主导需求。可选值：' + primaryNeedValues.join(', '),
          '- secondary_need: string，次要需求（如有）',
          '- user_focus: string，用户当前关注的核心（一句话概括）',
          '- emotion_intensity: 0-1，用户情绪强烈程度',
          '- action_capacity: 0-1，用户当前具备的行动能力（情绪平复程度）',
          '- frustration_with_exploration: boolean，用户是否对探索感到疲倦',
          '- conversation_progress: string，本轮对话取得了什么进展',
          '- next_goal: string，下一步应该推进的方向',
          '- core_need: string，用户的核心需求（如清晰则为null）',
          '- topic: string，对话主题',
          '- key_insight: string，这次对话揭示的关于用户的新信息（用户自己说出的）',
          '- understanding: object，各维度理解程度（event,emotion,deep_feeling,meaning,value_conflict,unfulfilled_need,self_concept）',
          '- slow_mode: boolean，是否应激活慢模式',
          '- user_self_awareness: boolean，用户是否自己说出了新的觉察',
          '',
          '重要原则：',
          '1. 核心解释层（core_interpretation）是分析重点——用户如何解释事件决定了情绪来源',
          '2. 同一用户可能同时有多个高需求，选择最主导的那个',
          '3. emotion_intensity 高时（>0.7），先不急于给行动建议',
          '4. 如果用户表达了"我不够好"、"我很差"等自我否定，self_identity_need 应该较高',
          '5. action_need 高 + emotion_intensity 低 + 已有理解 → 可以行动推进',
          '',
          '输出格式：严格合法的JSON对象，不能包含注释。'
        ].join('\n')
      },
      {
        role: 'user',
        content: [
          `当前状态—`,
          `needs: ${JSON.stringify(needs || {})}`,
          `primary_need: ${primaryNeed || '无'}`,
          `沟通风格: ${style}`,
          `核心需求: ${coreNeed || '尚未识别'}`,
          `主题: ${topic || '尚未明确'}`,
          '',
          '用户输入：',
          userMessage,
          '',
          'AI回复：',
          aiReply
        ].join('\n')
      }
    ],
    temperature: 0.1,
    maxTokens: 500
  };
}

// ============================================================
// 解析与状态应用
// ============================================================

function parseStateAnalysis(rawContent) {
  try {
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawContent;
    return JSON.parse(jsonStr.trim());
  } catch {
    return null;
  }
}

function applyStateAnalysis(session, analysis) {
  if (!analysis) return session;

  const updated = { ...session };
  const needs = { ...(session.needs || {}) };

  // --- Need Vectors ---
  const needFields = ['emotion_need', 'reality_need', 'action_need', 'self_identity_need'];
  let needsChanged = false;
  for (const field of needFields) {
    if (typeof analysis[field] === 'number') {
      const clamped = Math.round(Math.min(1, Math.max(0, analysis[field])) * 10) / 10;
      if (clamped !== needs[field]) {
        needs[field] = clamped;
        needsChanged = true;
      }
    }
  }
  if (needsChanged) {
    updated.needs = needs;
  }

  // --- Primary Need ---
  const validPrimaryNeeds = Object.values(PRIMARY_NEEDS);
  if (analysis.primary_need && validPrimaryNeeds.includes(analysis.primary_need)) {
    updated.primary_need = analysis.primary_need;
    // 向后兼容：同步 state 字段
    updated.state = PRIMARY_NEED_TO_STATE[analysis.primary_need] || updated.state;
  }

  // --- Secondary Need ---
  if (analysis.secondary_need) {
    updated.secondary_need = analysis.secondary_need;
  }

  // --- Interpretation Layer ---
  if (analysis.core_interpretation) {
    updated.core_interpretation = analysis.core_interpretation;
  }

  // --- Conversation State Snapshot ---
  if (analysis.user_focus) updated.user_focus = analysis.user_focus;
  if (typeof analysis.emotion_intensity === 'number') {
    updated.emotion_intensity = Math.round(Math.min(1, Math.max(0, analysis.emotion_intensity)) * 10) / 10;
  }
  if (typeof analysis.action_capacity === 'number') {
    updated.action_capacity = Math.round(Math.min(1, Math.max(0, analysis.action_capacity)) * 10) / 10;
  }
  if (typeof analysis.frustration_with_exploration === 'boolean') {
    updated.frustration_with_exploration = analysis.frustration_with_exploration;
  }
  if (analysis.conversation_progress) updated.conversation_progress = analysis.conversation_progress;
  if (analysis.next_goal) updated.next_goal = analysis.next_goal;

  // --- Core need ---
  if (analysis.core_need && analysis.core_need !== session.core_need) {
    if (session.core_need) {
      updated.core_need_history = [...(session.core_need_history || []), session.core_need].slice(-5);
    }
    updated.core_need = analysis.core_need;
  }

  // --- Topic ---
  if (analysis.topic) {
    updated.topic = analysis.topic;
  }

  // --- Insight ---
  if (analysis.key_insight) {
    updated.insights = [...(session.insights || []), {
      text: analysis.key_insight,
      primary_need: updated.primary_need,
      created_at: new Date().toISOString()
    }].slice(-20);
  }

  // --- Understanding ---
  if (analysis.understanding) {
    const currentCompleteness = { ...(session.info_completeness || {}) };
    let changed = false;
    for (const dim of INFO_DIMENSIONS) {
      if (typeof analysis.understanding[dim] === 'number') {
        const newVal = Math.round(Math.min(1, Math.max(0, analysis.understanding[dim])) * 10) / 10;
        if (newVal > (currentCompleteness[dim] || 0)) {
          currentCompleteness[dim] = newVal;
          changed = true;
        }
      }
    }
    if (changed) {
      updated.info_completeness = currentCompleteness;
      const scores = Object.values(currentCompleteness).filter(v => typeof v === 'number');
      updated.understanding_score = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10
        : 0;
    }
  }

  // --- Slow mode ---
  if (typeof analysis.slow_mode === 'boolean') {
    updated.slow_mode = analysis.slow_mode;
  }

  // --- Meaningful exchanges ---
  let meaningfulIncrement = 0;
  if (analysis.user_self_awareness === true) {
    meaningfulIncrement += 1;
  }
  if (meaningfulIncrement > 0) {
    updated.meaningful_exchanges = (session.meaningful_exchanges || 0) + meaningfulIncrement;
  }

  // --- Legacy fields ---
  updated.turns_in_state = (session.turns_in_state || 0) + 1;
  updated.total_turns = (session.total_turns || 0) + 1;
  updated.check_count = (session.check_count || 0) + 1;
  updated.last_activity_at = new Date().toISOString();

  return updated;
}

// ============================================================
// 成长摘要（保留 v4 逻辑）
// ============================================================
const GROWTH_SUMMARY_THRESHOLD = {
  minMeaningfulExchanges: 5,
  minUnderstandingScore: 0.7,
  requiredDimensions: ['event', 'emotion', 'deep_feeling', 'unfulfilled_need']
};

function shouldGenerateGrowthSummary(session) {
  if ((session.meaningful_exchanges || 0) < GROWTH_SUMMARY_THRESHOLD.minMeaningfulExchanges) return false;
  if ((session.understanding_score || 0) < GROWTH_SUMMARY_THRESHOLD.minUnderstandingScore) return false;

  const completeness = session.info_completeness || {};
  for (const dim of GROWTH_SUMMARY_THRESHOLD.requiredDimensions) {
    if (!completeness[dim] || completeness[dim] < 0.5) return false;
  }

  if (Array.isArray(session.insights) && session.insights.length > 0) return true;
  return false;
}

function buildGrowthSummaryPrompt(session, recentMessages) {
  const insights = Array.isArray(session.insights) ? session.insights : [];
  const history = Array.isArray(recentMessages) ? recentMessages : [];

  return {
    messages: [
      {
        role: 'system',
        content: [
          '你是一个成长记录生成器。根据一组对话，生成结构化成长记录。',
          '重点关注用户自己表达出的觉察，而不是AI的分析。',
          '输出JSON格式：',
          '{',
          '  "title": "简短的标题（10字以内）",',
          '  "summary": "一段成长记录（80-150字），以第三人称叙述：事件→情绪→核心冲突→用户模式→本次觉察",',
          '  "event": "触发事件简述",',
          '  "emotion": "核心情绪",',
          '  "core_conflict": "核心冲突",',
          '  "user_pattern": "用户的行为或认知模式（必须是用户自己呈现的，不是AI分析的）",',
          '  "growth": "本次的觉察或成长（必须是用户自己说出的，或是明确的转折）",',
          '  "action_step": "用户自己提出的行动尝试（如有，否则为null）",',
          '  "action_outcome": "用户报告的结果（如有，否则为null）"',
          '}',
          '重要：如果用户没有自己说出任何觉察或成长，growth 字段设为"本次对话主要在探索阶段，尚未形成明确的成长觉察"。',
          '只记录用户自己说出的行动，不记录 AI 的建议。',
          '不做诊断，不做评价，只记录观察到的事实。'
        ].join('\n')
      },
      {
        role: 'user',
        content: [
          `对话主题：${session.topic || '未明确主题'}`,
          `核心需求：${session.core_need || '未明确'}`,
          `主导需求：${session.primary_need || '未明确'}`,
          `对话轮数：${session.total_turns}`,
          '',
          '对话记录：',
          ...history.slice(-8).map(m => `${m.role}: ${m.content}`),
          '',
          '洞察记录：',
          insights.length > 0 ? insights.map(i => `- ${i.text}`).join('\n') : '暂无',
          '',
          '请生成结构化成长记录：'
        ].join('\n')
      }
    ],
    temperature: 0.3,
    maxTokens: 500
  };
}

function parseGrowthSummary(rawContent) {
  try {
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawContent;
    return JSON.parse(jsonStr.trim());
  } catch {
    return null;
  }
}

// ============================================================
// 开场白 prompt
// ============================================================
function buildOpeningPrompt({ mbtiType, communicationStyle, sessionState }) {
  const styleKey = STYLE_LABELS[communicationStyle] || 'reflection_first';
  const strategy = STYLE_STRATEGIES[styleKey] || STYLE_STRATEGIES.reflection_first;

  return {
    messages: [
      {
        role: 'system',
        content: [
          `用户 MBTI: ${mbtiType || '未知'}，沟通风格: ${communicationStyle || 'Companion'}（${strategy.label}）。`,
          '写一段简短、自然的开场白（2-3句）。',
          '传递一种感觉：这是一场可以慢慢聊的对话。',
          '不要太长，不要列点，不要使用任何心理学术语。',
          '不要使用 "我在这里稳稳地接住你"、"我会陪着你"、"有我在" 这类表述。'
        ].join('\n')
      },
      {
        role: 'user',
        content: '请写一段开场白。'
      }
    ],
    temperature: 0.7,
    maxTokens: 200
  };
}

// ============================================================
// 导出
// ============================================================
module.exports = {
  // v5 新架构
  NEED_TYPES,
  PRIMARY_NEEDS,
  PRIMARY_NEED_LABELS,
  estimateNeeds,
  determinePrimaryNeed,

  // 核心接口
  createInitialSessionState,
  buildDialogueSystemPrompt,
  buildStateAnalysisPrompt,
  parseStateAnalysis,
  applyStateAnalysis,

  // 成长摘要
  shouldGenerateGrowthSummary,
  buildGrowthSummaryPrompt,
  parseGrowthSummary,
  buildOpeningPrompt,

  // 慢模式
  detectSlowMode,
  buildSlowModeInstruction,
  buildCheckUnderstandingInstruction,

  // 会话管理
  shouldResetSession,
  resetSessionForNewTopic,
  calculateTextSimilarity,

  // 向后兼容（v4）
  DIALOGUE_STATES,
  PRIMARY_NEED_TO_STATE,
  migrateStateName,
  STYLE_LABELS,
  STYLE_STRATEGIES,
  INFO_DIMENSIONS,
  INFO_LABELS,
  EXPLORATION_RULES
};
