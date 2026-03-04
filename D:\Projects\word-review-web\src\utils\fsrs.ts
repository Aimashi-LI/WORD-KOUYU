import { Word, FSRSResult, ReviewRating } from '../types';

/**
 * FSRS (Free Spaced Repetition Scheduler) 算法实现
 * 计算单词的下次复习间隔和掌握程度
 */
export const calculateFSRS = (word: Word, rating: ReviewRating): FSRSResult => {
  const stability = word.stability || 0;
  const difficulty = word.difficulty || 5;

  // 计算新的难度（0-10）
  const newDifficulty = Math.max(1, Math.min(10, difficulty - 0.4 * (rating - 2.5)));

  // 根据稳定性分段计算
  let newStability: number;

  if (stability < 1.0) {
    // 初始期（0-1天）：快速增长
    newStability = stability + 0.3 * (rating - 2.5);
  } else if (stability < 7.0) {
    // 成长期（1-7天）：稳步提升
    newStability = stability * (1 + 0.1 * (rating - 2.5));
  } else if (stability < 30.0) {
    // 稳定期（7-30天）：平缓增长
    newStability = stability * (1 + 0.05 * (rating - 2.5));
  } else {
    // 巩固期（30天以上）：缓慢巩固
    newStability = stability * (1 + 0.02 * (rating - 2.5));
  }

  // 确保稳定性至少为 0.1
  newStability = Math.max(0.1, newStability);

  // 计算间隔（小时精度）
  const interval = Math.round(newStability * 24);

  // 根据稳定性确定掌握等级
  let masteryLevel: 'low' | 'medium' | 'high';

  if (newStability < 2) {
    masteryLevel = 'low';
  } else if (newStability < 10) {
    masteryLevel = 'medium';
  } else {
    masteryLevel = 'high';
  }

  return {
    stability: newStability,
    difficulty: newDifficulty,
    interval,
    masteryLevel,
  };
};

/**
 * 计算下次复习日期
 */
export const calculateNextReviewDate = (interval: number): string => {
  const now = new Date();
  const nextReview = new Date(now.getTime() + interval * 60 * 60 * 1000);
  return nextReview.toISOString();
};

/**
 * 判断单词是否需要复习
 */
export const needsReview = (word: Word): boolean => {
  const now = new Date();
  const nextReview = new Date(word.nextReviewDate);
  return nextReview <= now;
};

/**
 * 格式化下次复习时间
 */
export const formatNextReview = (date: string): string => {
  if (!date) return '待安排';

  const d = new Date(date);
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.floor(diff / (24 * 60 * 60 * 1000));

  if (days < 0) return '立即复习';
  if (days === 0) return '今天';
  if (days === 1) return '明天';
  if (days < 7) return `${days}天后`;
  if (days < 30) return `${Math.floor(days / 7)}周后`;
  return `${Math.floor(days / 30)}个月后`;
};

/**
 * 获取掌握程度标签
 */
export const getMasteryLabel = (level: 'low' | 'medium' | 'high'): string => {
  const labels = {
    low: '未掌握',
    medium: '掌握中',
    high: '已掌握',
  };
  return labels[level] || '未知';
};

/**
 * 获取掌握程度徽章样式
 */
export const getMasteryBadgeClass = (level: 'low' | 'medium' | 'high'): string => {
  const classes = {
    low: 'badge-error',
    medium: 'badge-warning',
    high: 'badge-success',
  };
  return classes[level] || 'badge-info';
};
