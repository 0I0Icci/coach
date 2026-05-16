const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

let supabaseAdmin = null;

function getSupabaseAdmin() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required on the backend.");
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdmin;
}

function normalizeError(error) {
  if (!error) {
    return null;
  }

  return {
    message: error.message || "Unknown Supabase error.",
    code: error.code || null,
    details: error.details || null,
    hint: error.hint || null,
  };
}

function result(data, error = null) {
  return {
    data,
    error: normalizeError(error),
  };
}

function requireOwner({ user_id, anonymous_user_id }) {
  if (!user_id && !anonymous_user_id) {
    throw new Error("Either user_id or anonymous_user_id is required.");
  }
}

function applyOwnerFilter(query, { user_id, anonymous_user_id }) {
  if (user_id) {
    return query.eq("user_id", user_id);
  }

  return query.eq("anonymous_user_id", anonymous_user_id);
}

function ownerPayload({ user_id, anonymous_user_id }) {
  return {
    user_id: user_id || null,
    anonymous_user_id: anonymous_user_id || null,
  };
}

function clampLimit(limit, fallback, max) {
  const numericLimit = Number(limit);

  if (!Number.isFinite(numericLimit) || numericLimit <= 0) {
    return fallback;
  }

  return Math.min(Math.floor(numericLimit), max);
}

async function upsertUserProfile({
  user_id = null,
  anonymous_user_id = null,
  mbti = null,
  communication_style = null,
  communication_style_description = null,
} = {}) {
  try {
    requireOwner({ user_id, anonymous_user_id });

    const supabase = getSupabaseAdmin();
    const profilePayload = {
      ...ownerPayload({ user_id, anonymous_user_id }),
      mbti,
      mbti_type: mbti,
      communication_style,
      communication_style_description,
      updated_at: new Date().toISOString(),
    };

    const existingQuery = supabase
      .from("user_profiles")
      .select("id")
      .limit(1)
      .maybeSingle();

    const { data: existingProfile, error: findError } = await applyOwnerFilter(existingQuery, {
      user_id,
      anonymous_user_id,
    });

    if (findError) {
      return result(null, findError);
    }

    if (existingProfile?.id) {
      const { data, error } = await supabase
        .from("user_profiles")
        .update(profilePayload)
        .eq("id", existingProfile.id)
        .select()
        .single();

      return result(data, error);
    }

    const { data, error } = await supabase
      .from("user_profiles")
      .insert(profilePayload)
      .select()
      .single();

    return result(data, error);
  } catch (error) {
    return result(null, error);
  }
}

async function saveChatMessage({
  user_id = null,
  anonymous_user_id = null,
  role,
  content,
  topic_tag = null,
  emotion_tag = null,
} = {}) {
  try {
    requireOwner({ user_id, anonymous_user_id });

    if (!["user", "assistant"].includes(role)) {
      throw new Error("role must be either 'user' or 'assistant'.");
    }

    if (!content || !String(content).trim()) {
      throw new Error("content is required.");
    }

    const { data, error } = await getSupabaseAdmin()
      .from("chat_messages")
      .insert({
        ...ownerPayload({ user_id, anonymous_user_id }),
        role,
        content: String(content).trim(),
        topic_tag,
        emotion_tag,
      })
      .select()
      .single();

    return result(data, error);
  } catch (error) {
    return result(null, error);
  }
}

async function saveConversationSummary({
  user_id = null,
  anonymous_user_id = null,
  summary,
  topic_tag = null,
  emotion_tag = null,
} = {}) {
  try {
    requireOwner({ user_id, anonymous_user_id });

    if (!summary || !String(summary).trim()) {
      throw new Error("summary is required.");
    }

    const { data, error } = await getSupabaseAdmin()
      .from("conversation_summaries")
      .insert({
        ...ownerPayload({ user_id, anonymous_user_id }),
        summary: String(summary).trim(),
        topic_tag,
        emotion_tag,
      })
      .select()
      .single();

    return result(data, error);
  } catch (error) {
    return result(null, error);
  }
}

async function saveGrowthRecord({
  user_id = null,
  anonymous_user_id = null,
  title,
  summary,
  signals = {},
} = {}) {
  try {
    requireOwner({ user_id, anonymous_user_id });

    if (!title || !String(title).trim()) {
      throw new Error("title is required.");
    }

    const { data, error } = await getSupabaseAdmin()
      .from("growth_records")
      .insert({
        ...ownerPayload({ user_id, anonymous_user_id }),
        session_id: signals.sessionId || null,
        title: String(title).trim(),
        summary: summary ? String(summary).trim() : '',
        signals,
      })
      .select()
      .single();

    return result(data, error);
  } catch (error) {
    return result(null, error);
  }
}

