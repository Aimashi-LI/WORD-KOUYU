# 单词记忆应用 - 完整技术文档（AI迁移专用版）

## 📋 文档说明

本文档详细描述了单词记忆应用的**页面设计、功能逻辑、技术架构**，供AI理解和迁移到HBuilderX 4.87使用。

**文档版本**: 1.0
**创建日期**: 2024
**适用项目**: word-review-web

---

## 🏗️ 技术架构

### 1. 整体架构

```
单词记忆应用
├── 前端框架：React 18 + TypeScript
├── 路由：React Router DOM
├── 构建工具：Vite
├── 数据存储：localStorage
├── 样式：CSS (CSS Variables)
└── 核心算法：FSRS (Free Spaced Repetition Scheduler)
```

### 2. 项目结构

```
word-review-web/
├── src/
│   ├── pages/              # 页面组件
│   │   ├── Home.tsx        # 首页（单词列表）
│   │   ├── Detail.tsx      # 详情页
│   │   ├── Review.tsx      # 复习页
│   │   └── Profile.tsx     # 个人中心
│   ├── types/              # 类型定义
│   │   └── index.ts        # 核心类型
│   ├── utils/              # 工具函数
│   │   ├── fsrs.ts         # FSRS算法
│   │   ├── date.ts         # 日期处理
│   │   └── storage.ts      # 数据存储
│   ├── App.tsx             # 应用入口
│   ├── main.tsx            # 主入口
│   ├── App.css             # 应用样式
│   └── index.css           # 全局样式
```

### 3. 核心数据结构

#### Word 类型（单词实体）

```typescript
interface Word {
  id: number;                    // 唯一标识（时间戳）
  word: string;                  // 单词
  meaning: string;               // 含义
  pronunciation?: string;        // 发音（可选）
  example?: string;              // 例句（可选）
  splitParts?: string;           // 拆分（用空格分隔，如 "w ay"）
  mnemonicSentence?: string;     // 助记句（可选）
  stability: number;             // 稳定性（天数）
  difficulty: number;            // 难度（1-10）
  reviewCount: number;           // 复习次数
  masteryLevel: 'low' | 'medium' | 'high';  // 掌握等级
  lastReviewDate?: string;       // 最后复习日期（ISO格式）
  nextReviewDate: string;        // 下次复习日期（ISO格式）
  createdAt: string;             // 创建日期（ISO格式）
}
```

#### FSRSResult 类型（算法结果）

```typescript
interface FSRSResult {
  stability: number;             // 新的稳定性（天数）
  difficulty: number;            // 新的难度（1-10）
  interval: number;              // 间隔（小时）
  masteryLevel: 'low' | 'medium' | 'high';  // 新的掌握等级
}
```

#### ReviewRating 类型（评分）

```typescript
type ReviewRating = 0 | 1 | 2 | 3 | 4 | 5;
// 0: 不记得
// 2: 模糊
// 3: 一般
// 4: 记得
// 5: 完全记住
```

---

## 📱 页面设计详解

## 页面 1: Home（首页）- 单词列表

### 1.1 页面布局

```
┌─────────────────────────────────┐
│      统计卡片区域               │
│  ┌──────┐ ┌──────┐ ┌──────┐    │
│  │总单词│ │待复习│ │掌握率│    │
│  │  10  │ │   5  │ │ 60%  │    │
│  └──────┘ └──────┘ └──────┘    │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│      搜索栏                     │
│  [搜索单词...]   [开始复习]    │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│      排序按钮                   │
│  [按复习时间] [按掌握程度]     │
│  [按复习次数]                  │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│      单词列表（可滚动）         │
│  ┌─────────────────────────┐   │
│  │ way                   ✓  │   │
│  │ 方式、方法             [中]│   │
│  │ [weɪ]  下次复习: 明天    │   │
│  └─────────────────────────┘   │
│  ┌─────────────────────────┐   │
│  │ hello                 ✓  │   │
│  │ 你好                   [高]│   │
│  │ [həˈləʊ] 下次复习: 3天后 │   │
│  └─────────────────────────┘   │
│        ... 更多单词            │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│         [+ 添加单词]            │
└─────────────────────────────────┘
```

### 1.2 功能逻辑

#### 1.2.1 初始化加载

```typescript
useEffect(() => {
  loadWords();    // 加载单词列表
  loadStats();    // 加载统计数据
}, [searchText, sortBy]);
```

**执行步骤：**
1. 从 localStorage 读取所有单词数据
2. 根据搜索条件过滤
3. 根据排序条件排序
4. 更新 words 状态
5. 计算统计数据（总单词、待复习、掌握率）

#### 1.2.2 搜索功能

```typescript
const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
  setSearchText(e.target.value);
};
```

**过滤逻辑：**
```typescript
// 搜索条件
if (filter.search) {
  const searchTerm = filter.search.toLowerCase();
  words = words.filter(
    (w) =>
      w.word.toLowerCase().includes(searchTerm) ||
      w.meaning.toLowerCase().includes(searchTerm)
  );
}
```

#### 1.2.3 排序功能

**按复习时间排序：**
```typescript
words.sort((a, b) =>
  new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime()
);
```

**按掌握程度排序：**
```typescript
words.sort((a, b) => b.stability - a.stability);
```

