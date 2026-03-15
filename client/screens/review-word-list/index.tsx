import React, { useState, useCallback } from 'react';
import { View, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { getWordsInWordbook } from '@/database/wordbookDao';
import { initDatabase } from '@/database';
import { Word } from '@/database/types';
import { Spacing, BorderRadius } from '@/constants/theme';

type ReviewMode = 'normal' | 'early';

export default function ReviewWordListScreen() {
  const { theme, isDark } = useTheme();
  const styles = createStyles(theme);
  const router = useSafeRouter();
  const { projectId } = useSafeSearchParams<{ projectId: string }>();

  const [words, setWords] = useState<Word[]>([]);
  const [loading, setLoading] = useState(true);
  const [wordbookName, setWordbookName] = useState('');

  // 提前复习弹窗相关状态
  const [showEarlyReviewModal, setShowEarlyReviewModal] = useState(false);
  const [earlyReviewWord, setEarlyReviewWord] = useState<Word | null>(null);
  const [earlyReviewHours, setEarlyReviewHours] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadWords();
    }, [projectId])
  );

  const loadWords = async () => {
    if (!projectId) {
      console.error('[ReviewWordList] projectId is missing');
      return;
    }

    try {
      setLoading(true);
      await initDatabase();
      const allWords = await getWordsInWordbook(parseInt(projectId));
      const now = new Date();

      // 筛选出待复习的单词
      const pendingWords = allWords.filter(w => {
        if (!w.next_review) return true;
        return new Date(w.next_review) <= now;
      });

      setWords(pendingWords);

      // 获取词库名称（从第一个单词的wordbook字段中获取，如果没有则显示ID）
      if (pendingWords.length > 0) {
        setWordbookName(`词库 ${projectId}`);
      }
    } catch (error) {
      console.error('加载待复习单词失败:', error);
      Alert.alert('错误', '加载失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 处理提前复习
  const handleEarlyReview = (word: Word) => {
    if (!word.next_review) {
      // 没有计划复习时间，直接开始复习
      startReview(word);
      return;
    }

    const nextReviewTime = new Date(word.next_review);
    const now = new Date();
    const hoursDiff = Math.floor((now.getTime() - nextReviewTime.getTime()) / (1000 * 60 * 60));

    if (hoursDiff >= 0) {
      // 已经到复习时间了，直接开始复习
      startReview(word);
      return;
    }

    // 计算提前的小时数
    const earlyHours = Math.abs(hoursDiff);
    setEarlyReviewWord(word);
    setEarlyReviewHours(earlyHours);
    setShowEarlyReviewModal(true);
  };

  // 确认提前复习
  const confirmEarlyReview = () => {
    setShowEarlyReviewModal(false);
    if (earlyReviewWord) {
      startReview(earlyReviewWord, 'early');
    }
  };

  // 开始复习
  const startReview = (word: Word, mode: ReviewMode = 'normal') => {
    console.log('[ReviewWordList] 开始复习单词:', word.word, 'mode:', mode);

    try {
      // 跳转到复习详情页面，只传入单词ID
      router.push('/review-detail', {
        wordId: word.id.toString(),
        reviewMode: mode,
      });
    } catch (error) {
      console.error('[ReviewWordList] 跳转失败:', error);
      Alert.alert('错误', '跳转失败，请重试');
    }
  };

  const renderWordItem = (word: Word) => {
    return (
      <ThemedView key={word.id} level="default" style={styles.wordItem}>
        <View style={styles.wordHeader}>
          <View style={styles.wordTitle}>
            <ThemedText variant="h3" color={theme.textPrimary}>
              {word.word}
            </ThemedText>
            {word.phonetic && (
              <ThemedText variant="body" color={theme.textSecondary} style={styles.wordPhonetic}>
                {word.phonetic}
              </ThemedText>
            )}
          </View>
        </View>

        {word.definition && (
          <ThemedText variant="body" color={theme.textSecondary} numberOfLines={2}>
            {word.definition}
          </ThemedText>
        )}

        <View style={styles.wordActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.earlyReviewButton]}
            onPress={() => handleEarlyReview(word)}
          >
            <FontAwesome6 name="clock" size={14} color={theme.warning} />
            <ThemedText variant="caption" color={theme.warning} style={styles.actionButtonText}>
              提前复习
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.reviewButton]}
            onPress={() => startReview(word)}
          >
            <FontAwesome6 name="play" size={14} color={theme.buttonPrimaryText} />
            <ThemedText variant="caption" color={theme.buttonPrimaryText} style={styles.actionButtonText}>
              开始复习
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <View style={styles.container}>
        {/* 标题栏 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <ThemedText variant="h2" color={theme.textPrimary}>
              待复习单词 ({words.length})
            </ThemedText>
          </View>
          <View style={styles.backButton} />
        </View>

        <ScrollView contentContainerStyle={styles.listContent}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
            </View>
          ) : words.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FontAwesome6
                name="circle-check"
                size={64}
                color={theme.success}
                style={styles.emptyIcon}
              />
              <ThemedText variant="h3" color={theme.textPrimary} style={styles.emptyTitle}>
                全部完成！
              </ThemedText>
              <ThemedText variant="body" color={theme.textSecondary} style={styles.emptyText}>
                当前项目没有待复习的单词
              </ThemedText>
            </View>
          ) : (
            words.map(renderWordItem)
          )}
        </ScrollView>
      </View>

      {/* 提前复习确认弹窗 */}
      <Modal
        visible={showEarlyReviewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEarlyReviewModal(false)}
      >
        <View style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <ThemedView level="default" style={{
            width: '85%',
            maxWidth: 400,
            borderRadius: BorderRadius.xl,
            padding: Spacing.xl,
          }}>
            <View style={{
              alignItems: 'center',
              marginBottom: Spacing.md,
            }}>
              <FontAwesome6 name="triangle-exclamation" size={48} color="#F59E0B" />
              <ThemedText variant="h3" color={theme.textPrimary} style={{
                marginTop: Spacing.md,
                marginBottom: Spacing.sm,
              }}>
                提前复习提醒
              </ThemedText>
            </View>

            <ThemedText variant="body" color={theme.textSecondary} style={{
              textAlign: 'center',
              marginBottom: Spacing.sm,
            }}>
              该单词计划在 {earlyReviewHours} 小时后复习
            </ThemedText>

            <ThemedText variant="body" color={theme.textSecondary} style={{
              textAlign: 'center',
              marginBottom: Spacing.sm,
            }}>
              提前复习会影响记忆效果，建议按系统安排的时间进行复习。
            </ThemedText>

            <ThemedText variant="caption" color={theme.warning} style={{
              textAlign: 'center',
              marginTop: Spacing.md,
            }}>
              系统将调整单词掌握率计算因子
            </ThemedText>

            <View style={{
              flexDirection: 'row',
              gap: Spacing.md,
              marginTop: Spacing.xl,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: Spacing.md,
                  paddingHorizontal: Spacing.lg,
                  borderRadius: BorderRadius.md,
                  alignItems: 'center',
                  backgroundColor: theme.backgroundTertiary,
                }}
                onPress={() => setShowEarlyReviewModal(false)}
              >
                <ThemedText variant="body" color={theme.textPrimary}>
                  取消
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: Spacing.md,
                  paddingHorizontal: Spacing.lg,
                  borderRadius: BorderRadius.md,
                  alignItems: 'center',
                  backgroundColor: theme.primary,
                }}
                onPress={confirmEarlyReview}
              >
                <ThemedText variant="body" color={theme.buttonPrimaryText}>
                  确认
                </ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>
    </Screen>
  );
}
