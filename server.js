const http = require("http");
const fs = require("fs");
const path = require("path");

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
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-5-mini";

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

function extractOutputText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  if (!Array.isArray(data.output)) {
    return "";
  }

  return data.output
    .flatMap((item) => Array.isArray(item.content) ? item.content : [])
    .filter((item) => item.type === "output_text" && typeof item.text === "string")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

function buildInstructions({ mbtiType, communicationStyle }) {
  const toneRule = stylePromptMap[communicationStyle] || stylePromptMap.Companion;

  return [
    "你是 EchoMind 的 AI 情绪成长教练，用中文回复。",
    "目标是帮助用户理解自己的情绪、恢复一点稳定感，并找到温和可执行的下一步。",
    "不要做医学诊断，不要宣称自己是治疗师。",
    "如果用户出现明显自伤、自杀或他伤风险，鼓励用户立即联系当地紧急支持、可信任的人或专业帮助。",
    `用户当前 MBTI 参考：${mbtiType || "未提供"}。这只是风格参考，不要把用户刻板化。`,
    `用户沟通偏好：${communicationStyle || "Companion"}。${toneRule}`,
    "默认回答结构：先回应当下感受，再给一点点澄清，最后给一个轻量下一步。",
    "除非用户明确要求，不要一次给太多步骤。",
  ].join("\n");
}

async function createOpenAIResponse({ message, previousResponseId, mbtiType, communicationStyle, opening }) {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is missing. Create a .env file from .env.example and fill in your key.");
  }

  const userPrompt = opening
    ? "请根据这个用户的 MBTI 和沟通风格，用一句自然、温和、适合继续展开聊天的开场白欢迎他。不要太长，不要列点。"
    : message;

  const payload = {
    model: OPENAI_MODEL,
    instructions: buildInstructions({ mbtiType, communicationStyle }),
    input: [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: userPrompt,
          },
        ],
      },
    ],
    max_output_tokens: 500,
  };

  if (previousResponseId) {
    payload.previous_response_id = previousResponseId;
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    const apiMessage = data?.error?.message || "OpenAI API request failed.";
    throw new Error(apiMessage);
  }

  const reply = extractOutputText(data);
  if (!reply) {
    throw new Error("The model response did not contain text output.");
  }

  return {
    reply,
    responseId: data.id,
    model: data.model,
  };
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
    json(response, 200, { ok: true, model: OPENAI_MODEL });
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
        const { message = "", previousResponseId = "", mbtiType = "", communicationStyle = "", opening = false } = payload;

        if (!opening && !message.trim()) {
          json(response, 400, { error: "Message is required." });
          return;
        }

        const aiResult = await createOpenAIResponse({
          message: message.trim(),
          previousResponseId,
          mbtiType,
          communicationStyle,
          opening,
        });

        json(response, 200, aiResult);
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