**按复习次数排序：**
```typescript
words.sort((a, b) => b.reviewCount - a.reviewCount);
```

#### 1.2.4 添加单词流程

**步骤 1：打开弹窗**
```typescript
setShowAddModal(true);
setFormData({
  word: '',
  meaning: '',
  pronunciation: '',
  example: '',
  splitParts: '',
  mnemonicSentence: '',
});
```

**步骤 2：用户填写表单**
- 必填：单词、含义
- 可选：发音、例句、拆分、助记句

**步骤 3：提交数据**
```typescript
const handleAddWord = (e: React.FormEvent) => {
  e.preventDefault();

  // 验证必填字段
  if (!formData.word || !formData.meaning) {
    alert('请填写单词和含义');
    return;
  }

  // 创建新单词
  const newWord: Word = {
    id: Date.now(),                              // 时间戳作为ID
    word: formData.word,
    meaning: formData.meaning,
    pronunciation: formData.pronunciation || undefined,
    example: formData.example || undefined,
    splitParts: formData.splitParts || undefined,
    mnemonicSentence: formData.mnemonicSentence || undefined,
    stability: 0,                                 // 初始稳定性为0
    difficulty: 5,                                // 初始难度为5
    reviewCount: 0,                              // 初始复习次数为0
    masteryLevel: 'low',                         // 初始掌握等级为低
    nextReviewDate: nextReviewDate.toISOString(), // 1天后复习
    createdAt: now.toISOString(),
  };

  // 保存到 localStorage
  saveAllWords([...words, newWord]);

  // 关闭弹窗并刷新列表
  setShowAddModal(false);
  loadWords();
};
```

#### 1.2.5 点击单词跳转

```typescript
const goToDetail = (id: number) => {
  navigate(`/detail/${id}`);
};
```

### 1.3 样式规范

#### 颜色方案

```css
:root {
  --primary-color: #4CAF50;          /* 主色调（绿色） */
  --text-primary: #333;              /* 主文字颜色 */
  --text-secondary: #666;            /* 次要文字颜色 */
  --text-muted: #999;                /* 辅助文字颜色 */
  --bg-primary: #FFFFFF;             /* 主背景（白色） */
  --bg-secondary: #F8F8F8;           /* 次背景（浅灰） */
  --bg-tertiary: #F5F5F5;            /* 第三背景（更浅灰） */
  --border-color: #E0E0E0;           /* 边框颜色 */
}
```

#### 掌握等级颜色

```css
/* 低掌握 - 红色 */
.badge-error {
  background-color: #FFEBEE;
  color: #F44336;
}

/* 中掌握 - 橙色 */
.badge-warning {
  background-color: #FFF3E0;
  color: #FF9800;
}

/* 高掌握 - 绿色 */
.badge-success {
  background-color: #E8F5E9;
  color: #4CAF50;
}
```

#### 卡片样式

```css
.word-item {
  background-color: var(--bg-primary);
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}

.word-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}
```

---

## 页面 2: Detail（详情页）

### 2.1 页面布局

```
┌─────────────────────────────────┐
│  ← 返回                          │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│      单词信息卡片               │
│  ┌─────────────────────────┐   │
│  │      way               [中]│
│  │  [weɪ]                     │
│  │  方式、方法                │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│      统计信息                   │
│  ┌──────┐ ┌──────┐            │
│  │复习次数│ 稳定性│            │
│  │   3   │ 2.5天 │            │
│  └──────┘ └──────┘            │
│  ┌──────┐ ┌──────┐            │
│  │ 难度  │下次复习│            │
│  │  4.5  │ 明天   │            │
│  └──────┘ └──────┘            │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│      例句                       │
│  There are many ways to solve  │
│  this problem.                  │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│      单词拆分                   │
│  点击字母开始拆分                │
│  [w] [ay]                       │
│  [输入拆分后的部分，用空格分隔]  │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│      助记句                     │
│  例：王(w)阿姨(ay)教我方法       │
│  [输入助记句...]               │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│  [标记为已复习]                 │
│  [重置进度]                    │
│  [删除单词]                    │
└─────────────────────────────────┘
```

### 2.2 功能逻辑

#### 2.2.1 页面加载

```typescript
useEffect(() => {
  if (id) {
    loadWordDetail();
  }
}, [id]);

const loadWordDetail = () => {
  if (!id) return;
  const loadedWord = getWordById(Number(id));
  if (loadedWord) {
    setWord(loadedWord);
    if (loadedWord.splitParts) {
      setSplitParts(loadedWord.splitParts.split(' '));
    }
  } else {
    navigate('/');  // 单词不存在，返回首页
  }
};
```

#### 2.2.2 保存拆分

```typescript
const handleSaveSplit = (value: string) => {
  if (!word || !value) return;

  try {
    updateWord(word.id, { splitParts: value });
    setWord({ ...word, splitParts: value });
    setSplitParts(value.split(' '));
    alert('保存成功');
  } catch (error) {
    alert('保存失败：' + (error as Error).message);
  }
};
```

**触发时机：**
- 输入框失去焦点时（`onBlur`）

#### 2.2.3 保存助记句

