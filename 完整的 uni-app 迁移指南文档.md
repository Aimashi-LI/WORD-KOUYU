# 单词记忆应用 - uni-app 迁移指南（修正版）

## 文档版本
- 版本号：1.2.0
- 创建日期：2026-02-26
- 修正日期：2026-02-26
- 修正内容：
  - ✅ 添加 phonetics（音标表）的数据库表描述
  - ✅ 更新预置编码表为实际使用的136个复杂组合编码
  - ✅ 修正复习计划页面的功能描述（日历视图）
  - ✅ 修正数据库默认值（stability默认为0，算法中MINIMUM_STABILITY为1.0）
  - ✅ 修正快速评分按钮的disabled属性说明
  - ✅ 新增样式系统完整定义（颜色、间距、圆角、字体）
  - ✅ 新增样式迁移指南（StyleSheet → SCSS）
  - ✅ 修正复习详情页UI颜色值描述（提供准确的hex值和rgba值）
  - ✅ 新增主题切换实现说明

---

## 目录

1. [项目概述](#1-项目概述)
2. [技术栈对比](#2-技术栈对比)
3. [项目结构](#3-项目结构)
4. [数据结构设计](#4-数据结构设计)
5. [核心算法实现](#5-核心算法实现)
6. [页面设计与功能](#6-页面设计与功能)
7. [数据库设计](#7-数据库设计)
8. [API设计](#8-api设计)
9. [配置文件](#9-配置文件)
10. [迁移要点](#10-迁移要点)
11. [关键实现细节](#11-关键实现细节)
12. [测试要点](#12-测试要点)
13. [注意事项](#13-注意事项)
14. [附录](#14-附录)

---

## 1. 项目概述

### 1.1 应用简介

这是一个基于**FSRS（Free Spaced Repetition Scheduler）算法**的智能单词记忆应用，采用编码拆分记忆法帮助用户高效记忆单词。

### 1.2 核心特色

- ✅ **完全离线运行**：所有数据存储在本地 SQLite 数据库，无需网络连接
- ✅ **智能复习算法**：基于遗忘曲线和FSRS算法自动安排复习计划
- ✅ **编码拆分记忆**：将单词拆分为编码，辅助记忆
- ✅ **动态掌握标准**：根据单词稳定性动态调整掌握判断标准
- ✅ **双模式测试**：单词拼写测试 + 释义填写测试
- ✅ **快速评分**：支持"没印象"和"有印象但想不起来"快速评分
- ✅ **智能优先级**：复习队列按逾期时间排序，紧急单词优先复习
- ✅ **自动补充**：掌握单词后自动从词库补充新单词
- ✅ **主题系统**：支持亮色/暗色主题切换
- ✅ **数据管理**：支持批量导入、导出、删除等操作
- ✅ **日历视图**：日历视图展示复习计划，可查看特定日期的单词

### 1.3 应用架构

```
┌─────────────────────────────────────────────────────────┐
│                    前端 (Expo 54 + RN)                   │
├─────────────────────────────────────────────────────────┤
│  UI层：页面组件 + 通用组件                              │
│  状态管理：React Context + Hooks                        │
│  路由：Expo Router (文件系统路由)                       │
│  数据持久化：SQLite (expo-sqlite)                       │
└─────────────────────────────────────────────────────────┘
```

---

## 2. 技术栈对比

### 2.1 前端技术栈

| 类别 | 原技术栈 | 目标技术栈 | 替代方案 |
|------|---------|-----------|---------|
| 框架 | React Native | uni-app (Vue 3) | - |
| 语言 | TypeScript | TypeScript | - |
| UI组件 | React Native 原生组件 | uni-app 组件 | View → view, Text → text |
| 状态管理 | React Context | Pinia / Vuex | 建议使用 Pinia |
| 路由 | Expo Router | uni-app pages.json | 配置式路由 |
| 数据持久化 | expo-sqlite | uni.sqlite / plus.sqlite | - |
| 主题系统 | 自定义 Context + Hooks | uni.css + CSS变量 | - |
| 图标库 | @expo/vector-icons | uni-icons | - |
| 手势处理 | react-native-gesture-handler | uni-app 内置手势 | - |

### 2.2 工具库替换

| 原库名称 | 功能描述 | uni-app 替代方案 |
|---------|---------|----------------|
| expo-sqlite | SQLite 数据库 | uni.sqlite (H5) / plus.sqlite (App) |
| expo-router | 路由管理 | uni-app pages.json + navigateTo |
| expo-status-bar | 状态栏 | uni.getSystemInfoSync().statusBarHeight |
| expo-safe-area-context | 安全区 | uni.getSystemInfoSync().safeArea |
| react-native-gesture-handler | 手势处理 | uni-app 内置手势事件 |
| @react-native-async-storage/async-storage | 本地存储 | uni.setStorage / uni.getStorage |
| expo-haptics | 触觉反馈 | uni.vibrateShort |
| expo-file-system | 文件系统 | uni.getFileSystemManager() |

---

## 3. 项目结构

### 3.1 原项目结构

```
client/                          # 前端根目录
├── app/                         # 路由配置目录
│   ├── _layout.tsx              # 根布局
│   ├── (tabs)/                  # Tab 路由组
│   │   ├── _layout.tsx          # Tab 布局配置
│   │   ├── index.tsx            # 首页（单词本）
│   │   ├── review.tsx           # 复习页
│   │   └── codebase.tsx         # 编码库页
│   ├── add-word.tsx             # 添加单词页
│   ├── brush-words.tsx          # 刷单词页
│   ├── import-words.tsx         # 批量导入页
│   ├── paste-import.tsx         # 文本粘贴导入页
│   ├── review-detail.tsx        # 复习详情页
│   ├── review-plan.tsx          # 复习计划页（日历视图）
│   ├── word-detail.tsx          # 单词详情页
│   ├── splash.tsx               # 启动页
│   └── about.tsx                # 关于页
├── screens/                     # 页面实现目录
│   ├── wordbook/                # 单词本页面
│   │   ├── index.tsx            # 组件实现
│   │   └── styles.ts            # 样式文件
│   ├── review-detail/           # 复习详情页面
│   │   ├── index.tsx
│   │   └── styles.ts
│   └── ...                      # 其他页面
├── components/                  # 通用组件
│   ├── Screen.tsx               # 页面容器组件
│   ├── ThemedText.tsx           # 主题文本组件
│   ├── ThemedView.tsx           # 主题视图组件
│   └── WordCard.tsx             # 单词卡片组件
│   └── CalendarView.tsx         # 日历视图组件
├── contexts/                    # React Context
│   ├── AuthContext.tsx          # 认证上下文
│   └── ThemeContext.tsx         # 主题上下文
├── hooks/                       # 自定义 Hooks
│   ├── useTheme.ts              # 主题 Hook
│   ├── useSafeRouter.ts         # 路由 Hook
│   └── useColorScheme.ts        # 配色方案 Hook
├── database/                    # 数据库相关
│   ├── index.ts                 # 数据库初始化
│   ├── wordDao.ts               # 单词数据访问
│   ├── wordbookDao.ts           # 词库数据访问
│   ├── codeDao.ts               # 编码数据访问
│   ├── reviewPlanDao.ts         # 复习计划数据访问
│   └── types.ts                 # 数据类型定义
├── algorithm/                   # 算法相关
│   └── fsrs.ts                  # FSRS 复习算法
├── constants/                   # 常量定义
│   └── reviewConfig.ts          # 复习配置常量
├── utils/                       # 工具函数
│   ├── splitHelper.ts           # 拆分辅助函数
│   └── stringSimilarity.ts      # 字符串相似度算法
├── assets/                      # 静态资源
└── package.json                 # 依赖配置
```

### 3.2 目标项目结构（uni-app）

```
src/                             # 源代码根目录
├── pages/                       # 页面目录
│   ├── index/                   # 首页（单词本）
│   │   ├── index.vue            # 页面组件
│   │   └── index.scss           # 页面样式
│   ├── review/                  # 复习页
│   ├── codebase/                # 编码库页
│   ├── add-word/                # 添加单词页
│   ├── brush-words/             # 刷单词页
│   ├── import-words/            # 批量导入页
│   ├── paste-import/            # 文本粘贴导入页
│   ├── review-detail/           # 复习详情页
│   ├── review-plan/             # 复习计划页（日历视图）
│   ├── word-detail/             # 单词详情页
│   ├── splash/                  # 启动页
│   └── about/                   # 关于页
├── components/                  # 通用组件
│   ├── Screen.vue               # 页面容器组件
│   ├── ThemedText.vue           # 主题文本组件
│   ├── ThemedView.vue           # 主题视图组件
│   ├── WordCard.vue             # 单词卡片组件
│   └── CalendarView.vue         # 日历视图组件
├── stores/                      # 状态管理（Pinia）
│   ├── theme.ts                 # 主题状态
│   ├── wordbook.ts              # 词库状态
│   └── review.ts                # 复习状态
├── database/                    # 数据库相关
│   ├── index.ts                 # 数据库初始化
│   ├── wordDao.ts               # 单词数据访问
│   ├── wordbookDao.ts           # 词库数据访问
│   ├── codeDao.ts               # 编码数据访问
│   ├── reviewPlanDao.ts         # 复习计划数据访问
│   └── types.ts                 # 数据类型定义
├── algorithm/                   # 算法相关
│   └── fsrs.ts                  # FSRS 复习算法
├── constants/                   # 常量定义
│   └── reviewConfig.ts          # 复习配置常量
├── utils/                       # 工具函数
│   ├── splitHelper.ts           # 拆分辅助函数
│   ├── stringSimilarity.ts      # 字符串相似度算法
│   ├── router.ts                # 路由工具
│   └── storage.ts               # 存储工具
├── hooks/                       # 组合式函数
│   ├── useTheme.ts              # 主题 Hook
│   ├── useDatabase.ts           # 数据库 Hook
│   └── useReview.ts             # 复习 Hook
├── static/                      # 静态资源
├── App.vue                      # 应用入口
├── main.ts                      # 主入口文件
├── manifest.json                # 应用配置
├── pages.json                   # 页面路由配置
├── uni.scss                     # 全局样式
└── package.json                 # 依赖配置
```

---

## 4. 数据结构设计

### 4.1 Word（单词）

```typescript
interface Word {
  id: number;                   // 单词ID（主键）
  word: string;                 // 单词文本
  phonetic?: string;            // 音标
  definition: string;           // 释义
  partOfSpeech?: string;        // 词性（如 "n.", "v."）
  split?: string;               // 编码拆分（如 "w-a-y"）
  mnemonic?: string;            // 助记句
  sentence?: string;            // 例句
  difficulty: number;           // 难度参数（0-1）
  stability: number;            // 稳定性（天数）
  last_review?: string;         // 最后复习时间（ISO 8601）
  next_review?: string;         // 下次复习时间（ISO 8601）
  avg_response_time: number;    // 平均响应时间（秒）
  is_mastered: number;          // 是否已掌握（0/1）
  review_count: number;         // 复习次数
  created_at: string;           // 创建时间（ISO 8601）
}
```

### 4.2 NewWord（新增单词）

```typescript
interface NewWord {
  word: string;                 // 单词文本（必填）
  phonetic?: string;            // 音标
  definition: string;           // 释义（必填）
  partOfSpeech?: string;        // 词性
  split?: string;               // 编码拆分
  mnemonic?: string;            // 助记句
  sentence?: string;            // 例句
  difficulty?: number;          // 难度参数（默认0）
  stability?: number;           // 稳定性（默认0，算法中MINIMUM_STABILITY为1.0）
  avg_response_time?: number;   // 平均响应时间（默认0）
  is_mastered?: number;         // 是否已掌握（默认0）
  review_count?: number;        // 复习次数（默认0）
}
```

### 4.3 Wordbook（词库）

```typescript
interface Wordbook {
  id: number;                   // 词库ID（主键）
  name: string;                 // 词库名称
  description?: string;         // 词库描述
  word_count: number;           // 单词数量
  is_preset: number;            // 是否为预置词库（0/1）
}
```

### 4.4 Code（编码）

```typescript
interface Code {
  id: number;                   // 编码ID（主键）
  letter: string;               // 字母组合（如 'ab', 'ee', 'im'）
  chinese: string;              // 中文谐音
  created_at: string;           // 创建时间
}
```

### 4.5 ReviewLog（复习记录）

```typescript
interface ReviewLog {
  id: number;                   // 记录ID（主键）
  word_id: number;              // 单词ID（外键）
  score: number;                // 得分（0-6）
  response_time: number;        // 响应时间（秒）
  reviewed_at: string;          // 复习时间（ISO 8601）
}
```

### 4.6 WordCompletion（单词完成状态）

```typescript
interface WordCompletion {
  wordId: number;               // 单词ID
  completedModes: Set<'type1' | 'type2'>;  // 已完成的方式
  type1Score: number;           // 方式一得分（0:未完成, 1:正确, 2:错误）
  type2Score: number;           // 方式二得分（0:未完成, 1:正确, 2:错误）
  isQuickCompleted: boolean;    // 是否通过快速评分完成
  quickScore: number | null;    // 快速评分分数
}
```

### 4.7 ReviewStep（复习步骤）

```typescript
interface ReviewStep {
  word: Word;                   // 单词对象
  mode: 'type1' | 'type2';     // 测试模式
  wordId: number;               // 单词ID
}
```

---

## 5. 核心算法实现

### 5.1 FSRS（Free Spaced Repetition Scheduler）算法

#### 5.1.1 算法概述

FSRS 是一个基于重复提取理论的间隔重复调度算法，通过跟踪每次复习的表现来动态调整间隔。

#### 5.1.2 核心概念

1. **难度参数（Difficulty, D）**
   - 范围：0（最简单）到 1（最困难）
   - 初始值：0.5
   - 更新规则：
     - 得分 ≥ 4：难度 -= 0.1
     - 得分 ≤ 2：难度 += 0.1

2. **稳定性（Stability, S）**
   - 表示记忆保持的能力，单位：天
   - 数据库默认值：0
   - 算法中最小值（MINIMUM_STABILITY）：1.0天（确保初次复习间隔合理）
   - 根据复习得分动态调整

3. **可提取性（Retrievability, R）**
   - 表示当前时刻能够正确回忆的概率
   - 计算公式：`R = exp(-间隔天数 / S)`

#### 5.1.3 核心函数

**1. 计算可提取性**

```typescript
function calculateRetrievability(word: Word): number {
  if (!word.next_review || !word.last_review || word.stability <= 0) {
    return 1.0; // 新单词，可提取性为 1
  }

  const lastReview = new Date(word.last_review);
  const now = new Date();
  const elapsedDays = (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24);

  const R = Math.exp(-elapsedDays / Math.max(word.stability, 0.1));
  return Math.max(0, Math.min(1, R));
}
```

**2. 计算新的稳定性（分段增长算法）**

```typescript
function calculateNewStability(word: Word, score: number): number {
  const currentStability = word.stability;
  const quality = scoreToQuality(score); // 将得分转换为质量等级（0-5）

  if (quality >= 3) {
    // 回答正确：使用分段增长算法
    let growthFactor: number;

    if (currentStability < 1) {
      // 初始阶段（<1天）：快速增长
      growthFactor = quality === 5 ? 2.5 : (quality === 4 ? 2.0 : 1.5);
    } else if (currentStability < 3) {
      // 成长期（1-3天）：较快增长
      growthFactor = quality === 5 ? 2.0 : (quality === 4 ? 1.6 : 1.3);
    } else if (currentStability < 7) {
      // 稳定期（3-7天）：稳定增长
      growthFactor = quality === 5 ? 1.6 : (quality === 4 ? 1.3 : 1.1);
    } else {
      // 巩固期（≥7天）：缓慢增长
      growthFactor = quality === 5 ? 1.3 : (quality === 4 ? 1.1 : 1.0);
    }

    return currentStability * growthFactor;
  } else {
    // 回答错误：降低稳定性
    if (currentStability < 3) {
      return 1.0; // 短期记忆，重置到初始稳定性
    } else {
      return currentStability * 0.7; // 长期记忆，保留70%
    }
  }
}
```

**3. 计算下次复习间隔（分段计算）**

```typescript
function calculateNextInterval(
  word: Word,
  score: number,
  reviewCount: number
): number {
  const quality = scoreToQuality(score);

  // 根据复习次数分段计算间隔
  if (reviewCount === 1) {
    // 第1次复习：刚学完，短间隔巩固短期记忆
    return 10 / 60; // 10分钟 = 0.166天
  } else if (reviewCount === 2) {
    // 第2次复习：间隔1天，形成中期记忆
    return 1.0;
  } else if (reviewCount === 3) {
    // 第3次复习：间隔2-3天，巩固中期记忆
    if (quality === 5) return 3.0;
    if (quality === 4) return 2.0;
    return 1.5;
  } else if (reviewCount === 4) {
    // 第4次复习：间隔5-7天，形成长期记忆
    if (quality === 5) return 7.0;
    if (quality === 4) return 5.0;
    return 3.0;
  } else {
    // 第5次及以后：使用稳定性算法
    return calculateStabilityBasedInterval(word, score);
  }
}
```

**4. 回忆时间加权更新**

```typescript
function updateWithTimeWeight(
  word: Word,
  score: number,
  responseTime: number,
  reviewCount: number
): {
  newDifficulty: number;
  newStability: number;
  newAvgResponseTime: number;
  nextReviewDate: Date;
  masteryAdjustmentFactor: number;
  reviewStatus: 'on-time' | 'early' | 'late';
} {
  // 计算时间预算
  const timeBudget = calculateTimeBudget(word);

  // 计算时间权重
  let timeWeight = 1.0;
  if (responseTime <= timeBudget * 0.7) {
    timeWeight = 1.2; // 快速响应
  } else if (responseTime >= timeBudget * 1.3) {
    timeWeight = 0.8; // 慢速响应
  }

  // 计算加权得分
  const weightedScore = score * timeWeight;

  // 计算复习时机调整因子
  const reviewTiming = calculateReviewTiming(word, calculateNextInterval(word, score, reviewCount));
  const masteryAdjustmentFactor = reviewTiming.masteryAdjustmentFactor;

  // 应用调整因子
  const adjustedScore = weightedScore * masteryAdjustmentFactor;

  // 更新难度
  let newDifficulty = word.difficulty;
  if (adjustedScore >= 4) {
    newDifficulty = Math.max(0, word.difficulty - 0.1);
  } else if (adjustedScore <= 2) {
    newDifficulty = Math.min(1, word.difficulty + 0.1);
  }

  // 计算新稳定性
  const newStability = calculateNewStability(word, adjustedScore);

  // 计算下次复习时间
  const intervalDays = calculateNextInterval(word, adjustedScore, reviewCount);
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + Math.round(intervalDays));

  // 更新平均响应时间
  const newAvgResponseTime = (word.avg_response_time * word.review_count + responseTime) / (word.review_count + 1);

  return {
    newDifficulty,
    newStability,
    newAvgResponseTime,
    nextReviewDate,
    masteryAdjustmentFactor,
    reviewStatus: reviewTiming.status
  };
}
```

**5. 掌握判断（动态标准）**

```typescript
function checkMastery(word: Word, recentScores: number[]): boolean {
  if (recentScores.length === 0) return false;

  // 计算平均得分
  const avgScore = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;

  // 总体掌握度阈值：60%
  const overallThreshold = 60;

  // 动态连续高分标准
  let consecutiveRequired: number;
  const stability = word.stability;

  if (stability < 3) {
    consecutiveRequired = 3; // 低稳定性：需要3次连续≥5分
  } else if (stability < 7) {
    consecutiveRequired = 2; // 中等稳定性：需要2次连续≥5分
  } else {
    consecutiveRequired = 1; // 高稳定性：需要1次连续≥5分
  }

  // 检查连续高分
  let consecutiveCount = 0;
  for (let i = recentScores.length - 1; i >= 0; i--) {
    if (recentScores[i] >= 5) {
      consecutiveCount++;
      if (consecutiveCount >= consecutiveRequired) {
        return true;
      }
    } else {
      break;
    }
  }

  // 检查总体掌握度
  if (avgScore >= overallThreshold) {
    return true;
  }

  return false;
}
```

### 5.2 字符串相似度算法

**改进的相似度匹配算法（结合编辑距离、字符集合和最长公共子序列）**

```typescript
function calculateImprovedSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 1.0;
  if (str1.length === 0 || str2.length === 0) return 0.0;

  // 1. 编辑距离相似度
  const editDistance = calculateLevenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  const editSimilarity = 1 - (editDistance / maxLength);

  // 2. 字符集合相似度
  const setSimilarity = calculateJaccardSimilarity(str1, str2);

  // 3. 最长公共子序列相似度
  const lcsLength = calculateLCS(str1, str2);
  const lcsSimilarity = (2 * lcsLength) / (str1.length + str2.length);

  // 加权平均（编辑距离权重最高）
  const weightedSimilarity = (editSimilarity * 0.5) +
                            (setSimilarity * 0.2) +
                            (lcsSimilarity * 0.3);

  return weightedSimilarity;
}

function calculateLevenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // 删除
          dp[i][j - 1] + 1,      // 插入
          dp[i - 1][j - 1] + 1   // 替换
        );
      }
    }
  }

  return dp[m][n];
}
```

---

## 6. 页面设计与功能

### 6.1 启动页 (splash)

**功能说明**：
- 应用首次启动时显示的欢迎页面
- 展示应用核心功能和特色
- 引导用户开始使用

**关键交互**：
1. 显示应用 Logo 和标题
2. 展示核心功能列表
3. "开始使用"按钮跳转到单词本首页
4. 标记启动状态（使用 AsyncStorage 存储）

**UI要点**：
- 全屏展示，无导航栏
- 简洁的动画效果
- 清晰的引导文案

---

### 6.2 单词本首页 (index)

**功能说明**：
- 展示当前词库的单词列表
- 提供搜索、筛选、批量操作功能
- 显示词库切换入口
- 展示统计数据（总数、已掌握、待复习）

**关键交互**：
1. **词库切换**：点击顶部词库选择器切换词库
2. **搜索单词**：点击搜索图标，输入关键词搜索
3. **批量操作**：
   - 长按单词进入批量选择模式
   - 选择多个单词后显示批量操作按钮
   - 支持批量移动到其他词库、批量删除
4. **单词操作**：
   - 点击单词卡片查看详情
   - 点击编辑图标编辑单词
   - 点击删除图标删除单词
5. **添加单词**：点击右上角 "+" 按钮进入添加页面
6. **批量导入**：点击右上角菜单图标进入批量导入页面

**UI要点**：
- 顶部：词库选择器 + 搜索图标 + 菜单图标
- 中间：统计数据卡片（总数、已掌握、待复习）
- 下方：单词列表（卡片式布局）
- 每个单词卡片显示：单词、词性、释义、拆分、掌握状态
- 浮动按钮：快速添加单词

---

### 6.3 复习页 (review)

**功能说明**：
- 展示需要复习的词库列表
- 显示每个词库的待复习单词数
- 提供快速复习入口

**关键交互**：
1. 点击词库卡片进入复习详情页
2. 显示每个词库的待复习单词数
3. 显示词库描述

---

### 6.4 复习详情页 (review-detail) - **核心页面**

**功能说明**：
- 执行单词复习任务
- 双模式测试（单词拼写 + 释义填写）
- 快速评分功能
- 实时进度显示
- 复习完成统计

**关键交互**：

**1. 复习时机提醒（一次性）**
```
- 复习开始前检查所有单词的复习时机
- 如果有提前或延后复习的单词，弹窗提醒
- 提醒信息汇总显示（如"5个提前复习，3个延后复习"）
- 用户可以选择"返回"或"继续复习"
```

**2. 模式一：根据词性、释义、拆分填写单词**
```
- 显示：词性、释义、拆分
- 输入框：用户输入单词
- 提交按钮：点击"确认"提交答案
- 快速评分：点击"没印象"或"有印象，但想不起来"按钮
- 答案反馈：显示"正确！"或"错误！正确答案：xxx"
```

**3. 模式二：根据单词、短句填写释义**
```
- 显示：单词、短句（如果有）
- 输入框：用户输入释义
- 提交按钮：点击"确认"提交答案
- 快速评分：点击"没印象"或"有印象，但想不起来"按钮
- 答案反馈：显示"正确！"或"错误！正确答案：xxx"
```

**4. 快速评分功能（重要）**
```
- "没印象"按钮：得0分，红色背景
- "有印象，但想不起来"按钮：得2分，粉色背景
- 点击后立即清空输入框内容（如果输入框有内容）
- 不受输入状态限制（即使输入后也可以点击）
- 延迟1秒后自动提交分数
```

**5. 进度条显示**
```
- 正常完成：两种方式都完成的单词
- 快速评分完成：通过快速评分按钮完成的单词
- 总计：正常完成 + 快速评分完成
- 格式："单词 X / Y"
```

**6. 复习完成**
```
- 显示复习统计：完成数、正确数、平均得分、总耗时
- 显示得分分布：完全正确、部分正确、完全错误、快速评分
- "继续复习"按钮：如果还有待复习单词
- "返回"按钮：返回复习页
```

**UI要点**：
- 顶部栏：返回按钮 + 进度条（单词 X / Y）
- 进度条：可视化进度条 + 文字提示
- 测试卡片：
  - 模式一容器：`rgba(59, 130, 246, 0.03)` 背景（浅蓝色）
  - 模式二容器：`rgba(239, 68, 68, 0.03)` 背景（浅红色）
  - 模式一卡片：`rgba(59, 130, 246, 0.06)` 背景 + `rgba(59, 130, 246, 0.19)` 边框
  - 模式二卡片：`rgba(239, 68, 68, 0.06)` 背景 + `rgba(239, 68, 68, 0.19)` 边框
  - 正确：主题色 + 20% 透明度背景 + 主题色边框
  - 错误：错误色 + 20% 透明度背景 + 错误色边框
  - 快速评分（"有印象"）：`rgba(255, 105, 180, 0.2)` 粉色背景
  - 快速评分（"没印象"）：错误色背景
- 输入框：
  - 模式一输入框：`rgba(59, 130, 246, 0.08)` 背景 + `rgba(59, 130, 246, 0.25)` 边框
  - 模式二输入框：`rgba(239, 68, 68, 0.08)` 背景 + `rgba(239, 68, 68, 0.25)` 边框
- 快速评分按钮：横向排列，位于输入框下方

**核心状态管理**：
```typescript
// 复习状态
state: 'idle' | 'reviewing' | 'completed'

// 复习队列
queue: Word[]                      // 单词队列
reviewQueue: ReviewStep[]          // 复习步骤队列
currentStepIndex: number           // 当前步骤索引
currentWord: Word | null           // 当前单词

// 答案状态
reviewMode: 'type1' | 'type2'     // 当前测试模式
type1Answer: string                // 方式一答案
type2Answer: string                // 方式二答案
type1Status: 'none' | 'correct' | 'wrong'  // 方式一状态
type2Status: 'none' | 'correct' | 'wrong'  // 方式二状态

// 快速评分
quickScore: number | null          // 快速评分分数

// 单词完成状态
wordCompletionStatus: Map<number, WordCompletion>

// 统计数据
totalScore: number                 // 总分
wordScores: Array<{               // 单词得分记录
  wordId: number;
  word: string;
  score: number;
  isQuick: boolean;
}>

// 自动补充
remainingWordsCount: number        // 剩余单词数

// 复习时机提醒
timingWarning: { early: number; late: number } | null
```

**复习时机检查逻辑**：
```typescript
// 检查所有单词的复习时机（一次性检查）
function checkAllWordsTiming() {
  let earlyCount = 0;
  let lateCount = 0;

  queue.forEach(word => {
    const timing = checkReviewTiming(word);
    earlyCount += timing.early;
    lateCount += timing.late;
  });

  if (earlyCount > 0 || lateCount > 0) {
    setTimingWarning({ early: earlyCount, late: lateCount });
  } else {
    setTimingWarning(null);
  }
}
```

**快速评分实现**：
```typescript
// 没印象（0分）
function handleNoImpression() {
  const currentWordSnapshot = currentWord;

  // ✅ 如果用户已在输入框输入文本，清空输入框
  if (reviewMode === 'type1' && type1Answer.trim().length > 0) {
    setType1Answer('');
  } else if (reviewMode === 'type2' && type2Answer.trim().length > 0) {
    setType2Answer('');
  }

  setQuickScore(SCORING_CONFIG.QUICK_NO_IMPRESSION);
  setIsEditing(false);

  // 延迟提交
  setTimeout(() => {
    if (currentWordSnapshot) {
      submitQuickScore(currentWordSnapshot, SCORING_CONFIG.QUICK_NO_IMPRESSION);
    }
  }, 1000);
}
```

**进度条计算**：
```typescript
// 计算已完成的单词数量（包括正常完成和快速评分完成）
const normalCompleted = Array.from(wordCompletionStatus.values())
  .filter(comp => comp.completedModes.size === 2).length;
const quickCompleted = Array.from(wordCompletionStatus.values())
  .filter(comp => comp.isQuickCompleted).length;
const completedWordCount = normalCompleted + quickCompleted;
```

---

### 6.5 复习计划页 (review-plan) - **日历视图**

**功能说明**：
- 日历视图展示复习计划
- 显示不同日期的待复习单词数
- 可选择特定日期查看该日期的单词列表
- 统计数据展示（总单词数、已掌握数、待复习数等）

**关键交互**：
1. 日历视图：显示未来60天的复习计划
2. 日期标记：有复习计划的日期会显示标记
3. 点击日期：查看该日期的单词列表
4. 快速复习：点击"今天待复习"卡片开始复习
5. 下拉刷新：刷新复习计划

**UI要点**：
- 顶部：统计数据卡片
- 中间：日历视图组件
- 下方：复习分组（今天待复习、本周待复习、未来待复习）
- 每个分组显示单词数

**核心状态管理**：
```typescript
stats: ReviewStats                     // 统计数据
reviewGroups: ReviewGroup[]           // 复习分组
selectedDate: Date | undefined        // 选中的日期
markedDates: string[]                 // 有复习计划的日期
markedDatesCount: Record<string, number>  // 每个日期的复习数量
selectedDateWords: any[]              // 选中日期的单词列表
```

---

### 6.6 添加单词页 (add-word)

**功能说明**：
- 添加新单词到当前词库
- 支持手动输入和自动拆分
- 支持保存到词库

**关键交互**：
1. 输入单词文本（必填）
2. 输入释义（必填）
3. 可选输入：音标、词性、拆分、助记句、例句
4. 点击"自动拆分"按钮自动生成拆分
5. 选择要保存的词库
6. 点击"保存"按钮保存单词

---

### 6.7 单词详情页 (word-detail)

**功能说明**：
- 显示单词的完整信息
- 支持编辑和删除
- 显示复习历史

**关键交互**：
1. 显示单词的所有信息
2. 点击编辑图标进入编辑模式
3. 点击删除图标删除单词（确认弹窗）
4. 显示最近5次复习记录

---

### 6.8 批量导入页 (import-words)

**功能说明**：
- 支持批量导入单词（CSV/JSON格式）
- 显示导入进度
- 支持错误处理

**关键交互**：
1. 选择导入文件类型（CSV/JSON）
2. 上传文件
3. 预览导入数据
4. 选择要保存的词库
5. 点击"导入"按钮开始导入

---

### 6.9 刷单词页 (brush-words)

**功能说明**：
- 卡片式学习模式
- 翻转卡片查看答案
- 标记是否掌握

**关键交互**：
1. 显示单词卡片正面（单词 + 音标）
2. 点击翻转卡片，显示背面（释义 + 助记句）
3. 点击"掌握"按钮标记为已掌握
4. 点击"未掌握"按钮标记为未掌握
5. 自动进入下一个单词

---

### 6.10 编码库页 (codebase)

**功能说明**：
- 展示字母编码对照表
- 支持添加、编辑、删除编码
- 用于辅助记忆

**关键交互**：
1. 显示所有字母编码（136个预设编码）
2. 点击编码查看详情
3. 添加新编码
4. 编辑现有编码
5. 删除编码
6. 重置编码库（恢复到预设）

**UI要点**：
- 网格布局（4列）
- 每个卡片显示：字母组合、中文谐音

---

## 7. 数据库设计

### 7.1 数据库表结构

**1. database_version - 数据库版本表**
```sql
CREATE TABLE IF NOT EXISTS database_version (
  id INTEGER PRIMARY KEY,
  version INTEGER NOT NULL
);
```

**2. words - 单词表**
```sql
CREATE TABLE IF NOT EXISTS words (
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
  review_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_words_next_review ON words(next_review);
CREATE INDEX IF NOT EXISTS idx_words_is_mastered ON words(is_mastered);
```

**3. sentences - 句子表**
```sql
CREATE TABLE IF NOT EXISTS sentences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id INTEGER,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mnemonic', 'example')),
  created_at TEXT NOT NULL,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
);
```

**4. wordbooks - 词库表**
```sql
CREATE TABLE IF NOT EXISTS wordbooks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  word_count INTEGER DEFAULT 0,
  is_preset INTEGER DEFAULT 0
);
```

**5. wordbook_words - 词库单词关联表**
```sql
CREATE TABLE IF NOT EXISTS wordbook_words (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  wordbook_id INTEGER NOT NULL,
  word_id INTEGER NOT NULL,
  FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
  UNIQUE(wordbook_id, word_id)
);

CREATE INDEX IF NOT EXISTS idx_wordbook_words_wordbook_id ON wordbook_words(wordbook_id);
CREATE INDEX IF NOT EXISTS idx_wordbook_words_word_id ON wordbook_words(word_id);
```

**6. codes - 编码表**
```sql
CREATE TABLE IF NOT EXISTS codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  letter TEXT NOT NULL,
  chinese TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(letter, chinese)
);
```

**7. review_logs - 复习记录表**
```sql
CREATE TABLE IF NOT EXISTS review_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word_id INTEGER NOT NULL,
  score REAL NOT NULL,
  response_time REAL NOT NULL,
  reviewed_at TEXT NOT NULL,
  FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_review_logs_word_id ON review_logs(word_id);
CREATE INDEX IF NOT EXISTS idx_review_logs_reviewed_at ON review_logs(reviewed_at);
```

**8. phonetics - 音标表**
```sql
CREATE TABLE IF NOT EXISTS phonetics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  word TEXT NOT NULL UNIQUE,
  phonetic TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_phonetics_word ON phonetics(word);
```

### 7.2 数据库初始化

```typescript
async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('word_review.db');

  // 创建所有表（见上方的表结构）

  // 初始化预设词库
  await initPresetWordbook();

  // 初始化编码表（136个预设编码）
  await initCodes();

  // 初始化基础音标数据（25个常用词）
  await initDefaultPhonetics();

  // 检查并执行数据库迁移
  await migrateDatabase();

  return db;
}
```

### 7.3 数据库版本控制

```typescript
// 当前数据库版本
const DB_VERSION = 6;

// 版本历史
// v1: 初始版本
// v2: 添加 avg_response_time 字段
// v3: 添加 wordbook_words 表
// v4: 添加 codes 表
// v5: 添加 review_logs 表
// v6: 添加 review_count 字段，调整稳定性初始值
```

---

## 8. API设计

### 8.1 数据库API

**单词相关**

```typescript
// 获取所有单词
getAllWords(): Promise<Word[]>

// 根据ID获取单词
getWordById(id: number): Promise<Word | null>

// 根据单词文本获取
getWordByText(word: string): Promise<Word | null>

// 添加单词
addWord(word: NewWord): Promise<number>

// 更新单词
updateWord(id: number, updates: Partial<Word>): Promise<void>

// 删除单词
deleteWords(ids: number[]): Promise<void>

// 搜索单词
searchWords(keyword: string): Promise<Word[]>

// 在词库中搜索单词
searchWordsInWordbook(wordbookId: number, keyword: string): Promise<Word[]>

// 获取需要复习的单词
getReviewWords(limit?: number): Promise<Word[]>

// 获取单词统计信息
getWordStats(): Promise<{ total: number; mastered: number; pending: number }>
```

**词库相关**

```typescript
// 获取所有词库
getAllWordbooks(): Promise<Wordbook[]>

// 创建词库
createWordbook(name: string, description?: string): Promise<number>

// 获取词库详情（含单词数）
getWordbookWithCount(wordbookId: number): Promise<Wordbook>

// 更新词库单词数
updateWordbookCount(wordbookId: number): Promise<void>

// 添加单词到词库
addWordToWordbook(wordbookId: number, wordId: number): Promise<void>

// 从词库移除单词
removeWordFromWordbook(wordbookId: number, wordId: number): Promise<void>

// 获取词库中的单词
getWordsInWordbook(wordbookId: number): Promise<Word[]>

// 获取词库统计信息
getWordbookStats(wordbookId: number): Promise<{ total: number; mastered: number; pending: number }>

// 获取包含指定单词的所有词库
getWordbookNamesByWordId(wordId: number): Promise<string[]>
```

**编码相关**

```typescript
// 获取所有编码
getAllCodes(): Promise<Code[]>

// 根据字母获取编码
getCodeByLetter(letter: string): Promise<Code | null>

// 添加编码
addCode(letter: string, chinese: string): Promise<number>

// 批量添加编码
addCodes(codes: { letter: string; chinese: string }[]): Promise<number[]>

// 更新编码
updateCode(id: number, letter: string, chinese: string): Promise<void>

// 删除编码
deleteCode(id: number): Promise<void>

// 重置编码库（恢复到预设）
resetCodes(): Promise<number>

// 初始化默认编码库
initDefaultCodes(): Promise<void>
```

**复习记录相关**

```typescript
// 添加复习记录
addReviewLog(log: Omit<ReviewLog, 'id' | 'reviewed_at'>): Promise<number>

// 获取单词的最近复习记录
getRecentReviewLogs(wordId: number, limit?: number): Promise<ReviewLog[]>

// 获取所有复习记录
getAllReviewLogs(wordId: number): Promise<ReviewLog[]>
```

**复习计划相关**

```typescript
// 获取复习统计信息
getReviewStats(): Promise<ReviewStats>

// 获取复习计划（60天）
getReviewPlan(days: number): Promise<ReviewPlan[]>

// 获取分组的复习计划
getReviewPlanGrouped(): Promise<ReviewGroup[]>

// 根据日期范围获取单词
getWordsByDateRange(startDate: Date, endDate: Date): Promise<Word[]>
```

**音标相关**

```typescript
// 初始化基础音标数据
initDefaultPhonetics(): Promise<void>
```

---

## 9. 配置文件

### 9.1 复习配置常量

```typescript
// 掌握标准配置
export const MASTERY_CONFIG = {
  // 动态掌握标准 - 根据稳定性分段
  dynamicConsecutive: {
    low: { threshold: 3, consecutive: 3 },      // <3天：3次≥5分
    medium: { threshold: 3, consecutive: 2 },    // 3-7天：2次≥5分
    high: { threshold: 7, consecutive: 1 },      // ≥7天：1次≥5分
  },

  // 总体掌握程度阈值（%）
  overallMasteryThreshold: 60,

  // 最近得分的窗口大小（次）
  reviewScoreWindowSize: 5,

  // 高分标准 - 最低多少分才算高分
  highScoreThreshold: 5,
} as const;

// FSRS 算法参数
export const FSRS_PARAMS = {
  REQUEST_PRIOR: { ease: 0.5, stability: 0 },
  MINIMUM_STABILITY: 1.0, // 算法中最小稳定性设为1.0天
  DESIRED_RETENTION: 0.9,
  MAXIMUM_INTERVAL: 36500, // 100年
  EASE_FACTOR: 1.3,
} as const;

// 复习评分配置
export const SCORING_CONFIG = {
  // 两种方式都正确
  PERFECT_SCORE: 6,
  // 只有一种方式正确
  PARTIAL_SCORE: 4,
  // 两种方式都错误
  WRONG_SCORE: 0,
  // 快速评分：没印象
  QUICK_NO_IMPRESSION: 0,
  // 快速评分：有印象但想不起来
  QUICK_SOME_IMPRESSION: 2,
} as const;

// 相似度匹配阈值
export const SIMILARITY_THRESHOLD = 0.5; // 50% 相似度以上判定为正确

// 回忆时间配置
export const TIME_CONFIG = {
  // 基础时间（秒）
  BASE_TIME: 20,
  // 难度加成系数（秒）
  DIFFICULTY_FACTOR: 10,
  // 标准差比例
  STD_DEV_RATIO: 0.3,
  // 快速响应阈值（倍数）
  FAST_RESPONSE_THRESHOLD: 0.7,
  // 慢速响应阈值（倍数）
  SLOW_RESPONSE_THRESHOLD: 1.3,
  // 快速响应权重
  FAST_RESPONSE_WEIGHT: 1.2,
  // 慢速响应权重
  SLOW_RESPONSE_WEIGHT: 0.8,
} as const;
```

---

## 10. 迁移要点

### 10.1 组件迁移

**React Native → uni-app 组件映射**

| React Native | uni-app | 说明 |
|-------------|---------|------|
| View | view | 容器组件 |
| Text | text | 文本组件 |
| TextInput | input | 输入框 |
| TouchableOpacity | view (with @click) | 可点击组件 |
| ScrollView | scroll-view | 滚动视图 |
| FlatList | v-for + scroll-view | 列表组件 |
| Modal | uni-popup | 弹窗 |
| Alert.alert | uni.showModal | 弹窗提示 |
| ActivityIndicator | uni.showLoading | 加载提示 |
| StatusBar | - | 使用 uni.getSystemInfoSync() |
| SafeAreaView | - | 使用 uni.getSystemInfoSync().safeArea |
| KeyboardAvoidingView | adjust-position | 键盘避让 |

### 10.2 数据库迁移

**expo-sqlite → uni-app / plus.sqlite**

```typescript
// expo-sqlite
import * as SQLite from 'expo-sqlite';
const db = await SQLite.openDatabaseAsync('word_review.db');

// uni-app (App端)
import Database from '@/utils/database/sqlite.js';
const db = new Database('word_review.db');

// uni-app (H5端)
import { openDB } from 'idb';
const db = await openDB('word_review', 1);
```

### 10.3 样式系统迁移

**颜色系统定义**

实际应用使用 Stone 色系（文字、背景）和 Amber 色系（主题色）。

```typescript
// 亮色主题
const Colors = {
  textPrimary: "#44403C",      // Stone-700
  textSecondary: "#78716C",    // Stone-500
  textMuted: "#A8A29E",        // Stone-400
  primary: "#B45309",          // Amber-600（温暖护眼）
  accent: "#D97706",           // Amber-500
  success: "#10B981",          // Emerald-500
  error: "#EF4444",            // Red-500
  backgroundRoot: "#F5F5F4",   // Stone-100
  backgroundDefault: "#FAFAF9",// Stone-50
  backgroundTertiary: "#E7E5E4",// Stone-200
  border: "#D6D3D1",           // Stone-300
}

// 暗色主题
const Colors = {
  textPrimary: "#FAFAF9",      // Stone-50
  textSecondary: "#A8A29E",    // Stone-400
  textMuted: "#78716C",        // Stone-500
  primary: "#D97706",          // Amber-500
  accent: "#F59E0B",           // Amber-400
  success: "#34D399",          // Emerald-400
  error: "#F87171",            // Red-400
  backgroundRoot: "#1C1917",   // Stone-900
  backgroundDefault: "#292524",// Stone-800
  backgroundTertiary: "#44403C",// Stone-700
  border: "#44403C",           // Stone-700
}
```

**特殊颜色值（复习详情页）**

```scss
// 方式一（拼写测试）- 蓝色系
.review-mode-container-type1 {
  background-color: rgba(59, 130, 246, 0.03); // #3B82F608
}
.card-type1 {
  background-color: rgba(59, 130, 246, 0.06); // #3B82F610
  border-color: rgba(59, 130, 246, 0.19);    // #3B82F630
}
.input-type1 {
  background-color: rgba(59, 130, 246, 0.08); // #3B82F615
  border-color: rgba(59, 130, 246, 0.25);    // #3B82F640
}

// 方式二（释义填写）- 红色系
.review-mode-container-type2 {
  background-color: rgba(239, 68, 68, 0.03);  // #EF444408
}
.card-type2 {
  background-color: rgba(239, 68, 68, 0.06);  // #EF444410
  border-color: rgba(239, 68, 68, 0.19);     // #EF444430
}
.input-type2 {
  background-color: rgba(239, 68, 68, 0.08);  // #EF444415
  border-color: rgba(239, 68, 68, 0.25);     // #EF444440
}

// 快速评分 - 粉色
.card-pink {
  background-color: rgba(255, 105, 180, 0.2); // #FF69B433
  border-color: #FF69B4;
}
```

**React Native StyleSheet → uni-app SCSS**

```typescript
// React Native
export const createStyles = (theme: Theme) => {
  return StyleSheet.create({
    container: {
      flex: 1,
      padding: Spacing.lg,
      backgroundColor: theme.backgroundRoot,
      borderRadius: BorderRadius.lg,
    },
  });
};
```

```scss
// uni-app
:root {
  --background-root: #F5F5F4;
  --border-radius-lg: 16px;
  --spacing-lg: 16px;
}

.container {
  flex: 1;
  padding: var(--spacing-lg);
  background-color: var(--background-root);
  border-radius: var(--border-radius-lg);
}
```

**主题切换实现**

```typescript
// React Native
const { isDark, toggleTheme } = useTheme();

// uni-app (Pinia)
import { useThemeStore } from '@/stores/theme';

const { isDark, toggleTheme } = useThemeStore();

// 切换时更新 CSS 变量
toggleTheme();
document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
```

**注意**：详细样式系统定义请参考补充文档 `STYLE_SYSTEM_SUPPLEMENT.md`

### 10.4 路由迁移

**Expo Router → uni-app pages.json**

```json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": { "navigationBarTitleText": "单词本" }
    },
    {
      "path": "pages/review/review",
      "style": { "navigationBarTitleText": "复习" }
    },
    {
      "path": "pages/review-plan/review-plan",
      "style": { "navigationBarTitleText": "复习计划" }
    }
  ],
  "tabBar": {
    "list": [
      {
        "pagePath": "pages/index/index",
        "text": "单词本",
        "iconPath": "static/icons/book.png",
        "selectedIconPath": "static/icons/book-active.png"
      },
      {
        "pagePath": "pages/review/review",
        "text": "复习",
        "iconPath": "static/icons/review.png",
        "selectedIconPath": "static/icons/review-active.png"
      },
      {
        "pagePath": "pages/codebase/codebase",
        "text": "编码库",
        "iconPath": "static/icons/code.png",
        "selectedIconPath": "static/icons/code-active.png"
      }
    ]
  }
}
```

---

## 11. 关键实现细节

### 11.1 复习队列生成逻辑

```typescript
// 1. 智能排序：按逾期时间降序排序
const getOverdueHours = (word: Word): number => {
  if (!word.next_review) return 0;
  const now = new Date();
  const nextReview = new Date(word.next_review);
  const diffMs = now.getTime() - nextReview.getTime();
  return diffMs / (1000 * 60 * 60);
};

const sortedWords = words.sort((a, b) => {
  const overdueA = getOverdueHours(a);
  const overdueB = getOverdueHours(b);
  return overdueB - overdueA; // 逾期越久越紧急
});

// 2. 生成复习步骤（每个单词两种方式）
const reviewQueue: ReviewStep[] = [];
sortedWords.slice(0, 20).forEach(word => {
  reviewQueue.push({ word, mode: 'type1', wordId: word.id });
  reviewQueue.push({ word, mode: 'type2', wordId: word.id });
});

// 3. 随机打乱（Fisher-Yates）
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const shuffledQueue = shuffleArray(reviewQueue);

// 4. 确保不连续出现同一个单词
const ensureNonConsecutiveSameWord = (steps: ReviewStep[]): ReviewStep[] => {
  const result = [...steps];
  for (let i = 0; i < result.length - 1; i++) {
    if (result[i].wordId === result[i + 1].wordId) {
      for (let j = i + 2; j < result.length; j++) {
        if (result[j].wordId !== result[i].wordId &&
            result[j].wordId !== result[i + 1].wordId) {
          [result[i + 1], result[j]] = [result[j], result[i + 1]];
          break;
        }
      }
    }
  }
  return result;
};

const finalQueue = ensureNonConsecutiveSameWord(shuffledQueue);
```

### 11.2 释义匹配算法

```typescript
function handleSubmitType2() {
  if (!currentWord) return;

  const userAnswer = type2Answer.trim();
  const correctAnswer = currentWord.definition.trim();

  // 使用改进的相似度算法
  const matchScore = calculateImprovedSimilarity(userAnswer, correctAnswer);

  const isCorrect = matchScore >= SIMILARITY_THRESHOLD; // 0.5

  if (isCorrect) {
    setType2Status('correct');
  } else {
    setType2Status('wrong');
  }

  // 记录得分
  updateWordCompletion(currentWord.id, 'type2', isCorrect ? 1 : 2);

  // 延迟后进入下一个步骤
  setTimeout(() => {
    goToNextStep();
  }, 1000);
}
```

### 11.3 自动补充机制

```typescript
// 在 submitWordScore 中检查是否掌握
const isMastered = checkMasteryWithConfig(updatedWord, recentScores);

if (isMastered && !word.is_mastered) {
  console.log(`[Review] 单词 ${word.word} 已掌握，尝试补充新单词`);

  const newWords = await loadNewWords(1);
  if (newWords.length > 0) {
    const newWord = newWords[0];
    console.log(`[Review] 自动补充新单词: ${newWord.word}`);

    // 添加到队列
    setQueue(prev => [...prev, newWord]);

    // 添加复习步骤
    const newSteps = [
      { word: newWord, mode: 'type1', wordId: newWord.id },
      { word: newWord, mode: 'type2', wordId: newWord.id }
    ];

    // 随机打乱
    const shuffledNewSteps = shuffleArray([...newSteps]);

    // 确保不连续
    const finalNewSteps = ensureNonConsecutiveSameWord(shuffledNewSteps);

    // 添加到复习队列
    setReviewQueue(prev => [...prev, ...finalNewSteps]);

    // 初始化完成状态
    setWordCompletionStatus(prev => {
      const newStatus = prev;
      newStatus.set(newWord.id, {
        wordId: newWord.id,
        completedModes: new Set(),
        type1Score: 0,
        type2Score: 0,
        isQuickCompleted: false,
        quickScore: null
      });
      return new Map(newStatus);
    });
  }
}
```

---

## 12. 测试要点

### 12.1 功能测试

1. **单词管理**
   - ✅ 添加单词（必填项验证）
   - ✅ 编辑单词
   - ✅ 删除单词（确认弹窗）
   - ✅ 搜索单词（模糊匹配）
   - ✅ 批量操作（移动、删除）

2. **词库管理**
   - ✅ 创建词库
   - ✅ 切换词库
   - ✅ 统计数据正确性

3. **复习功能**
   - ✅ 复习队列生成（智能排序）
   - ✅ 双模式测试（拼写、释义）
   - ✅ 快速评分（清空输入框）
   - ✅ 进度条正确显示
   - ✅ 复习时机提醒（一次性）
   - ✅ 自动补充机制
   - ✅ 掌握判断（动态标准）

4. **复习计划**
   - ✅ 日历视图展示
   - ✅ 日期标记
   - ✅ 选择日期查看单词
   - ✅ 统计数据正确

5. **FSRS算法**
   - ✅ 稳定性计算（分段增长）
   - ✅ 间隔计算（分段）
   - ✅ 掌握判断（动态标准）
   - ✅ 时间权重调整

---

## 13. 注意事项

### 13.1 uni-app 平台差异

| 平台 | 数据库 | 存储 | 特殊说明 |
|-----|-------|-----|---------|
| H5 | IndexedDB | localStorage | 使用 Web 标准 |
| App | plus.sqlite | plus.storage | 使用 HTML5+ API |
| 微信小程序 | 不支持本地数据库 | wx.setStorage | 需要云数据库支持 |

### 13.2 数据库注意事项

1. **uni-app App端**
   - 使用 `plus.sqlite` API
   - 需要在 `manifest.json` 中配置权限
   - 数据库文件存储在应用的私有目录

2. **uni-app H5端**
   - 使用 `IndexedDB`
   - 需要使用封装库（如 `idb`）
   - 存储限制（通常5-50MB）

3. **微信小程序**
   - 不支持本地数据库
   - 需要使用云数据库或服务器
   - 考虑使用云开发

---

## 14. 附录

### A. 预置编码表（136个复杂组合编码）

实际应用中使用的是136个预设的组合编码（非简单的A-Z字母表）：

```
ab - 阿爸          | al - 阿郎         | ali - 阿里       | ac - 一次
adu - 阿杜        | ad - 阿弟、广告   | ap - 阿婆       | ar - 矮人、爱人
ary - 一人妖      | adv - 一大碗      | anc - 一册       | an - 阿牛
au - 遨游         | aw - 一碗         | bl - 玻璃       | br - 病人
by - 表演         | ble - 伯乐        | ch - 彩虹、吃   | ck - 刺客
cl - 成龙         | co - 可乐、错     | com - 电脑      | con - 葱、虫
cr - 超人         | cu - 醋           | cy - 抽烟       | cir - 词人
dis - 的士        | dy - 地狱         | dr - 敌人       | ee - 眼睛
el - 饮料         | ele - 大象       | em - 姨妈、鹅毛 | ep - 硬盘
en - 题难题       | ent - 疑难题      | er - 儿、耳     | es - 二十、恶少
ef - 衣服         | eh - 遗憾         | ev - 一胃       | et - 外星人
ex - 易错、恶心   | eq - 艺曲        | ence - 恩师     | fl - 风铃
fe - 翻译、父爱   | fi - 父爱、飞     | gl - 公路       | gr - 工人
gy - 观音         | gue - 故意       | hy - 花园       | ho - 猴
hu - 湖           | im - 一毛        | ick - IC卡      | in - 老鹰
io - 爱情         | ive - 夏威夷     | ir - 耳、儿     | je - 姐
jo - 机灵         | kn - 困难        | la - 拉         | le - 乐
lf - 雷锋         | li - 礼          | lib - 李白      | lm - 流氓
ly - 老鹰、姥爷   | lay - 腊月       | mini - 迷你裙   | mir - 迷人
mo - 魔           | mt - 模特        | mul - 木楼      | mn - 魔女
mis - 密室        | ment - 门童      | non - 笑脸      | ne - 呢
nu - 努力         | ob - 氧吧        | oo - 眼镜       | of - 零分
olo - 火箭        | on - 罐          | op - 藕片       | or - 或、或者
ot - 呕吐         | ou - 藕          | ow - 灯泡       | pa - 怕
pe - 赔           | ph - 炮灰        | pl - 漂亮       | po - 破
pr - 仆人         | pu - 扑          | pt - 皮特       | que - 问题
ri - 日           | re - 热、花      | ro - 稍微       | ry - 日语
rt - 软糖         | ru - 肉          | se - 蛇         | sh - 上海
si - 四           | sk - 水库        | sl - 司令       | sm - 寺庙
sp - 水瓶、山坡   | squ - 身躯       | ss - 双胞胎     | sis - 姐姐
sion - 绳子       | sus - 宿舍       | st - 石头       | str - 石头人
sw - 丝袜         | th - 天河、弹簧  | tion - 神、神仙 | tele - 泰勒
tl - 铁路         | tr - 树、唐仁    | ty - 太阳       | tw - 台湾
te - 特别         | ute - 夏威夷     | ur - 友人       | ue - 友谊
udy - 邮递员      | um - 幼猫        | ut - 油条       | vo - 声音
was - 瓦斯        | wo - 我          | wh - 武汉       | ...
```

完整编码列表请参考代码：`client/database/codeDao.ts`

### B. 预置音标数据（25个常用词）

```
hello - /həˈloʊ/      | world - /wɜːrld/      | apple - /ˈæpl/
book - /bʊk/          | computer - /kəmˈpjuːtər/ | water - /ˈwɔːtər/
time - /taɪm/         | people - /ˈpiːpl/   | year - /jɪr/
good - /ɡʊd/          | make - /meɪk/        | word - /wɜːrd/
new - /nuː/           | first - /fɜːrst/     | work - /wɜːrk/
now - /naʊ/           | find - /faɪnd/      | long - /lɔːŋ/
look - /lʊk/          | day - /deɪ/         | get - /ɡet/
come - /kʌm/          | made - /meɪd/       | may - /meɪ/
part - /pɑːrt/
```

### C. 参考资料

1. [FSRS算法论文](https://arxiv.org/abs/2309.07472)
2. [Expo Router文档](https://docs.expo.dev/router/introduction/)
3. [uni-app官方文档](https://uniapp.dcloud.net.cn/)
4. [Pinia文档](https://pinia.vuejs.org/)
5. [SQLite文档](https://www.sqlite.org/docs.html)

### D. 版本历史

- v1.2.0 (2026-02-26): 样式系统修正版
  - ✅ 新增样式系统完整定义（Colors、Spacing、BorderRadius、Typography）
  - ✅ 新增样式迁移指南（StyleSheet → SCSS、主题切换）
  - ✅ 修正复习详情页UI颜色值描述（提供准确的rgba值）
  - ✅ 新增补充文档 `STYLE_SYSTEM_SUPPLEMENT.md`
- v1.1.0 (2026-02-26): 修正版
  - ✅ 添加 phonetics（音标表）的数据库表描述
  - ✅ 更新预置编码表为实际使用的136个复杂组合编码
  - ✅ 修正复习计划页面的功能描述（日历视图）
  - ✅ 修正数据库默认值（stability默认为0，算法中MINIMUM_STABILITY为1.0）
  - ✅ 修正快速评分按钮的disabled属性说明
- v1.0.0 (2026-02-26): 初始版本
