# EchoMind

AI 情绪成长教练 MVP。目标是为用户提供个性化情绪理解、稳定支持和成长记录。

## 核心体验路径

1. 用户登录（Supabase Magic Link）
2. 选择或测试 MBTI
3. 完成沟通风格测试（12 题）
4. 进入 AI 情绪聊天
5. AI 根据用户画像、对话状态和核心需求生成回复
6. 系统保存聊天、状态分析和成长记录
7. 用户可在个人页查看成长辅助信息

## 技术栈

- **前端**: 原生 HTML/CSS/JS，GitHub Pages 托管
- **后端**: Node.js 原生 http server，Render 部署
- **AI**: DeepSeek API
- **数据库/登录**: Supabase Auth + PostgreSQL + JS SDK

## 项目目录

```
D:\Projects\EchoMind
├── index.html               # 单页应用结构
├── styles.css               # 低对比蓝色、疗愈风格
├── app.js                   # 前端 SPA 状态切换、登录、MBTI、测试、聊天、个人页
├── server.js                # 后端入口 /health, /api/config, /api/chat
├── dialogueEngine.js         # 成长引导型对话引擎（核心新增）
├── supabaseService.js       # 后端 Supabase 数据读写
├── package.json
├── render.yaml
├── .env.example
├── supabase/
│   └── schema.sql           # 建表和 RLS 策略
└── docs/
    ├── memory-helpers.js
    └── memory-layer.md
```

## 成长引导型对话系统

### 核心架构

```
用户输入 → 判断对话状态 → 提取核心需求 → 评估理解程度 → 选择阶段策略 → 生成回复
```

### 对话状态（Conversation State）

每个 session 维护一个状态机，分四个阶段推进：

| 状态 | 阶段名称 | AI 行为 | 禁止行为 |
|------|----------|---------|----------|
| `emotion_intake` | 情绪接收 | 共情、鼓励表达、轻微提问 | 讲道理、给解决方案 |
| `source_exploration` | 来源探索 | 提问、澄清、探索事件和触发点 | 未理解就跳到分析 |
| `pattern_reflection` | 模式觉察 | 引导觉察、连接模式和历史 | 强行解读、抽象讨论 |
| `action_integration` | 行动与整合 | 分析、总结、引导用户自己的答案 | 给标准答案、"你应该" |

### 核心需求跟踪（Core Need）

持续维护 `core_need`，所有回复围绕核心需求推进，不被表面话题带跑。

### 信息完整度（Understanding Score）

五个维度的 0-1 评分：
- `event` — 发生了什么
- `emotion` — 用户感受
- `reason` — 为什么会刺痛
- `goal` — 用户想解决什么
- `constraints` — 现实限制

低于 0.5 时 AI 禁止给出建议。

### 沟通风格即策略

| 类型 | 标签 | 策略特点 |
|------|------|----------|
| `Emotion-first` | 共情型 | 慢进入分析，多停留情绪阶段 |
| `Logic-first` | 分析型 | 更快原因分析，强调逻辑结构 |
| `Action-first` | 行动型 | 快速到行动，聚焦可操作步骤 |
| Companion | 陪伴型 | 重命名为 `reflection_first`，深入模式和价值观 |

### Session 管理

- 按主题形成 session，非每轮独立
- session 包含多条消息，以主题推进
- session 结束或阶段转换时生成结构化成长摘要

### API 变更

`POST /api/chat` 新增请求/响应字段：

**请求新增：**
- `session_state` — 当前对话状态对象（前端维护、轮询带回）

**响应新增：**
- `session_state` — 更新后的对话状态（含 `state`, `core_need`, `understanding_score` 等）

### 状态分析流程

1. 主请求：AI 根据当前状态和系统 prompt 生成回复（不阻塞）
2. 后台分析：用轻量 AI 调用分析对话，输出 JSON 包含：
   - `next_state` / `should_transition` — 状态转换建议
   - `core_need` — 核心需求更新
   - `understanding` — 各维度理解程度
   - `topic` — 对话主题
   - `key_insight` — 新洞察
3. 达到阈值时自动生成结构化成长记录并保存

## 当前后端接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /health | 健康检查 |
| GET | /api/config | 返回 Supabase 公钥配置 |
| POST | /api/chat | 核心 AI 聊天（含对话状态） |

## AI 回复策略（dialogueEngine.js / server.js）

- 回复长度根据阶段灵活调整：情绪接收 50-100 字，模式觉察/行动整合 200-600 字
- 完整比详细更重要，不可在句子/标记中途结束
- 结构根据状态自动适配：接住情绪 → 探索来源 → 觉察模式 → 整合行动
- 不做医疗诊断
- 状态分析/成长摘要后台执行，不阻塞回复

## Supabase 表

- `user_profiles` — 用户画像（MBTI、沟通风格、八维排序）
- `conversation_sessions` — 对话 session 管理（状态、核心需求、理解程度）
- `chat_messages` — 聊天记录（含 `session_id`）
- `conversation_summaries` — 对话摘要
- `user_memories` — 长期记忆（preference/pain_point/relationship/goal/growth）
- `growth_records` — 成长记录（含结构化 signals）

## 开发约定

- 基于现有代码修改，不要从头重写
- 保持极简、疗愈、低对比蓝色视觉风格
- 代码优先稳定可用，不追求复杂架构
- 不引入 React/Vite/Next.js（除非用户明确要求）
- 功能做好后默认提交并推送 GitHub main
- 影响数据库或用户数据的修改需先说明风险
- Git: `git add <files>` → `git commit -m "msg"` → `git push origin main`

## 重要注意事项

- SUPABASE_SERVICE_ROLE_KEY 只能存在于 Render 环境变量和后端，前端不能暴露
- 中文 prompt 文件确保 UTF-8 保存，避免乱码
- mbti / mbti_type 两个字段兼容保留，不可贸然删除
- session_state 由前端维护、逐轮带回，后端不做持久化（MVP 阶段）