```typescript
const handleSaveMnemonic = (value: string) => {
  if (!word || !value) return;

  try {
    updateWord(word.id, { mnemonicSentence: value });
    setWord({ ...word, mnemonicSentence: value });
    alert('保存成功');
  } catch (error) {
    alert('保存失败：' + (error as Error).message);
  }
};
```

#### 2.2.4 标记为已复习

```typescript
const handleMarkReviewed = () => {
  if (!word) return;

  // 默认评分为 3（一般）
  const rating: ReviewRating = 3;

  // 调用 FSRS 算法计算新的状态
  const fsrsResult = calculateFSRS(word, rating);

  const now = new Date();
  const nextReviewDate = new Date(
    now.getTime() + fsrsResult.interval * 60 * 60 * 1000
  );

  try {
    updateWord(word.id, {
      stability: fsrsResult.stability,
      difficulty: fsrsResult.difficulty,
      reviewCount: word.reviewCount + 1,
      masteryLevel: fsrsResult.masteryLevel,
      lastReviewDate: now.toISOString(),
      nextReviewDate: nextReviewDate.toISOString(),
    });

    alert('复习完成');
    navigate('/');  // 返回首页
  } catch (error) {
    alert('操作失败：' + (error as Error).message);
  }
};
```

#### 2.2.5 重置进度

```typescript
const handleResetProgress = () => {
  if (!word) return;

  if (confirm('确定要重置这个单词的学习进度吗？')) {
    const now = new Date();
    const nextReviewDate = new Date(
      now.getTime() + 24 * 60 * 60 * 1000  // 1天后
    );

    try {
      updateWord(word.id, {
        stability: 0,
        difficulty: 5,
        reviewCount: 0,
        masteryLevel: 'low',
        lastReviewDate: undefined,
        nextReviewDate: nextReviewDate.toISOString(),
      });

      alert('已重置');
      loadWordDetail();  // 重新加载详情
    } catch (error) {
      alert('操作失败：' + (error as Error).message);
    }
  }
};
```

#### 2.2.6 删除单词

```typescript
const handleDeleteWord = () => {
  if (!word) return;

  if (confirm('确定要删除这个单词吗？')) {
    try {
      deleteWord(word.id);
      alert('已删除');
      navigate('/');  // 返回首页
    } catch (error) {
      alert('删除失败：' + (error as Error).message);
    }
  }
};
```

---

## 页面 3: Review（复习页）

### 3.1 页面布局

```
┌─────────────────────────────────┐
│      统计头部                   │
│  ┌──────┐ ┌──────┐ ┌──────┐   │
│  │待复习│ │今日完成│ │掌握率│   │
│  │   5  │ │   3   │ │ 60%  │   │
│  └──────┘ └──────┘ └──────┘   │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│      复习卡片                   │
│  ┌─────────────────────────┐   │
│  │                           │   │
│  │         way              │   │
│  │      [weɪ]               │   │
│  │                           │   │
│  │    [查看答案]             │   │
│  │                           │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│         1 / 20                  │
└─────────────────────────────────┘
```

**翻转后（显示答案）：**

```
┌─────────────────────────────────┐
│      复习卡片                   │
│  ┌─────────────────────────┐   │
│  │         way              │   │
│  │      [weɪ]               │   │
│  │  方式、方法                │   │
│  │                           │   │
│  │  例句：                   │   │
│  │  There are many ways...   │   │
│  │                           │   │
│  │  拆分：                   │   │
│  │  [w] [ay]                 │   │
│  │                           │   │
│  │  助记句：                 │   │
│  │  王(w)阿姨(ay)教我方法     │   │
│  │                           │   │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ [不记得] [模糊] [一般] [记得]  │
│            [完全记住]           │
└─────────────────────────────────┘
```

### 3.2 功能逻辑

#### 3.2.1 加载复习队列

```typescript
useEffect(() => {
  loadReviewQueue();
  loadStats();
}, []);

const loadReviewQueue = () => {
  const queue = getReviewQueue(20);  // 最多20个单词
  setReviewQueue(queue);
  setCurrentIndex(0);
  setShowAnswer(false);
};
```

**智能排序逻辑：**
```typescript
export const getReviewQueue = (limit: number = 20): Word[] => {
  const words = getAllWords();
  const now = new Date();

  // 筛选：需要复习且未掌握的单词
  const reviewWords = words.filter((w) => {
    const nextReview = new Date(w.nextReviewDate);
    return nextReview <= now && w.masteryLevel !== 'high';
  });

  // 智能排序
  reviewWords.sort((a, b) => {
    const aNextReview = new Date(a.nextReviewDate);
    const bNextReview = new Date(b.nextReviewDate);

    // 规则1：超期单词优先
    const aOverdue = aNextReview < now;
    const bOverdue = bNextReview < now;

    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // 规则2：稳定性低的优先
    if (a.stability !== b.stability) {
      return a.stability - b.stability;
    }

    // 规则3：难度高的优先
    return b.difficulty - a.difficulty;
  });

  return reviewWords.slice(0, limit);
};
```

#### 3.2.2 查看答案

```typescript
const handleShowAnswer = () => {
  setShowAnswer(true);
};
```

#### 3.2.3 评分并切换到下一个

