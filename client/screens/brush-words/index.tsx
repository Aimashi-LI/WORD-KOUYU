import React, { useState, useMemo } from 'react';
import { View, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { getAllWords } from '@/database/wordDao';
import { getWordsInWordbook } from '@/database/wordbookDao';
import { initDatabase } from '@/database';
import { Word } from '@/database/types';
import { useCallback } from 'react';

export default function BrushWordsScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { projectId } = useSafeSearchParams<{ projectId?: string }>();
  
  const [words, setWords] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showDefinition, setShowDefinition] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadWords();
    }, [projectId])
  );

  const loadWords = async () => {
    setLoading(true);
    try {
      await initDatabase();
      
      let wordList: Word[];
      
      if (projectId) {
        // 从指定词库加载单词
        wordList = await getWordsInWordbook(parseInt(projectId));
      } else {
        // 加载所有单词
        wordList = await getAllWords();
      }
      
      setWords(wordList);
      setCurrentIndex(0);
      setShowDefinition(false);
    } catch (error) {
      console.error('加载单词失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowDefinition(false);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowDefinition(false);
    }
  };

  const currentWord = words[currentIndex];

  if (loading) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText variant="body" color={theme.textMuted} style={styles.loadingText}>
            加载中...
          </ThemedText>
        </View>
      </Screen>
    );
  }

  if (words.length === 0) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.emptyContainer}>
          <FontAwesome6 name="book-open" size={64} color={theme.textMuted} />
          <ThemedText variant="h3" color={theme.textPrimary} style={styles.emptyTitle}>
            暂无单词
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.emptyText}>
            请先添加单词
          </ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* 顶部栏 */}
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h3" color={theme.textPrimary}>
            刷单词 ({currentIndex + 1}/{words.length})
          </ThemedText>
          <View style={styles.placeholder} />
        </View>

        {/* 进度条 */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentIndex + 1) / words.length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        {/* 单词卡片 */}
        <ScrollView contentContainerStyle={styles.cardContainer}>
          <ThemedView level="default" style={styles.wordCard}>
            {/* 单词 */}
            <View style={styles.wordSection}>
              <ThemedText variant="h1" color={theme.textPrimary} style={styles.wordText}>
                {currentWord.word}
              </ThemedText>
              {currentWord.phonetic && (
                <ThemedText variant="body" color={theme.textSecondary} style={styles.phonetic}>
                  {currentWord.phonetic}
                </ThemedText>
              )}
            </View>

            {/* 分割 */}
            {currentWord.split && (
              <ThemedView level="tertiary" style={styles.splitSection}>
                <FontAwesome6 name="scissors" size={16} color={theme.accent} />
                <ThemedText variant="body" color={theme.textSecondary} style={styles.splitText}>
                  {currentWord.split}
                </ThemedText>
              </ThemedView>
            )}

            {/* 助记符 */}
            {currentWord.mnemonic && (
              <ThemedView level="tertiary" style={styles.mnemonicSection}>
                <FontAwesome6 name="lightbulb" size={16} color={theme.accent} />
                <ThemedText variant="body" color={theme.textSecondary} style={styles.mnemonicText}>
                  {currentWord.mnemonic}
                </ThemedText>
              </ThemedView>
            )}

            {/* 释义（可切换显示） */}
            <TouchableOpacity 
              style={styles.definitionSection}
              onPress={() => setShowDefinition(!showDefinition)}
            >
              <View style={styles.definitionHeader}>
                <FontAwesome6 
                  name={showDefinition ? "eye" : "eye-slash"} 
                  size={16} 
                  color={theme.primary} 
                />
                <ThemedText variant="body" color={theme.primary} style={styles.definitionTitle}>
                  释义 {showDefinition ? '(点击隐藏)' : '(点击显示)'}
                </ThemedText>
              </View>
              
              {showDefinition && (
                <ThemedView level="tertiary" style={styles.definitionContent}>
                  {currentWord.partOfSpeech && (
                    <ThemedText variant="smallMedium" color={theme.textMuted}>
                      {currentWord.partOfSpeech}.
                    </ThemedText>
                  )}
                  <ThemedText variant="body" color={theme.textPrimary}>
                    {currentWord.definition}
                  </ThemedText>
                  {currentWord.sentence && (
                    <ThemedText variant="caption" color={theme.textSecondary} style={styles.sentence}>
                      例句：{currentWord.sentence}
                    </ThemedText>
                  )}
                </ThemedView>
              )}
            </TouchableOpacity>
          </ThemedView>
        </ScrollView>

        {/* 底部导航按钮 */}
        <View style={styles.bottomBar}>
          <TouchableOpacity 
            style={[
              styles.navButton, 
              currentIndex === 0 && styles.navButtonDisabled
            ]}
            onPress={handlePrev}
            disabled={currentIndex === 0}
          >
            <FontAwesome6 
              name="chevron-left" 
              size={24} 
              color={currentIndex === 0 ? theme.textMuted : theme.primary} 
            />
            <ThemedText 
              variant="body" 
              color={currentIndex === 0 ? theme.textMuted : theme.primary}
            >
              上一个
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.navButton, 
              currentIndex === words.length - 1 && styles.navButtonDisabled
            ]}
            onPress={handleNext}
            disabled={currentIndex === words.length - 1}
          >
            <ThemedText 
              variant="body" 
              color={currentIndex === words.length - 1 ? theme.textMuted : theme.primary}
            >
              下一个
            </ThemedText>
            <FontAwesome6 
              name="chevron-right" 
              size={24} 
              color={currentIndex === words.length - 1 ? theme.textMuted : theme.primary} 
            />
          </TouchableOpacity>
        </View>
      </View>
    </Screen>
  );
}
