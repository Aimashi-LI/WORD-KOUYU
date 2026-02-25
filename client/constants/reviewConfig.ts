/**
 * 复习配置常量
 */

// 掌握标准配置
export const MASTERY_CONFIG = {
  // 动态掌握标准 - 根据稳定性分段
  // 低稳定性（<3天）：需要3次连续高分（巩固短期记忆）
  // 中等稳定性（3-7天）：需要2次连续高分（形成中期记忆）
  // 高稳定性（≥7天）：需要1次连续高分（已形成长期记忆）
  dynamicConsecutive: {
    low: { threshold: 3, consecutive: 3 },      // <3天：3次≥5分
    medium: { threshold: 3, consecutive: 2 },    // 3-7天：2次≥5分
    high: { threshold: 7, consecutive: 1 },      // ≥7天：1次≥5分
  },

  // 总体掌握程度阈值（%）
  // 最近5次得分平均达到60%以上才算掌握
  overallMasteryThreshold: 60,

  // 最近得分的窗口大小（次）
  reviewScoreWindowSize: 5,

  // 高分标准 - 最低多少分才算高分
  highScoreThreshold: 5,
} as const;

// FSRS 算法参数
export const FSRS_PARAMS = {
  REQUEST_PRIOR: { ease: 0.5, stability: 0 },
  MINIMUM_STABILITY: 1.0, // 初始稳定性设为1.0天，避免刚学完即安排数天后复习
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