```typescript
const handleRateWord = (rating: ReviewRating) => {
  if (!currentWord) return;

  // 1. 调用 FSRS 算法
  const fsrsResult = calculateFSRS(currentWord, rating);

  // 2. 计算下次复习时间
  const now = new Date();
  const nextReviewDate = new Date(
    now.getTime() + fsrsResult.interval * 60 * 60 * 1000
  );

  // 3. 更新单词数据
  try {
    updateWord(currentWord.id, {
      stability: fsrsResult.stability,
      difficulty: fsrsResult.difficulty,
      reviewCount: currentWord.reviewCount + 1,
      masteryLevel: fsrsResult.masteryLevel,
      lastReviewDate: now.toISOString(),
      nextReviewDate: nextReviewDate.toISOString(),
    });

    // 4. 显示反馈
    let message = '';
    switch (rating) {
      case 0: message = '没关系，下次加油！'; break;
      case 2: message = '有点模糊，继续努力'; break;
      case 3: message = '一般，还需加强'; break;
      case 4: message = '记得不错！'; break;
      case 5: message = '完全记住，太棒了！'; break;
    }
    alert(message);

    // 5. 延迟后切换到下一个
    setTimeout(() => {
      nextWord();
    }, 500);
  } catch (error) {
    alert('操作失败：' + (error as Error).message);
  }
};
```

#### 3.2.4 切换到下一个单词

```typescript
const nextWord = () => {
  if (currentIndex < reviewQueue.length - 1) {
    // 还有更多单词，显示下一个
    setCurrentIndex(currentIndex + 1);
    setShowAnswer(false);
  } else {
    // 队列完成，自动补充
    loadReviewQueue();
    loadStats();

    if (reviewQueue.length === 0) {
      alert('复习完成！');
      navigate('/');
    }
  }
};
```

---

## 页面 4: Profile（个人中心）

### 4.1 页面布局

```
┌─────────────────────────────────┐
│      个人中心                   │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│      统计卡片                   │
│  ┌──────┐ ┌──────┐            │
│  │ 📚    │ ⏰    │            │
│  │  10   │   5   │            │
│  │总单词  │待复习  │            │
│  └──────┘ └──────┘            │
│  ┌──────┐ ┌──────┐            │
│  │ ✅    │ 📊    │            │
│  │   3   │  60%  │            │
│  │今日完成│掌握率  │            │
│  └──────┘ └──────┘            │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│      数据管理                   │
│  [📤 导出数据] [📥 导入数据]   │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│      危险操作                   │
│  [🗑️ 清空所有数据]             │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│      关于                       │
│  应用名称：单词记忆              │
│  版本：1.0.0                    │
│  技术栈：React + TypeScript     │
│  算法：FSRS                    │
└─────────────────────────────────┘
```

### 4.2 功能逻辑

#### 4.2.1 计算统计数据

```typescript
export const getStats = () => {
  const words = getAllWords();
  const now = new Date();
  const todayStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  // 待复习数量
  const pendingCount = words.filter((w) => {
    const nextReview = new Date(w.nextReviewDate);
    return nextReview <= now && w.masteryLevel !== 'high';
  }).length;

  // 今日已完成数量
  const completedCount = words.filter((w) => {
    if (!w.lastReviewDate) return false;
    const lastReview = new Date(w.lastReviewDate);
    return lastReview >= todayStart;
  }).length;

  // 总掌握率
  const total = words.length;
  const highMastery = words.filter((w) => w.masteryLevel === 'high').length;
  const masteryRate = total > 0
    ? Math.round((highMastery / total) * 100)
    : 0;

  return {
    total,
    pendingCount,
    completedCount,
    masteryRate,
  };
};
```

#### 4.2.2 导出数据

```typescript
const handleExport = () => {
  try {
    // 1. 获取所有单词数据
    const data = exportData();  // 返回 JSON 字符串

    // 2. 创建 Blob 对象
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // 3. 创建下载链接
    const a = document.createElement('a');
    a.href = url;
    a.download = `word-review-export-${new Date().toISOString().split('T')[0]}.json`;

    // 4. 触发下载
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('导出成功！');
  } catch (error) {
    alert('导出失败：' + (error as Error).message);
  }
};
```

#### 4.2.3 导入数据

```typescript
const handleImport = () => {
  setShowImportModal(true);
  setImportText('');
};

const handleImportSubmit = (e: React.FormEvent) => {
  e.preventDefault();

  if (!importText.trim()) {
    alert('请输入数据');
    return;
  }

  if (!confirm('导入将覆盖现有数据，确定要继续吗？')) {
    return;
  }

  try {
    const success = importData(importText);
    if (success) {
      alert('导入成功！');
      setShowImportModal(false);
      loadStats();
    } else {
      alert('导入失败：数据格式不正确');
    }
  } catch (error) {
    alert('导入失败：' + (error as Error).message);
  }
};
```

**导入数据验证：**
```typescript
export const importData = (jsonData: string): boolean => {
  try {
    const words = JSON.parse(jsonData) as Word[];

    // 验证数据格式
    if (!Array.isArray(words)) return false;

    // 验证每个单词对象
    for (const word of words) {
      if (
        !word.id ||
        !word.word ||
        !word.meaning ||
        typeof word.stability !== 'number' ||
        typeof word.difficulty !== 'number'
      ) {
        return false;
      }
    }

    saveAllWords(words);
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
};
```

