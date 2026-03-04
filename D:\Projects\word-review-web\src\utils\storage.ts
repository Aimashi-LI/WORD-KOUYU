import { Word, WordFilter, SortBy } from '../types';

const STORAGE_KEY = 'wordreview_data';

/**
 * 获取所有单词
 */
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

/**
 * 保存所有单词
 */
const saveAllWords = (words: Word[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(words));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
    throw new Error('保存失败，存储空间不足');
  }
};

/**
 * 根据ID获取单词
 */
export const getWordById = (id: number): Word | null => {
  const words = getAllWords();
  return words.find((w) => w.id === id) || null;
};

/**
 * 添加单词
 */
export const addWord = (wordData: Omit<Word, 'id' | 'reviewCount' | 'stability' | 'difficulty' | 'masteryLevel' | 'createdAt'>): Word => {
  const words = getAllWords();

  const now = new Date();
  const nextReviewDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1天后

  const newWord: Word = {
    ...wordData,
    id: Date.now(),
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

/**
 * 更新单词
 */
export const updateWord = (id: number, updates: Partial<Word>): Word | null => {
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

/**
 * 删除单词
 */
export const deleteWord = (id: number): boolean => {
  const words = getAllWords();
  const filteredWords = words.filter((w) => w.id !== id);

  if (filteredWords.length === words.length) return false;

  saveAllWords(filteredWords);
  return true;
};

/**
 * 搜索和过滤单词
 */
export const searchWords = (filter: WordFilter): Word[] => {
  let words = getAllWords();

  // 搜索过滤
  if (filter.search) {
    const searchTerm = filter.search.toLowerCase();
    words = words.filter(
      (w) =>
        w.word.toLowerCase().includes(searchTerm) ||
        w.meaning.toLowerCase().includes(searchTerm)
    );
  }

  // 排序
  const sortBy = filter.sortBy || 'next_review';

  switch (sortBy) {
    case 'next_review':
      words.sort((a, b) => new Date(a.nextReviewDate).getTime() - new Date(b.nextReviewDate).getTime());
      break;
    case 'stability':
      words.sort((a, b) => b.stability - a.stability);
      break;
    case 'review_count':
      words.sort((a, b) => b.reviewCount - a.reviewCount);
      break;
  }

  return words;
};

/**
 * 获取复习队列（智能排序）
 */
export const getReviewQueue = (limit: number = 20): Word[] => {
  const words = getAllWords();
  const now = new Date();

  // 筛选需要复习且未掌握的单词
  const reviewWords = words.filter((w) => {
    const nextReview = new Date(w.nextReviewDate);
    return nextReview <= now && w.masteryLevel !== 'high';
  });

  // 智能排序：按紧急程度
  reviewWords.sort((a, b) => {
    const aNextReview = new Date(a.nextReviewDate);
    const bNextReview = new Date(b.nextReviewDate);

    // 超期单词优先
    const aOverdue = aNextReview < now;
    const bOverdue = bNextReview < now;

    if (aOverdue && !bOverdue) return -1;
    if (!aOverdue && bOverdue) return 1;

    // 按稳定性升序
    if (a.stability !== b.stability) return a.stability - b.stability;

    // 按难度降序
    return b.difficulty - a.difficulty;
  });

  return reviewWords.slice(0, limit);
};

/**
 * 获取统计信息
 */
export const getStats = () => {
  const words = getAllWords();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

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
  const masteryRate = total > 0 ? Math.round((highMastery / total) * 100) : 0;

  return {
    total,
    pendingCount,
    completedCount,
    masteryRate,
  };
};

/**
 * 清空所有数据
 */
export const clearAllData = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

/**
 * 导出数据
 */
export const exportData = (): string => {
  const words = getAllWords();
  return JSON.stringify(words, null, 2);
};

/**
 * 导入数据
 */
export const importData = (jsonData: string): boolean => {
  try {
    const words = JSON.parse(jsonData) as Word[];
    saveAllWords(words);
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    return false;
  }
};
