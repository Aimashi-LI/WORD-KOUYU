import { Word } from '../database/types';
import { MASTERY_CONFIG, FSRS_PARAMS as FSRS_CONFIG, TIME_CONFIG } from '../constants/reviewConfig';

// 向后兼容：导出 FSRS_PARAMS 别名
export const FSRS_PARAMS = FSRS_CONFIG;

/**
 * 计算可提取性 R 值
 * R = exp(-间隔天数 / S)
 */
export function calculateRetrievability(word: Word): number {
  if (!word.next_review || !word.last_review || word.stability <= 0) {
    return 1.0; // 新单词，可提取性为 1
  }
  
  const lastReview = new Date(word.last_review);
  const now = new Date();
  const elapsedDays = (now.getTime() - lastReview.getTime()) / (1000 * 60 * 60 * 24);
  
  const R = Math.exp(-elapsedDays / Math.max(word.stability, 0.1));
  return Math.max(0, Math.min(1, R));
}

/**
 * 预测下次复习间隔（天）
 * 根据得分和当前稳定性计算
 */
export function predictNextInterval(word: Word, score: number): number {
  const { stability, difficulty } = word;
  
  // 将得分 (0-6) 映射到回忆质量 (0-5)
  const quality = scoreToQuality(score);
  
  // 基于回忆质量计算新的稳定性
  let newStability: number;
  
  if (quality >= 3) {
    // 回答正确
    const easyBonus = quality === 5 ? 1.2 : (quality === 4 ? 1.1 : 1.0);
    newStability = stability * Math.max(FSRS_PARAMS.EASE_FACTOR, easyBonus * (1 + difficulty * 0.5));
  } else {
    // 回答错误
    newStability = stability * 0.4;
  }
  
  // 确保稳定性在合理范围内
  newStability = Math.max(FSRS_PARAMS.MINIMUM_STABILITY, newStability);
  
  // 计算间隔天数
  const intervalDays = newStability;
  
  return Math.min(FSRS_PARAMS.MAXIMUM_INTERVAL, intervalDays);
}

/**
 * 计算时间预算（秒）
 * 时间预算 = 基础时间 + 难度加成
 */
export function calculateTimeBudget(word: Word): number {
  return Math.floor(TIME_CONFIG.BASE_TIME + (word.difficulty * TIME_CONFIG.DIFFICULTY_FACTOR));
}

/**
 * 选择初始测试类型
 * 根据单词难度自适应选择
 */
export function selectInitialTestType(difficulty: number): 'spelling' | 'split_definition' | 'recognition' {
  if (difficulty < 0.3) {
    // 简单词：从识别开始
    return 'recognition';
  } else if (difficulty <= 0.7) {
    // 中等词：从拆分+释义开始
    return 'split_definition';
  } else {
    // 困难词：从拼写开始
    return 'spelling';
  }
}

/**
 * 回忆时间加权更新
 * 根据回忆时间和复习时机调整得分权重
 */
export async function updateWithTimeWeight(
  word: Word,
  score: number,
  responseTime: number
): Promise<{
  newDifficulty: number;
  newStability: number;
  newAvgResponseTime: number;
  nextReviewDate: Date;
  masteryAdjustmentFactor: number; // 新增：掌握率调整因子
  reviewStatus: 'on-time' | 'early' | 'late'; // 新增：复习状态
}> {
  // 计算复习时机（提前/延后/按时）
  const reviewTiming = calculateReviewTiming(word);
  const { masteryAdjustmentFactor, reviewStatus } = reviewTiming;

  // 计算加权得分
  const weightedScore = calculateWeightedScore(word, score, responseTime);

  // 应用掌握率调整因子
  const adjustedScore = weightedScore * masteryAdjustmentFactor;

  // 更新难度参数
  let newDifficulty = word.difficulty;
  if (adjustedScore >= 4) {
    newDifficulty = Math.max(0, word.difficulty - 0.1); // 降低难度
  } else if (adjustedScore <= 2) {
    newDifficulty = Math.min(1, word.difficulty + 0.1); // 增加难度
  }

  // 预测新稳定性
  const newStability = predictNextInterval(
    { ...word, difficulty: newDifficulty },
    adjustedScore
  );

  // 更新平均回忆时间
  const newAvgResponseTime = calculateNewAvgResponseTime(
    word.avg_response_time,
    responseTime
  );

  // 计算下次复习时间
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + Math.floor(newStability));

  return {
    newDifficulty,
    newStability,
    newAvgResponseTime,
    nextReviewDate,
    masteryAdjustmentFactor,
    reviewStatus,
  };
};

/**
 * 计算复习时机和掌握率调整因子
 * 基于认知心理学理论：
 * - 提前复习（>3小时）：记忆痕迹未充分巩固，掌握率降低15%-30%
 * - 延后复习（>6小时）：遗忘曲线下降，掌握率降低30%-50%
 */
