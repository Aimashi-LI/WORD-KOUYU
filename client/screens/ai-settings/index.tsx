import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';

// AI 提供商
type AIProvider = 'deepseek' | 'doubao';

// AI 模型配置
interface AIModel {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
}

// AI 配置
interface AISettings {
  id: number;
  provider: AIProvider;
  apiKey: string;
  apiBaseUrl?: string;
  model: string;
  isActive: boolean;
}

// API 基础 URL
const API_BASE_URLS: Record<AIProvider, string> = {
  deepseek: 'https://api.deepseek.com/v1',
  doubao: 'https://ark.cn-beijing.volces.com/api/v3',
};

export default function AISettingsScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // 状态
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState('');

  // 表单数据
  const [provider, setProvider] = useState<AIProvider>('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [apiBaseUrl, setApiBaseUrl] = useState(API_BASE_URLS.deepseek);
  const [model, setModel] = useState('deepseek-chat');

  // 当前配置
  const [currentSettings, setCurrentSettings] = useState<AISettings | null>(null);

  // 可用的模型列表
  const availableModels: AIModel[] = [
    // DeepSeek 模型
    { id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'deepseek', description: '通用对话模型，性价比高' },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', provider: 'deepseek', description: '深度推理模型，适合复杂任务' },
    // 豆包模型
    { id: 'doubao-pro-32k', name: '豆包 Pro 32K', provider: 'doubao', description: '专业版，32K上下文' },
    { id: 'doubao-lite-32k', name: '豆包 Lite 32K', provider: 'doubao', description: '轻量版，性价比高' },
  ];

  // 根据提供商筛选模型
  const filteredModels = availableModels.filter(m => m.provider === provider);

  // 加载当前配置
  useEffect(() => {
    loadSettings();
  }, []);

  // 加载配置
  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ai/settings`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setCurrentSettings(data.data);
        setProvider(data.data.provider);
        setModel(data.data.model);
        // API 密钥已脱敏，显示占位符
        setApiKey('••••••••••••');
        const providerKey = data.data.provider as AIProvider;
        setApiBaseUrl(data.data.apiBaseUrl || API_BASE_URLS[providerKey]);
      }
    } catch (error) {
      console.error('Load settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  // 切换提供商时更新默认 URL 和模型
  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    setApiBaseUrl(API_BASE_URLS[newProvider]);
    // 设置默认模型
    const defaultModel = availableModels.find(m => m.provider === newProvider);
    if (defaultModel) {
      setModel(defaultModel.id);
    }
  };

  // 测试连接
  const handleTest = async () => {
    if (!apiKey.trim()) {
      Alert.alert('提示', '请输入 API 密钥');
      return;
    }

    if (apiKey === '••••••••••••' && currentSettings) {
      // 使用已保存的配置测试
      setTesting(true);
      setTestResult(null);
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ai/test`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ provider, model }),
        });
        const data = await response.json();
        
        if (data.success && data.data.isValid) {
          setTestResult('success');
          setTestMessage(data.data.message);
        } else {
          setTestResult('error');
          setTestMessage(data.data?.message || '测试失败');
        }
      } catch (error: any) {
        setTestResult('error');
        setTestMessage(error.message || '网络错误');
      } finally {
        setTesting(false);
      }
      return;
    }

    // 使用新密钥测试
    setTesting(true);
    setTestResult(null);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ai/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, apiBaseUrl, model }),
      });
      const data = await response.json();
      
      if (data.success && data.data.isValid) {
        setTestResult('success');
        setTestMessage(data.data.message);
      } else {
        setTestResult('error');
        setTestMessage(data.data?.message || '测试失败');
      }
    } catch (error: any) {
      setTestResult('error');
      setTestMessage(error.message || '网络错误');
    } finally {
      setTesting(false);
    }
  };

  // 保存配置
  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert('提示', '请输入 API 密钥');
      return;
    }

    if (apiKey === '••••••••••••') {
      Alert.alert('提示', '请输入新的 API 密钥，或直接测试当前配置');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ai/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider, apiKey, apiBaseUrl, model }),
      });
      const data = await response.json();
      
      if (data.success) {
        Alert.alert('成功', 'AI 配置保存成功');
        loadSettings();
      } else {
        Alert.alert('错误', data.error || '保存失败');
      }
    } catch (error: any) {
      Alert.alert('错误', error.message || '网络错误');
    } finally {
      setSaving(false);
    }
  };

  // 删除配置
  const handleDelete = () => {
    Alert.alert(
      '确认删除',
      '确定要删除 AI 配置吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_BASE_URL}/api/v1/ai/settings`, {
                method: 'DELETE',
              });
              const data = await response.json();
              
              if (data.success) {
                Alert.alert('成功', 'AI 配置已删除');
                setCurrentSettings(null);
                setApiKey('');
                setProvider('deepseek');
                setModel('deepseek-chat');
                setApiBaseUrl(API_BASE_URLS.deepseek);
              }
            } catch (error: any) {
              Alert.alert('错误', error.message || '网络错误');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText style={styles.emptyText}>加载中...</ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* 当前配置状态 */}
        {currentSettings && (
          <View style={styles.section}>
            <ThemedText style={styles.sectionTitle}>当前配置</ThemedText>
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <ThemedText style={styles.label}>提供商</ThemedText>
                <ThemedText style={styles.value}>
                  {currentSettings.provider === 'deepseek' ? 'DeepSeek' : '豆包'}
                </ThemedText>
              </View>
              <View style={styles.cardRow}>
                <ThemedText style={styles.label}>模型</ThemedText>
                <ThemedText style={styles.value}>{currentSettings.model}</ThemedText>
              </View>
              <View style={styles.cardRow}>
                <ThemedText style={styles.label}>状态</ThemedText>
                <View style={[styles.statusBadge, currentSettings.isActive ? styles.statusActive : styles.statusInactive]}>
                  <ThemedText style={styles.statusText}>
                    {currentSettings.isActive ? '已激活' : '未激活'}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 配置表单 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>
            {currentSettings ? '更新配置' : '添加配置'}
          </ThemedText>
          
          <View style={styles.card}>
            {/* 提供商选择 */}
            <ThemedText style={styles.inputLabel}>AI 提供商</ThemedText>
            <View style={styles.pickerContainer}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  style={[
                    styles.button,
                    { flex: 1, backgroundColor: provider === 'deepseek' ? theme.primary : theme.backgroundDefault },
                  ]}
                  onPress={() => handleProviderChange('deepseek')}
                >
                  <ThemedText style={provider === 'deepseek' ? styles.buttonText : styles.buttonTextSecondary}>
                    DeepSeek
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.button,
                    { flex: 1, backgroundColor: provider === 'doubao' ? theme.primary : theme.backgroundDefault },
                  ]}
                  onPress={() => handleProviderChange('doubao')}
                >
                  <ThemedText style={provider === 'doubao' ? styles.buttonText : styles.buttonTextSecondary}>
                    豆包
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* API 密钥 */}
            <ThemedText style={styles.inputLabel}>API 密钥</ThemedText>
            <TextInput
              style={styles.input}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="请输入 API 密钥"
              placeholderTextColor={theme.textMuted}
              secureTextEntry={apiKey !== '••••••••••••'}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <ThemedText style={styles.helpText}>
              从 {provider === 'deepseek' ? 'DeepSeek 官网' : '火山引擎控制台'} 获取 API 密钥
            </ThemedText>

            {/* API 地址 */}
            <ThemedText style={styles.inputLabel}>API 地址（可选）</ThemedText>
            <TextInput
              style={styles.input}
              value={apiBaseUrl}
              onChangeText={setApiBaseUrl}
              placeholder="默认使用官方 API 地址"
              placeholderTextColor={theme.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* 模型选择 */}
            <ThemedText style={styles.inputLabel}>模型</ThemedText>
            <View style={{ gap: 8 }}>
              {filteredModels.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  style={[
                    styles.card,
                    { marginBottom: 0, borderColor: model === m.id ? theme.primary : theme.border },
                  ]}
                  onPress={() => setModel(m.id)}
                >
                  <View style={[styles.cardRow, { marginBottom: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <ThemedText style={styles.value}>{m.name}</ThemedText>
                      <ThemedText style={styles.modelDescription}>{m.description}</ThemedText>
                    </View>
                    {model === m.id && (
                      <FontAwesome6 name="circle-check" size={20} color={theme.primary} />
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* 测试结果 */}
            {testResult && (
              <View style={{ marginTop: 12 }}>
                <ThemedText style={testResult === 'success' ? styles.successText : styles.errorText}>
                  {testMessage}
                </ThemedText>
              </View>
            )}

            {/* 操作按钮 */}
            <View style={{ marginTop: 16, gap: 12 }}>
              <TouchableOpacity
                style={[styles.buttonSecondary, testing && { opacity: 0.5 }]}
                onPress={handleTest}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator size="small" color={theme.textPrimary} />
                ) : (
                  <ThemedText style={styles.buttonTextSecondary}>测试连接</ThemedText>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, saving && { opacity: 0.5 }]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <ThemedText style={styles.buttonText}>保存配置</ThemedText>
                )}
              </TouchableOpacity>

              {currentSettings && (
                <TouchableOpacity style={styles.buttonDanger} onPress={handleDelete}>
                  <ThemedText style={styles.buttonText}>删除配置</ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* 使用说明 */}
        <View style={styles.section}>
          <ThemedText style={styles.sectionTitle}>使用说明</ThemedText>
          <View style={styles.card}>
            <ThemedText style={styles.helpText}>
              {'1. 选择 AI 提供商（DeepSeek 或豆包）\n'}
              {'2. 获取 API 密钥并填入上方输入框\n'}
              {'3. 选择要使用的模型\n'}
              {'4. 点击"测试连接"验证密钥是否有效\n'}
              {'5. 测试成功后点击"保存配置"\n\n'}
              {'注意：API 密钥将安全存储在您的设备上，我们不会收集您的密钥信息。'}
            </ThemedText>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
