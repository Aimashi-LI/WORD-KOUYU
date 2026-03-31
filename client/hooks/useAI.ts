import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useSafeRouter } from '@/hooks/useSafeRouter';

// AI 提供商
export type AIProvider = 'deepseek' | 'doubao';

// AI 配置
export interface AISettings {
  id: number;
  provider: AIProvider;
  apiKey: string;
  model: string;
  isActive: boolean;
}

// AI 模型
export interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
}

// 复习建议响应
export interface ReviewAdviceResponse {
  advice: string;
  suggestedInterval?: number;
  priority: 'high' | 'medium' | 'low';
}

// 自动填充响应
export interface AutoFillResponse {
  phonetic?: string;
  definition?: string;
  split?: string;
  mnemonic?: string;
}

// AI 复习分析响应
export interface ReviewAnalysisResponse {
  analysis: {
    summary: string;
    urgentCount: number;
    suggestedCount: number;
  };
  reviewPlan: Array<{
    wordId: number;
    word: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    reason: string;
    suggestedTime: string;
    expectedRetention: number;
    reviewStrategy: string;
  }>;
  recommendations: Array<{
    type: 'timing' | 'method' | 'frequency' | 'break';
    message: string;
  }>;
  nextReviewReminder?: {
    time: string;
    message: string;
  };
}

// AI 复习结果响应
export interface ReviewResultResponse {
  newStability: number;
  newDifficulty: number;
  nextReviewDate: string;
  isMastered: boolean;
  advice: string;
}

// Hook 返回类型
interface UseAI {
  // 状态
  isConfigured: boolean;
  isLoading: boolean;
  settings: AISettings | null;
  
  // 方法
  generateMnemonic: (word: string, definition?: string, split?: string, phonetic?: string) => Promise<string | null>;
  generatePhonetic: (word: string) => Promise<string | null>;
  generateReviewAdvice: (params: {
    word: string;
    definition?: string;
    stability: number;
    difficulty: number;
    reviewCount: number;
    lastScore?: number;
    retrievability: number;
    daysSinceLastReview?: number;
  }) => Promise<ReviewAdviceResponse | null>;
  generateAutoFill: (word: string, existingData?: {
    phonetic?: string;
    definition?: string;
    split?: string;
    mnemonic?: string;
  }) => Promise<AutoFillResponse | null>;
  generateReviewAnalysis: (words: Array<{
    id: number;
    word: string;
    definition?: string;
    stability: number;
    difficulty: number;
    reviewCount: number;
    lastScore?: number;
    retrievability: number;
    daysSinceLastReview?: number;
    nextReviewDate?: string;
    isMastered: boolean;
    lastReviewDate?: string;
  }>, context?: {
    currentTime?: string;
    studyGoal?: string;
    preferredTime?: string;
  }) => Promise<ReviewAnalysisResponse | null>;
  generateReviewResult: (params: {
    word: string;
    definition?: string;
    score: number;
    responseTime: number;
    previousStability: number;
    previousDifficulty: number;
    reviewCount: number;
    recentScores?: number[];
  }) => Promise<ReviewResultResponse | null>;
  checkConfiguration: () => Promise<boolean>;
  openSettings: () => void;
}

// API 基础 URL
const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || 'http://localhost:9091';

/**
 * AI 功能 Hook
 * 用于管理 AI 状态和调用 AI 功能
 */
