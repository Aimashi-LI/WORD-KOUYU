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
  feature: 'mnemonic' | 'phonetic' | 'tts';
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
