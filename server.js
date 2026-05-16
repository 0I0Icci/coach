const http = require("http");
const fs = require("fs");
const path = require("path");
const {
  getRelevantSummaries,
  getUserMemories,
  getUserProfile,
  saveChatMessage,
  saveConversationSummary,
  saveGrowthRecord,
} = require("./supabaseService");

const {
  createInitialSessionState,
  buildDialogueSystemPrompt,
  buildStateAnalysisPrompt,
  parseStateAnalysis,
  applyStateAnalysis,
  shouldGenerateGrowthSummary,
  buildGrowthSummaryPrompt,
  parseGrowthSummary,
  buildOpeningPrompt,
  DIALOGUE_STATES,
  detectSlowMode,
} = require("./dialogueEngine");

const projectRoot = __dirname;
const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
};

function loadDotEnv() {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }

  const raw = fs.readFileSync(envPath, "utf8");
  raw.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (key && !process.env[key]) {
      process.env[key] = value;
    }
  });
}

loadDotEnv();

const PORT = Number(process.env.PORT || 3000);
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const MAX_HISTORY_MESSAGES = 24;

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  response.end(JSON.stringify(payload));
}

function sanitizeHistory(history) {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
    .map((item) => ({
      role: item.role,
      content: item.content.trim(),
    }))
    .filter((item) => item.content)
    .slice(-MAX_HISTORY_MESSAGES);
}

function hasOwner({ user_id, anonymous_user_id }) {
  return Boolean(user_id || anonymous_user_id);
}

function hasDatabaseAccess() {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}

async function safeDatabaseCall(operation, fallback) {
  if (!hasDatabaseAccess()) {
    return fallback;
  }

  try {
    const { data, error } = await operation();
    if (error) {
      console.warn("Supabase operation skipped:", error.message || error);
      return fallback;
    }

    return data ?? fallback;
  } catch (error) {
    console.warn("Supabase operation failed:", error.message || error);
    return fallback;
  }
}

function classifyTopicAndEmotion(text) {
  const value = String(text || "").toLowerCase();
  const topic_tag = value.includes("朋友") || value.includes("关系") || value.includes("同事") || value.includes("家人")
    ? "人际关系"
    : value.includes("拖延") || value.includes("不想做") || value.includes("效率")
      ? "拖延"
      : value.includes("工作") || value.includes("学习") || value.includes("考试") || value.includes("领导")
        ? "学业工作压力"
        : value.includes("迷茫") || value.includes("不知道") || value.includes("未来")
          ? "迷茫"
          : "日常情绪";

  const emotion_tag = value.includes("焦虑") || value.includes("慌") || value.includes("紧张")
    ? "焦虑"
    : value.includes("生气") || value.includes("愤怒") || value.includes("烦")
      ? "生气"
      : value.includes("开心") || value.includes("高兴") || value.includes("满足")
        ? "开心"
        : value.includes("乱") || value.includes("混乱") || value.includes("卡住")
          ? "混乱"
          : value.includes("平静")
            ? "平静"
            : "低落";

  return { topic_tag, emotion_tag };
}

function buildMemoryContext({ profile, summaries, memories, topic_tag, emotion_tag }) {
  const summaryText = Array.isArray(summaries) && summaries.length
    ? summaries.map((item, index) => `${index + 1}. [${item.topic_tag || "未标记"}/${item.emotion_tag || "未标记"}] ${item.summary}`).join("\n")
    : "暂无相关历史摘要。";

  const memoryText = Array.isArray(memories) && memories.length
    ? memories.map((item, index) => `${index + 1}. (${item.memory_type}, importance ${item.importance}) ${item.memory}`).join("\n")
    : "暂无长期记忆。";

  const profileMbti = profile?.mbti || profile?.mbti_type || "未提供";
  const profileStyle = profile?.communication_style || "未提供";
  const profileDescription = profile?.communication_style_description || "暂无";

  return [
    "以下是用户的长期上下文，请只把它作为理解用户的参考，不要机械复述：",
    `用户画像：MBTI=${profileMbti}；沟通风格=${profileStyle}；风格说明=${profileDescription}`,
    `当前识别标签：主题=${topic_tag || "未识别"}；情绪=${emotion_tag || "未识别"}`,
    "相关历史摘要：",
    summaryText,
    "长期记忆：",
    memoryText,
  ].join("\n");
}

function buildMessages({ message, history, opening, systemPrompt, sessionState }) {
  if (opening) {
    const promptResult = buildOpeningPrompt({
      mbtiType: sessionState?.mbti_type || '',
      communicationStyle: sessionState?.style || 'Companion',
      sessionState,
    });
    return promptResult.messages;
  }

  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
  ];

  const safeHistory = sanitizeHistory(history);
  if (safeHistory.length > 0) {
    messages.push(...safeHistory);
    return messages;
  }

  messages.push({
    role: "user",
    content: message,
  });
  return messages;
}