function calculateReviewTiming(word: Word): {
  masteryAdjustmentFactor: number;
  reviewStatus: 'on-time' | 'early' | 'late';
} {
  if (!word.next_review || !word.last_review) {
    return {
      masteryAdjustmentFactor: 1.0,
      reviewStatus: 'on-time',
    };
  }

  const scheduledTime = new Date(word.next_review).getTime();
  const currentTime = Date.now();
  const timeDiffHours = (currentTime - scheduledTime) / (1000 * 60 * 60);

  // 提前复习（提前时间 > 3小时）
  if (timeDiffHours < -3) {
    // 基于过度学习理论和间隔效应
    // 提前复习会导致记忆效果降低
    // 根据认知心理学研究，提前3小时以上复习，掌握率降低约15%-30%
    const earlyHours = Math.abs(timeDiffHours);
    // 使用非线性惩罚：提前时间越长，调整因子越小
    const penalty = Math.min(0.3, 0.07 * Math.log(earlyHours + 1));
    return {
      masteryAdjustmentFactor: 1.0 - penalty,
      reviewStatus: 'early',
    };
  }

  // 延后复习（延后时间 > 6小时）
  if (timeDiffHours > 6) {
    // 基于遗忘曲线（Ebbinghaus Forgetting Curve）
    // 6小时后单词已显著遗忘
    // 根据研究，6小时后遗忘率约42%-56%，1天后74%
    const lateHours = timeDiffHours;
    // 使用指数惩罚：延后时间越长，调整因子越小
    // 延后6小时：factor ≈ 0.6
    // 延后12小时：factor ≈ 0.5
    // 延后24小时：factor ≈ 0.4
    const penalty = Math.min(0.6, 0.4 * (1 - Math.exp(-lateHours / 12)));
    return {
      masteryAdjustmentFactor: 1.0 - penalty,
      reviewStatus: 'late',
    };
  }

  // 按时复习（提前≤3小时且延后≤6小时）
  return {
    masteryAdjustmentFactor: 1.0,
    reviewStatus: 'on-time',
  };
}

/**
 * 计算加权得分
 * 考虑回忆时间
 */
function calculateWeightedScore(word: Word, score: number, responseTime: number): number {
  const avgTime = word.avg_response_time || TIME_CONFIG.BASE_TIME;
  const stdDev = avgTime * TIME_CONFIG.STD_DEV_RATIO;

  let weight = 1.0;

  if (responseTime > avgTime * TIME_CONFIG.SLOW_RESPONSE_THRESHOLD) {
    weight = TIME_CONFIG.SLOW_RESPONSE_WEIGHT; // 降权，缩短间隔
  } else if (responseTime < avgTime * TIME_CONFIG.FAST_RESPONSE_THRESHOLD) {
    weight = TIME_CONFIG.FAST_RESPONSE_WEIGHT; // 提权，延长间隔
  }

  const weightedScore = score * weight;
  return Math.min(6, Math.max(0, weightedScore));
}

/**
 * 计算新的平均回忆时间
 */
function calculateNewAvgResponseTime(currentAvg: number, newTime: number, count: number = 1): number {
  if (count <= 1) {
    return newTime;
  }
  return (currentAvg * (count - 1) + newTime) / count;
}

/**
 * 将得分转换为回忆质量 (0-5)
 */
function scoreToQuality(score: number): number {
  // 得分范围 0-6，映射到 0-5
  return Math.min(5, Math.floor(score));
}

/**
 * 判断是否已掌握
 * 使用统一的掌握标准配置
 */
export function checkMastery(word: Word, recentScores: number[]): boolean {
  // 条件1：稳定性达到阈值
  const condition1 = word.stability >= MASTERY_CONFIG.stabilityThreshold;

  // 条件2：最近N次得分都≥高分标准
  const condition2 = recentScores.length >= MASTERY_CONFIG.consecutiveHighScores &&
    recentScores.slice(0, MASTERY_CONFIG.consecutiveHighScores).every(s => s >= MASTERY_CONFIG.highScoreThreshold);

  return condition1 && condition2;
}

/**
 * 检查单词是否需要复习
 * R < 0.9 时加入待复习队列
 */
export function needsReview(word: Word): boolean {
  const retrievability = calculateRetrievability(word);
  const isMastered = word.is_mastered === 1;
  
  return !isMastered && (retrievability < 0.9 || !word.next_review);
}

/**
 * 获取测试难度权重
 * 方式2：拼写（最难）3分
 * 方式1：拆分+释义（中等）2分
 * 方式3：识别（最简单）1分
 */
export function getTestWeight(testType: 'spelling' | 'split_definition' | 'recognition'): number {
  switch (testType) {
    case 'spelling':
      return 3;
    case 'split_definition':
      return 2;
    case 'recognition':
      return 1;
  }
}

/**
 * 计算掌握率
 * 总分 / (单词数 × 6) × 100%
 */
export function calculateMasteryRate(totalScore: number, wordCount: number): number {
  if (wordCount === 0) return 0;
  const maxScore = wordCount * 6;
  return Math.round((totalScore / maxScore) * 100);
}

/**
 * 获取评级
 */
export function getRating(masteryRate: number): string {
  if (masteryRate < 70) return '持续成长';
  if (masteryRate < 85) return '稳步前进';
  return '词汇达人';
}
