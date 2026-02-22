import React, { useState, useMemo } from 'react';
import { View, ScrollView, Alert, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { createWord } from '@/database/wordDao';
import { addWordToWordbook } from '@/database/wordbookDao';
import { initDatabase } from '@/database';
import { NewWord } from '@/database/types';

export default function PasteImportScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { wordbookId } = useSafeSearchParams<{ wordbookId?: string }>();

  const [importText, setImportText] = useState('');
  const [loading, setLoading] = useState(false);

  // 解析导入行
  const parseImportLine = (line: string): NewWord | null => {
    if (!line.trim()) return null;

    // 去掉开头的序号（如 "1. " 或 "1、"）
    let cleanedLine = line.replace(/^\d+[\.\、]\s*/, '');

    // 去掉加粗标记（如 "**abandon**" -> "abandon"）
    cleanedLine = cleanedLine.replace(/\*\*/g, '');

    // 按分隔符分割（支持 - 或 :）
    let parts: string[];

    if (cleanedLine.includes(' - ')) {
      parts = cleanedLine.split(' - ');
    } else if (cleanedLine.includes('：')) {
      parts = cleanedLine.split('：');
    } else if (cleanedLine.includes(':')) {
      parts = cleanedLine.split(':');
    } else {
      parts = cleanedLine.split(/\s+/).filter(p => p);
    }

    if (parts.length < 2) return null;

    // parts[0] 应该是单词，parts[1] 是词性+释义
    const wordText = parts[0].trim();
    if (!wordText || !/^[a-zA-Z]+$/.test(wordText)) return null;

    // 提取词性和释义
    let pos = '';
    let definition = '';

    const posDefinition = parts[1].trim();

    // 匹配词性（n. v. adj. adv. 等）
    const posMatch = posDefinition.match(/^(n\.|v\.|adj\.|adv\.|prep\.|pron\.|conj\.|art\.|num\.|int\.|vt\.|vi\.|n\.&adj\.|v\.&n\.)\s*/i);
    if (posMatch) {
      pos = posMatch[1];
      definition = posDefinition.substring(posMatch[0].length).trim();
    } else {
      // 没有明确的词性标记，整段作为释义
      definition = posDefinition;
    }

    if (!definition) return null;

    return {
      word: wordText,
      phonetic: undefined,
      definition: definition,
      partOfSpeech: pos,
      split: undefined,
      sentence: undefined
    };
  };

  // 处理导入
  const handleImport = async () => {
    if (!importText.trim()) {
      Alert.alert('提示', '请输入导入内容');
      return;
    }

    setLoading(true);

    try {
      await initDatabase();

      const lines = importText.split('\n').filter(line => line.trim());
      let successCount = 0;
      let failedCount = 0;
      const importedWordIds: number[] = [];

      for (const line of lines) {
        try {
          const wordData = parseImportLine(line);
          if (wordData) {
            const wordId = await createWord(wordData);
            importedWordIds.push(wordId);
            successCount++;
          } else {
            failedCount++;
          }
        } catch (error) {
          console.error('导入失败:', line, error);
          failedCount++;
        }
      }

      // 如果有词库ID，将导入的单词添加到词库
      if (wordbookId && importedWordIds.length > 0) {
        try {
          for (const wordId of importedWordIds) {
            await addWordToWordbook(parseInt(wordbookId), wordId);
          }
        } catch (error) {
          console.error('添加到词库失败:', error);
        }
      }

      Alert.alert(
        '导入完成',
        `成功: ${successCount}，失败: ${failedCount}`,
        [
          {
            text: '确定',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('导入失败:', error);
      Alert.alert('错误', '导入失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 清空内容
  const handleClear = () => {
    Alert.alert(
      '确认清空',
      '确定要清空所有内容吗？',
      [
        { text: '取消', style: 'cancel' },
        { text: '确定', style: 'destructive', onPress: () => setImportText('') }
      ]
    );
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <ThemedText variant="h2" color={theme.textPrimary}>文本粘贴</ThemedText>
        <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
          <ThemedText variant="body" color={theme.primary}>清空</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 说明卡片 */}
        <ThemedView level="default" style={styles.infoCard}>
          <View style={styles.infoItem}>
            <FontAwesome6 name="lightbulb" size={20} color={theme.primary} style={styles.infoIcon} />
            <View style={styles.infoContent}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.infoTitle}>
                支持的格式
              </ThemedText>
              <ThemedText variant="caption" color={theme.textSecondary}>
                格式：单词 - 词性 释义（支持序号和加粗）
              </ThemedText>
            </View>
          </View>
          <ThemedText variant="caption" color={theme.textMuted} style={styles.exampleText}>
            示例：1. **abandon** - v. 放弃，抛弃
          </ThemedText>
        </ThemedView>

        {/* 输入框 */}
        <ThemedView level="tertiary" style={styles.textareaContainer}>
          <TextInput
            style={[styles.textarea, { color: theme.textPrimary }]}
            placeholder="请粘贴单词列表，每行一个单词"
            placeholderTextColor={theme.textMuted}
            value={importText}
            onChangeText={setImportText}
            multiline
            textAlignVertical="top"
          />
        </ThemedView>

        {/* 统计信息 */}
        {importText.trim() && (
          <View style={styles.statsContainer}>
            <ThemedText variant="caption" color={theme.textSecondary}>
              共 {importText.split('\n').filter(line => line.trim()).length} 行
            </ThemedText>
          </View>
        )}

        {/* 导入按钮 */}
        <TouchableOpacity
          style={[styles.importButton, loading && styles.importButtonDisabled]}
          onPress={handleImport}
          disabled={loading || !importText.trim()}
        >
          {loading ? (
            <ActivityIndicator size="small" color={theme.buttonPrimaryText} />
          ) : (
            <>
              <FontAwesome6 name="check" size={20} color={theme.buttonPrimaryText} style={styles.importButtonIcon} />
              <ThemedText variant="h3" color={theme.buttonPrimaryText}>
                开始导入
              </ThemedText>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}
