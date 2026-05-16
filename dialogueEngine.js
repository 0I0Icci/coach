// EchoMind 成长引导型对话引擎
// 提供对话状态管理、核心需求跟踪、信息完整度评估、风格策略适配

const DIALOGUE_STATES = {
  EMOTION_INTAKE: 'emotion_intake',
  SOURCE_EXPLORATION: 'source_exploration',
  PATTERN_REFLECTION: 'pattern_reflection',
  ACTION_INTEGRATION: 'action_integration'
};

const STATE_LABELS = {
  emotion_intake: '情绪接收',
  source_exploration: '来源探索',
  pattern_reflection: '模式觉察',
  action_integration: '行动与整合'
};

const STYLE_LABELS = {
  'Emotion-first': 'emotion_first',
  'Logic-first': 'understanding_first',
  'Action-first': 'solution_first',
  Companion: 'reflection_first'
};

// 每种沟通风格的推进策略
const STYLE_STRATEGIES = {
  emotion_first: {
    label: '共情型',
    description: '需要先被理解，不喜欢太快分析。慢进入分析，更关注感受，更多安全感建立。',
    stateTransitions: {
      emotion_intake: { minTurns: 2, baseWeight: 1.0 },
      source_exploration: { minTurns: 3, baseWeight: 0.8 },
      pattern_reflection: { minTurns: 2, baseWeight: 0.6 },
      action_integration: { minTurns: 1, baseWeight: 0.5 }
    },
    thresholdModifier: 0.12,
    styleInstruction: '用户是共情型：多停留情绪接收阶段，确认情绪被充分接住后再推进。分析时保持温和，多用感受性语言。'
  },
  understanding_first: {
    label: '分析型',
    description: '想知道为什么，希望理解问题结构。更快进入原因分析，更强调逻辑与模式，多做归纳和澄清。',
    stateTransitions: {
      emotion_intake: { minTurns: 1, baseWeight: 0.6 },
      source_exploration: { minTurns: 2, baseWeight: 1.0 },
      pattern_reflection: { minTurns: 2, baseWeight: 1.0 },
      action_integration: { minTurns: 1, baseWeight: 0.7 }
    },
    thresholdModifier: -0.05,
    styleInstruction: '用户是分析型：可以较快进入原因分析，帮用户厘清因果关系和逻辑结构。归纳和澄清对此类用户特别有效。'
  },
  solution_first: {
    label: '行动型',
    description: '希望快速恢复掌控感。不长时间停留情绪，聚焦阻碍与下一步，输出可执行动作。',
    stateTransitions: {
      emotion_intake: { minTurns: 1, baseWeight: 0.5 },
      source_exploration: { minTurns: 2, baseWeight: 0.6 },
      pattern_reflection: { minTurns: 1, baseWeight: 0.5 },
      action_integration: { minTurns: 2, baseWeight: 1.0 }
    },
    thresholdModifier: -0.08,
    styleInstruction: '用户是行动型：不要长时间停留在情绪阶段。快速识别阻碍，给出具体、简洁、有行动感的回应。'
  },
  reflection_first: {
    label: '探索型',
    description: '希望通过对话更理解自己。深入长期模式，深入认知与价值观，强调成长与觉察。',
    stateTransitions: {
      emotion_intake: { minTurns: 2, baseWeight: 0.8 },
      source_exploration: { minTurns: 2, baseWeight: 0.8 },
      pattern_reflection: { minTurns: 3, baseWeight: 1.0 },
      action_integration: { minTurns: 1, baseWeight: 0.5 }
    },
    thresholdModifier: 0.03,
    styleInstruction: '用户是探索型：适合深入模式和价值观层面的探讨。帮助用户连接过去的经验，发现自己的认知习惯和成长线索。'
  }
};

