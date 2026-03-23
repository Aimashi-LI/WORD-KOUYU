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

// Hook 返回类型
interface UseAI {
  // 状态
  isConfigured: boolean;
  isLoading: boolean;
  settings: AISettings | null;
  
  // 方法
  generateMnemonic: (word: string, definition?: string, split?: string, phonetic?: string) => Promise<string | null>;
  generatePhonetic: (word: string) => Promise<string | null>;
  checkConfiguration: () => Promise<boolean>;
  openSettings: () => void;
}

// API 基础 URL
const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL || '';

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
    checkConfiguration,
    openSettings,
  };
}