#### 4.2.4 清空所有数据

```typescript
const handleClear = () => {
  if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
    try {
      clearAllData();  // localStorage.removeItem(STORAGE_KEY)
      alert('已清空所有数据');
      loadStats();
    } catch (error) {
      alert('操作失败：' + (error as Error).message);
    }
  }
};
```

---

## 🧠 核心算法：FSRS 详细说明

### 算法概述

**FSRS (Free Spaced Repetition Scheduler)** 是一个智能的间隔重复算法，根据用户的掌握程度动态调整复习间隔。

### 算法核心逻辑

```typescript
export const calculateFSRS = (
  word: Word,
  rating: ReviewRating
): FSRSResult => {
  // 输入参数
  const stability = word.stability || 0;   // 当前稳定性（天数）
  const difficulty = word.difficulty || 5;  // 当前难度（1-10）
  const rating = rating;                     // 用户评分（0-5）

  // 步骤1：计算新的难度
  const newDifficulty = Math.max(1, Math.min(10,
    difficulty - 0.4 * (rating - 2.5)
  ));

  // 步骤2：根据稳定性分段计算新的稳定性
  let newStability: number;

  if (stability < 1.0) {
    // 初始期（0-1天）：快速增长
    // 公式：新稳定性 = 旧稳定性 + 0.3 * (评分 - 2.5)
    newStability = stability + 0.3 * (rating - 2.5);

  } else if (stability < 7.0) {
    // 成长期（1-7天）：稳步提升
    // 公式：新稳定性 = 旧稳定性 * (1 + 0.1 * (评分 - 2.5))
    newStability = stability * (1 + 0.1 * (rating - 2.5));

  } else if (stability < 30.0) {
    // 稳定期（7-30天）：平缓增长
    // 公式：新稳定性 = 旧稳定性 * (1 + 0.05 * (评分 - 2.5))
    newStability = stability * (1 + 0.05 * (rating - 2.5));

  } else {
    // 巩固期（30天+）：缓慢巩固
    // 公式：新稳定性 = 旧稳定性 * (1 + 0.02 * (评分 - 2.5))
    newStability = stability * (1 + 0.02 * (rating - 2.5));
  }

  // 步骤3：确保稳定性至少为 0.1
  newStability = Math.max(0.1, newStability);

  // 步骤4：计算间隔（小时精度）
  const interval = Math.round(newStability * 24);

  // 步骤5：根据稳定性确定掌握等级
  let masteryLevel: 'low' | 'medium' | 'high';

  if (newStability < 2) {
    masteryLevel = 'low';      // < 2天：低掌握
  } else if (newStability < 10) {
    masteryLevel = 'medium';   // 2-10天：中掌握
  } else {
    masteryLevel = 'high';     // > 10天：高掌握
  }

  // 返回结果
  return {
    stability: newStability,
    difficulty: newDifficulty,
    interval,
    masteryLevel,
  };
};
```

### 算法参数说明

#### 评分含义

| 评分 | 含义 | 对稳定性的影响 |
|------|------|----------------|
| 0 | 不记得 | 大幅降低 |
| 1 | 几乎不记得 | 较大降低 |
| 2 | 模糊 | 略微降低 |
| 3 | 一般 | 保持不变 |
| 4 | 记得 | 略微提升 |
| 5 | 完全记住 | 大幅提升 |

#### 阶段特点

| 阶段 | 稳定性范围 | 增长系数 | 说明 |
|------|-----------|---------|------|
| 初始期 | 0-1天 | 0.3 | 快速增长，适应新词 |
| 成长期 | 1-7天 | 0.1 | 稳步提升，巩固记忆 |
| 稳定期 | 7-30天 | 0.05 | 平缓增长，保持记忆 |
| 巩固期 | 30天+ | 0.02 | 缓慢巩固，长期记忆 |

### 示例计算

**示例 1：新单词第一次复习**
```
输入：
  stability = 0
  difficulty = 5
  rating = 4（记得）

计算：
  newDifficulty = 5 - 0.4 * (4 - 2.5) = 5 - 0.6 = 4.4
  newStability = 0 + 0.3 * (4 - 2.5) = 0 + 0.45 = 0.45
  interval = 0.45 * 24 = 11小时
  masteryLevel = 'low'

输出：
  stability = 0.45天
  difficulty = 4.4
  interval = 11小时
  masteryLevel = 'low'
```

**示例 2：中等掌握单词**
```
输入：
  stability = 5
  difficulty = 4
  rating = 5（完全记住）

计算：
  newDifficulty = 4 - 0.4 * (5 - 2.5) = 4 - 1 = 3
  newStability = 5 * (1 + 0.1 * (5 - 2.5)) = 5 * 1.25 = 6.25
  interval = 6.25 * 24 = 150小时（约6天）
  masteryLevel = 'medium'

输出：
  stability = 6.25天
  difficulty = 3
  interval = 150小时
  masteryLevel = 'medium'
```

---

## 💾 数据存储详细说明

### localStorage 键名

```typescript
const STORAGE_KEY = 'wordreview_data';
```

### 数据格式

