import React, { useEffect, useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { getAllWords, getWordStats } from '@/database/wordDao';
import { initDatabase } from '@/database';

export default function WordbookScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  
  const [stats, setStats] = useState({ total: 0, mastered: 0, pending: 0 });
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await initDatabase();
      const [wordStats, wordList] = await Promise.all([
        getWordStats(),
        getAllWords()
      ]);
      setStats(wordStats);
      setWords(wordList);
    } catch (error) {
      console.error('加载失败:', error);
      Alert.alert('错误', '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 顶部统计卡片 */}
        <ThemedView level="default" style={styles.statsCard}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <ThemedText variant="h2" color={theme.primary}>{stats.total}</ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>总单词</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText variant="h2" color={theme.success}>{stats.mastered}</ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>已掌握</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText variant="h2" color={theme.warning}>{stats.pending}</ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>待复习</ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* 添加按钮组 */}
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/add-word')}
          >
            <FontAwesome6 name="plus" size={24} color={theme.buttonPrimaryText} />
            <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>手动添加</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/import-words')}
          >
            <FontAwesome6 name="file-import" size={24} color={theme.buttonPrimaryText} />
            <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>批量导入</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push('/camera-scan')}
          >
            <FontAwesome6 name="camera" size={24} color={theme.buttonPrimaryText} />
            <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>拍照识别</ThemedText>
          </TouchableOpacity>
        </View>

        {/* 单词列表 */}
        <ThemedText variant="h3" color={theme.textPrimary} style={styles.sectionTitle}>单词列表</ThemedText>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ThemedText color={theme.textMuted}>加载中...</ThemedText>
          </View>
        ) : words.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="book-open" size={48} color={theme.textMuted} />
            <ThemedText variant="body" color={theme.textMuted} style={styles.emptyText}>
              暂无单词，点击上方按钮添加
            </ThemedText>
          </View>
        ) : (
          words.map((word) => (
            <TouchableOpacity 
              key={word.id} 
              style={styles.wordCard}
              onPress={() => router.push('/word-detail', { id: word.id.toString() })}
            >
              <View style={styles.wordHeader}>
                <ThemedText variant="h3" color={theme.textPrimary}>{word.word}</ThemedText>
                {word.phonetic && (
                  <ThemedText variant="caption" color={theme.textMuted}>{word.phonetic}</ThemedText>
                )}
              </View>
              <ThemedText variant="body" color={theme.textSecondary} numberOfLines={2}>
                {word.definition}
              </ThemedText>
              {word.mnemonic && (
                <View style={styles.mnemonicContainer}>
                  <FontAwesome6 name="lightbulb" size={14} color={theme.accent} />
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.mnemonicText}>
                    {word.mnemonic}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
