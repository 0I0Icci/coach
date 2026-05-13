const http = require("http");
const fs = require("fs");
const path = require("path");
const {
  getRelevantSummaries,
  getUserMemories,
  getUserProfile,
  saveChatMessage,
  saveConversationSummary,
} = require("./supabaseService");

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

const stylePromptMap = {
  "Emotion-first": "优先共情和接纳感受，再帮助用户慢慢梳理。避免过度讲道理。",
  "Logic-first": "优先帮助用户厘清发生了什么、逻辑关系和关键矛盾。语气清晰但不过度冷淡。",
  "Action-first": "优先帮助用户看见可以采取的下一步。回答要具体、简洁、有行动感。",
  Companion: "优先提供陪伴感和低压力交流，不逼迫用户立刻分析或行动。",
};

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  response.end(JSON.stringify(payload));
}

function buildInstructions({ mbtiType, communicationStyle, cognitiveStack }) {
  const toneRule = stylePromptMap[communicationStyle] || stylePromptMap.Companion;
  const stackText = Array.isArray(cognitiveStack) && cognitiveStack.length ? cognitiveStack.join(" > ") : "未提供";

  return [
    "你是 EchoMind 的 AI 情绪成长教练，用中文回复。",
    "目标是帮助用户理解自己的情绪、恢复一点稳定感，并找到温和可执行的下一步。",
    "不要做医学诊断，不要宣称自己是治疗师。",
    "如果用户出现明显自伤、自杀或他伤风险，鼓励用户立即联系当地紧急支持、可信任的人或专业帮助。",
    `用户当前 MBTI 参考：${mbtiType || "未提供"}。这只是风格参考，不要把用户刻板化。`,
    `用户八维认知功能排序：${stackText}。请根据主导/辅助/第三/劣势功能差异调整分析方式和行动建议。`,
    `用户沟通偏好：${communicationStyle || "Companion"}。${toneRule}`,
    "默认回答结构：先回应当下感受，再给一点点澄清，最后给一个轻量下一步。",
    "除非用户明确要求，不要一次给太多步骤。",
    "回复必须完整收束，不要在句子、编号或 markdown 标记中途结束。",
  ].join("\n");
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

function buildMessages({ message, history, opening, mbtiType, communicationStyle, cognitiveStack, memoryContext }) {
  const messages = [
    {
      role: "system",
      content: buildInstructions({ mbtiType, communicationStyle, cognitiveStack }),
    },
  ];

  if (memoryContext) {
    messages.push({
      role: "system",
      content: memoryContext,
    });
  }

  if (opening) {
    messages.push({
      role: "user",
      content: "请根据这个用户的 MBTI 和沟通风格，用一句自然、温和、适合继续展开聊天的开场白欢迎他。不要太长，不要列点。",
    });
    return messages;
  }

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

async function createDeepSeekResponse({ message, history, mbtiType, communicationStyle, cognitiveStack, opening, memoryContext }) {
  return callDeepSeek(
    buildMessages({ message, history, opening, mbtiType, communicationStyle, cognitiveStack, memoryContext }),
    { maxTokens: 1000, temperature: 0.7 },
  );
}

async function createConversationSummary({ message, reply, topic_tag, emotion_tag }) {
  const summaryResult = await callDeepSeek(
    [
      {
        role: "system",
        content: "你是对话摘要助手。请用中文输出一句不超过80字的成长记录摘要，只总结事实、情绪和下一步线索，不做诊断。",
      },
      {
        role: "user",
        content: [
          `主题标签：${topic_tag || "未识别"}`,
          `情绪标签：${emotion_tag || "未识别"}`,
          `用户输入：${message}`,
          `AI回复：${reply}`,
        ].join("\n"),
      },
    ],
    { maxTokens: 160, temperature: 0.2 },
  );

  return summaryResult.reply;
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
        } = payload;

        if (!opening && !String(message).trim()) {
          json(response, 400, { error: "Message is required." });
          return;
        }

        const owner = { user_id, anonymous_user_id };
        const canUseMemory = hasOwner(owner) && hasDatabaseAccess();
        const tags = opening
          ? { topic_tag: providedTopic, emotion_tag: providedEmotion }
          : classifyTopicAndEmotion(message);
        const topic_tag = providedTopic || tags.topic_tag;
        const emotion_tag = providedEmotion || tags.emotion_tag;

        const userMessage = !opening && canUseMemory
          ? await safeDatabaseCall(() => saveChatMessage({
            ...owner,
            role: "user",
            content: String(message).trim(),
            topic_tag,
            emotion_tag,
          }), null)
          : null;

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
        const resolvedMbtiType = profile?.mbti || profile?.mbti_type || mbtiType;
        const resolvedCommunicationStyle = profile?.communication_style || communicationStyle;
        const resolvedCognitiveStack = Array.isArray(profile?.cognitive_stack) && profile.cognitive_stack.length
          ? profile.cognitive_stack
          : cognitiveStack;

        const aiResult = await createDeepSeekResponse({
          message: String(message).trim(),
          history,
          mbtiType: resolvedMbtiType,
          communicationStyle: resolvedCommunicationStyle,
          cognitiveStack: resolvedCognitiveStack,
          opening,
          memoryContext,
        });

        const assistantMessage = !opening && canUseMemory
          ? await safeDatabaseCall(() => saveChatMessage({
            ...owner,
            role: "assistant",
            content: aiResult.reply,
            topic_tag,
            emotion_tag,
          }), null)
          : null;

        json(response, 200, {
          ...aiResult,
          topic_tag,
          emotion_tag,
          stored: {
            userMessageId: userMessage?.id || null,
            assistantMessageId: assistantMessage?.id || null,
            summaryId: null,
          },
        });

        if (!opening && canUseMemory) {
          createConversationSummary({
            message: String(message).trim(),
            reply: aiResult.reply,
            topic_tag,
            emotion_tag,
          })
            .then((summary) => safeDatabaseCall(() => saveConversationSummary({
              ...owner,
              summary,
              topic_tag,
              emotion_tag,
            }), null))
            .catch((summaryError) => {
              console.warn("Conversation summary skipped:", summaryError.message || summaryError);
            });
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
