# EchoMind MVP Memory Layer

This is the minimum viable memory design for a private beta with fewer than 10 users.

## Tables

- `user_profiles`: one row per user, storing MBTI, communication style, style description, and optional cognitive stack/test answers.
- `chat_messages`: raw user/assistant messages with lightweight `topic_tag` and `emotion_tag` text fields.
- `conversation_summaries`: short summaries for recent conversation chunks. Use this instead of injecting full chat logs into every AI call.
- `user_memories`: long-term memories worth preserving, with `memory_type` and `importance` for future retrieval.
- `growth_records`: optional product-facing growth cards for the personal homepage.

## Anonymous Users

The SQL supports `anonymous_user_id`, but for safety the RLS policies only allow authenticated users to access rows where `auth.uid() = user_id`.

For no-login experiments, generate an anonymous UUID in the browser and send it to your own backend. The backend can write rows with `anonymous_user_id` using `SUPABASE_SERVICE_ROLE_KEY`. Do not expose the service role key to the browser.

## Example Prompt Shape

```text
系统角色：你是 AI 情绪成长教练。

用户画像：
- MBTI：INFP
- 沟通风格：共情型
- 风格说明：用户更需要先被理解和情绪支持，再进入分析或行动。

当前标签：
- 主题：拖延
- 情绪：焦虑

相关历史摘要：
1. [拖延/焦虑] 用户提到面对重要任务时会反复自责，越焦虑越难开始。
2. [学业工作压力/低落] 用户在工作压力下容易把一次失败理解成自我否定。

长期记忆：
1. (pain_point, importance 4) 用户在面对重要任务时容易拖延，并伴随自我否定倾向。
2. (preference, importance 3) 用户更能接受温和、非命令式的行动建议。

当前用户输入：
我知道该做，但就是一直拖着，越拖越觉得自己很差。

回复规则：
1. 先接住情绪，再引导。
2. 根据沟通风格调整表达方式。
3. 不要一上来讲大道理。
4. 不做医疗诊断。
5. 如果用户处于高风险状态，应建议寻求现实帮助或专业支持。
```

## Runtime Flow

1. Save the user message in `chat_messages`.
2. Load `user_profiles` for MBTI and communication style.
3. Classify `topic_tag` and `emotion_tag`.
4. Load the latest three matching rows from `conversation_summaries`.
5. Load important rows from `user_memories`.
6. Build the model prompt.
7. Call the model.
8. Save the assistant reply in `chat_messages`.
9. Generate and save a short row in `conversation_summaries`.
10. Save a row in `user_memories` only when the information is stable and useful later.

## Cost Control

For early private beta, do not summarize every single short message. A practical starting rule is:

- Save every raw message.
- Summarize after every meaningful assistant reply, or every 4-6 messages.
- Save long-term memories only when the user reveals a stable preference, repeated pain point, important relationship context, goal, or visible growth shift.