```json
[
  {
    "id": 1732000000000,
    "word": "way",
    "meaning": "方式、方法",
    "pronunciation": "weɪ",
    "example": "There are many ways to solve this problem.",
    "splitParts": "w ay",
    "mnemonicSentence": "王(w)阿姨(ay)教我方法",
    "stability": 2.5,
    "difficulty": 4.5,
    "reviewCount": 3,
    "masteryLevel": "medium",
    "lastReviewDate": "2024-11-20T10:30:00.000Z",
    "nextReviewDate": "2024-11-23T10:30:00.000Z",
    "createdAt": "2024-11-15T08:00:00.000Z"
  }
]
```

### CRUD 操作

#### 读取所有数据

```typescript
export const getAllWords = (): Word[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return [];
  }
};
```

#### 保存所有数据

```typescript
const saveAllWords = (words: Word[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
    throw new Error('保存失败，存储空间不足');
  }
};
```

#### 添加单词

```typescript
export const addWord = (
  wordData: Omit<Word, 'id' | 'reviewCount' | 'stability' | 'difficulty' | 'masteryLevel' | 'createdAt'>
): Word => {
  const words = getAllWords();

  const now = new Date();
  const nextReviewDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const newWord: Word = {
    ...wordData,
    id: Date.now(),  // 使用时间戳作为唯一ID
    stability: 0,
    difficulty: 5,
    reviewCount: 0,
    masteryLevel: 'low',
    lastReviewDate: undefined,
    nextReviewDate: nextReviewDate.toISOString(),
    createdAt: now.toISOString(),
  };

  words.push(newWord);
  saveAllWords(words);

  return newWord;
};
```

#### 更新单词

```typescript
export const updateWord = (
  id: number,
  updates: Partial<Word>
): Word | null => {
  const words = getAllWords();
  const index = words.findIndex((w) => w.id === id);

  if (index === -1) return null;

  words[index] = {
    ...words[index],
    ...updates,
  };

  saveAllWords(words);

  return words[index];
};
```

#### 删除单词

```typescript
export const deleteWord = (id: number): boolean => {
  const words = getAllWords();
  const filteredWords = words.filter((w) => w.id !== id);

  if (filteredWords.length === words.length) return false;

  saveAllWords(filteredWords);
  return true;
};
```

---

## 🎨 样式系统详细说明

### CSS 变量定义

```css
:root {
  /* 颜色变量 */
  --primary-color: #4CAF50;
  --secondary-color: #FF9800;
  --error-color: #F44336;
  --success-color: #4CAF50;

  /* 文字颜色 */
  --text-primary: #333;
  --text-secondary: #666;
  --text-muted: #999;
  --text-disabled: #CCCCCC;

  /* 背景颜色 */
  --bg-primary: #FFFFFF;
  --bg-secondary: #F8F8F8;
  --bg-tertiary: #F5F5F5;

  /* 边框颜色 */
  --border-color: #E0E0E0;
  --border-light: #EEEEEE;

  /* 阴影 */
  --shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 16px rgba(0, 0, 0, 0.12);

  /* 圆角 */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
}
```

### 暗色主题

```css
[data-theme='dark'] {
  --text-primary: #FFFFFF;
  --text-secondary: #B0B0B0;
  --text-muted: #757575;
  --text-disabled: #424242;

  --bg-primary: #1E1E1E;
  --bg-secondary: #2C2C2C;
  --bg-tertiary: #121212;

  --border-color: #424242;
  --border-light: #2C2C2C;
}
```

### 通用组件样式

#### 按钮样式

```css
.btn {
  padding: 12px 24px;
  border: none;
  border-radius: var(--radius-md);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.btn-primary {
  background-color: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: #43A047;
}

.btn-secondary {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover:not(:disabled) {
  background-color: var(--bg-tertiary);
}

.btn-danger {
  background-color: var(--error-color);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #D32F2F;
}
```

#### 输入框样式

```css
.input {
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 16px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: border-color 0.2s;
}

.input:focus {
  outline: none;
  border-color: var(--primary-color);
}
```

#### 卡片样式

```css
.card {
  background-color: var(--bg-primary);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-md);
}
```

#### 徽章样式

```css
.badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  display: inline-block;
}

.badge-success {
  background-color: #E8F5E9;
  color: #4CAF50;
}

.badge-warning {
  background-color: #FFF3E0;
  color: #FF9800;
}

.badge-error {
  background-color: #FFEBEE;
  color: #F44336;
}
```

### 响应式设计

```css
@media (max-width: 768px) {
  .container {
    padding: 0 16px;
  }

  .card {
    padding: 16px;
  }

  .btn {
    padding: 10px 20px;
    font-size: 14px;
  }

  /* 网格布局转为单列 */
  .stats-grid {
    grid-template-columns: 1fr;
  }

  /* 按钮组转为纵向 */
  .rating-buttons {
    flex-direction: column;
  }
}
```

---

## 🛣️ 路由设计

### 路由配置

```typescript
<Routes>
  <Route path="/" element={<Home />} />
  <Route path="/detail/:id" element={<Detail />} />
  <Route path="/review" element={<Review />} />
  <Route path="/profile" element={<Profile />} />
  <Route path="*" element={<Navigate to="/" replace />} />
</Routes>
```

### 路由说明

