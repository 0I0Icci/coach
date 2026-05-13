import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for backend memory helpers.");
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

function ownerFilter(query, userId) {
  return query.eq("user_id", userId);
}

export async function upsertUserProfile({
  user_id,
  mbti,
  communication_style,
  communication_style_description,
}) {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .upsert({
      user_id,
      mbti,
      communication_style,
      communication_style_description,
    }, { onConflict: "user_id" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveChatMessage({
  user_id,
  role,
  content,
  topic_tag = null,
  emotion_tag = null,
}) {
  const { data, error } = await supabaseAdmin
    .from("chat_messages")
    .insert({ user_id, role, content, topic_tag, emotion_tag })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function saveConversationSummary({
  user_id,
  summary,
  topic_tag = null,
  emotion_tag = null,
}) {
  const { data, error } = await supabaseAdmin
    .from("conversation_summaries")
    .insert({ user_id, summary, topic_tag, emotion_tag })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getRelevantSummaries({ user_id, topic_tag, limit = 3 }) {
  let query = supabaseAdmin
    .from("conversation_summaries")
    .select("summary, topic_tag, emotion_tag, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  query = ownerFilter(query, user_id);
  if (topic_tag) query = query.eq("topic_tag", topic_tag);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function saveUserMemory({
  user_id,
  memory,
  memory_type,
  importance = 3,
  source_message_id = null,
}) {
  const { data, error } = await supabaseAdmin
    .from("user_memories")
    .insert({ user_id, memory, memory_type, importance, source_message_id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getUserMemories({ user_id, memory_type = null, limit = 8 }) {
  let query = supabaseAdmin
    .from("user_memories")
    .select("id, memory, memory_type, importance, created_at")
    .order("importance", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  query = ownerFilter(query, user_id);
  if (memory_type) query = query.eq("memory_type", memory_type);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function getUserProfile(user_id) {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select("mbti, communication_style, communication_style_description")
    .eq("user_id", user_id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export function classifyTopicAndEmotion(userText) {
  const text = userText.toLowerCase();
  const topic_tag = text.includes("朋友") || text.includes("关系") || text.includes("同事")
    ? "人际关系"
    : text.includes("拖延") || text.includes("不想做")
      ? "拖延"
      : text.includes("工作") || text.includes("学习") || text.includes("考试")
        ? "学业工作压力"
        : text.includes("迷茫") || text.includes("不知道")
          ? "迷茫"
          : "日常情绪";

  const emotion_tag = text.includes("焦虑") || text.includes("慌")
    ? "焦虑"
    : text.includes("生气") || text.includes("愤怒")
      ? "生气"
      : text.includes("开心") || text.includes("高兴")
        ? "开心"
        : text.includes("乱") || text.includes("混乱")
          ? "混乱"
          : "低落";

  return { topic_tag, emotion_tag };
}

export function buildCoachPrompt({
  profile,
  summaries = [],
  memories = [],
  userInput,
  topic_tag,
  emotion_tag,
}) {
  const summaryText = summaries.length
    ? summaries.map((item, index) => `${index + 1}. [${item.topic_tag || "无主题"}/${item.emotion_tag || "无情绪"}] ${item.summary}`).join("\n")
    : "暂无相关历史摘要。";

  const memoryText = memories.length
    ? memories.map((item, index) => `${index + 1}. (${item.memory_type}, importance ${item.importance}) ${item.memory}`).join("\n")
    : "暂无长期记忆。";

  return [
    "系统角色：你是 AI 情绪成长教练。",
    "",
    "用户画像：",
    `- MBTI：${profile?.mbti || "未知"}`,
    `- 沟通风格：${profile?.communication_style || "未知"}`,
    `- 风格说明：${profile?.communication_style_description || "暂无"}`,
    "",
    "当前标签：",
    `- 主题：${topic_tag || "未识别"}`,
    `- 情绪：${emotion_tag || "未识别"}`,
    "",
    "相关历史摘要：",
    summaryText,
    "",
    "长期记忆：",
    memoryText,
    "",
    "当前用户输入：",
    userInput,
    "",
    "回复规则：",
    "1. 先接住情绪，再引导。",
    "2. 根据沟通风格调整表达方式。",
    "3. 不要一上来讲大道理。",
    "4. 不做医疗诊断。",
    "5. 如果用户处于高风险状态，应建议寻求现实帮助或专业支持。",
  ].join("\n");
}

export async function handleUserMessage({ user_id, userInput, callModel }) {
  const { topic_tag, emotion_tag } = classifyTopicAndEmotion(userInput);

  const userMessage = await saveChatMessage({
    user_id,
    role: "user",
    content: userInput,
    topic_tag,
    emotion_tag,
  });

  const profile = await getUserProfile(user_id);
  const summaries = await getRelevantSummaries({ user_id, topic_tag, limit: 3 });
  const memories = await getUserMemories({ user_id, limit: 8 });
  const prompt = buildCoachPrompt({ profile, summaries, memories, userInput, topic_tag, emotion_tag });

  const aiReply = await callModel(prompt);

  const assistantMessage = await saveChatMessage({
    user_id,
    role: "assistant",
    content: aiReply,
    topic_tag,
    emotion_tag,
  });

  const summary = `用户围绕“${topic_tag}”表达了${emotion_tag}相关体验，本轮对话提供了情绪承接和下一步整理。`;
  await saveConversationSummary({ user_id, summary, topic_tag, emotion_tag });

  if (emotion_tag === "焦虑" || topic_tag === "拖延") {
    await saveUserMemory({
      user_id,
      memory: `用户在“${topic_tag}”主题下容易出现${emotion_tag}，需要先被理解，再进入小步骤行动。`,
      memory_type: topic_tag === "拖延" ? "pain_point" : "growth",
      importance: 4,
      source_message_id: userMessage.id,
    });
  }

  return {
    reply: aiReply,
    userMessage,
    assistantMessage,
    prompt,
  };
}