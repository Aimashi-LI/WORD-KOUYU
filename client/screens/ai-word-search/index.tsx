import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { useSafeSearchParams } from '@/hooks/useSafeRouter';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';
import { useAI } from '@/hooks/useAI';
import { initDatabase } from '@/database';
import { addWordToWordbook } from '@/database/wordbookDao';
import { createWord } from '@/database/wordDao';

// AI 搜索单词结果类型
interface SearchedWord {
  word: string;
  phonetic?: string;
  definition?: string;
  partOfSpeech?: string;
  example?: string; // 英文例句
}

export default function AIWordSearchScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { wordbookId } = useSafeSearchParams<{ wordbookId?: string }>();
  const { isConfigured, settings: aiSettings } = useAI();

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchedWord[]>([]);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [selectedWords, setSelectedWords] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);

  // 搜索单词
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      Alert.alert('提示', '请输入搜索关键词');
      return;
    }

    setSearching(true);
    setError('');
    setSearchResults([]);
    setSelectedWords(new Set());
    setDescription('');

    try {
      const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
      const response = await fetch(`${API_BASE_URL}/api/v1/ai/generate/search-words`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: searchQuery.trim(),
          count: 30,
        }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        setSearchResults(data.data.words || []);
        setDescription(data.data.description || '');
        
        if (!data.data.words || data.data.words.length === 0) {
          setError('未找到相关单词，请尝试其他关键词');
        }
      } else {
        setError(data.error || '搜索失败，请重试');
      }
    } catch (err: any) {
      console.error('Search words error:', err);
      setError('网络错误，请检查网络连接');
    } finally {
      setSearching(false);
    }
  }, [searchQuery]);

  // 切换单词选择
  const toggleWordSelection = (word: string) => {
    const newSelection = new Set(selectedWords);
    if (newSelection.has(word)) {
      newSelection.delete(word);
    } else {
      newSelection.add(word);
    }
    setSelectedWords(newSelection);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedWords.size === searchResults.length) {
      setSelectedWords(new Set());
    } else {
      setSelectedWords(new Set(searchResults.map(w => w.word)));
    }
  };

  // 添加选中的单词
  const handleAddSelected = async () => {
    if (selectedWords.size === 0) {
      Alert.alert('提示', '请先选择要添加的单词');
      return;
    }

    const targetWordbookId = wordbookId ? parseInt(wordbookId, 10) : null;

    if (!targetWordbookId) {
      Alert.alert('错误', '未指定词库');
      return;
    }

    setAdding(true);
    let successCount = 0;
    let failCount = 0;

    try {
      await initDatabase();

      for (const word of selectedWords) {
        const wordData = searchResults.find(w => w.word === word);
        if (!wordData) continue;

        try {
          // 插入单词
          const wordId = await createWord({
            word: wordData.word,
            phonetic: wordData.phonetic || '',
            definition: wordData.definition || '',
            partOfSpeech: wordData.partOfSpeech || '',
            sentence: wordData.example || '', // 保存AI生成的例句
            split: '',
            mnemonic: '',
            is_mastered: 0,
          });

          // 添加到词库
          if (wordId) {
            await addWordToWordbook(targetWordbookId, wordId);
            successCount++;
          } else {
            failCount++;
          }
        } catch (err) {
          console.error(`Failed to add word ${word}:`, err);
          failCount++;
        }
      }

      if (successCount > 0) {
        Alert.alert(
          '添加完成',
          `成功添加 ${successCount} 个单词${failCount > 0 ? `，${failCount} 个添加失败` : ''}`,
          [
            {
              text: '继续搜索',
              style: 'default',
            },
            {
              text: '返回单词本',
              style: 'cancel',
              onPress: () => router.back(),
            },
          ]
        );
        // 清空选择
        setSelectedWords(new Set());
      } else {
        Alert.alert('添加失败', '没有单词被成功添加，请重试');
      }
    } catch (err: any) {
      console.error('Add words error:', err);
      Alert.alert('错误', '添加单词失败');
    } finally {
      setAdding(false);
    }
  };

  // 跳转到AI设置页面
  const goToAISettings = () => {
    router.push('/ai-settings');
  };

  // 未配置AI时的提示
  if (!isConfigured) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
              <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <ThemedText variant="h2" color={theme.textPrimary} style={styles.title}>
              AI 搜索单词
            </ThemedText>
            <View style={styles.placeholder} />
          </View>

          <View style={styles.configPrompt}>
            <FontAwesome6 name="wand-magic-sparkles" size={64} color={theme.primary} style={styles.configPromptIcon} />
            <ThemedText variant="h2" color={theme.textPrimary} style={styles.configPromptTitle}>
              AI 功能未配置
            </ThemedText>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.configPromptText}>
              请先配置 AI API 密钥以使用智能搜索单词功能
            </ThemedText>
            <TouchableOpacity style={styles.configButton} onPress={goToAISettings}>
              <ThemedText variant="body" color={theme.buttonPrimaryText}>
                前往配置
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* 顶部导航栏 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h2" color={theme.textPrimary} style={styles.title}>
            AI 搜索单词
          </ThemedText>
          <View style={styles.placeholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 搜索区域 */}
          <View style={styles.searchSection}>
            <View style={styles.searchInputContainer}>
              <FontAwesome6 name="magnifying-glass" size={20} color={theme.textMuted} style={styles.searchInputIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="输入关键词，如：高中单词、大学四级单词"
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
            </View>
            <TouchableOpacity
              style={[styles.searchButton, searching && styles.searchButtonDisabled]}
              onPress={handleSearch}
              disabled={searching || !searchQuery.trim()}
            >
              {searching ? (
                <ActivityIndicator size="small" color={theme.buttonPrimaryText} />
              ) : (
                <>
                  <FontAwesome6 name="wand-magic-sparkles" size={20} color={theme.buttonPrimaryText} />
                  <ThemedText variant="body" color={theme.buttonPrimaryText} style={styles.searchButtonText}>
                    AI 搜索
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>
            <ThemedText variant="caption" color={theme.textMuted} style={styles.hintText}>
              AI 将根据您的关键词智能搜索相关单词
            </ThemedText>
          </View>

          {/* 错误提示 */}
          {error ? (
            <View style={styles.errorContainer}>
              <ThemedText variant="body" color={theme.error}>{error}</ThemedText>
            </View>
          ) : null}

          {/* 搜索结果描述 */}
          {description ? (
            <View style={styles.descriptionCard}>
              <ThemedText variant="caption" color={theme.textSecondary} style={styles.descriptionText}>
                {description}
              </ThemedText>
            </View>
          ) : null}

          {/* 搜索结果列表 */}
          {searchResults.length > 0 && (
            <View style={styles.resultsSection}>
              <View style={styles.resultsHeader}>
                <ThemedText variant="body" color={theme.textPrimary} style={styles.resultsCount}>
                  找到 {searchResults.length} 个单词
                </ThemedText>
                <TouchableOpacity style={styles.selectAllButton} onPress={toggleSelectAll}>
                  <FontAwesome6
                    name={selectedWords.size === searchResults.length ? 'check-square' : 'square'}
                    size={18}
                    color={theme.primary}
                  />
                  <ThemedText variant="caption" color={theme.primary}>
                    {selectedWords.size === searchResults.length ? '取消全选' : '全选'}
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {searchResults.map((item, index) => (
                <TouchableOpacity
                  key={`${item.word}-${index}`}
                  style={[styles.wordCard, selectedWords.has(item.word) && styles.wordCardSelected]}
                  onPress={() => toggleWordSelection(item.word)}
                >
                  <View style={[styles.checkbox, selectedWords.has(item.word) && styles.checkboxChecked]}>
                    {selectedWords.has(item.word) && (
                      <FontAwesome6 name="check" size={14} color={theme.buttonPrimaryText} />
                    )}
                  </View>
                  <View style={styles.wordInfo}>
                    <ThemedText variant="body" color={theme.textPrimary} style={styles.wordText}>
                      {item.word}
                      {item.partOfSpeech && (
                        <ThemedText variant="caption" color={theme.textMuted}> {item.partOfSpeech}</ThemedText>
                      )}
                    </ThemedText>
                    {item.phonetic && (
                      <ThemedText variant="caption" color={theme.textMuted} style={styles.phoneticText}>
                        {item.phonetic}
                      </ThemedText>
                    )}
                    {item.definition && (
                      <ThemedText variant="caption" color={theme.textSecondary} style={styles.definitionText}>
                        {item.definition}
                      </ThemedText>
                    )}
                    {item.example && (
                      <View style={styles.exampleContainer}>
                        {item.example.split('\n').map((line, idx) => (
                          <ThemedText 
                            key={idx} 
                            variant="caption" 
                            color={idx === 0 ? theme.textMuted : theme.textSecondary} 
                            style={styles.exampleText}
                          >
                            {idx === 0 ? `例: ${line}` : line}
                          </ThemedText>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* 加载中 */}
          {searching && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <ThemedText variant="body" color={theme.textMuted} style={styles.loadingText}>
                AI 正在搜索中...
              </ThemedText>
            </View>
          )}

          {/* 空状态 */}
          {!searching && searchResults.length === 0 && !error && searchQuery === '' && (
            <View style={styles.emptyContainer}>
              <FontAwesome6 name="magnifying-glass" size={48} color={theme.textMuted} />
              <ThemedText variant="body" color={theme.textMuted} style={styles.emptyText}>
                输入关键词开始搜索单词
              </ThemedText>
            </View>
          )}
        </ScrollView>

        {/* 底部操作栏 */}
        {searchResults.length > 0 && (
          <View style={styles.bottomBar}>
            <View style={styles.selectedCount}>
              <FontAwesome6 name="circle-check" size={18} color={theme.primary} />
              <ThemedText variant="body" color={theme.textPrimary}>
                已选择 {selectedWords.size} 个
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.addButton, (selectedWords.size === 0 || adding) && styles.addButtonDisabled]}
              onPress={handleAddSelected}
              disabled={selectedWords.size === 0 || adding}
            >
              {adding ? (
                <ActivityIndicator size="small" color={theme.buttonPrimaryText} />
              ) : (
                <>
                  <FontAwesome6 name="plus" size={18} color={theme.buttonPrimaryText} />
                  <ThemedText variant="body" color={theme.buttonPrimaryText} style={styles.addButtonText}>
                    添加到词库
                  </ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}
