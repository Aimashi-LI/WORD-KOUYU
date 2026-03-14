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
 * 计算新的稳定性（分段增长算法）
 * 根据当前稳定性和得分计算新的稳定性
 */
export function calculateNewStability(word: Word, score: number): number {
  const currentStability = word.stability;
  const quality = scoreToQuality(score);

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

/**
 * 计算基于稳定性的间隔（第5次复习及以后）
 */
function calculateStabilityBasedInterval(word: Word, score: number): number {
  const stability = word.stability;
  const quality = scoreToQuality(score);

  if (quality >= 3) {
    // 回答正确
    let growthFactor: number;

    if (stability < 3) {
      // 低稳定性：较快增长
      growthFactor = quality === 5 ? 2.0 : (quality === 4 ? 1.6 : 1.3);
    } else if (stability < 7) {
      // 中等稳定性：稳定增长
      growthFactor = quality === 5 ? 1.6 : (quality === 4 ? 1.3 : 1.1);
    } else {
      // 高稳定性：缓慢增长
      growthFactor = quality === 5 ? 1.3 : (quality === 4 ? 1.1 : 1.0);
    }

    return stability * growthFactor;
  } else {
    // 回答错误
    if (stability < 3) {
      return 1.0; // 重置到1天
    } else {
      return stability * 0.7; // 降低30%
    }
  }
}

/**
 * 计算下次复习间隔（天）
 * 根据复习次数进行分段计算
 */
export function calculateNextInterval(
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

/**
 * 向后兼容：保留 predictNextInterval 函数
 * @deprecated 请使用 calculateNextInterval
 */
export function predictNextInterval(word: Word, score: number): number {
  return calculateNextInterval(word, score, 1);
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
  responseTime: number,
  reviewCount: number = 1  // 新增：复习次数
): Promise<{
  newDifficulty: number;
  newStability: number;
  newAvgResponseTime: number;
  nextReviewDate: Date;
  masteryAdjustmentFactor: number; // 新增：掌握率调整因子
  reviewStatus: 'on-time' | 'early' | 'late'; // 新增：复习状态
}> {
  // 计算下次间隔（用于相对比例判断）
  const nextIntervalDays = calculateNextInterval(word, score, reviewCount);

  // 计算复习时机（提前/延后/按时）
  const reviewTiming = calculateReviewTiming(word, nextIntervalDays);
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

  // 计算新稳定性
  const newStability = calculateNewStability(
    { ...word, difficulty: newDifficulty },
    adjustedScore
  );

  // 确保稳定性在合理范围内
  const finalStability = Math.max(FSRS_PARAMS.MINIMUM_STABILITY, newStability);

  // 更新平均回忆时间
  const newAvgResponseTime = calculateNewAvgResponseTime(
    word.avg_response_time,
    responseTime
  );

  // 计算下次复习时间（精确到小时）
  const nextReviewDate = new Date();
  const intervalHours = Math.round(finalStability * 24);
  nextReviewDate.setHours(nextReviewDate.getHours() + intervalHours);

  return {
    newDifficulty,
    newStability: finalStability,
    newAvgResponseTime,
    nextReviewDate,
    masteryAdjustmentFactor,
    reviewStatus,
  };
};

/**
 * 计算复习时机和掌握率调整因子
 * 基于相对比例判断，适应不同的复习间隔
 * - 提前复习：相对比例超过15%，掌握率降低15%-40%
 * - 延后复习：相对比例超过30%，掌握率降低15%-60%
 */
function calculateReviewTiming(word: Word, scheduledInterval: number): {
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

  // 计算相对比例
  const relativeRatio = Math.abs(timeDiffHours) / scheduledInterval;

  // 根据间隔大小动态调整阈值
  const earlyThreshold = Math.max(0.2, scheduledInterval * 0.15);  // 最小20分钟或15%
  const lateThreshold = Math.max(0.5, scheduledInterval * 0.3);    // 最小30分钟或30%

  // 提前复习
  if (timeDiffHours < -earlyThreshold) {
    // 相对比例惩罚：提前越多，惩罚越重
    const penalty = Math.min(0.4, 0.1 + relativeRatio * 0.3);
    return {
      masteryAdjustmentFactor: 1.0 - penalty,
      reviewStatus: 'early',
    };
  }

  // 延后复习
  if (timeDiffHours > lateThreshold) {
    // 相对比例惩罚：延后越多，惩罚越重
    const penalty = Math.min(0.6, 0.1 + relativeRatio * 0.5);
    return {
      masteryAdjustmentFactor: 1.0 - penalty,
      reviewStatus: 'late',
    };
  }

  // 按时复习
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
 * 使用动态掌握标准（基于稳定性分段）
 */
export function checkMastery(word: Word, recentScores: number[]): boolean {
  const stability = word.stability;

  // 1. 根据稳定性确定连续高分要求
  let requiredConsecutive: number;
  if (stability < 3) {
    // 低稳定性（<3天）：需要3次连续高分
    requiredConsecutive = MASTERY_CONFIG.dynamicConsecutive.low.consecutive;
  } else if (stability < 7) {
    // 中等稳定性（3-7天）：需要2次连续高分
    requiredConsecutive = MASTERY_CONFIG.dynamicConsecutive.medium.consecutive;
  } else {
    // 高稳定性（≥7天）：需要1次连续高分
    requiredConsecutive = MASTERY_CONFIG.dynamicConsecutive.high.consecutive;
  }

  // 2. 检查连续高分
  const consecutiveHighScores = countConsecutiveHighScores(
    recentScores,
    requiredConsecutive,
    MASTERY_CONFIG.highScoreThreshold
  );

  // 3. 计算总体掌握程度
  const windowSize = Math.min(recentScores.length, MASTERY_CONFIG.reviewScoreWindowSize);
  const recentScoresWindow = recentScores.slice(0, windowSize);
  const totalScore = recentScoresWindow.reduce((sum, score) => sum + score, 0);
  const maxPossibleScore = windowSize * 6;
  const overallMasteryRate = (totalScore / maxPossibleScore) * 100;

  // 4. 综合判断
  return consecutiveHighScores && overallMasteryRate >= MASTERY_CONFIG.overallMasteryThreshold;
}

/**
 * 计算连续高分次数
 */
function countConsecutiveHighScores(scores: number[], required: number, threshold: number): boolean {
  if (scores.length < required) return false;
  for (let i = 0; i < required; i++) {
    if (scores[i] < threshold) return false;
  }
  return true;
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
