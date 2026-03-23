# AI 功能架构设计

## 📋 功能概述

### 核心功能
1. **AI 助记句子生成**：使用 AI 为单词生成助记句子
2. **AI 音标生成**：使用 AI 为单词生成音标
3. **AI TTS 读音**：使用 AI 为单词生成读音
4. **API 密钥管理**：用户自行配置 AI API 密钥
5. **Token 监控**：监控 token 余额，不足时提醒

### 设计原则
- ✅ AI 生成的内容可以被用户编辑
- ✅ 用户自行提供 API 密钥
- ✅ 软件不提供充值方式
- ✅ 联网功能

---

## 🏗️ 技术架构

### 后端架构

```
server/src/
├── routes/
│   └── ai.ts                 # AI 相关路由
├── services/
│   ├── aiService.ts          # AI 服务（调用 AI API）
│   ├── ttsService.ts         # TTS 服务（文字转语音）
│   └── tokenMonitor.ts       # Token 监控服务
└── types/
    └── ai.ts                 # AI 相关类型定义
```

---

### 前端架构

```
client/
├── screens/
│   └── ai-settings/          # AI 设置页面
│       ├── index.tsx
│       └── styles.ts
├── components/
│   ├── AIButton.tsx          # AI 生成按钮组件
│   └── TokenWarning.tsx      # Token 不足提醒组件
└── hooks/
    └── useAI.ts              # AI 功能 Hook
```

---

## 📊 数据库设计

### 新增表：ai_settings（AI 配置）

```sql
CREATE TABLE ai_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,           -- AI 提供商：'openai', 'anthropic', 'deepseek', 'custom'
  api_key TEXT NOT NULL,            -- API 密钥（加密存储）
  api_base_url TEXT,                -- API 基础 URL（自定义 API）
  model TEXT NOT NULL,              -- 模型名称
  is_active INTEGER DEFAULT 1,      -- 是否激活
  created_at TEXT NOT NULL,         -- 创建时间
  updated_at TEXT NOT NULL          -- 更新时间
);
```

### 新增表：ai_usage（AI 使用记录）

```sql
CREATE TABLE ai_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  setting_id INTEGER NOT NULL,      -- 关联 ai_settings
  feature TEXT NOT NULL,            -- 功能类型：'mnemonic', 'phonetic', 'tts'
  word TEXT NOT NULL,               -- 单词
  tokens_used INTEGER,              -- 使用的 token 数
  cost REAL,                        -- 费用（如果有）
  created_at TEXT NOT NULL,         -- 创建时间
  FOREIGN KEY (setting_id) REFERENCES ai_settings(id)
);
```

---

## 🔌 API 接口设计

### 1. AI 配置管理

#### GET /api/v1/ai/settings
获取 AI 配置列表

**响应：**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "provider": "openai",
      "model": "gpt-3.5-turbo",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

#### POST /api/v1/ai/settings
创建/更新 AI 配置

**请求：**
```json
{
  "provider": "openai",
  "apiKey": "sk-...",
  "apiBaseUrl": "https://api.openai.com/v1",
  "model": "gpt-3.5-turbo"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "provider": "openai",
    "model": "gpt-3.5-turbo",
    "isActive": true
  }
}
```

---

#### POST /api/v1/ai/settings/test
测试 AI 配置是否有效

**请求：**
```json
{
  "provider": "openai",
  "apiKey": "sk-...",
  "model": "gpt-3.5-turbo"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "message": "API 密钥有效"
  }
}
```

---

### 2. AI 生成功能

#### POST /api/v1/ai/generate/mnemonic
生成助记句子

**请求：**
```json
{
  "word": "apple",
  "definition": "苹果",
  "split": "ap-ple",
  "phonetic": "/ˈæpl/"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "mnemonic": "一个苹果(ap)放在盘子(ple)里",
    "tokensUsed": 150
  }
}
```

---

#### POST /api/v1/ai/generate/phonetic
生成音标

**请求：**
```json
{
  "word": "apple"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "phonetic": "/ˈæpl/",
    "tokensUsed": 50
  }
}
```

---

#### POST /api/v1/ai/generate/tts
生成读音（返回音频文件）

**请求：**
```json
{
  "word": "apple",
  "phonetic": "/ˈæpl/"
}
```

**响应：**
```json
{
  "success": true,
  "data": {
    "audioUrl": "https://storage.example.com/audio/apple.mp3",
    "tokensUsed": 200
  }
}
```

---

### 3. Token 监控

#### GET /api/v1/ai/token/balance
获取 token 余额

**响应：**
```json
{
  "success": true,
  "data": {
    "balance": 50000,
    "used": 5000,
    "total": 55000,
    "warningLevel": "normal"  // "normal", "low", "critical"
  }
}
```

---

## 🤖 支持的 AI 提供商

### 1. OpenAI
- **模型**：gpt-3.5-turbo, gpt-4, gpt-4-turbo
- **API**：https://api.openai.com/v1
- **特点**：稳定可靠，功能强大

### 2. Anthropic Claude
- **模型**：claude-3-opus, claude-3-sonnet, claude-3-haiku
- **API**：https://api.anthropic.com/v1
- **特点**：上下文长，推理能力强

### 3. DeepSeek
- **模型**：deepseek-chat, deepseek-coder
- **API**：https://api.deepseek.com/v1
- **特点**：性价比高，中文友好

### 4. 自定义 API
- **支持**：任何兼容 OpenAI API 格式的服务
- **用途**：用户自己搭建的 AI 服务

