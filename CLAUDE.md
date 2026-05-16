# EchoMind

AI 情绪成长教练 MVP。目标是为用户提供个性化情绪理解、稳定支持和成长记录。

## 核心体验路径

1. 用户登录（Supabase Magic Link）
2. 选择或测试 MBTI
3. 完成沟通风格测试（12 题）
4. 进入 AI 情绪聊天
5. AI 根据用户画像和历史记忆生成回复
6. 系统保存聊天、摘要和成长记录
7. 用户可在个人页查看成长辅助信息

## 技术栈

- **前端**: 原生 HTML/CSS/JS，GitHub Pages 托管
- **后端**: Node.js 原生 http server，Render 部署
- **AI**: DeepSeek API
- **数据库/登录**: Supabase Auth + PostgreSQL + JS SDK

## 项目目录

```
D:\Projects\EchoMind
├── index.html           # 单页应用结构
├── styles.css           # 低对比蓝色、疗愈风格
├── app.js               # 前端 SPA 状态切换、登录、MBTI、测试、聊天、个人页
├── server.js            # 后端入口 /health, /api/config, /api/chat
├── supabaseService.js   # 后端 Supabase 数据读写
├── package.json
├── render.yaml
├── .env.example
├── supabase/
│   └── schema.sql       # 建表和 RLS 策略
└── docs/
    ├── memory-helpers.js
    └── memory-layer.md
```

## 当前后端接口

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /health | 健康检查 |
| GET | /api/config | 返回 Supabase 公钥配置 |
| POST | /api/chat | 核心 AI 聊天 |

## AI 回复策略 (server.js)

- 100-600 中文字符
- 完整比详细更重要，不可在句子/标记中途结束
- 默认结构：接住情绪 → 简短澄清 → 一个轻量下一步
- 不做医疗诊断
- Supabase 保存失败不中断 AI 回复
- 摘要生成后台执行，不阻塞回复

## 沟通风格映射

| 类型 | 标签 | AI 策略 |
|------|------|---------|
| Emotion-first | 共情型 | 优先共情和接纳感受 |
| Logic-first | 分析型 | 厘清逻辑关系和关键矛盾 |
| Action-first | 行动型 | 给出具体行动建议 |
| Companion | 陪伴型 | 低压力陪伴感 |

## Supabase 表

- `user_profiles` — 用户画像（MBTI、沟通风格、八维排序）
- `chat_messages` — 聊天记录
- `conversation_summaries` — 对话摘要
- `user_memories` — 长期记忆（preference/pain_point/relationship/goal/growth）
- `growth_records` — 成长记录

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