export function useAI(): UseAI {
  const [settings, setSettings] = useState<AISettings | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useSafeRouter();

  // 检查是否已配置
  const isConfigured = settings !== null && settings.isActive;

  // 加载配置
  const loadSettings = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/settings`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setSettings(data.data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Load AI settings error:', error);
      return false;
    }
  }, []);

  // 初始化时加载配置
  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // 检查配置
  const checkConfiguration = useCallback(async (): Promise<boolean> => {
    const configured = await loadSettings();
    return configured;
  }, [loadSettings]);

  // 生成助记句
  const generateMnemonic = useCallback(async (
    word: string,
    definition?: string,
    split?: string,
    phonetic?: string
  ): Promise<string | null> => {
    // 检查是否已配置
    if (!isConfigured) {
      Alert.alert(
        '提示',
        '尚未配置 AI，请先配置 AI API 密钥',
        [
          { text: '取消', style: 'cancel' },
          { text: '去配置', onPress: () => openSettings() },
        ]
      );
      return null;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/generate/mnemonic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, definition, split, phonetic }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data.mnemonic;
      }
      
      // 处理错误
      if (data.error) {
        if (data.error.includes('余额不足') || data.error.includes('Token')) {
          Alert.alert('提示', 'AI Token 余额不足，请充值后继续使用');
        } else {
          Alert.alert('错误', data.error);
        }
      }
      
      return null;
    } catch (error: any) {
      console.error('Generate mnemonic error:', error);
      Alert.alert('错误', error.message || '网络错误');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured]);

  // 生成音标
  const generatePhonetic = useCallback(async (word: string): Promise<string | null> => {
    // 检查是否已配置
    if (!isConfigured) {
      Alert.alert(
        '提示',
        '尚未配置 AI，请先配置 AI API 密钥',
        [
          { text: '取消', style: 'cancel' },
          { text: '去配置', onPress: () => openSettings() },
        ]
      );
      return null;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/generate/phonetic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data.phonetic;
      }
      
      // 处理错误
      if (data.error) {
        if (data.error.includes('余额不足') || data.error.includes('Token')) {
          Alert.alert('提示', 'AI Token 余额不足，请充值后继续使用');
        } else {
          Alert.alert('错误', data.error);
        }
      }
      
      return null;
    } catch (error: any) {
      console.error('Generate phonetic error:', error);
      Alert.alert('错误', error.message || '网络错误');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured]);

  // 生成复习建议
  const generateReviewAdvice = useCallback(async (params: {
    word: string;
    definition?: string;
    stability: number;
    difficulty: number;
    reviewCount: number;
    lastScore?: number;
    retrievability: number;
    daysSinceLastReview?: number;
  }): Promise<ReviewAdviceResponse | null> => {
    // 检查是否已配置
    if (!isConfigured) {
      return null;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/generate/review-advice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      
      return null;
    } catch (error: any) {
      console.error('Generate review advice error:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured]);

  // 一键自动填充
  const generateAutoFill = useCallback(async (word: string, existingData?: {
    phonetic?: string;
    definition?: string;
    split?: string;
    mnemonic?: string;
  }): Promise<AutoFillResponse | null> => {
    // 检查是否已配置
    if (!isConfigured) {
      Alert.alert(
        '提示',
        '尚未配置 AI，请先配置 AI API 密钥',
        [
          { text: '取消', style: 'cancel' },
          { text: '去配置', onPress: () => openSettings() },
        ]
      );
      return null;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/generate/auto-fill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word, existingData }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      
      // 处理错误
      if (data.error) {
        if (data.error.includes('余额不足') || data.error.includes('Token')) {
          Alert.alert('提示', 'AI Token 余额不足，请充值后继续使用');
        } else {
          Alert.alert('错误', data.error);
        }
      }
      
      return null;
    } catch (error: any) {
      console.error('Generate auto fill error:', error);
      Alert.alert('错误', error.message || '网络错误');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured]);

  /**
   * AI 复习分析
   * 分析所有单词的学习状态，生成个性化复习计划
   */
  const generateReviewAnalysis = useCallback(async (
    words: Array<{
      id: number;
      word: string;
      definition?: string;
      stability: number;
      difficulty: number;
      reviewCount: number;
      lastScore?: number;
      retrievability: number;
      daysSinceLastReview?: number;
      nextReviewDate?: string;
      isMastered: boolean;
      lastReviewDate?: string;
    }>,
    context?: {
      currentTime?: string;
      studyGoal?: string;
      preferredTime?: string;
    }
  ): Promise<ReviewAnalysisResponse | null> => {
    // 检查是否已配置
    if (!isConfigured) {
      Alert.alert(
        '提示',
        '尚未配置 AI，请先配置 AI API 密钥',
        [
          { text: '取消', style: 'cancel' },
          { text: '去配置', onPress: () => openSettings() },
        ]
      );
      return null;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/generate/review-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words, context }),
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      
      // 处理错误
      if (data.error) {
        Alert.alert('错误', data.error);
      }
      
      return null;
    } catch (error: any) {
      console.error('Generate review analysis error:', error);
      Alert.alert('错误', error.message || '网络错误');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured]);

  /**
   * AI 复习结果处理
   * 根据用户复习表现，AI计算新的学习参数
   */
  const generateReviewResult = useCallback(async (params: {
    word: string;
    definition?: string;
    score: number;
    responseTime: number;
    previousStability: number;
    previousDifficulty: number;
    reviewCount: number;
    recentScores?: number[];
  }): Promise<ReviewResultResponse | null> => {
    // 检查是否已配置
    if (!isConfigured) {
      return null;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/generate/review-result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      const data = await response.json();
      
      if (data.success && data.data) {
        return data.data;
      }
      
      return null;
    } catch (error: any) {
      console.error('Generate review result error:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured]);

  // 打开设置页面
  const openSettings = useCallback(() => {
    router.push('/ai-settings');
  }, [router]);

  return {
    isConfigured,
    isLoading,
    settings,
    generateMnemonic,
    generatePhonetic,
    generateReviewAdvice,
    generateAutoFill,
    generateReviewAnalysis,
    generateReviewResult,
    checkConfiguration,
    openSettings,
  };
}