// 各阶段的系统指令
const STATE_INSTRUCTIONS = {
  emotion_intake: [
    '当前阶段：情绪接收',
    '目标：接住情绪，建立安全感。不急着分析，不急着解决问题。',
    '行为：共情、鼓励表达、用轻微的提问帮助用户展开感受。',
    '禁止：直接讲道理、立刻给解决方案、跳过情绪做分析。',
    '判断可以推进的信号：用户情绪有所平复，或开始主动叙述具体事件。'
  ].join('\n'),

  source_exploration: [
    '当前阶段：来源探索',
    '目标：理解具体发生了什么，触发点是什么，为什么会产生这种感受。',
    '行为：温和提问、澄清细节、探索深层原因。',
    '问题方向参考：',
    '- "最刺痛你的是什么？"',
    '- "你觉得真正让你难受的是哪部分？"',
    '- "这件事对你来说意味着什么？"',
    '注意：如果没有完全理解事件和原因，不要跳到分析或建议。'
  ].join('\n'),

  pattern_reflection: [
    '当前阶段：模式觉察',
    '目标：发现重复模式，分析认知习惯，连接过去的类似经历。',
    '行为：引导觉察，帮助用户看见自己的思维或行为模式。',
    '问题方向参考：',
    '- "这种感觉以前也出现过吗？"',
    '- "你会不会很容易把外界评价等同于自我价值？"',
    '- "这和你之前遇到的那件事，有没有相似之处？"',
    '注意：避免变成抽象讨论，始终锚定在用户的具体经验上。不要强行解读。'
  ].join('\n'),

  action_integration: [
    '当前阶段：行动与整合',
    '目标：区分是需要处理情绪（需要被理解/接纳）还是需要解决现实问题（需要行动），帮助用户形成自己的理解或下一步。',
    '行为：分析、总结、引导用户找到自己的答案。',
    '如果是情绪问题：帮助用户重新理解自己的反应，而不是消除情绪。',
    '如果是现实问题：帮用户看见可操作的、微小的一步，但不给标准答案。',
    '注意：此阶段仍以用户自己的答案为主。不给标准答案，不建议"你应该"。'
  ].join('\n')
};

// 信息完整度维度
const INFO_DIMENSIONS = ['event', 'emotion', 'reason', 'goal', 'constraints'];
const INFO_LABELS = {
  event: '发生了什么',
  emotion: '用户感受',
  reason: '为什么会刺痛',
  goal: '用户想解决什么',
  constraints: '现实限制'
};

// 判断是否需要生成成长摘要的阈值
const GROWTH_SUMMARY_THRESHOLD = {
  minTurns: 6,
  minUnderstandingScore: 0.5,
  requiredDimensions: ['event', 'emotion']
};

function generateId() {
  const crypto = require('crypto');
  return crypto.randomUUID();
}

function createInitialSessionState({ style = 'Companion', mbtiType = '' } = {}) {
  const styleKey = STYLE_LABELS[style] || 'reflection_first';
  return {
    session_id: generateId(),
    state: DIALOGUE_STATES.EMOTION_INTAKE,
    previous_state: null,
    turns_in_state: 0,
    total_turns: 0,
    style,
    style_key: styleKey,
    mbti_type: mbtiType,
    core_need: null,
    core_need_history: [],
    understanding_score: 0,
    info_completeness: {
      event: 0,
      emotion: 0,
      reason: 0,
      goal: 0,
      constraints: 0
    },
    topic: null,
    insights: [],
    started_at: new Date().toISOString(),
    last_activity_at: new Date().toISOString()
  };
}

// 信息完整度描述文本（用于注入 system prompt）
function buildUnderstandingDescription(session) {
  const score = session.understanding_score || 0;
  const completeness = session.info_completeness || {};

  const lines = [
    `当前理解程度：${Math.round(score * 100)}%`,
    '信息完整度：',
    ...INFO_DIMENSIONS.map(dim => {
      const level = completeness[dim] || 0;
      const bar = level < 0.3 ? '较低' : level < 0.7 ? '部分' : '充分';
      return `- ${INFO_LABELS[dim]}: ${bar} (${Math.round(level * 100)}%)`;
    })
  ];

  if (score < 0.5) {
    lines.push('');
    lines.push('注意：理解程度不足，应继续探索，避免过早给出分析或建议。');
  } else if (score < 0.7) {
    lines.push('');
    lines.push('注意：已有一定理解，可尝试温和地引导模式觉察，但还不适合进入行动建议。');
  } else {
    lines.push('');
    lines.push('注意：理解程度较好，可以推进到更深层次的模式觉察或行动整合。');
  }

  return lines.join('\n');
}

