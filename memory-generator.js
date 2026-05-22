// EchoMind 记忆生成模块
// 职责：对话结束或满足条件时，生成结构化成长记录 + 认知摘要

// ============================================================
// 1. 成长记录卡片生成
// ============================================================

/**
 * 构建成长记录生成的 prompt
 * @param {Object} session 当前 session 状态
 * @param {Array} messages 最近对话消息 [{role, content}]
 * @param {Object} options
 * @param {string} options.existingSummary 已有的 cognitive_summary（如有）
 * @returns {Object} { messages, temperature, maxTokens }
 */
function buildGrowthRecordPrompt(session, messages, { existingSummary } = {}) {
  const history = Array.isArray(messages) ? messages : [];
  const insights = Array.isArray(session.insights) ? session.insights : [];

  return {
    messages: [
      {
        role: 'system',
        content: [
          '你是一个成长记录分析师。根据对话内容，生成结构化的成长记录卡片。',
          '',
          '核心关注：用户从 A 状态变化到了 B 状态。',
          '',
          '输出 JSON 格式：',
          '{',
          '  "title": "简短标题（10字以内，概括核心变化）",',
          '  "change_from": "用户进入对话前的初始状态/认知/情绪",',
          '  "change_to": "用户在对话中达到的新状态/认知/情绪",',
          '  "conclusion": "核心结论——用户通过这次对话理解或意识到了什么（80字以内）",',
          '  "action_measures": ["可操作行动1", "可操作行动2"],',
          '  "signals": {',
          '    "event": "触发事件简述",',
          '    "emotion": "核心情绪",',
          '    "coreConflict": "核心冲突",',
          '    "userPattern": "用户的行为或认知模式（必须是用户自身呈现的）",',
          '    "growth": "本次的觉察或成长（必须是用户自己说出的）"',
          '  }',
          '}',
          '',
          '规则：',
          '- change_from / change_to 必须具体，不能泛泛（如"焦虑→平静"不够，要写"担心自己不够好→意识到是系统竞争激烈"）',
          '- action_measures 必须是具体的、可执行的行动，且基于对话中浮现的需求（1-2条）',
          '- 如果用户没有明确表达行动意愿，action_measures 设为空数组',
          '- 如果用户没有自己说出觉察，growth 字段设为 null',
          '- 不做诊断，不做评价，只记录观察到的事实',
          '- 输出严格合法的 JSON，不能包含注释',
        ].join('\n')
      },
      {
        role: 'user',
        content: [
          `对话主题：${session.topic || '未明确主题'}`,
          `核心需求：${session.core_need || '未明确'}`,
          `主导需求：${session.primary_need || '未明确'}`,
          `对话轮数：${session.total_turns || 0}`,
          existingSummary ? `现有认知摘要：${existingSummary}` : '',
          '',
          '对话记录：',
          ...history.slice(-10).map(m => `${m.role}: ${m.content}`),
          '',
          '已记录的洞察：',
          insights.length > 0 ? insights.map(i => `- ${i.text}`).join('\n') : '暂无',
          '',
          '请生成成长记录卡片 JSON：',
        ].join('\n')
      }
    ],
    temperature: 0.2,
    maxTokens: 600
  };
}

/**
 * 解析成长记录 JSON
 */
function parseGrowthRecord(rawContent) {
  try {
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawContent;
    const parsed = JSON.parse(jsonStr.trim());
    return {
      title: parsed.title || '一次新的成长记录',
      changeFrom: parsed.change_from || '',
      changeTo: parsed.change_to || '',
      conclusion: parsed.conclusion || '',
      actionMeasures: Array.isArray(parsed.action_measures) ? parsed.action_measures : [],
      signals: parsed.signals || {}
    };
  } catch {
    return null;
  }
}

// ============================================================
// 2. 认知摘要生成（聚合多条成长记录）
// ============================================================

/**
 * 构建认知摘要生成的 prompt
 * @param {Array} records 已有成长记录列表
 * @param {Object} userProfile 用户画像
 * @param {string} userProfile.mbti_type
 * @param {string} userProfile.communication_style
 * @returns {Object} { messages, temperature, maxTokens }
 */
function buildCognitiveSummaryPrompt(records = [], userProfile = {}) {
  return {
    messages: [
      {
        role: 'system',
        content: [
          '你是一个认知模式分析师。根据用户的成长记录，生成一份结构化的认知摘要。',
          '',
          '输出 JSON 格式：',
          '{',
          '  "thinking_habits": ["用户的思维习惯列表，每条10字以内"],',
          '  "recurring_themes": ["反复出现的主题/卡点，每条10字以内"],',
          '  "emotional_patterns": "用户常见的情绪反应模式（20字以内）",',
          '  "cognitive_progress": "用户认知上的整体进展描述（40字以内）",',
          '  "recent_focus": "近期最核心的成长方向（20字以内）",',
          '  "suggested_approach": "根据认知模式建议的对话方式（30字以内）"',
          '}',
          '',
          '规则：',
          '- 只基于成长记录中用户自己呈现的模式，不臆测',
          '- thinking_habits 和 recurring_themes 各最多 3 条',
          '- 不做诊断，不贴病理标签',
        ].join('\n')
      },
      {
        role: 'user',
        content: [
          `MBTI：${userProfile.mbti_type || '未知'}`,
          `沟通风格：${userProfile.communication_style || '未知'}`,
          '',
          '已有成长记录：',
          records.length > 0
            ? records.map((r, i) =>
                `记录 ${i + 1}：\n标题：${r.title}\n从：${r.changeFrom || '未记录'}\n到：${r.changeTo || '未记录'}\n结论：${r.conclusion || '未记录'}\n行动措施：${Array.isArray(r.actionMeasures) ? r.actionMeasures.join('; ') : '无'}\n`
              ).join('\n')
            : '暂无成长记录',
          '',
          '请生成认知摘要 JSON：',
        ].join('\n')
      }
    ],
    temperature: 0.2,
    maxTokens: 400
  };
}

/**
 * 解析认知摘要 JSON
 */
function parseCognitiveSummary(rawContent) {
  try {
    const jsonMatch = rawContent.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : rawContent;
    return JSON.parse(jsonStr.trim());
  } catch {
    return null;
  }
}

// ============================================================
// 3. 使用条件判断
// ============================================================

/**
 * 判断是否应该生成成长记录
 * 条件：对话有足够深度，或 session 完成/用户切换话题
 */
function shouldGenerateMemoryRecord(session = {}, sessionCompleted = false) {
  const totalTurns = session.total_turns || 0;
  const meaningfulExchanges = session.meaningful_exchanges || 0;
  const understandingScore = session.understanding_score || 0;
  const hasInsights = Array.isArray(session.insights) && session.insights.length > 0;

  // session 完成时强制生成
  if (sessionCompleted) return true;

  // 有足够深度且有洞察
  if (totalTurns >= 4 && meaningfulExchanges >= 2 && understandingScore >= 0.5 && hasInsights) {
    return true;
  }

  return false;
}

/**
 * 判断是否应该更新认知摘要
 * 条件：新增了足够的成长记录
 */
function shouldUpdateCognitiveSummary(existingRecordCount = 0, newRecordCount = 0) {
  // 首次有记录，或每增加 3 条新记录时更新
  if (existingRecordCount === 0 && newRecordCount > 0) return true;
  if (newRecordCount >= 3) return true;
  return false;
}

module.exports = {
  buildGrowthRecordPrompt,
  parseGrowthRecord,
  buildCognitiveSummaryPrompt,
  parseCognitiveSummary,
  shouldGenerateMemoryRecord,
  shouldUpdateCognitiveSummary
};
