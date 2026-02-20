/**
 * 复习配置常量
 */

// 掌握标准配置
export const MASTERY_CONFIG = {
  // 稳定性阈值（天）- 超过此天数的单词很难遗忘
  // 降低阈值：对于频繁复习的单词，不需要等待 14 天的稳定性
  // 0.5 天 = 约 12 小时，如果单词在 12 小时内能保持记忆，说明已掌握
  stabilityThreshold: 0.5,

  // 连续高分次数 - 需要连续多少次高分才能标记为已掌握
  consecutiveHighScores: 2,

  // 高分标准 - 最低多少分才算高分
  highScoreThreshold: 5,
} as const;

// FSRS 算法参数
export const FSRS_PARAMS = {
  REQUEST_PRIOR: { ease: 0.5, stability: 0 },
  MINIMUM_STABILITY: 0.1,
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