---

## 🎨 前端界面设计

### AI 设置页面

```
┌─────────────────────────────────────┐
│  AI 设置                             │
├─────────────────────────────────────┤
│  当前配置                            │
│  ┌───────────────────────────────┐  │
│  │ 提供商: OpenAI                │  │
│  │ 模型: gpt-3.5-turbo           │  │
│  │ Token 余额: 50,000            │  │
│  │ [测试连接] [编辑] [删除]       │  │
│  └───────────────────────────────┘  │
│                                     │
│  添加新配置                          │
│  ┌───────────────────────────────┐  │
│  │ 提供商: [下拉选择]             │  │
│  │ API 密钥: [输入框]             │  │
│  │ API 地址: [输入框]             │  │
│  │ 模型: [下拉选择]               │  │
│  │                               │  │
│  │ [测试] [保存]                  │  │
│  └───────────────────────────────┘  │
│                                     │
│  使用记录                            │
│  ┌───────────────────────────────┐  │
│  │ 今日使用: 1,000 tokens        │  │
│  │ 本月使用: 15,000 tokens       │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

### 单词详情页（集成 AI）

```
┌─────────────────────────────────────┐
│  单词: apple                         │
├─────────────────────────────────────┤
│  音标: /ˈæpl/           [AI生成] 🎵  │
│                                     │
│  定义: 苹果                          │
│                                     │
│  拆分: ap-ple                        │
│                                     │
│  助记句:                             │
│  ┌───────────────────────────────┐  │
│  │ 一个苹果(ap)放在盘子(ple)里    │  │
│  │                               │  │
│  │ [AI生成] [编辑]               │  │
│  └───────────────────────────────┘  │
│                                     │
│  例句:                              │
│  ┌───────────────────────────────┐  │
│  │ I eat an apple every day.     │  │
│  │ 我每天吃一个苹果。              │  │
│  │                               │  │
│  │ [AI生成] [编辑] [播放读音]     │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

---

## ⚠️ Token 不足提醒

### 提醒级别

1. **正常 (normal)**：余额 > 10,000 tokens
2. **偏低 (low)**：余额 < 10,000 tokens
3. **严重不足 (critical)**：余额 < 1,000 tokens

### 提醒方式

```
┌─────────────────────────────────────┐
│  ⚠️ Token 余额不足                   │
├─────────────────────────────────────┤
│  您的 AI Token 余额已不足 1,000     │
│  请及时充值以继续使用 AI 功能        │
│                                     │
│  当前余额: 800 tokens               │
│                                     │
│  [查看 AI 设置] [稍后提醒]           │
└─────────────────────────────────────┘
```

---

## 🔒 安全性设计

### API 密钥加密存储

```typescript
// 使用 AES 加密存储 API 密钥
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'your-secret-key'; // 应该从环境变量获取

export function encryptApiKey(apiKey: string): string {
  return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY).toString();
}

export function decryptApiKey(encryptedKey: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}
```

---

### API 请求签名

```typescript
// 对 AI API 请求进行签名验证
export function signRequest(params: any): string {
  const timestamp = Date.now();
  const data = JSON.stringify({ ...params, timestamp });
  return CryptoJS.HmacSHA256(data, ENCRYPTION_KEY).toString();
}
```

---

## 📊 性能优化

### 1. 缓存策略

- AI 生成的助记句、音标缓存到本地数据库
- 相同单词不重复调用 AI
- 用户编辑后以用户编辑的内容为准

### 2. 请求优化

- 批量生成：一次性为多个单词生成内容
- 异步处理：后台生成，不阻塞用户操作
- 失败重试：网络错误自动重试 3 次

### 3. 成本控制

- 提示词优化：减少不必要的 token 消耗
- 模型选择：默认使用性价比高的模型
- 用户配额：限制每日调用次数

---

## 🚀 实施步骤

### 第 1 阶段：后端实现（1-2 天）
1. 创建 AI 服务和路由
2. 实现 API 密钥管理
3. 实现助记句、音标、TTS 生成
4. 实现 Token 监控

### 第 2 阶段：前端实现（2-3 天）
1. 创建 AI 设置页面
2. 修改单词详情页
3. 集成 AI 生成功能
4. 实现 TTS 播放

### 第 3 阶段：测试优化（1 天）
1. 功能测试
2. 性能优化
3. 错误处理
4. 用户体验优化

---

## 📝 提示词设计

### 助记句生成提示词

```
你是一个专业的英语单词记忆助手。请为以下单词生成一个助记句，帮助学习者记忆。

单词：{word}
音标：{phonetic}
定义：{definition}
拆分：{split}

要求：
1. 助记句要生动有趣，便于记忆
2. 尽量结合单词的拆分部分
3. 句子要简洁，不超过 50 个字
4. 可以使用谐音、联想、故事等方法
5. 用中文回答

请直接输出助记句，不需要其他说明。
```

---

### 音标生成提示词

```
请为以下英语单词生成音标。

单词：{word}

要求：
1. 使用国际音标格式，如 /ˈæpl/
2. 如果有多种发音，给出最常用的发音
3. 只输出音标，不需要其他说明

输出格式：
/音标/
```

---

## 💡 扩展功能（未来）

1. **AI 对话学习**：与 AI 进行英语对话练习
2. **AI 作文批改**：AI 批改英语作文
3. **AI 语法解释**：AI 解释语法知识
4. **多语言支持**：支持多种语言学习

---

*设计完成时间：2024*