async function saveSession({
  user_id = null,
  anonymous_user_id = null,
  session_id,
  state,
  style = 'Companion',
  topic = null,
  core_need = null,
  understanding_score = 0,
  info_completeness = {},
  total_turns = 0,
  insights = [],
  is_completed = false,
} = {}) {
  try {
    requireOwner({ user_id, anonymous_user_id });

    if (!session_id) {
      throw new Error("session_id is required.");
    }

    const { data, error } = await getSupabaseAdmin()
      .from("conversation_sessions")
      .upsert({
        ...ownerPayload({ user_id, anonymous_user_id }),
        session_id,
        state,
        style,
        topic,
        core_need,
        understanding_score,
        info_completeness,
        total_turns,
        insights,
        is_completed,
        completed_at: is_completed ? new Date().toISOString() : null,
        last_activity_at: new Date().toISOString(),
      }, { onConflict: 'user_id,session_id', ignoreDuplicates: false })
      .select()
      .single();

    return result(data, error);
  } catch (error) {
    return result(null, error);
  }
}

async function getSession({
  user_id = null,
  anonymous_user_id = null,
  session_id,
} = {}) {
  try {
    requireOwner({ user_id, anonymous_user_id });

    if (!session_id) {
      throw new Error("session_id is required.");
    }

    let query = getSupabaseAdmin()
      .from("conversation_sessions")
      .select("session_id, state, style, topic, core_need, understanding_score, info_completeness, total_turns, insights, is_completed, started_at, last_activity_at")
      .eq("session_id", session_id)
      .limit(1)
      .maybeSingle();

    query = applyOwnerFilter(query, { user_id, anonymous_user_id });

    const { data, error } = await query;
    return result(data, error);
  } catch (error) {
    return result(null, error);
  }
}

async function getRelevantSummaries({
  user_id = null,
  anonymous_user_id = null,
  topic_tag = null,
  limit = 3,
} = {}) {
  try {
    requireOwner({ user_id, anonymous_user_id });

    let query = getSupabaseAdmin()
      .from("conversation_summaries")
      .select("id, summary, topic_tag, emotion_tag, created_at")
      .order("created_at", { ascending: false })
      .limit(clampLimit(limit, 3, 20));

    query = applyOwnerFilter(query, { user_id, anonymous_user_id });

    if (topic_tag) {
      query = query.eq("topic_tag", topic_tag);
    }

    const { data, error } = await query;
    return result(data || [], error);
  } catch (error) {
    return result(null, error);
  }
}

async function saveUserMemory({
  user_id = null,
  anonymous_user_id = null,
  memory,
  memory_type,
  importance = 3,
  source_message_id = null,
} = {}) {
  try {
    requireOwner({ user_id, anonymous_user_id });

    const allowedTypes = ["preference", "pain_point", "relationship", "goal", "growth"];
    if (!allowedTypes.includes(memory_type)) {
      throw new Error(`memory_type must be one of: ${allowedTypes.join(", ")}.`);
    }

    if (!memory || !String(memory).trim()) {
      throw new Error("memory is required.");
    }

    const safeImportance = Math.min(Math.max(Number(importance) || 3, 1), 5);
    const { data, error } = await getSupabaseAdmin()
      .from("user_memories")
      .insert({
        ...ownerPayload({ user_id, anonymous_user_id }),
        memory: String(memory).trim(),
        memory_type,
        importance: safeImportance,
        source_message_id: source_message_id ? String(source_message_id) : null,
      })
      .select()
      .single();

    return result(data, error);
  } catch (error) {
    return result(null, error);
  }
}

async function getUserMemories({
  user_id = null,
  anonymous_user_id = null,
  memory_type = null,
  limit = 5,
} = {}) {
  try {
    requireOwner({ user_id, anonymous_user_id });

    let query = getSupabaseAdmin()
      .from("user_memories")
      .select("id, memory, memory_type, importance, source_message_id, created_at, updated_at")
      .order("importance", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(clampLimit(limit, 5, 50));

    query = applyOwnerFilter(query, { user_id, anonymous_user_id });

    if (memory_type) {
      query = query.eq("memory_type", memory_type);
    }

    const { data, error } = await query;
    return result(data || [], error);
  } catch (error) {
    return result(null, error);
  }
}

async function getUserProfile({
  user_id = null,
  anonymous_user_id = null,
} = {}) {
  try {
    requireOwner({ user_id, anonymous_user_id });

    let query = getSupabaseAdmin()
      .from("user_profiles")
      .select("id, mbti, mbti_type, communication_style, communication_style_description, cognitive_stack, test_answers, created_at, updated_at")
      .limit(1)
      .maybeSingle();

    query = applyOwnerFilter(query, { user_id, anonymous_user_id });

    const { data, error } = await query;
    return result(data, error);
  } catch (error) {
    return result(null, error);
  }
}

module.exports = {
  upsertUserProfile,
  saveChatMessage,
  saveConversationSummary,
  saveGrowthRecord,
  saveSession,
  getSession,
  getRelevantSummaries,
  saveUserMemory,
  getUserMemories,
  getUserProfile,
};
