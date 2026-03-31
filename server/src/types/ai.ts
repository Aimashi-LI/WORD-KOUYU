// AI 提供商类型
export type AIProvider = 'deepseek' | 'doubao';

// AI 配置
export interface AISettings {
  id?: number;
  provider: AIProvider;
  apiKey: string;
  apiBaseUrl?: string;
  model: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// AI 使用记录
export interface AIUsage {
  id?: number;
  settingId: number;
  feature: 'mnemonic' | 'phonetic' | 'review_advice' | 'auto_fill';
  word: string;
  tokensUsed: number;
  cost?: number;
  createdAt?: string;
}

// AI 模型配置
export interface AIModelConfig {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
  maxTokens: number;
  costPer1kTokens: number;
}

// 支持的 AI 模型列表
export const AI_MODELS: AIModelConfig[] = [
  // DeepSeek 模型
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    description: '通用对话模型，性价比高',
    maxTokens: 4096,
    costPer1kTokens: 0.001,
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    provider: 'deepseek',
    description: '深度推理模型，适合复杂任务',
    maxTokens: 8192,
    costPer1kTokens: 0.002,
  },
  // 豆包模型
  {
    id: 'doubao-pro-32k',
    name: '豆包 Pro 32K',
    provider: 'doubao',
    description: '豆包专业版，32K上下文',
    maxTokens: 32768,
    costPer1kTokens: 0.0008,
  },
  {
    id: 'doubao-lite-32k',
    name: '豆包 Lite 32K',
    provider: 'doubao',
    description: '豆包轻量版，性价比高',
    maxTokens: 32768,
    costPer1kTokens: 0.0003,
  },
];

// API 基础 URL
export const API_BASE_URLS: Record<AIProvider, string> = {
  deepseek: 'https://api.deepseek.com/v1',
  doubao: 'https://ark.cn-beijing.volces.com/api/v3',
};

// 生成请求参数
export interface GenerateMnemonicRequest {
  word: string;
  definition?: string;
  split?: string;
  phonetic?: string;
}

export interface GeneratePhoneticRequest {
  word: string;
}

export interface GenerateTTSRequest {
  word: string;
  phonetic?: string;
}

// AI 复习建议请求
export interface GenerateReviewAdviceRequest {
  word: string;
  definition?: string;
  stability: number;        // 稳定性（天）
  difficulty: number;       // 难度 0-1
  reviewCount: number;      // 复习次数
  lastScore?: number;       // 最近得分
  retrievability: number;   // 可提取性 0-1
  daysSinceLastReview?: number; // 距上次复习天数
}

// AI 自动填充请求
export interface GenerateAutoFillRequest {
  word: string;
  existingData?: {
    phonetic?: string;
    definition?: string;
    split?: string;
    mnemonic?: string;
  };
}

// 生成响应
export interface GenerateMnemonicResponse {
  mnemonic: string;
  tokensUsed: number;
}

export interface GeneratePhoneticResponse {
  phonetic: string;
  tokensUsed: number;
}

export interface GenerateTTSResponse {
  audioUrl: string;
  tokensUsed: number;
}

// AI 复习建议响应
export interface GenerateReviewAdviceResponse {
  advice: string;
  suggestedInterval?: number;  // 建议复习间隔（天）
  priority: 'high' | 'medium' | 'low';  // 复习优先级
  tokensUsed: number;
}

// AI 自动填充响应
export interface GenerateAutoFillResponse {
  phonetic?: string;
  definition?: string;
  split?: string;
  mnemonic?: string;
  inspirationalSentence?: string;  // 励志例句
  funnySentence?: string;          // 搞笑例句
  tokensUsed: number;
}

// Token 余额响应
export interface TokenBalanceResponse {
  balance: number;
  used: number;
  total: number;
  warningLevel: 'normal' | 'low' | 'critical';
}

// AI 测试响应
export interface AITestResponse {
  isValid: boolean;
  message: string;
  models?: string[];
}

// AI 搜索单词请求
export interface GenerateSearchWordsRequest {
  query: string;           // 搜索关键词，如 "高中单词"、"大学四级单词"
  count?: number;          // 返回单词数量，默认20
  existingWords?: string[]; // 已存在的单词列表，避免重复
}

// AI 搜索单词响应
export interface GenerateSearchWordsResponse {
  words: Array<{
    word: string;          // 单词
    phonetic?: string;     // 音标
    definition?: string;   // 释义
    partOfSpeech?: string; // 词性
  }>;
  description?: string;    // 搜索结果描述
  tokensUsed: number;
}

// AI 复习分析请求
export interface GenerateReviewAnalysisRequest {
  words: Array<{
    id: number;
    word: string;
    definition?: string;
    stability: number;        // 稳定性（天）
    difficulty: number;       // 难度 0-1
    reviewCount: number;      // 复习次数
    lastScore?: number;       // 最近得分
    retrievability: number;   // 可提取性 0-1
    daysSinceLastReview?: number; // 距上次复习天数
    nextReviewDate?: string;  // 下次复习日期
    isMastered: boolean;      // 是否已掌握
    lastReviewDate?: string;  // 上次复习日期
  }>;
  context?: {
    currentTime?: string;     // 当前时间
    studyGoal?: string;       // 学习目标，如 "每天复习20个单词"
    preferredTime?: string;   // 偏好复习时间
  };
}

// AI 复习分析响应
export interface GenerateReviewAnalysisResponse {
  analysis: {
    summary: string;          // 整体学习状况总结
    urgentCount: number;      // 紧急需要复习的单词数
    suggestedCount: number;   // 建议今日复习的单词数
  };
  reviewPlan: Array<{
    wordId: number;
    word: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';  // 复习优先级
    reason: string;           // AI给出的复习原因
    suggestedTime: string;    // 建议复习时间
    expectedRetention: number; // 预期记忆保持率 0-1
    reviewStrategy: string;   // 复习策略建议
  }>;
  recommendations: Array<{
    type: 'timing' | 'method' | 'frequency' | 'break';
    message: string;
  }>;
  nextReviewReminder?: {
    time: string;             // 下次提醒时间
    message: string;          // 提醒内容
  };
  tokensUsed: number;
}

// AI 复习结果处理请求
export interface GenerateReviewResultRequest {
  word: string;
  definition?: string;
  score: number;              // 本次得分 0-6
  responseTime: number;       // 答题时间（秒）
  previousStability: number;  // 之前的稳定性
  previousDifficulty: number; // 之前的难度
  reviewCount: number;        // 复习次数
  recentScores?: number[];    // 最近几次得分
}

// AI 复习结果处理响应
export interface GenerateReviewResultResponse {
  newStability: number;       // 新的稳定性
  newDifficulty: number;      // 新的难度
  nextReviewDate: string;     // 下次复习日期
  isMastered: boolean;        // 是否已掌握
  advice: string;             // AI学习建议
  tokensUsed: number;
}
