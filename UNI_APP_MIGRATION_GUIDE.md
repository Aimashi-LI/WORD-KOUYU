# 单词记忆应用 - uni-app 迁移指南

## 文档版本
- 版本号：1.0.0
- 创建日期：2026-02-26
- 原始技术栈：Expo 54 + React Native + TypeScript
- 目标技术栈：uni-app + Vue 3 + TypeScript

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
│   ├── review-plan.tsx          # 复习计划页
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
│   ├── review-plan/             # 复习计划页
│   ├── word-detail/             # 单词详情页
│   ├── splash/                  # 启动页
│   └── about/                   # 关于页
├── components/                  # 通用组件
│   ├── Screen.vue               # 页面容器组件
│   ├── ThemedText.vue           # 主题文本组件
│   ├── ThemedView.vue           # 主题视图组件
│   └── WordCard.vue             # 单词卡片组件
├── stores/                      # 状态管理（Pinia）
│   ├── theme.ts                 # 主题状态
│   ├── wordbook.ts              # 词库状态
│   └── review.ts                # 复习状态
├── database/                    # 数据库相关
│   ├── index.ts                 # 数据库初始化
│   ├── wordDao.ts               # 单词数据访问
│   ├── wordbookDao.ts           # 词库数据访问
│   ├── codeDao.ts               # 编码数据访问
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
  difficulty?: number;          // 难度参数（默认0.5）
  stability?: number;           // 稳定性（默认1.0）
  avg_response_time?: number;   // 平均响应时间（默认20）
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
  letter: string;               // 字母
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
   - 初始值：1.0天
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

**实现逻辑**：
```typescript
// 检查是否已显示过启动页
const hasShownSplash = await AsyncStorage.getItem('@app:splash_shown');
if (!hasShownSplash) {
  router.replace('/splash');
} else {
  router.replace('/(tabs)/index');
}

// 在启动页点击"开始使用"
await AsyncStorage.setItem('@app:splash_shown', 'true');
router.replace('/(tabs)/index');
```

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

**核心状态管理**：
```typescript
// 词库列表
wordbooks: Wordbook[]
currentWordbookId: number | null

// 单词列表
words: Word[]
loading: boolean

// 搜索状态
showSearch: boolean
searchKeyword: string
searchResults: Word[]

// 批量选择状态
isSelectionMode: boolean
selectedWordIds: Set<number>
```

**关键函数**：
```typescript
// 加载词库数据
async loadWordbookData(wordbookId: number) {
  const stats = await getWordbookStats(wordbookId);
  const words = await getWordsInWordbook(wordbookId);
  setStats(stats);
  setWords(words);
}

// 搜索单词
async handleSearch(keyword: string) {
  if (keyword.trim() === '') {
    setSearchResults([]);
    return;
  }
  const results = await searchWordsInWordbook(currentWordbookId, keyword);
  setSearchResults(results);
}

// 批量删除
async handleBatchDelete() {
  const ids = Array.from(selectedWordIds);
  await deleteWords(ids);
  await updateWordbookCount(currentWordbookId);
  await loadWordbookData(currentWordbookId);
  setIsSelectionMode(false);
  setSelectedWordIds(new Set());
}
```

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

**UI要点**：
- 标题栏："复习"
- 词库列表（卡片式布局）
- 每个卡片显示：词库名称、描述、待复习单词数、图标

**核心状态管理**：
```typescript
wordbooks: Wordbook[]
loading: boolean
```

**关键函数**：
```typescript
// 加载需要复习的词库
async loadReviewWordbooks() {
  const allWordbooks = await getAllWordbooks();
  const reviewWordbooks = allWordbooks.filter(wb => wb.word_count > 0);
  setWordbooks(reviewWordbooks);
}
```

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
- 点击后立即清空输入框内容
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
  - 模式一：浅蓝色背景
  - 模式二：浅红色背景
  - 正确：绿色背景
  - 错误：红色背景
  - "没印象"：红色背景
  - "有印象"：粉色背景
