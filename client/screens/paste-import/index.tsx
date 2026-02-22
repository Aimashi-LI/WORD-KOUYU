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
    // 支持格式：word pos definition 或 word,definition
    let parts: string[];

    if (line.includes(',')) {
      parts = line.split(',').map(p => p.trim());
    } else if (line.includes('|')) {
      parts = line.split('|').map(p => p.trim());
    } else {
      parts = line.split(/\s+/).filter(p => p);
    }

    if (parts.length < 2) return null;

    const wordText = parts[0].replace(/[^a-z]/gi, '');
    if (!wordText) return null;

    const pos = parts[1] || '';
    const definition = parts[2] || parts[1] || '';

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
                每行一个单词，用逗号、空格或竖线分隔
              </ThemedText>
            </View>
          </View>
          <ThemedText variant="caption" color={theme.textMuted} style={styles.exampleText}>
            示例：apple n.苹果, fruit
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