| 路径 | 页面 | 参数 | 说明 |
|------|------|------|------|
| `/` | Home | - | 首页（单词列表） |
| `/detail/:id` | Detail | `id` (number) | 单词详情页 |
| `/review` | Review | - | 智能复习页 |
| `/profile` | Profile | - | 个人中心 |

### 路由跳转

```typescript
// 声明式跳转
<Link to="/detail/123">查看详情</Link>

// 编程式跳转
const navigate = useNavigate();
navigate('/detail/123');
navigate('/review');
navigate('/');

// 获取路由参数
const { id } = useParams<{ id: string }>();
const wordId = Number(id);
```

---

## 📊 完整功能流程图

### 单词学习流程

```
用户添加单词
    ↓
填写单词和含义（必填）
    ↓
可选填写：发音、例句、拆分、助记句
    ↓
保存到 localStorage
    ↓
生成初始数据：
  - stability = 0
  - difficulty = 5
  - reviewCount = 0
  - masteryLevel = 'low'
  - nextReviewDate = 1天后
    ↓
单词出现在列表中
    ↓
点击单词进入详情页
    ↓
查看单词信息
    ↓
点击"标记为已复习"
    ↓
调用 FSRS 算法（默认评分3）
    ↓
更新单词数据
    ↓
计算下次复习时间
    ↓
返回首页
```

### 智能复习流程

```
用户点击"开始复习"
    ↓
加载复习队列（智能排序）
    ↓
显示第一个单词（正面）
    ↓
用户点击"查看答案"
    ↓
显示完整信息（背面）
    ↓
用户选择评分（0-5）
    ↓
调用 FSRS 算法
    ↓
更新单词数据
    ↓
显示反馈信息
    ↓
延迟0.5秒
    ↓
自动切换到下一个单词
    ↓
重复以上步骤
    ↓
队列完成
    ↓
自动补充队列
    ↓
如无单词，显示"复习完成"
```

### 数据管理流程

```
导出数据：
    1. 从 localStorage 读取所有数据
    2. 转换为 JSON 字符串
    3. 创建 Blob 对象
    4. 触发下载

导入数据：
    1. 用户粘贴 JSON 数据
    2. 验证数据格式
    3. 确认覆盖
    4. 保存到 localStorage
    5. 刷新页面

清空数据：
    1. 用户点击"清空所有数据"
    2. 确认操作
    3. 删除 localStorage 数据
    4. 刷新页面
```

---

## 🔧 迁移到 HBuilderX 4.87 的关键点

### 技术栈映射

| React 版 | HBuilderX 版 | 说明 |
|---------|-------------|------|
| React 18 | Vue 3 | 组件框架 |
| TypeScript | JavaScript / TypeScript | 语言 |
| Vite | HBuilderX 构建 | 构建工具 |
| React Router | uni-app 路由 | 路由 |
| localStorage | uni.storage | 数据存储 |
| CSS | uni.scss / CSS | 样式 |

### 核心功能迁移重点

#### 1. 数据存储

**React 版：**
```typescript
localStorage.setItem('key', JSON.stringify(data));
const data = JSON.parse(localStorage.getItem('key'));
```

**HBuilderX 版：**
```javascript
uni.setStorageSync('key', data);
const data = uni.getStorageSync('key');
```

#### 2. 页面跳转

**React 版：**
```typescript
const navigate = useNavigate();
navigate('/detail/123');
```

**HBuilderX 版：**
```javascript
uni.navigateTo({
  url: '/pages/detail/detail?id=123'
});

// 获取参数
onLoad(options) {
  const id = options.id;
}
```

#### 3. 条件渲染

**React 版：**
```typescript
{showAnswer && <div>答案内容</div>}
```

**HBuilderX 版：**
```html
<div v-if="showAnswer">答案内容</div>
```

#### 4. 列表渲染

**React 版：**
```typescript
{words.map((word) => (
  <div key={word.id}>{word.word}</div>
))}
```

**HBuilderX 版：**
```html
<div v-for="word in words" :key="word.id">
  {{ word.word }}
</div>
```

#### 5. 事件处理

**React 版：**
```typescript
<button onClick={handleClick}>点击</button>
<input onChange={handleChange} />
```

**HBuilderX 版：**
```html
<button @click="handleClick">点击</button>
<input @input="handleChange" />
```

#### 6. 状态管理

**React 版：**
```typescript
const [words, setWords] = useState<Word[]>([]);
setWords(newWords);
```

**HBuilderX 版：**
```javascript
data() {
  return {
    words: []
  }
},
methods: {
  loadWords() {
    this.words = getWords();
  }
}
```

### 样式迁移重点

#### Flex 布局