// 核心需求描述文本
function buildCoreNeedDescription(session) {
  if (!session.core_need) {
    return '尚未识别核心需求。当前任务是帮助用户从情绪逐步深入到核心议题。';
  }
  const history = session.core_need_history || [];
  const context = history.length > 1
    ? `需求演变：${history.join(' → ')}`
    : '';
  return [
    `核心需求：${session.core_need}`,
    context,
    '注意：围绕核心需求推进，不被表面话题带跑。如果用户发散，温和地引回核心。'
  ].filter(Boolean).join('\n');
}

// 构建完整的对话系统指令（用于 system prompt）
function buildDialogueSystemPrompt({
  mbtiType,
  communicationStyle,
  cognitiveStack,
  memoryContext,
  sessionState
}) {
  const styleKey = STYLE_LABELS[communicationStyle] || 'reflection_first';
  const strategy = STYLE_STRATEGIES[styleKey] || STYLE_STRATEGIES.reflection_first;
  const stackText = Array.isArray(cognitiveStack) && cognitiveStack.length
    ? cognitiveStack.join(' > ')
    : '未提供';

  const parts = [
    '你是 EchoMind 的 AI 成长伙伴，用中文回复。',
    '你的目标不是立刻解决用户情绪，而是帮助用户更理解自己。',
    '',
    '=== 核心原则 ===',
    '1. 理解情绪来源：不只回应当下情绪，而是帮用户看见情绪从何而来。',
    '2. 分析事件与认知模式：区分"这件事本身"和"我怎么看待这件事"。',
    '3. 区分情绪问题和现实问题：情绪需要被理解，现实问题需要行动。',
    '4. 推动自我理解：每一轮对话都让用户对自己多一分认识。',
    '5. 不做医学诊断，不宣称自己是治疗师。',
    '6. 如果用户出现明显自伤、自杀或他伤风险，鼓励用户立即联系当地紧急支持或专业帮助。',
    '',
    '=== 用户背景 ===',
    `MBTI 参考：${mbtiType || '未提供'}（风格参考，不刻板化）`,
    `八维认知功能排序：${stackText}`,
    `沟通偏好：${communicationStyle || 'Companion'}`,
    '',
    '=== 当前对话阶段 ===',
    STATE_INSTRUCTIONS[sessionState.state] || STATE_INSTRUCTIONS.emotion_intake,
    '',
    '=== 核心需求 ===',
    buildCoreNeedDescription(sessionState),
    '',
    '=== 理解程度 ===',
    buildUnderstandingDescription(sessionState),
    '',
    '=== 风格策略 ===',
    strategy.styleInstruction,
    '',
    '=== 语言边界 ===',
    '不要使用治疗师式的承诺语言。绝对不要说"我在这里稳稳地接住你"、"我会陪着你"、"有我在"、"你可以完全信任我"这类表述。',
    '你是成长伙伴，不是治疗师，也不是亲密朋友。保持温和但有边界的伙伴感。',
    '不要宣称自己能"治愈"或"修复"用户。',
    ''
  ];

  if (memoryContext) {
    parts.push('=== 长期上下文 ===');
    parts.push(memoryContext);
    parts.push('');
  }

  parts.push('=== 回答规范 ===');
  parts.push('字数灵活：情绪接收阶段可短（50-100字），模式觉察和行动整合可长（200-600字），整体不超过800字。');
  parts.push('语言温和但有力量，不敷衍不机械。');
  parts.push('不要让用户感觉在被流程化。对话要自然，像一次有深度的交流。');
  parts.push('不要使用未闭合的 markdown 粗体、编号或列表；不要在句子中途结束。');
  parts.push('完整比详细更重要；如果空间不够，宁可少说，也必须自然结束。');

  return parts.join('\n');
}