function extractReply(data) {
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content === "string" && content.trim()) {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .filter((item) => item && typeof item.text === "string")
      .map((item) => item.text)
      .join("\n")
      .trim();
  }

  return "";
}

async function callDeepSeek(messages, { maxTokens = 1000, temperature = 0.7 } = {}) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DEEPSEEK_API_KEY is missing. Create a .env file from .env.example and fill in your key.");
  }

  const payload = {
    model: DEEPSEEK_MODEL,
    messages,
    max_tokens: maxTokens,
    temperature,
  };

  const response = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const apiMessage = data?.error?.message || "DeepSeek API request failed.";
    throw new Error(apiMessage);
  }

  const reply = extractReply(data);
  if (!reply) {
    throw new Error("The model response did not contain text output.");
  }

  return {
    reply,
    responseId: data.id,
    model: data.model,
  };
}

async function createDeepSeekResponse({ message, history, opening, systemPrompt, sessionState, maxTokens, temperature }) {
  const promptResult = buildMessages({ message, history, opening, systemPrompt, sessionState });
  return callDeepSeek(promptResult, {
    maxTokens: maxTokens || 1200,
    temperature: temperature || 0.7,
  });
}

function serveStaticFile(requestPath, response) {
  const safePath = requestPath === "/" ? "/index.html" : requestPath;
  const resolvedPath = path.join(projectRoot, safePath.replace(/^\/+/, ""));

  if (!resolvedPath.startsWith(projectRoot)) {
    json(response, 403, { error: "Forbidden" });
    return;
  }

  if (!fs.existsSync(resolvedPath) || fs.statSync(resolvedPath).isDirectory()) {
    json(response, 404, { error: "Not found" });
    return;
  }

  const extension = path.extname(resolvedPath);
  const contentType = mimeTypes[extension] || "application/octet-stream";
  response.writeHead(200, { "Content-Type": contentType });
  fs.createReadStream(resolvedPath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host}`);

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    response.end();
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/health") {
    json(response, 200, { ok: true, model: DEEPSEEK_MODEL });
    return;
  }

  if (request.method === "GET" && requestUrl.pathname === "/api/config") {
    json(response, 200, {
      supabase: {
        enabled: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
        url: SUPABASE_URL,
        anonKey: SUPABASE_ANON_KEY,
      },
    });
    return;
  }

  if (request.method === "POST" && requestUrl.pathname === "/api/chat") {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", async () => {
      try {
        const payload = JSON.parse(body || "{}");
        const {
          message = "",
          history = [],
          mbtiType = "",
          communicationStyle = "",
          cognitiveStack = [],
          opening = false,
          user_id = null,
          anonymous_user_id = null,
          topic_tag: providedTopic = null,
          emotion_tag: providedEmotion = null,
          session_state = null,
        } = payload;

        if (!opening && !String(message).trim()) {
          json(response, 400, { error: "Message is required." });
          return;
        }

        // --- 对话状态初始化 ---
        const safeStyle = communicationStyle || 'Companion';
        const safeMbti = mbtiType || '';

        // 如果有 session_state 则继续，否则创建新的
        const currentState = session_state && session_state.session_id
          ? { ...session_state }
          : createInitialSessionState({ style: safeStyle, mbtiType: safeMbti });

        // 如果是开场白，重置状态（新 session）
        const sessionState = opening
          ? createInitialSessionState({ style: safeStyle, mbtiType: safeMbti })
          : currentState;

        // 检测是否需要激活慢模式
        if (!opening && message && detectSlowMode(message)) {
          sessionState.slow_mode = true;
        }

        const owner = { user_id, anonymous_user_id };
        const canUseMemory = hasOwner(owner) && hasDatabaseAccess();
        const tags = opening
          ? { topic_tag: providedTopic, emotion_tag: providedEmotion }
          : classifyTopicAndEmotion(message);
        const topic_tag = providedTopic || tags.topic_tag;
        const emotion_tag = providedEmotion || tags.emotion_tag;

        // --- 保存用户消息 ---
        const userMessage = !opening && canUseMemory
          ? await safeDatabaseCall(() => saveChatMessage({
            ...owner,
            role: "user",
            content: String(message).trim(),
            topic_tag,
            emotion_tag,
            session_id: sessionState.session_id,
          }), null)
          : null;

        // --- 加载用户画像和记忆 ---
        const profile = canUseMemory
          ? await safeDatabaseCall(() => getUserProfile(owner), null)
          : null;
        const summaries = canUseMemory && topic_tag
          ? await safeDatabaseCall(() => getRelevantSummaries({ ...owner, topic_tag, limit: 3 }), [])
          : [];
        const memories = canUseMemory
          ? await safeDatabaseCall(() => getUserMemories({ ...owner, limit: 5 }), [])
          : [];
        const memoryContext = canUseMemory
          ? buildMemoryContext({ profile, summaries, memories, topic_tag, emotion_tag })
          : "";
        const resolvedMbtiType = profile?.mbti || profile?.mbti_type || safeMbti;
        const resolvedCommunicationStyle = profile?.communication_style || safeStyle;
        const resolvedCognitiveStack = Array.isArray(profile?.cognitive_stack) && profile.cognitive_stack.length
          ? profile.cognitive_stack
          : cognitiveStack;

        // --- 构建成长引导型系统指令 ---
        const systemPrompt = buildDialogueSystemPrompt({
          mbtiType: resolvedMbtiType,
          communicationStyle: resolvedCommunicationStyle,
          cognitiveStack: resolvedCognitiveStack,
          memoryContext,
          sessionState,
        });

        // --- 调用 AI ---
        const aiResult = await createDeepSeekResponse({
          message: String(message).trim(),
          history,
          opening,
          systemPrompt,
          sessionState,
        });

        // --- 保存 AI 回复 ---
        const assistantMessage = !opening && canUseMemory
          ? await safeDatabaseCall(() => saveChatMessage({
            ...owner,
            role: "assistant",
            content: aiResult.reply,
            topic_tag,
            emotion_tag,
            session_id: sessionState.session_id,
          }), null)
          : null;

        // 更新 session 轮数（同步部分，不等待分析）
        const returnedState = {
          ...sessionState,
          turns_in_state: (sessionState.turns_in_state || 0) + 1,
          total_turns: (sessionState.total_turns || 0) + 1,
          last_activity_at: new Date().toISOString(),
        };

        json(response, 200, {
          ...aiResult,
          topic_tag,
          emotion_tag,
          session_state: returnedState,
          stored: {
            userMessageId: userMessage?.id || null,
            assistantMessageId: assistantMessage?.id || null,
            summaryId: null,
          },
        });

        // --- 后台分析：状态评估 + 成长摘要（非阻塞）---
        if (!opening && canUseMemory && message.trim()) {
          (async () => {
            // 1. 状态分析
            const analysisPrompt = buildStateAnalysisPrompt({
              currentState: sessionState.state,
              style: resolvedCommunicationStyle,
              coreNeed: sessionState.core_need,
              userMessage: String(message).trim(),
              aiReply: aiResult.reply,
              topic: sessionState.topic,
            });

            try {
              const analysisResult = await callDeepSeek(analysisPrompt.messages, {
                maxTokens: analysisPrompt.maxTokens || 500,
                temperature: analysisPrompt.temperature || 0.1,
              });
              const analysis = parseStateAnalysis(analysisResult.reply);

              if (analysis) {
                const updated = applyStateAnalysis(sessionState, analysis);

                // 2. 检查是否需要生成成长摘要
                if (shouldGenerateGrowthSummary(updated)) {
                  try {
                    const growthPrompt = buildGrowthSummaryPrompt(updated, [
                      { role: 'user', content: String(message).trim() },
                      { role: 'assistant', content: aiResult.reply },
                    ]);
                    const growthResult = await callDeepSeek(growthPrompt.messages, {
                      maxTokens: growthPrompt.maxTokens || 500,
                      temperature: growthPrompt.temperature || 0.3,
                    });
                    const growth = parseGrowthSummary(growthResult.reply);

                    if (growth) {
                      // 保存成长记录到数据库
                      await safeDatabaseCall(() => saveGrowthRecord({
                        ...owner,
                        title: growth.title || '一次新的成长记录',
                        summary: growth.summary || '',
                        signals: {
                          event: growth.event,
                          emotion: growth.emotion,
                          coreConflict: growth.core_conflict,
                          userPattern: growth.user_pattern,
                          growth: growth.growth,
                          focusFunction: resolvedCognitiveStack?.[0] || null,
                          mbtiType: resolvedMbtiType,
                          communicationStyle: resolvedCommunicationStyle,
                          sessionId: sessionState.session_id,
                          topic: updated.topic,
                          coreNeed: updated.core_need,
                        },
                      }), null);

                      // 同时保存简短摘要用于历史上下文
                      await safeDatabaseCall(() => saveConversationSummary({
                        ...owner,
                        summary: growth.summary || '完成了新一轮成长对话。',
                        topic_tag,
                        emotion_tag,
                      }), null);
                    }
                  } catch (innerErr) {
                    console.warn("Growth summary generation skipped:", innerErr.message);
                  }
                }
              }
            } catch (analysisError) {
              console.warn("State analysis skipped:", analysisError.message || analysisError);
            }
          })();
        }
      } catch (error) {
        json(response, 500, { error: error.message || "Unexpected server error." });
      }
    });

    return;
  }

  if (request.method === "GET") {
    serveStaticFile(requestUrl.pathname, response);
    return;
  }

  json(response, 405, { error: "Method not allowed." });
});

server.listen(PORT, () => {
  console.log(`EchoMind server running at http://localhost:${PORT}`);
});
