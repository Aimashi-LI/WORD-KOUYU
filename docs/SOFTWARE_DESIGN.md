# 编码记忆法 - 软件设计文档

## 📋 文档信息

- **项目名称**：编码记忆法
- **文档版本**：1.0.0
- **创建日期**：2026年2月
- **技术栈**：Expo 54 + React Native + SQLite + FSRS 算法
- **开发者**：小浣熊
- **联系邮箱**：2487717060@qq.com

---

## 📚 目录

1. [项目概述](#1-项目概述)
2. [功能模块](#2-功能模块)
3. [技术架构](#3-技术架构)
4. [数据模型](#4-数据模型)
5. [核心算法](#5-核心算法)
6. [数据库设计](#6-数据库设计)
7. [界面设计](#7-界面设计)
8. [配置参数](#8-配置参数)
9. [设计理念](#9-设计理念)

---

## 1. 项目概述

### 1.1 产品定位

"编码记忆法"是一款基于 **FSRS（Free Spaced Repetition Scheduler）算法**优化的艾宾浩斯记忆法和编码拆分技术的单词学习应用。

### 1.2 核心价值

- **科学记忆**：采用先进的 FSRS 算法，相比传统 SM-2 算法更精准
- **编码记忆**：结合编码拆分技术，帮助用户建立单词记忆关联
- **完全离线**：所有数据存储在本地，无需网络连接
- **智能复习**：自动计算最佳复习时间，提高学习效率

### 1.3 目标用户

- 英语学习者
- 备考学生（四六级、托福、雅思等）
- 需要记忆大量单词的专业人士
- 希望使用科学方法提高记忆效率的用户

---

## 2. 功能模块

### 2.1 单词本管理

#### 功能描述
- 创建、编辑、删除单词
- 添加单词详细信息（音标、释义、词性、拆分、助记、例句）
- 支持批量导入/导出（CSV、JSON 格式）
- 单词分类管理（词库）

#### 核心功能
1. **添加单词**
   - 支持手动添加
   - 支持从剪贴板粘贴导入
   - 支持从文件导入
   - 自动获取音标（内置词库 + API）

2. **编辑单词**
   - 修改所有字段
   - 查看学习历史
   - 查看复习记录

3. **删除单词**
   - 单个删除
   - 批量删除
   - 标记为已掌握/未掌握

4. **导入导出**
   - CSV 格式导入导出
   - JSON 格式导入导出
   - 支持自定义字段映射

#### 技术实现
- 数据存储：SQLite 数据库
- 文件操作：expo-file-system
- 音标获取：内置词库 + 在线 API
- 格式转换：papaparse（CSV）

---

### 2.2 智能复习（FSRS）

#### 功能描述
基于 FSRS 算法的智能复习系统，自动计算最佳复习间隔。

#### 核心特性

1. **自适应复习间隔**
   - 根据记忆稳定性动态调整
   - 考虑单词难度和个人学习习惯
   - 支持三种测试类型自适应选择

2. **时间敏感调整**
   - 提前复习：降低掌握率（0-30%）
   - 延后复习：降低掌握率（0-60%）
   - 按时复习：无惩罚

3. **记忆强度计算**
   - 可提取性（Retrievability）：R = exp(-t/S)
   - 稳定性（Stability）：记忆持久性
   - 难度（Difficulty）：单词掌握难度

4. **掌握判断**
   - 双条件判断：稳定性达标 + 连续高分
   - 避免过早或过晚停止复习

#### 复习流程
```
开始复习
  ↓
选择测试类型（自适应）
  ↓
用户答题
  ↓
计算得分（0-6）
  ↓
记录响应时间
  ↓
更新单词参数（难度、稳定性）
  ↓
计算下次复习时间
  ↓
判断是否已掌握
  ↓
保存复习记录
```

#### 技术实现
- 算法引擎：自定义 FSRS 实现
- 状态管理：React Hooks
- 时间处理：dayjs
- 数据持久化：SQLite

---

### 2.3 刷单词模式

#### 功能描述
卡片式刷单词学习，支持三种测试类型。

#### 测试类型

1. **拼写测试（Spelling）**
   - 要求用户完整拼写单词
   - 适合困难单词
   - 错误率高

2. **拆分+释义（Split + Definition）**
   - 显示编码拆分和释义
   - 要求用户回忆单词
   - 适合中等难度单词

3. **识别测试（Recognition）**
   - 显示单词，要求用户选择释义
   - 适合简单单词
   - 错误率低

#### 自适应选择策略
```typescript
difficulty < 0.3  → Recognition（简单词）
difficulty ≤ 0.7  → Split + Definition（中等词）
difficulty > 0.7  → Spelling（困难词）
```

#### 评分标准

**详细评分模式（0-6分）**
- 6分：两种测试方式都正确（完美）
- 4分：只有一种方式正确（部分）
- 0分：两种方式都错误（失败）

**快速评分模式（0-6分）**
- 0分：没印象
- 2分：有印象但想不起来
- 5分：记得但不确定
- 6分：完全记住

#### 技术实现
- UI组件：React Native
- 动画效果：react-native-reanimated
- 手势操作：react-native-gesture-handler
- 键盘处理：react-native-keyboard-aware-scroll-view

---

### 2.4 数据导入导出

#### 功能描述
支持多种格式的数据导入导出，方便用户备份和迁移学习数据。

#### 支持格式

1. **CSV 格式**
   - 通用性强，可在 Excel 中编辑
   - 支持自定义分隔符
   - 支持字段映射

2. **JSON 格式**
   - 结构完整，包含所有数据
   - 适合程序间数据交换
   - 保留所有元数据

#### 导入流程
```
选择导入源
  ↓
选择文件格式（CSV/JSON）
  ↓
解析文件内容
  ↓
字段映射（CSV）
  ↓
验证数据
  ↓
插入数据库
  ↓
显示导入结果
```

#### 导出流程
```
选择导出范围
  ↓
选择导出格式（CSV/JSON）
  ↓
提取数据
  ↓
格式转换
  ↓
生成文件
  ↓
保存到本地
```

#### 技术实现
- CSV 解析：papaparse
- 文件操作：expo-file-system
- 文件分享：expo-sharing
- 权限处理：expo-document-picker

---

### 2.5 编码库管理

#### 功能描述
提供26个字母对应的中文编码，帮助用户建立单词记忆关联。

#### 编码示例
```
A - 阿
B - 伯
C - 此
D - 的
E - 鹅
...
Z - 资
```

#### 使用场景
1. **记忆新单词**
   - 将单词拆分为字母组合
   - 每个字母对应中文编码
   - 联想记忆

2. **编码拆分学习**
   - 提供内置编码库
   - 支持自定义编码
   - 查询字母对应编码

#### 技术实现
- 数据存储：SQLite 数据库
- 搜索功能：模糊匹配
- UI展示：字母索引

---

### 2.6 复习计划

#### 功能描述
展示未来的复习计划，帮助用户合理安排学习时间。

#### 计划展示

1. **时间分组**
   - 今天待复习
   - 明天待复习
   - 本周待复习
   - 下周待复习
   - 后续计划

2. **统计信息**
   - 总单词数
   - 已掌握单词数
   - 待复习单词数
   - 掌握率（百分比）
   - 平均稳定性
   - 总复习次数

3. **单词详情**
   - 单词信息
   - 稳定性
   - 预计复习时间
   - 掌握状态

#### 技术实现
- 数据查询：SQL 聚合查询
- 时间分组：dayjs 日期处理
- UI展示：列表 + 分组

---

### 2.7 学习统计

#### 功能描述
展示用户的学习进度和效果统计。

#### 统计指标

1. **整体统计**
   - 总单词数
   - 已掌握单词数
   - 待复习单词数
   - 掌握率

2. **复习统计**
   - 总复习次数
   - 平均得分
   - 平均响应时间
   - 最近7天复习曲线

3. **单词统计**
   - 按难度分布
   - 按稳定性分布
   - 按掌握状态分布

#### 技术实现
- 数据查询：SQL 统计查询
- 图表展示：react-native-chart-kit
- 时间处理：dayjs

---

### 2.8 关于页面

#### 功能描述
展示应用信息和法律文档。

#### 内容展示

1. **应用信息**
   - 应用名称
   - 版本号
   - 开发者信息
   - 技术架构

2. **法律信息**
   - 隐私政策
   - 用户协议
   - 应用权限说明

3. **开源许可**
   - 开源软件列表
   - 感谢声明

4. **联系方式**
   - 开发者邮箱
   - 联系方式

#### 技术实现
- 文档展示：Modal 弹窗
- 邮箱复制：expo-clipboard
- 主题支持：useTheme Hook

---

## 3. 技术架构

### 3.1 整体架构

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Wordbook    │  │   Review     │  │   Settings   │  │
│  │   Screens    │  │   Screens    │  │   Screens    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                      Business Layer                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   FSRS       │  │   Word       │  │   Review     │  │
│  │  Algorithm   │  │   Service    │  │   Service    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                       Data Layer                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   SQLite     │  │   AsyncStorage│  │ FileSystem   │  │
│  │   Database   │  │   (Theme)    │  │   (Files)    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 3.2 技术栈

#### 前端框架
- **框架**：React Native 0.81.5
- **路由**：Expo Router 6.0.23
- **SDK**：Expo 54

#### 数据持久化
- **数据库**：SQLite (expo-sqlite)
- **键值存储**：AsyncStorage (@react-native-async-storage/async-storage)
- **文件存储**：expo-file-system

#### UI 组件
- **图标**：@expo/vector-icons (FontAwesome6)
- **图表**：react-native-chart-kit
- **动画**：react-native-reanimated
- **手势**：react-native-gesture-handler
- **键盘**：react-native-keyboard-aware-scroll-view

#### 工具库
- **时间处理**：dayjs
- **数据验证**：zod
- **CSV解析**：papaparse
- **分享**：expo-sharing
- **截图**：react-native-view-shot
- **剪贴板**：expo-clipboard

### 3.3 项目结构

```
client/
├── app/                    # Expo Router 路由
│   ├── _layout.tsx         # 根布局
│   ├── (tabs)/             # Tab 导航
│   ├── index.tsx           # 首页
│   ├── about.tsx           # 关于页面
│   └── +not-found.tsx      # 404 页面
├── algorithm/              # 算法模块
│   └── fsrs.ts             # FSRS 算法实现
├── components/             # 通用组件
│   ├── Screen.tsx          # 屏幕容器
│   ├── ThemedText.tsx      # 主题文本
│   ├── ThemedView.tsx      # 主题视图
│   └── ...
├── constants/              # 常量配置
│   ├── theme.ts            # 主题配置
│   └── reviewConfig.ts     # 复习配置
├── database/               # 数据库模块
│   ├── index.ts            # 数据库初始化
│   ├── types.ts            # 数据类型
│   ├── wordDao.ts          # 单词数据访问
│   ├── wordbookDao.ts      # 词库数据访问
│   ├── reviewPlanDao.ts    # 复习计划数据访问
│   ├── reviewLogDao.ts     # 复习记录数据访问
│   ├── codeDao.ts          # 编码数据访问
│   └── phoneticDao.ts      # 音标数据访问
├── hooks/                  # 自定义 Hooks
│   ├── useTheme.ts         # 主题 Hook
│   ├── useThemeSwitch.tsx  # 主题切换 Hook
│   └── useSafeRouter.ts    # 安全路由 Hook
├── screens/                # 页面组件
│   ├── wordbook/           # 单词本页面
│   ├── review/             # 复习页面
│   ├── review-detail/      # 复习详情页面
│   ├── review-plan/        # 复习计划页面
│   ├── brush-words/        # 刷单词页面
│   ├── add-word/           # 添加单词页面
│   ├── import-words/       # 导入单词页面
│   ├── codebase/           # 编码库页面
│   ├── phonetics/          # 音标库页面
│   └── about/              # 关于页面
├── utils/                  # 工具函数
│   ├── index.ts            # 通用工具
│   ├── similarity.ts       # 相似度计算
│   └── masonry.ts          # 瀑布流布局
└── assets/                 # 静态资源
    └── ...
```

### 3.4 数据流

```
用户操作
  ↓
屏幕组件（Screens）
  ↓
服务层（Services/DAO）
  ↓
算法层（Algorithm）
  ↓
数据库（Database）
  ↓
持久化存储
```

---

## 4. 数据模型

### 4.1 Word（单词）

```typescript
interface Word {
  id: number;                  // 单词ID
  word: string;                // 单词
  phonetic?: string;           // 音标
  definition: string;          // 释义
  partOfSpeech?: string;       // 词性
  split?: string;              // 编码拆分
  mnemonic?: string;           // 助记
  sentence?: string;           // 例句
  difficulty: number;          // 难度（0-1）
  stability: number;           // 稳定性（天）
  last_review?: string;        // 最后复习时间
  next_review?: string;        // 下次复习时间
  avg_response_time: number;   // 平均响应时间（秒）
  is_mastered: number;         // 是否已掌握（0/1）
  created_at: string;          // 创建时间
}
```

**字段说明**：
- `difficulty`：0（简单）到 1（困难）
- `stability`：记忆持久性，单位为天
- `avg_response_time`：平均答题时间
- `is_mastered`：0（未掌握）或 1（已掌握）

### 4.2 Wordbook（词库）

```typescript
interface Wordbook {
  id: number;              // 词库ID
  name: string;            // 词库名称
  description?: string;    // 描述
  word_count: number;      // 单词数量
  is_preset: number;       // 是否预置（0/1）
}
```

### 4.3 Code（编码）

```typescript
interface Code {
  id: number;          // 编码ID
  letter: string;      // 字母（A-Z）
  chinese: string;     // 对应中文
  created_at: string;  // 创建时间
}
```

### 4.4 Phonetic（音标）

```typescript
interface Phonetic {
  id: number;          // 音标ID
  word: string;        // 单词
  phonetic: string;    // 音标
  created_at: string;  // 创建时间
}
```

### 4.5 ReviewLog（复习记录）

```typescript
interface ReviewLog {
  id: number;          // 记录ID
  word_id: number;     // 单词ID
  score: number;       // 得分（0-6）
  response_time: number; // 响应时间（秒）
  reviewed_at: string; // 复习时间
}
```

### 4.6 Sentence（句子）

```typescript
interface Sentence {
  id: number;          // 句子ID
  word_id?: number;    // 关联单词ID
  content: string;     // 句子内容
  type: 'mnemonic' | 'example'; // 类型：助记/例句
  created_at: string;  // 创建时间
}
```

### 4.7 TestType（测试类型）

```typescript
type TestType = 'spelling' | 'split_definition' | 'recognition';
```

- `spelling`：拼写测试
- `split_definition`：拆分+释义测试
- `recognition`：识别测试

---

## 5. 核心算法

### 5.1 FSRS 算法概述

FSRS（Free Spaced Repetition Scheduler）是一种先进的间隔重复调度算法，相比传统的 SM-2 算法具有以下优势：

1. **动态稳定性计算**
2. **时间敏感调整**
3. **个性化学习**
4. **科学掌握判断**

### 5.2 核心参数

#### Stability（稳定性）
- **定义**：记忆持久性，单位为天
- **作用**：表示单词能保持记忆的时长
- **计算**：基于回忆质量和响应时间动态更新

#### Difficulty（难度）
- **范围**：0（简单）到 1（困难）
- **作用**：表示单词掌握难度
- **更新**：根据答题得分调整

#### Retrievability（可提取性）
- **公式**：R = exp(-t/S)
- **范围**：0 到 1
- **作用**：表示当前时刻能回忆起单词的概率

### 5.3 算法流程

#### 5.3.1 复习时机判断

```typescript
function calculateReviewTiming(word: Word) {
  const scheduledTime = new Date(word.next_review).getTime();
  const currentTime = Date.now();
  const timeDiffHours = (currentTime - scheduledTime) / (1000 * 60 * 60);

  // 提前复习（< 6小时）
  if (timeDiffHours < -6) {
    const earlyHours = Math.abs(timeDiffHours);
    const penalty = Math.min(0.3, 0.05 * Math.log(earlyHours + 1));
    return {
      masteryAdjustmentFactor: 1.0 - penalty,
      reviewStatus: 'early'
    };
  }

  // 延后复习（> 6小时）
  if (timeDiffHours > 6) {
    const lateHours = timeDiffHours;
    const penalty = Math.min(0.6, 0.4 * (1 - Math.exp(-lateHours / 12)));
    return {
      masteryAdjustmentFactor: 1.0 - penalty,
      reviewStatus: 'late'
    };
  }

  // 按时复习（±6小时内）
  return {
    masteryAdjustmentFactor: 1.0,
    reviewStatus: 'on-time'
  };
}
```

#### 5.3.2 加权得分计算

```typescript
function calculateWeightedScore(word: Word, score: number, responseTime: number) {
  const timeBudget = calculateTimeBudget(word);
  const ratio = responseTime / timeBudget;

  let weight = 1.0;
  if (ratio < 0.7) {
    weight = 1.2;  // 快速响应
  } else if (ratio > 1.3) {
    weight = 0.8;  // 慢速响应
  }

  return score * weight;
}
```

#### 5.3.3 稳定性更新

```typescript
function predictNextInterval(word: Word, score: number) {
  const quality = scoreToQuality(score); // 0-5
  let newStability: number;

  if (quality >= 3) {
    // 回答正确
    const easyBonus = quality === 5 ? 1.2 : (quality === 4 ? 1.1 : 1.0);
    newStability = word.stability * Math.max(1.3, easyBonus * (1 + word.difficulty * 0.5));
  } else {
    // 回答错误
    newStability = word.stability * 0.4;
  }

  return Math.max(0.1, Math.min(36500, newStability));
}
```

#### 5.3.4 难度更新

```typescript
let newDifficulty = word.difficulty;
if (adjustedScore >= 4) {
  newDifficulty = Math.max(0, word.difficulty - 0.1);  // 降低难度
} else if (adjustedScore <= 2) {
  newDifficulty = Math.min(1, word.difficulty + 0.1);  // 增加难度
}
```

#### 5.3.5 掌握判断

```typescript
function checkMasteryWithConfig(word: Word, recentScores: number[]) {
  // 条件1：稳定性达到阈值（0.5天）
  const condition1 = word.stability >= 0.5;

  // 条件2：最近2次得分都≥5分
  const condition2 = recentScores.length >= 2 &&
                     recentScores.slice(0, 2).every(s => s >= 5);

  return condition1 && condition2;
}
```

### 5.4 掌握率计算

#### 5.4.1 整体掌握率

```typescript
masteryRate = (已掌握单词数 / 总单词数) × 100%
```

#### 5.4.2 单词掌握判断

**双条件**：
1. 稳定性 ≥ 0.5 天
2. 最近 2 次得分均 ≥ 5 分

### 5.5 评分系统

#### 详细评分模式

| 得分 | 说明 |
|------|------|
| 6 | 两种测试方式都正确（完美） |
| 4 | 只有一种方式正确（部分） |
| 0 | 两种方式都错误（失败） |

#### 快速评分模式

| 得分 | 说明 |
|------|------|
| 0 | 没印象 |
| 2 | 有印象但想不起来 |
| 5 | 记得但不确定 |
| 6 | 完全记住 |

### 5.6 自适应测试类型选择

```typescript
function selectInitialTestType(difficulty: number) {
  if (difficulty < 0.3) {
    return 'recognition';  // 简单词：识别
  } else if (difficulty <= 0.7) {
    return 'split_definition';  // 中等词：拆分+释义
  } else {
    return 'spelling';  // 困难词：拼写
  }
}
```

### 5.7 时间预算计算

```typescript
function calculateTimeBudget(word: Word) {
  return Math.floor(20 + (word.difficulty * 10));  // 秒
}
```

- 基础时间：20秒
- 难度加成：每个难度单位 +10秒
- 范围：20-30秒

---

## 6. 数据库设计

### 6.1 表结构

#### words（单词表）

```sql
CREATE TABLE words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL,
  phonetic TEXT,
  definition TEXT NOT NULL,
  partOfSpeech TEXT,
  split TEXT,
  mnemonic TEXT,
  sentence TEXT,
  difficulty REAL DEFAULT 0,
  stability REAL DEFAULT 0,
  last_review TEXT,
  next_review TEXT,
  avg_response_time REAL DEFAULT 0,
  is_mastered INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_words_next_review ON words(next_review);
CREATE INDEX idx_words_is_mastered ON words(is_mastered);
```

#### wordbooks（词库表）

```sql
CREATE TABLE wordbooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  word_count INTEGER DEFAULT 0,
  is_preset INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);
```

#### wordbook_words（词库-单词关联表）

```sql
CREATE TABLE wordbook_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wordbook_id INTEGER NOT NULL,
  word_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
);

CREATE INDEX idx_wordbook_words_wordbook_id ON wordbook_words(wordbook_id);
CREATE INDEX idx_wordbook_words_word_id ON wordbook_words(word_id);
```

#### codes（编码表）

```sql
CREATE TABLE codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  letter TEXT NOT NULL UNIQUE,
  chinese TEXT NOT NULL,
  created_at TEXT NOT NULL
);
```

#### phonetics（音标表）

```sql
CREATE TABLE phonetics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL,
  phonetic TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_phonetics_word ON phonetics(word);
```

#### review_logs（复习记录表）

```sql
CREATE TABLE review_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id INTEGER NOT NULL,
  score INTEGER NOT NULL,
  response_time REAL NOT NULL,
  reviewed_at TEXT NOT NULL,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
);

CREATE INDEX idx_review_logs_word_id ON review_logs(word_id);
CREATE INDEX idx_review_logs_reviewed_at ON review_logs(reviewed_at);
```

#### database_version（数据库版本表）

```sql
CREATE TABLE database_version (
  id INTEGER PRIMARY KEY,
  version INTEGER NOT NULL
);
```

### 6.2 数据库版本管理

- **当前版本**：5
- **迁移策略**：检查版本号，增量升级
- **数据保护**：升级前备份数据，升级后恢复

### 6.3 索引优化

- `idx_words_next_review`：加速复习时间查询
- `idx_words_is_mastered`：加速掌握状态查询
- `idx_phonetics_word`：加速音标查询
- `idx_review_logs_word_id`：加速复习记录查询
- `idx_review_logs_reviewed_at`：加速时间范围查询

---

## 7. 界面设计

### 7.1 设计原则

1. **简洁性**：界面简洁明了，避免复杂
2. **一致性**：保持视觉和交互一致
3. **可访问性**：支持亮色/暗色主题
4. **响应式**：适配不同屏幕尺寸

### 7.2 主题系统

#### 主题配置

```typescript
interface Theme {
  // 文本颜色
  textPrimary: string;
  textSecondary: string;
  textMuted: string;

  // 背景颜色
  backgroundRoot: string;
  backgroundDefault: string;
  backgroundTertiary: string;

  // 边框颜色
  border: string;
  borderLight: string;

  // 主题色
  primary: string;
  accent: string;
  success: string;
  error: string;

  // 按钮颜色
  buttonPrimaryText: string;
  tabIconSelected: string;
}
```

#### 主题切换

- 支持三种模式：light / dark / auto
- 使用 AsyncStorage 持久化用户选择
- 使用 Context API 实现全局主题

### 7.3 页面布局

#### Tab 导航

```
┌─────────────────────────────────────┐
│                                     │
│         单词本 | 复习 | 我的        │ ← Tab Bar
└─────────────────────────────────────┘
```

#### 单词本页面

```
┌─────────────────────────────────────┐
│  单词本                    [+添加]  │
├─────────────────────────────────────┤
│  🔍 搜索单词...                    │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ 📚 全部词库 (100)          │   │
│  └─────────────────────────────┘   │
│  ┌─────────────────────────────┐   │
│  │ ⭐ 收藏词库 (20)           │   │
│  └─────────────────────────────┘   │
│                                     │
│  单词列表...                        │
└─────────────────────────────────────┘
```

#### 复习页面

```
┌─────────────────────────────────────┐
│  复习                    [退出]    │
├─────────────────────────────────────┤
│  🔍 搜索单词...                    │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐   │
│  │ 📚 词库名称                 │   │
│  │ ✅ 已掌握: 20               │   │
│  │ ⏳ 待复习: 50               │   │
│  └─────────────────────────────┘   │
│                                     │
│  词库列表...                        │
└─────────────────────────────────────┘
```

#### 复习详情页面

```
┌─────────────────────────────────────┐
│  ← 复习单词        1/100  ⏱️30s   │
├─────────────────────────────────────┤
│                                     │
│         [显示单词或提示]            │
│                                     │
├─────────────────────────────────────┤
│  [输入答案区域]                     │
│                                     │
├─────────────────────────────────────┤
│  [详细评分] [快速评分]              │
│                                     │
└─────────────────────────────────────┘
```

### 7.4 交互设计

#### 手势操作

- **左滑**：删除单词
- **右滑**：编辑单词
- **长按**：复制邮箱地址
- **双击**：查看单词详情

#### 反馈机制

- **成功操作**：绿色提示 + 轻微震动
- **错误操作**：红色提示 + 错误音效
- **加载状态**：Loading 动画
- **空状态**：空数据提示

---

## 8. 配置参数

### 8.1 掌握标准配置（MASTERY_CONFIG）

```typescript
{
  stabilityThreshold: 0.5,      // 稳定性阈值（天）
  consecutiveHighScores: 2,     // 连续高分次数
  highScoreThreshold: 5         // 高分标准
}
```

### 8.2 FSRS 算法参数（FSRS_PARAMS）

```typescript
{
  REQUEST_PRIOR: {
    ease: 0.5,
    stability: 0
  },
  MINIMUM_STABILITY: 0.1,       // 最小稳定性
  DESIRED_RETENTION: 0.9,       // 期望保持率
  MAXIMUM_INTERVAL: 36500,      // 最大间隔（100年）
  EASE_FACTOR: 1.3              // 简易因子
}
```

### 8.3 评分配置（SCORING_CONFIG）

```typescript
{
  PERFECT_SCORE: 6,              // 完美得分
  PARTIAL_SCORE: 4,              // 部分得分
  WRONG_SCORE: 0,                // 错误得分
  QUICK_NO_IMPRESSION: 0,        // 快速评分：没印象
  QUICK_SOME_IMPRESSION: 2       // 快速评分：有印象
}
```

### 8.4 时间配置（TIME_CONFIG）

```typescript
{
  BASE_TIME: 20,                 // 基础时间（秒）
  DIFFICULTY_FACTOR: 10,         // 难度加成（秒）
  STD_DEV_RATIO: 0.3,            // 标准差比例
  FAST_RESPONSE_THRESHOLD: 0.7,  // 快速响应阈值
  SLOW_RESPONSE_THRESHOLD: 1.3,  // 慢速响应阈值
  FAST_RESPONSE_WEIGHT: 1.2,     // 快速响应权重
  SLOW_RESPONSE_WEIGHT: 0.8      // 慢速响应权重
}
```

### 8.5 相似度配置（SIMILARITY_THRESHOLD）

```typescript
SIMILARITY_THRESHOLD: 0.5  // 50% 相似度以上判定为正确
```

---

## 9. 设计理念

### 9.1 认知心理学基础

#### 9.1.1 艾宾浩斯遗忘曲线

- **原理**：遗忘在学习后立即开始，且最初遗忘速度最快
- **应用**：在遗忘临界点之前复习，保持记忆

#### 9.1.2 间隔效应

- **原理**：间隔重复比集中重复更有效
- **应用**：自动计算最佳复习间隔

#### 9.1.3 编码记忆法

- **原理**：将抽象信息转化为具象图像，增强记忆
- **应用**：使用编码拆分技术帮助记忆单词

#### 9.1.4 测试效应

- **原理**：主动回忆比被动阅读更有效
- **应用**：使用测试型学习而非浏览型学习

### 9.2 FSRS 算法优势

#### 9.2.1 相比 SM-2 算法

| 特性 | SM-2 | FSRS |
|------|------|------|
| 稳定性计算 | 线性增长 | 动态调整 |
| 响应时间 | 不考虑 | 考虑权重 |
| 复习时机 | 不敏感 | 时间敏感 |
| 掌握判断 | 单一标准 | 双条件判断 |

#### 9.2.2 核心改进

1. **动态稳定性**
   - SM-2：固定增长公式
   - FSRS：基于回忆质量和响应时间动态调整

2. **时间敏感**
   - SM-2：不考虑复习时机
   - FSRS：提前/延后复习有惩罚

3. **个性化**
   - SM-2：通用参数
   - FSRS：考虑单词难度和个人习惯

### 9.3 编码记忆法

#### 9.3.1 编码拆分

```
单词：abandon
拆分：a-ban-don
编码：阿-班-顿
联想：一个班放弃了（abandon）
```

#### 9.3.2 记忆优势

1. **可视化**：抽象字母转化为具象汉字
2. **故事化**：通过故事联想记忆
3. **趣味化**：增加记忆的趣味性
4. **持久化**：故事比死记硬背更持久

### 9.4 用户体验原则

#### 9.4.1 极简设计

- 界面简洁，功能聚焦
- 减少认知负担
- 提高学习效率

#### 9.4.2 智能化

- 自动计算复习时间
- 自适应选择测试类型
- 个性化学习路径

#### 9.4.3 数据驱动

- 记录所有学习数据
- 统计分析学习效果
- 优化学习策略

#### 9.4.4 离线优先

- 完全离线运行
- 数据本地存储
- 无需网络连接

### 9.5 可扩展性

#### 9.5.1 功能扩展

- 支持添加新的测试类型
- 支持自定义编码库
- 支持自定义评分标准

#### 9.5.2 数据扩展

- 支持添加新的数据字段
- 支持自定义音标库
- 支持多语言扩展

#### 9.5.3 平台扩展

- 已支持：iOS、Android、Web
- 可扩展：Desktop（Electron）

---

## 10. 总结

### 10.1 核心价值

1. **科学记忆**：基于 FSRS 算法和认知心理学
2. **编码记忆**：结合编码拆分技术
3. **智能复习**：自动计算最佳复习时间
4. **完全离线**：数据本地存储，保护隐私

### 10.2 技术亮点

1. **FSRS 算法**：先进的间隔重复调度算法
2. **时间敏感**：考虑复习时机对记忆效果的影响
3. **自适应学习**：根据单词难度选择测试类型
4. **双条件掌握**：科学判断单词是否已掌握

### 10.3 未来优化方向

1. **算法优化**
   - 引入更多认知心理学研究成果
   - 优化稳定性计算公式
   - 改进掌握判断逻辑

2. **功能增强**
   - 添加更多测试类型
   - 支持语音评测
   - 添加学习统计图表

3. **用户体验**
   - 优化界面交互
   - 增加动画效果
   - 提供学习建议

4. **平台扩展**
   - 支持 Desktop 平台
   - 支持同步功能（可选）
   - 支持多人学习模式

---

## 附录

### A. 参考文献和理论

1. **艾宾浩斯遗忘曲线**（Ebbinghaus, 1885）
2. **间隔重复理论**（Spitzer, 1939）
3. **测试效应**（Roediger & Karpicke, 2006）
4. **编码记忆法**（Atkinson, 1975）
5. **FSRS 算法**（Jarrett Ye, 2022）

### B. 开源协议

- React Native（MIT License）
- Expo（MIT License）
- SQLite（Public Domain）
- dayjs（MIT License）
- papaparse（MIT License）

### C. 联系方式

- **开发者**：小浣熊
- **联系邮箱**：2487717060@qq.com
- **项目地址**：[待补充]

---

**文档结束**