// 构建状态分析 prompt（用于后台分析对话）
function buildStateAnalysisPrompt({
  currentState,
  style,
  coreNeed,
  userMessage,
  aiReply,
  topic
}) {
  const dimensions = INFO_DIMENSIONS.map(d => `"${d}"`).join(', ');

  return {
    messages: [
      {
        role: 'system',
        content: [
          '你是一个对话分析师。分析以下用户和AI的对话片段，输出JSON。',
          '字段说明：',
          '- next_state: 对话应进入的下一阶段。可选值: "emotion_intake", "source_exploration", "pattern_reflection", "action_integration"。如果当前阶段合适则保持当前阶段。',
          '- should_transition: boolean，是否建议推进到下一阶段。',
          '- core_need: 用一句中文概括用户的核心需求/核心议题。如果尚未清晰则为null。',
          '- understanding: 对每个维度的理解程度，0-1之间。' + dimensions,
          '- topic: 对话主题，简洁的名词短语。如果尚未明确则为null。',
          '- key_insight: 这次对话中揭示的关于用户的新洞察（如有），否则为null。',
          '- growing_readiness: 0-1，用户对深入探索的接受程度。',
          '',
          '输出格式：必须是严格合法的JSON对象，不能包含注释。',
          '示例：{"next_state":"source_exploration","should_transition":false,"core_need":"如何面对被否定后的自我怀疑","understanding":{"event":0.8,"emotion":0.9,"reason":0.5,"goal":0.3,"constraints":0.1},"topic":"导师否定带来的自我怀疑","key_insight":"用户真正害怕的不是批评本身，而是不被认可","growing_readiness":0.6}'
        ].join('\n')
      },
      {
        role: 'user',
        content: [
          `当前阶段：${currentState}`,
          `沟通风格：${style}`,
          `当前核心需求：${coreNeed || '尚未识别'}`,
          `当前主题：${topic || '尚未明确'}`,
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

// 解析 AI 返回的状态分析 JSON
function parseStateAnalysis(rawContent) {
  try {
    // 尝试提取 JSON（AI 可能在 markdown 代码块中返回）
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawContent;
    return JSON.parse(jsonStr.trim());
  } catch {
    return null;
  }
}

// 应用状态分析结果到当前 session
function applyStateAnalysis(session, analysis) {
  if (!analysis) return session;

  const updated = { ...session };

  // 状态转换
  if (analysis.next_state && analysis.should_transition) {
    const validStates = Object.values(DIALOGUE_STATES);
    if (validStates.includes(analysis.next_state) && analysis.next_state !== session.state) {
      updated.previous_state = session.state;
      updated.state = analysis.next_state;
      updated.turns_in_state = 0;
    }
  }

  // 核心需求
  if (analysis.core_need && analysis.core_need !== session.core_need) {
    if (session.core_need) {
      updated.core_need_history = [...(session.core_need_history || []), session.core_need].slice(-5);
    }
    updated.core_need = analysis.core_need;
  }

  // 理解程度
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
      const scores = Object.values(currentCompleteness);
      updated.understanding_score = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length * 10) / 10;
    }
  }

  // 主题
  if (analysis.topic) {
    updated.topic = analysis.topic;
  }

  // 洞察
  if (analysis.key_insight) {
    updated.insights = [...(session.insights || []), {
      text: analysis.key_insight,
      state: session.state,
      created_at: new Date().toISOString()
    }].slice(-20);
  }

  updated.turns_in_state = (session.turns_in_state || 0) + 1;
  updated.total_turns = (session.total_turns || 0) + 1;
  updated.last_activity_at = new Date().toISOString();

  return updated;
}

// 判断当前 session 是否应该生成成长摘要
function shouldGenerateGrowthSummary(session) {
  if ((session.total_turns || 0) < GROWTH_SUMMARY_THRESHOLD.minTurns) return false;
  if ((session.understanding_score || 0) < GROWTH_SUMMARY_THRESHOLD.minUnderstandingScore) return false;

  // 检查基本信息维度
  const completeness = session.info_completeness || {};
  for (const dim of GROWTH_SUMMARY_THRESHOLD.requiredDimensions) {
    if (!completeness[dim] || completeness[dim] < 0.3) return false;
  }

  // 有洞察记录时更有价值
  if (Array.isArray(session.insights) && session.insights.length > 0) return true;

  // 达到行动整合阶段
  if (session.state === DIALOGUE_STATES.ACTION_INTEGRATION) return true;

  // 总轮数较多且有核心需求
  if ((session.total_turns || 0) >= 10 && session.core_need) return true;

  return false;
}

// 构建成长摘要生成 prompt
function buildGrowthSummaryPrompt(session, recentMessages) {
  const insights = Array.isArray(session.insights) ? session.insights : [];
  const history = Array.isArray(recentMessages) ? recentMessages : [];

  return {
    messages: [
      {
        role: 'system',
        content: [
          '你是一个成长记录生成器。根据一组对话和洞察，生成结构化成长记录。',
          '输出JSON格式：',
          '{',
          '  "title": "简短的标题（10字以内）",',
          '  "summary": "一段有深度的成长记录（80-150字），以第三人称叙述：事件→情绪→核心冲突→用户模式→本次觉察/成长",',
          '  "event": "触发事件简述",',
          '  "emotion": "核心情绪",',
          '  "core_conflict": "核心冲突是什么",',
          '  "user_pattern": "用户的行为或认知模式",',
          '  "growth": "本次的觉察或成长"',
          '}',
          '不做诊断，不做评价，只记录观察到的事实和成长。'
        ].join('\n')
      },
      {
        role: 'user',
        content: [
          `对话主题：${session.topic || '未明确主题'}`,
          `核心需求：${session.core_need || '未明确'}`,
          `对话阶段：${session.state}（前一阶段：${session.previous_state || '无'}）`,
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

// 解析成长摘要 JSON
function parseGrowthSummary(rawContent) {
  try {
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawContent;
    return JSON.parse(jsonStr.trim());
  } catch {
    return null;
  }
}

// 构建开场白的 prompt
function buildOpeningPrompt({ mbtiType, communicationStyle, sessionState }) {
  const styleKey = STYLE_LABELS[communicationStyle] || 'reflection_first';
  const strategy = STYLE_STRATEGIES[styleKey] || STYLE_STRATEGIES.reflection_first;

  return {
    messages: [
      {
        role: 'system',
        content: [
          `用户 MBTI: ${mbtiType || '未知'}，沟通风格: ${communicationStyle || 'Companion'}（${strategy.label}）。`,
          '请根据这个用户的人格类型和沟通偏好，写一段简短、自然的开场白（2-3句）。',
          '先简单欢迎，再传递一种感觉：这是一场可以深入聊的对话。',
          '不要使用治疗师式的承诺语言。不要太长，不要列点。',
          '不要使用 "我在这里稳稳地接住你"、"我会陪着你"、"有我在" 这类表述。',
          strategy.styleInstruction
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

module.exports = {
  DIALOGUE_STATES,
  STATE_LABELS,
  STYLE_LABELS,
  STYLE_STRATEGIES,
  INFO_DIMENSIONS,
  INFO_LABELS,
  createInitialSessionState,
  buildDialogueSystemPrompt,
  buildStateAnalysisPrompt,
  parseStateAnalysis,
  applyStateAnalysis,
  shouldGenerateGrowthSummary,
  buildGrowthSummaryPrompt,
  parseGrowthSummary,
  buildOpeningPrompt
};