- 输入框：占位提示（"请输入单词"、"请输入释义"）
- 快速评分按钮：位于输入框下方，横向排列

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

// 检查单个单词的复习时机
function checkReviewTiming(word: Word): { early: number; late: number } {
  if (!word.next_review || !word.last_review) {
    return { early: 0, late: 0 };
  }

  const scheduledTime = new Date(word.next_review).getTime();
  const currentTime = Date.now();
  const lastReviewTime = new Date(word.last_review).getTime();
  const timeDiffHours = (currentTime - scheduledTime) / (1000 * 60 * 60);
  const reviewIntervalHours = (scheduledTime - lastReviewTime) / (1000 * 60 * 60);

  // 判断是否是第一个复习节点
  const isFirstReviewNode = reviewIntervalHours < 24;

  // 设置阈值
  let earlyThresholdMinutes = 30;
  let lateThresholdMinutes = 30;

  if (isFirstReviewNode) {
    earlyThresholdMinutes = 1;
    lateThresholdMinutes = 5;
  }

  const timeDiffMinutes = timeDiffHours * 60;
  let earlyCount = 0;
  let lateCount = 0;

  if (timeDiffMinutes < -earlyThresholdMinutes) {
    earlyCount++;
  }
  if (timeDiffMinutes > lateThresholdMinutes) {
    lateCount++;
  }

  return { early: earlyCount, late: lateCount };
}
```

**快速评分实现**：
```typescript
// 没印象（0分）
function handleNoImpression() {
  const currentWordSnapshot = currentWord;

  // 如果用户已在输入框输入文本，清空输入框
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

// 有印象，但想不起来（2分）
function handleSomeImpression() {
  const currentWordSnapshot = currentWord;

  // 如果用户已在输入框输入文本，清空输入框
  if (reviewMode === 'type1' && type1Answer.trim().length > 0) {
    setType1Answer('');
  } else if (reviewMode === 'type2' && type2Answer.trim().length > 0) {
    setType2Answer('');
  }

  setQuickScore(SCORING_CONFIG.QUICK_SOME_IMPRESSION);
  setIsEditing(false);

  // 延迟提交
  setTimeout(() => {
    if (currentWordSnapshot) {
      submitQuickScore(currentWordSnapshot, SCORING_CONFIG.QUICK_SOME_IMPRESSION);
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

**自动补充机制**：
```typescript
// 加载新单词
async loadNewWords(count: number = 1): Promise<Word[]> {
  const allWords = await getWordsInWordbook(parseInt(projectId));
  return allWords.filter(w => {
    if (w.is_mastered === 1) return false;
    if (!w.next_review) return true;
    return new Date(w.next_review) <= new Date();
  }).sort((a, b) => {
    const overdueA = getOverdueHours(a);
    const overdueB = getOverdueHours(b);
    return overdueB - overdueA; // 逾期越久越紧急
  }).slice(0, count);
}

// 单词掌握后自动补充
if (isMastered && !word.is_mastered) {
  const newWords = await loadNewWords(1);
  if (newWords.length > 0) {
    const newWord = newWords[0];
    setQueue(prev => [...prev, newWord]);
    // 添加复习步骤
    const newSteps = [
      { word: newWord, mode: 'type1', wordId: newWord.id },
      { word: newWord, mode: 'type2', wordId: newWord.id }
    ];
    setReviewQueue(prev => [...prev, ...shuffleArray(newSteps)]);
  }
}
```

---

### 6.5 添加单词页 (add-word)

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

**UI要点**：
- 表单布局，字段清晰标注
- 必填项标红或加星号
- "自动拆分"按钮：点击后调用拆分算法
- 词库选择器：下拉选择
- 保存按钮：底部固定

**核心状态管理**：
```typescript
wordForm: {
  word: string;
  phonetic?: string;
  definition: string;
  partOfSpeech?: string;
  split?: string;
  mnemonic?: string;
  sentence?: string;
}
selectedWordbookId: number | null
loading: boolean
```

**关键函数**：
```typescript
// 自动拆分
async handleAutoSplit() {
  if (!wordForm.word) {
    Alert.alert('提示', '请先输入单词');
    return;
  }
  const split = await generateSplit(wordForm.word);
  setWordForm({ ...wordForm, split });
}

// 保存单词
async handleSave() {
  if (!wordForm.word || !wordForm.definition) {
    Alert.alert('提示', '请填写单词和释义');
    return;
  }

  const newWord: NewWord = {
    word: wordForm.word,
    phonetic: wordForm.phonetic,
    definition: wordForm.definition,
    partOfSpeech: wordForm.partOfSpeech,
    split: wordForm.split,
    mnemonic: wordForm.mnemonic,
    sentence: wordForm.sentence,
  };

  await addWord(newWord);
  await addWordToWordbook(wordId, selectedWordbookId);
  router.back();
}
```

---

### 6.6 单词详情页 (word-detail)

**功能说明**：
- 显示单词的完整信息
- 支持编辑和删除
- 显示复习历史

**关键交互**：
1. 显示单词的所有信息
2. 点击编辑图标进入编辑模式
3. 点击删除图标删除单词（确认弹窗）
4. 显示最近5次复习记录

**UI要点**：
- 顶部：返回按钮 + 标题 + 编辑/删除图标
- 中间：单词信息卡片（大字体显示单词）
- 下方：复习历史列表

**核心状态管理**：
```typescript
word: Word | null
loading: boolean
reviewLogs: ReviewLog[]
```

**关键函数**：
```typescript
// 加载单词详情
async loadWordDetail() {
  const word = await getWordById(wordId);
  setWord(word);

  const logs = await getRecentReviewLogs(wordId, 5);
  setReviewLogs(logs);
}

// 删除单词
async handleDelete() {
  Alert.alert(
    '确认删除',
    '确定要删除这个单词吗？',
    [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteWord(wordId);
          router.back();
        }
      }
    ]
  );
}
```

---

### 6.7 批量导入页 (import-words)

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

**UI要点**：
- 文件选择器
- 数据预览表格
- 导入进度条
- 导入结果提示

**核心状态管理**：
```typescript
importType: 'csv' | 'json'
importData: ImportWord[]
selectedWordbookId: number | null
importing: boolean
importResult: { success: number; failed: number; errors: string[] }
```

---

### 6.8 刷单词页 (brush-words)

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

**UI要点**：
- 全屏卡片布局
- 点击翻转动画
- 底部按钮：掌握 / 未掌握

---

### 6.9 编码库页 (codebase)

**功能说明**：
- 展示字母编码对照表
- 支持添加、编辑、删除编码
- 用于辅助记忆

**关键交互**：
1. 显示所有字母编码（A-Z）
2. 点击编码查看详情
3. 添加新编码
4. 编辑现有编码
5. 删除编码

**UI要点**：
- 网格布局（4列）
- 每个卡片显示：字母、中文谐音

---

## 7. 数据库设计

### 7.1 数据库初始化

```typescript
async function initDatabase() {
  const db = await SQLite.openDatabaseAsync('word_review.db');

  // 创建单词表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word TEXT NOT NULL UNIQUE,
      phonetic TEXT,
      definition TEXT NOT NULL,
      partOfSpeech TEXT,
      split TEXT,
      mnemonic TEXT,
      sentence TEXT,
      difficulty REAL DEFAULT 0.5,
      stability REAL DEFAULT 1.0,
      last_review TEXT,
      next_review TEXT,
      avg_response_time REAL DEFAULT 20.0,
      is_mastered INTEGER DEFAULT 0,
      review_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_words_next_review ON words(next_review);
    CREATE INDEX IF NOT EXISTS idx_words_is_mastered ON words(is_mastered);
  `);

  // 创建词库表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS wordbooks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      word_count INTEGER DEFAULT 0,
      is_preset INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 创建词库-单词关联表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS wordbook_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      wordbook_id INTEGER NOT NULL,
      word_id INTEGER NOT NULL,
      FOREIGN KEY (wordbook_id) REFERENCES wordbooks(id) ON DELETE CASCADE,
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE,
      UNIQUE(wordbook_id, word_id)
    );
  `);

  // 创建编码表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS codes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      letter TEXT NOT NULL UNIQUE,
      chinese TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // 创建复习记录表
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS review_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      word_id INTEGER NOT NULL,
      score REAL NOT NULL,
      response_time REAL NOT NULL,
      reviewed_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (word_id) REFERENCES words(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_review_logs_word_id ON review_logs(word_id);
    CREATE INDEX IF NOT EXISTS idx_review_logs_reviewed_at ON review_logs(reviewed_at);
  `);

  // 初始化预置词库
  await initPresetWordbook();

  // 初始化编码表
  await initCodes();

  return db;
}
```

### 7.2 数据库版本控制

```typescript
// 当前数据库版本
const DB_VERSION = 6;

// 升级数据库
async function upgradeDatabase(db: SQLite.SQLiteDatabase, currentVersion: number) {
  if (currentVersion < 2) {
    // 版本2：添加 avg_response_time 字段
    await db.execAsync(`ALTER TABLE words ADD COLUMN avg_response_time REAL DEFAULT 20.0`);
  }

  if (currentVersion < 3) {
    // 版本3：添加 wordbook_words 表
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS wordbook_words (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        wordbook_id INTEGER NOT NULL,
        word_id INTEGER NOT NULL,
        UNIQUE(wordbook_id, word_id)
      )
    `);
  }

  if (currentVersion < 4) {
    // 版本4：添加 codes 表
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS codes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        letter TEXT NOT NULL UNIQUE,
        chinese TEXT NOT NULL
      )
    `);
  }

  if (currentVersion < 5) {
    // 版本5：添加 review_logs 表
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS review_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word_id INTEGER NOT NULL,
        score REAL NOT NULL,
        response_time REAL NOT NULL,
        reviewed_at TEXT DEFAULT (datetime('now'))
      )
    `);
  }

  if (currentVersion < 6) {
    // 版本6：调整稳定性初始值
    await db.execAsync(`UPDATE words SET stability = 1.0 WHERE stability < 1.0`);
  }

  // 更新版本号
  await db.execAsync(`INSERT OR REPLACE INTO meta (key, value) VALUES ('version', ${DB_VERSION})`);
}
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

// 更新编码
updateCode(id: number, updates: Partial<Code>): Promise<void>

// 删除编码
deleteCode(id: number): Promise<void>
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
  MINIMUM_STABILITY: 1.0, // 初始稳定性设为1.0天
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

**示例：View 组件**

```typescript
// React Native
<View style={styles.container}>
  <Text>Hello</Text>
</View>

// uni-app
<view class="container">
  <text>Hello</text>
</view>
```

**示例：TouchableOpacity 组件**

```typescript
// React Native
<TouchableOpacity onPress={handlePress}>
  <Text>Click me</Text>
</TouchableOpacity>

// uni-app
<view @click="handlePress">
  <text>Click me</text>
</view>
```

**示例：FlatList 组件**

```typescript
// React Native
<FlatList
  data={words}
  renderItem={({ item }) => <WordCard word={item} />}
  keyExtractor={item => item.id.toString()}
/>

// uni-app
<scroll-view scroll-y>
  <view v-for="word in words" :key="word.id">
    <WordCard :word="word" />
  </view>
</scroll-view>
```

### 10.2 状态管理迁移

**React Context → Pinia**

```typescript
// React Context
const ThemeContext = createContext<ThemeContextType>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// 使用
const { isDark, toggleTheme } = useContext(ThemeContext);

// Pinia (uni-app)
// stores/theme.ts
import { defineStore } from 'pinia';

export const useThemeStore = defineStore('theme', {
  state: () => ({
    isDark: false,
  }),

  actions: {
    toggleTheme() {
      this.isDark = !this.isDark;
    },
  },
});

// 使用
import { useThemeStore } from '@/stores/theme';

const { isDark, toggleTheme } = useThemeStore();
```

### 10.3 路由迁移

**Expo Router → uni-app pages.json**

```typescript
// Expo Router (文件系统路由)
client/app/
├── _layout.tsx
├── index.tsx
├── review.tsx
└── word-detail.tsx

// uni-app (配置式路由)
// pages.json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "navigationBarTitleText": "单词本"
      }
    },
    {
      "path": "pages/review/review",
      "style": {
        "navigationBarTitleText": "复习"
      }
    },
    {
      "path": "pages/word-detail/word-detail",
      "style": {
        "navigationBarTitleText": "单词详情"
      }
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

**路由跳转**

```typescript
// Expo Router
import { useRouter } from 'expo-router';
const router = useRouter();

// 导航
router.push('/word-detail', { id: 123 });
router.replace('/index');
router.back();

// uni-app
// 导航
uni.navigateTo({
  url: '/pages/word-detail/word-detail?id=123'
});

uni.redirectTo({
  url: '/pages/index/index'
});

uni.navigateBack();
```

**获取路由参数**

```typescript
// Expo Router
import { useLocalSearchParams } from 'expo-router';
const { id } = useLocalSearchParams<{ id: string }>();

// uni-app
onLoad((options) => {
  const id = options.id;
});
```

### 10.4 数据库迁移

**expo-sqlite → uni.sqlite**

```typescript
// expo-sqlite
import * as SQLite from 'expo-sqlite';

const db = await SQLite.openDatabaseAsync('word_review.db');
const result = await db.getAllAsync<any>('SELECT * FROM words');
await db.execAsync('INSERT INTO words (word) VALUES ("test")');

// uni-app (H5)
import { openDB } from 'idb';

const db = await openDB('word_review', 1, {
  upgrade(db) {
    db.createObjectStore('words', { keyPath: 'id', autoIncrement: true });
  }
});

const result = await db.getAll('words');
await db.add('words', { word: 'test' });

// uni-app (App)
import Database from '@/utils/database/sqlite.js';

const db = new Database('word_review.db');
const result = await db.select('SELECT * FROM words');
await db.execute('INSERT INTO words (word) VALUES (?)', ['test']);
```

### 10.5 本地存储迁移

**AsyncStorage → uni.setStorage**

```typescript
// AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';

await AsyncStorage.setItem('key', 'value');
const value = await AsyncStorage.getItem('key');

// uni-app
uni.setStorage({
  key: 'key',
  data: 'value',
});

uni.getStorage({
  key: 'key',
  success: (res) => {
    const value = res.data;
  }
});
```

### 10.6 主题系统迁移

```typescript
// React Context
const ThemeContext = createContext({
  isDark: false,
  theme: lightTheme,
  toggleTheme: () => {},
});

// uni-app (CSS变量 + uni.getSystemInfo)
// uni.scss
:root {
  --primary-color: #4CAF50;
  --text-primary: #000000;
  --text-secondary: #666666;
  --background-root: #FFFFFF;
  --border-color: #E0E0E0;
}

[data-theme="dark"] {
  --primary-color: #81C784;
  --text-primary: #FFFFFF;
  --text-secondary: #AAAAAA;
  --background-root: #121212;
  --border-color: #333333;
}

// 使用
<script setup>
import { onMounted, ref } from 'vue';

const isDark = ref(false);

onMounted(() => {
  const systemInfo = uni.getSystemInfoSync();
  // 根据系统主题或用户设置切换主题
});

const toggleTheme = () => {
  isDark.value = !isDark.value;
  document.documentElement.setAttribute('data-theme', isDark.value ? 'dark' : 'light');
};
</script>

<template>
  <view :style="{ backgroundColor: 'var(--background-root)' }">
    <text :style="{ color: 'var(--text-primary)' }">Hello</text>
  </view>
</template>
```

### 10.7 图标库迁移

**@expo/vector-icons → uni-icons**

```typescript
// @expo/vector-icons
import { FontAwesome6 } from '@expo/vector-icons';

<FontAwesome6 name="book" size={20} color="#4CAF50" />

// uni-icons
<uni-icons type="book" size="20" color="#4CAF50" />

// 或使用自定义图标
<image src="/static/icons/book.png" style="width: 20px; height: 20px;" />
```

### 10.8 手势处理迁移

**react-native-gesture-handler → uni-app 手势事件**

```typescript
// react-native-gesture-handler
import { PanResponder } from 'react-native-gesture-handler';

const panResponder = PanResponder.create({
  onStartShouldSetPanResponder: () => true,
  onPanResponderMove: (evt) => {
    // 处理手势
  },
});

// uni-app
<view
  @touchstart="handleTouchStart"
  @touchmove="handleTouchMove"
  @touchend="handleTouchEnd"
>
  <!-- 内容 -->
</view>

<script setup>
const handleTouchStart = (e) => {
  const touch = e.touches[0];
  console.log('Touch start:', touch.x, touch.y);
};

const handleTouchMove = (e) => {
  const touch = e.touches[0];
  console.log('Touch move:', touch.x, touch.y);
};

const handleTouchEnd = (e) => {
  console.log('Touch end');
};
</script>
```

### 10.9 加载提示迁移

**ActivityIndicator → uni.showLoading**

```typescript
// React Native
<ActivityIndicator size="large" color="#4CAF50" />

// uni-app
// 显示加载
uni.showLoading({
  title: '加载中...',
  mask: true,
});

// 隐藏加载
uni.hideLoading();
```

### 10.10 弹窗提示迁移

**Alert.alert → uni.showModal**

```typescript
// React Native
Alert.alert(
  '提示',
  '确定要删除吗？',
  [
    { text: '取消', style: 'cancel' },
    { text: '删除', style: 'destructive', onPress: () => {} }
  ]
);

// uni-app
uni.showModal({
  title: '提示',
  content: '确定要删除吗？',
  cancelText: '取消',
  confirmText: '删除',
  confirmColor: '#FF0000',
  success: (res) => {
    if (res.confirm) {
      // 用户点击了删除
    }
  }
});
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

4. **FSRS算法**
   - ✅ 稳定性计算（分段增长）
   - ✅ 间隔计算（分段）
   - ✅ 掌握判断（动态标准）
   - ✅ 时间权重调整

### 12.2 UI测试

1. **响应式布局**
   - ✅ 不同屏幕尺寸适配
   - ✅ 横竖屏适配

2. **主题切换**
   - ✅ 亮色主题
   - ✅ 暗色主题
   - ✅ 系统主题跟随

3. **交互体验**
   - ✅ 点击反馈
   - ✅ 加载状态
   - ✅ 错误提示

### 12.3 性能测试

1. **数据库性能**
   - ✅ 大量单词加载速度
   - ✅ 搜索性能
   - ✅ 复习队列生成速度

2. **内存管理**
   - ✅ 大量单词的内存占用
   - ✅ 图片缓存

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

### 13.3 性能优化

1. **列表渲染**
   - 使用虚拟列表（uni-app 的 `scroll-view` + 分页）
   - 避免一次性加载过多数据

2. **数据库查询**
   - 添加索引
   - 使用分页查询
   - 避免频繁查询

3. **图片处理**
   - 使用懒加载
   - 压缩图片
   - 使用 CDN

---

## 14. 总结

本文档详细描述了单词记忆应用的所有关键信息，包括：

1. **项目概述**：应用的核心特色和架构
2. **技术栈对比**：React Native 到 uni-app 的映射关系
3. **项目结构**：原项目和目标项目的目录结构
4. **数据结构设计**：所有数据模型的详细定义
5. **核心算法实现**：FSRS算法和相似度算法的完整代码
6. **页面设计与功能**：每个页面的详细功能说明和实现逻辑
7. **数据库设计**：数据库表结构和初始化代码
8. **API设计**：所有数据访问接口的定义
9. **配置文件**：复习配置常量的详细说明
10. **迁移要点**：React Native 到 uni-app 的组件、状态管理、路由等迁移指南
11. **关键实现细节**：复习队列生成、释义匹配、自动补充等核心逻辑
12. **测试要点**：功能、UI、性能测试清单
13. **注意事项**：uni-app 平台差异和优化建议

使用本文档，其他AI应该能够准确理解应用的所有细节，并将其成功迁移到uni-app项目中。

---

## 附录

### A. 预置编码表

字母编码对照表用于辅助记忆单词的拆分：

| 字母 | 中文谐音 | 示例 |
|-----|---------|------|
| A | 阿姨 | apple (a-p-p-l-e) → 阿姨婆婆爱 |
| B | 笔 | book (b-o-o-k) → 笔呜呜咳 |
| C | 西 | cat (c-a-t) → 西阿姨特 |
| D | 弟 | dog (d-o-g) → 弟呜鸡 |
| E | 姨 | egg (e-g-g) → 姨鸡鸡 |
| F | 佛 | fish (f-i-s-h) → 佛爱师海 |
| G | 鸡 | girl (g-i-r-l) → 鸡阿姨热了 |
| H | 喝 | house (h-o-u-s-e) → 喝呜屋师姨 |
| I | 爱 | ice (i-c-e) → 爱师姨 |
| J | 姐 | juice (j-u-i-c-e) → 姐又爱师姨 |
| K | 客 | key (k-e-y) → 客姨外 |
| L | 拉 | love (l-o-v-e) → 拉呜爱外 |
| M | 妈 | mom (m-o-m) → 妈呜妈 |
| N | 你 | name (n-a-m-e) → 你阿姨妈外 |
| O | 呜 | orange (o-r-a-n-g-e) → 呜阿姨奶鸡外 |
| P | 婆 | pen (p-e-n) → 婆姨你 |
| Q | 妻 | question (q-u-e-s-t-i-o-n) → 妻又爱师体阿姨呜 |
| R | 热 | red (r-e-d) → 热姨弟 |
| S | 师 | sun (s-u-n) → 师又你 |
| T | 特 | tea (t-e-a) → 特姨阿 |
| U | 屋 | umbrella (u-m-b-r-e-l-l-a) → 屋妈笔热爱了阿姨 |
| V | 五 | vase (v-a-s-e) → 五阿姨师姨 |
| W | 我 | water (w-a-t-e-r) → 我阿姨特热 |
| X | 蜥 | fox (f-o-x) → 佛呜蜥 |
| Y | 外 | year (y-e-a-r) → 外姨阿姨热 |
| Z | 则 | zoo (z-o-o) → 则呜呜 |

### B. 参考资料

1. [FSRS算法论文](https://arxiv.org/abs/2309.07472)
2. [Expo Router文档](https://docs.expo.dev/router/introduction/)
3. [uni-app官方文档](https://uniapp.dcloud.net.cn/)
4. [Pinia文档](https://pinia.vuejs.org/)
5. [SQLite文档](https://www.sqlite.org/docs.html)

### C. 版本历史

- v1.0.0 (2026-02-26): 初始版本，完整迁移文档