**React CSS：**
```css
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

**HBuilderX uni-app：**
```css
.container {
  display: flex;
  justify-content: center;
  align-items: center;
}
```
（基本一致）

#### 响应式单位

**React 版：**
- 使用 `px`
- 使用媒体查询 `@media`

**HBuilderX 版：**
- 使用 `rpx`（750rpx = 屏幕宽度）
- 使用条件编译 `/* #ifdef H5 */`

### 必须保持一致的部分

#### 1. 数据结构

**Word 类型必须完全一致：**
```javascript
{
  id: number,
  word: string,
  meaning: string,
  pronunciation: string,
  example: string,
  splitParts: string,
  mnemonicSentence: string,
  stability: number,
  difficulty: number,
  reviewCount: number,
  masteryLevel: 'low' | 'medium' | 'high',
  lastReviewDate: string,
  nextReviewDate: string,
  createdAt: string
}
```

#### 2. FSRS 算法

**算法逻辑必须完全一致，包括：**
- 四阶段稳定性计算
- 难度计算公式
- 间隔计算公式
- 掌握等级判断标准

#### 3. 页面布局

**每个页面的布局必须保持一致：**
- 统计卡片位置和样式
- 按钮位置和样式
- 卡片样式和阴影
- 颜色方案

#### 4. 交互逻辑

**交互流程必须保持一致：**
- 复习卡片翻转效果
- 评分反馈机制
- 数据导入导出流程
- 弹窗确认机制

---

## 📋 迁移检查清单

### 功能完整性检查

- [ ] 单词添加功能
- [ ] 单词列表展示
- [ ] 单词搜索功能
- [ ] 单词排序功能
- [ ] 单词详情展示
- [ ] 单词拆分编辑
- [ ] 助记句编辑
- [ ] FSRS 复习算法
- [ ] 智能复习队列
- [ ] 5级评分系统
- [ ] 学习统计展示
- [ ] 数据导出功能
- [ ] 数据导入功能
- [ ] 数据清空功能

### UI 一致性检查

- [ ] 颜色方案一致
- [ ] 卡片样式一致
- [ ] 按钮样式一致
- [ ] 输入框样式一致
- [ ] 徽章样式一致
- [ ] 布局结构一致
- [ ] 间距和圆角一致

### 算法一致性检查

- [ ] FSRS 算法公式一致
- [ ] 稳定性计算一致
- [ ] 难度计算一致
- [ ] 间隔计算一致
- [ ] 掌握等级判断一致
- [ ] 复习队列排序一致

### 数据一致性检查

- [ ] 数据结构一致
- [ ] 数据存储方式兼容
- [ ] 数据导入导出兼容
- [ ] ID 生成方式一致
- [ ] 日期格式一致

---

## 📚 附录

### A. 完整颜色参考

| 用途 | 颜色值 | CSS 变量 |
|------|--------|---------|
| 主色调 | #4CAF50 | `--primary-color` |
| 次色调 | #FF9800 | `--secondary-color` |
| 错误色 | #F44336 | `--error-color` |
| 成功色 | #4CAF50 | `--success-color` |
| 主文字 | #333333 | `--text-primary` |
| 次文字 | #666666 | `--text-secondary` |
| 辅助文字 | #999999 | `--text-muted` |
| 主背景 | #FFFFFF | `--bg-primary` |
| 次背景 | #F8F8F8 | `--bg-secondary` |
| 第三背景 | #F5F5F5 | `--bg-tertiary` |
| 边框 | #E0E0E0 | `--border-color` |

### B. 掌握等级判断标准

| 等级 | 稳定性范围 | 背景色 | 文字色 |
|------|-----------|--------|--------|
| 低掌握 | < 2天 | #FFEBEE | #F44336 |
| 中掌握 | 2-10天 | #FFF3E0 | #FF9800 |
| 高掌握 | > 10天 | #E8F5E9 | #4CAF50 |

### C. FSRS 算法参数速查

| 参数 | 值 | 说明 |
|------|-----|------|
| 初始稳定性 | 0 | 新单词的初始稳定性 |
| 初始难度 | 5 | 新单词的初始难度 |
| 初始掌握等级 | 'low' | 新单词的初始掌握等级 |
| 初始间隔 | 24小时 | 新单词的首次复习间隔 |
| 难度范围 | 1-10 | 难度的最小值和最大值 |
| 初始期增长系数 | 0.3 | 稳定性 < 1天的增长系数 |
| 成长期增长系数 | 0.1 | 稳定性 1-7天的增长系数 |
| 稳定期增长系数 | 0.05 | 稳定性 7-30天的增长系数 |
| 巩固期增长系数 | 0.02 | 稳定性 > 30天的增长系数 |
| 难度调整系数 | 0.4 | 每次评分对难度的影响 |
| 掌握阈值-低 | 2天 | 判断为低掌握的稳定性上限 |
| 掌握阈值-中 | 10天 | 判断为中掌握的稳定性上限 |

---

## 🎯 总结

本文档详细描述了单词记忆应用的：

1. **技术架构** - 完整的技术栈和项目结构
2. **数据结构** - 所有核心类型定义
3. **页面设计** - 4个页面的详细布局和交互
4. **功能逻辑** - 每个功能的详细实现流程
5. **核心算法** - FSRS 算法的完整说明和示例
6. **数据存储** - localStorage 的完整 CRUD 操作
7. **样式系统** - CSS 变量、组件样式、响应式设计
8. **路由设计** - 完整的路由配置和跳转方式
9. **迁移指南** - HBuilderX 迁移的关键点和映射关系

**使用建议：**

1. 将此文档提供给负责迁移的 AI
2. AI 应该按照文档的详细说明进行迁移
3. 迁移后按照检查清单进行验证
4. 确保所有功能和样式与原文档保持一致

**这份文档应该足够详细，可以帮助其他AI理解和实现这个应用的迁移！** 🚀
