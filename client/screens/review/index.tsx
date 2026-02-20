import React, { useState, useRef, useMemo } from 'react';
import { View, TouchableOpacity, Alert, ActivityIndicator, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { getReviewWords, addReviewLog, updateWord } from '@/database/wordDao';
import { getRecentReviewLogs } from '@/database/wordDao';
import { getWordsInWordbook } from '@/database/wordbookDao';
import { initDatabase } from '@/database';
import { Word } from '@/database/types';
import {
  updateWithTimeWeight,
  calculateMasteryRate,
  getRating
} from '@/algorithm/fsrs';
import { useCallback } from 'react';
import { formatSplitStringForDisplay } from '@/utils/splitHelper';
import { calculateImprovedSimilarity } from '@/utils/stringSimilarity';
import { MASTERY_CONFIG, SCORING_CONFIG, SIMILARITY_THRESHOLD } from '@/constants/reviewConfig';

type ReviewState = 'idle' | 'reviewing' | 'completed';
type ReviewMode = 'type1' | 'type2'; // type1: 填空单词, type2: 填空释义
type AnswerStatus = 'none' | 'correct' | 'wrong';

export default function ReviewScreen() {
  console.log('[Review] ========== ReviewScreen 组件开始渲染 ==========');
  
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { projectId } = useSafeSearchParams<{ projectId?: string }>();

  // 添加调试日志
  console.log('[Review] 页面加载，projectId:', projectId);
  console.log('[Review] 当前路由:', router);

  const [state, setState] = useState<ReviewState>('idle');
  const [queue, setQueue] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [masteredWords, setMasteredWords] = useState<Word[]>([]);
  
  // 新增：记录每个单词的得分
  const [wordScores, setWordScores] = useState<{ wordId: number; word: string; score: number; isQuick: boolean }[]>([]);
  
  // 复习状态相关
  const [reviewMode, setReviewMode] = useState<ReviewMode>('type1');
  const [type1Answer, setType1Answer] = useState('');
  const [type2Answer, setType2Answer] = useState('');
  const [type1Status, setType1Status] = useState<AnswerStatus>('none');
  const [type2Status, setType2Status] = useState<AnswerStatus>('none');
  const [quickScore, setQuickScore] = useState<number | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // 新增：记录开始时间
  const startTimeRef = useRef<number>(0);
  const reviewStartTimeRef = useRef<number>(0);

  useFocusEffect(
    useCallback(() => {
      loadReviewQueue();
    }, [projectId])
  );

  const loadReviewQueue = async () => {
    console.log('[Review] ========== loadReviewQueue 开始 ==========');
    console.log('[Review] 加载复习队列，projectId:', projectId);
    setLoading(true);
    try {
      await initDatabase();
      console.log('[Review] 数据库初始化完成');

      let words: Word[];

      if (projectId) {
        console.log('[Review] 从指定词库加载单词，projectId:', projectId);
        // 从指定词库加载单词
        const allWords = await getWordsInWordbook(parseInt(projectId));
        console.log('[Review] 词库中的单词总数:', allWords.length);

        // 只加载需要复习且未掌握的单词
        words = allWords.filter(w => {
          // 已掌握的单词不加载
          if (w.is_mastered === 1) return false;

          // 检查是否需要复习
          const now = new Date();
          if (!w.next_review) return true;
          return new Date(w.next_review) <= now;
        }).slice(0, 20);
        console.log('[Review] 过滤后的待复习单词数:', words.length);
      } else {
        console.log('[Review] 从所有单词加载需要复习的单词');
        // 从所有单词加载需要复习的单词
        words = await getReviewWords(20);
      }

      console.log('[Review] 最终加载了', words.length, '个单词');
      setQueue(words);
      setCurrentIndex(0);
      setState('idle');
    } catch (error) {
      console.error('[Review] 加载复习队列失败:', error);
      Alert.alert('错误', '加载复习队列失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStartReview = () => {
    if (queue.length > 0) {
      startReview(queue[0]);
    }
  };

  const startReview = (word: Word) => {
    setCurrentWord(word);
    setReviewMode('type1');
    setType1Answer('');
    setType2Answer('');
    setType1Status('none');
    setType2Status('none');
    setQuickScore(null);
    setIsEditing(false);
    setState('reviewing');
    startTimeRef.current = Date.now();
    
    // 记录复习开始时间（用于统计总耗时）
    if (currentIndex === 0) {
      reviewStartTimeRef.current = Date.now();
    }
  };

  // 方式一：根据词性、释义、拆分填写单词
  const handleSubmitType1 = () => {
    if (!currentWord) return;

    // 标准化答案：去除空格，转换为小写
    const userAnswer = type1Answer.trim().toLowerCase();
    const correctAnswer = currentWord.word.trim().toLowerCase();

    if (userAnswer === correctAnswer) {
      setType1Status('correct');
    } else {
      setType1Status('wrong');
    }

    // 方式一完成后，切换到方式二
    setTimeout(() => {
      setReviewMode('type2');
    }, 1000);
  };

  // 方式二：根据单词、短句填写释义
  const handleSubmitType2 = () => {
    if (!currentWord) return;

    // 释义匹配：使用改进的相似度匹配算法
    const userAnswer = type2Answer.trim();
    const correctAnswer = currentWord.definition.trim();

    // 使用改进的相似度算法（结合编辑距离、字符集合和最长公共子序列）
    const matchScore = calculateImprovedSimilarity(userAnswer, correctAnswer);

    if (matchScore >= SIMILARITY_THRESHOLD) {
      setType2Status('correct');
    } else {
      setType2Status('wrong');
    }

    // 方式二完成后，提交最终分数
    setTimeout(() => {
      submitFinalScore();
    }, 1000);
  };

  // 快速评分：没印象（0分）
  const handleNoImpression = () => {
    setQuickScore(SCORING_CONFIG.QUICK_NO_IMPRESSION);
    setIsEditing(false);

    // 延迟提交
    setTimeout(() => {
      submitFinalScore();
    }, 1000);
  };

  // 快速评分：有印象，但想不起来（2分）
  const handleSomeImpression = () => {
    setQuickScore(SCORING_CONFIG.QUICK_SOME_IMPRESSION);
    setIsEditing(false);

    // 延迟提交
    setTimeout(() => {
      submitFinalScore();
    }, 1000);
  };

  // 计算最终分数
  const calculateFinalScore = (): number => {
    if (quickScore !== null) {
      return quickScore; // 0分或2分
    }

    // 计算方式一和方式二的得分
    const type1Score = type1Status === 'correct' ? 1 : 0;
    const type2Score = type2Status === 'correct' ? 1 : 0;

    // 两种方式都正确：6分
    // 只有一种方式正确：4分
    // 两种方式都错误：0分
    if (type1Score === 1 && type2Score === 1) {
      return SCORING_CONFIG.PERFECT_SCORE;
    } else if (type1Score === 1 || type2Score === 1) {
      return SCORING_CONFIG.PARTIAL_SCORE;
    } else {
      return SCORING_CONFIG.WRONG_SCORE;
    }
  };

  // 提交最终分数
  const submitFinalScore = async () => {
    if (!currentWord) return;

    const finalScore = calculateFinalScore();
    const responseTime = (Date.now() - startTimeRef.current) / 1000;
    const isQuick = quickScore !== null;

    try {
      // 更新数据库
      const {
        newDifficulty,
        newStability,
        newAvgResponseTime,
        nextReviewDate
      } = await updateWithTimeWeight(currentWord, finalScore, responseTime);

      // 检查是否掌握
      const recentLogs = await getRecentReviewLogs(currentWord.id, MASTERY_CONFIG.consecutiveHighScores);
      const recentScores = recentLogs.map(log => log.score);
      recentScores.push(finalScore);

      const isMastered = checkMasteryWithConfig(currentWord, recentScores);

      await updateWord(currentWord.id, {
        difficulty: newDifficulty,
        stability: newStability,
        avg_response_time: newAvgResponseTime,
        last_review: new Date().toISOString(),
        next_review: nextReviewDate.toISOString(),
        is_mastered: isMastered ? 1 : 0
      });

      await addReviewLog({
        word_id: currentWord.id,
        score: finalScore,
        response_time: responseTime,
        reviewed_at: new Date().toISOString()
      });

      // 记录单词得分
      setWordScores(prev => [
        ...prev,
        {
          wordId: currentWord.id,
          word: currentWord.word,
          score: finalScore,
          isQuick
        }
      ]);

      // 如果单词已掌握，添加到已掌握列表
      if (isMastered && !currentWord.is_mastered) {
        setMasteredWords(prev => [...prev, currentWord]);
      }

      // 累加总分
      setTotalScore(prev => prev + finalScore);

      // 进入下一个单词
      const nextIndex = currentIndex + 1;
      if (nextIndex < queue.length) {
        setCurrentIndex(nextIndex);
        startReview(queue[nextIndex]);
      } else {
        setState('completed');
      }
    } catch (error) {
      console.error('提交分数失败:', error);
      Alert.alert('错误', '提交失败，请重试');
    }
  };

  // 使用配置的掌握标准判断
  const checkMasteryWithConfig = (word: Word, recentScores: number[]): boolean => {
    // 条件1：稳定性达到阈值
    const condition1 = word.stability >= MASTERY_CONFIG.stabilityThreshold;

    // 条件2：最近N次得分都≥高分标准
    const condition2 = recentScores.length >= MASTERY_CONFIG.consecutiveHighScores &&
      recentScores.slice(0, MASTERY_CONFIG.consecutiveHighScores).every(s => s >= MASTERY_CONFIG.highScoreThreshold);

    return condition1 && condition2;
  };

  const renderStartScreen = () => {
    return (
      <View style={styles.startScreen}>
        <FontAwesome6 name="book-open" size={80} color={theme.primary} style={styles.startIcon} />
        <ThemedText variant="h2" color={theme.textPrimary} style={styles.startTitle}>
          复习单词
        </ThemedText>
        <ThemedText variant="body" color={theme.textSecondary} style={styles.startSubtitle}>
          本次需要复习 {queue.length} 个单词
        </ThemedText>

        <TouchableOpacity
          style={[styles.startButton, { backgroundColor: theme.primary }]}
          onPress={handleStartReview}
        >
          <ThemedText variant="h3" color={theme.buttonPrimaryText}>点击开始</ThemedText>
        </TouchableOpacity>
      </View>
    );
  };

  const renderReviewContent = () => {
    if (!currentWord) return null;

    // 获取当前方式的背景颜色
    const getCardBackgroundColor = () => {
      if (quickScore === 0) return styles.cardWrong; // 没印象：红色
      if (quickScore === 2) return styles.cardPink; // 有印象：粉色

      if (reviewMode === 'type1') {
        if (type1Status === 'correct') return styles.cardCorrect;
        if (type1Status === 'wrong') return styles.cardWrong;
      } else {
        if (type2Status === 'correct') return styles.cardCorrect;
        if (type2Status === 'wrong') return styles.cardWrong;
      }

      return styles.cardNormal;
    };

    // 判断是否已完成所有方式
    const isCompleted = quickScore !== null || (type1Status !== 'none' && type2Status !== 'none');

    return (
      <KeyboardAvoidingView
        style={styles.reviewContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 顶部栏 */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                Alert.alert(
                  '提示',
                  '确定要退出复习吗？当前进度将不会保存',
                  [
                    { text: '取消', style: 'cancel' },
                    { text: '确定退出', onPress: () => router.back(), style: 'destructive' }
                  ]
                );
              }}
            >
              <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* 进度指示 */}
          <View style={styles.progressContainer}>
            <ThemedText variant="caption" color={theme.textMuted}>
              单词 {currentIndex + 1} / {queue.length}
            </ThemedText>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${((currentIndex + 1) / queue.length) * 100}%`, backgroundColor: theme.primary }]} />
            </View>
          </View>

          {/* 方式一：根据词性、释义、拆分填写单词 */}
          {reviewMode === 'type1' && (
            <View style={styles.reviewModeContainer}>
              <ThemedText variant="body" color={theme.textSecondary} style={styles.modeHint}>
                根据以下信息填写单词
              </ThemedText>

              <ThemedView level="default" style={[styles.reviewCard, getCardBackgroundColor()]}>
                <View style={styles.cardContent}>
                  {currentWord.partOfSpeech && (
                    <View style={styles.cardItem}>
                      <ThemedText variant="body" color={theme.textMuted} style={styles.infoLabel}>词性：</ThemedText>
                      <ThemedText variant="body" color={theme.textPrimary} style={styles.cardText}>{currentWord.partOfSpeech}.</ThemedText>
                    </View>
                  )}
                  <View style={styles.cardItem}>
                    <ThemedText variant="body" color={theme.textMuted} style={styles.infoLabel}>释义：</ThemedText>
                    <ThemedText variant="body" color={theme.textPrimary} style={styles.cardText}>{currentWord.definition}</ThemedText>
                  </View>
                  {currentWord.split && (
                    <View style={styles.cardItem}>
                      <ThemedText variant="body" color={theme.textMuted} style={styles.infoLabel}>拆分：</ThemedText>
                      <ThemedText variant="body" color={theme.textSecondary} style={styles.cardText}>{formatSplitStringForDisplay(currentWord.split)}</ThemedText>
                    </View>
                  )}
                </View>
              </ThemedView>

              {/* 输入框 */}
              {!isCompleted && (
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                  placeholder="请输入单词"
                  placeholderTextColor={theme.textMuted}
                  value={type1Answer}
                  onChangeText={setType1Answer}
                  onFocus={() => setIsEditing(true)}
                  onSubmitEditing={handleSubmitType1}
                />
              )}

              {/* 确认按钮 */}
              {!isCompleted && type1Answer.trim().length > 0 && (
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: theme.primary }]}
                  onPress={handleSubmitType1}
                >
                  <ThemedText variant="body" color={theme.buttonPrimaryText}>确认</ThemedText>
                </TouchableOpacity>
              )}

              {/* 答案反馈 */}
              {type1Status === 'correct' && (
                <View style={styles.feedbackContainer}>
                  <FontAwesome6 name="circle-check" size={24} color={theme.success} />
                  <ThemedText variant="body" color={theme.success}>正确！</ThemedText>
                </View>
              )}
              {type1Status === 'wrong' && (
                <View style={styles.feedbackContainer}>
                  <FontAwesome6 name="circle-xmark" size={24} color={theme.error} />
                  <ThemedText variant="body" color={theme.error}>错误！正确答案：{currentWord.word}</ThemedText>
                </View>
              )}
            </View>
          )}

          {/* 方式二：根据单词、短句填写释义 */}
          {reviewMode === 'type2' && (
            <View style={styles.reviewModeContainer}>
              <ThemedText variant="body" color={theme.textSecondary} style={styles.modeHint}>
                根据以下信息填写释义
              </ThemedText>

              <ThemedView level="default" style={[styles.reviewCard, getCardBackgroundColor()]}>
                <View style={styles.cardContent}>
                  <ThemedText variant="h1" color={theme.textPrimary} style={styles.cardText}>
                    {currentWord.word}
                  </ThemedText>
                  {currentWord.phonetic && (
                    <ThemedText variant="body" color={theme.textMuted} style={styles.cardText}>
                      {currentWord.phonetic}
                    </ThemedText>
                  )}
                  {currentWord.mnemonic && (
                    <View style={styles.cardItem}>
                      <ThemedText variant="body" color={theme.textMuted} style={styles.infoLabel}>助记：</ThemedText>
                      <ThemedText variant="body" color={theme.textSecondary} style={styles.cardText}>{currentWord.mnemonic}</ThemedText>
                    </View>
                  )}
                  {currentWord.sentence && (
                    <View style={styles.cardItem}>
                      <ThemedText variant="body" color={theme.textMuted} style={styles.infoLabel}>例句：</ThemedText>
                      <ThemedText variant="body" color={theme.textSecondary} style={styles.cardText}>{currentWord.sentence}</ThemedText>
                    </View>
                  )}
                </View>
              </ThemedView>

              {/* 输入框 */}
              {!isCompleted && (
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                  placeholder="请输入释义"
                  placeholderTextColor={theme.textMuted}
                  value={type2Answer}
                  onChangeText={setType2Answer}
                  onFocus={() => setIsEditing(true)}
                  onSubmitEditing={handleSubmitType2}
                  multiline
                  numberOfLines={3}
                />
              )}

              {/* 确认按钮 */}
              {!isCompleted && type2Answer.trim().length > 0 && (
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: theme.primary }]}
                  onPress={handleSubmitType2}
                >
                  <ThemedText variant="body" color={theme.buttonPrimaryText}>确认</ThemedText>
                </TouchableOpacity>
              )}

              {/* 答案反馈 */}
              {type2Status === 'correct' && (
                <View style={styles.feedbackContainer}>
                  <FontAwesome6 name="circle-check" size={24} color={theme.success} />
                  <ThemedText variant="body" color={theme.success}>正确！</ThemedText>
                </View>
              )}
              {type2Status === 'wrong' && (
                <View style={styles.feedbackContainer}>
                  <FontAwesome6 name="circle-xmark" size={24} color={theme.error} />
                  <ThemedText variant="body" color={theme.error}>错误！正确答案：{currentWord.definition}</ThemedText>
                </View>
              )}
            </View>
          )}

          {/* 快速评分按钮 */}
          {!isCompleted && (
            <View style={styles.quickScoreButtons}>
              <TouchableOpacity
                style={[
                  styles.quickScoreButton,
                  { backgroundColor: theme.error },
                  quickScore === 0 && styles.quickScoreButtonActive
                ]}
                onPress={handleNoImpression}
                disabled={isEditing}
              >
                <FontAwesome6 name="circle-xmark" size={20} color={theme.buttonPrimaryText} />
                <ThemedText variant="body" color={theme.buttonPrimaryText}>没印象</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickScoreButton,
                  { backgroundColor: '#FF69B4' }, // 粉色
                  quickScore === 2 && styles.quickScoreButtonActive
                ]}
                onPress={handleSomeImpression}
                disabled={isEditing}
              >
                <FontAwesome6 name="face-meh" size={20} color={theme.buttonPrimaryText} />
                <ThemedText variant="body" color={theme.buttonPrimaryText}>有印象，但想不起来</ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  const renderCompleted = () => {
    const masteryRate = calculateMasteryRate(totalScore, queue.length);
    const rating = getRating(masteryRate);
    
    // 计算详细统计
    const perfectCount = wordScores.filter(w => w.score === 6).length; // 完全正确（6分）
    const partialCount = wordScores.filter(w => w.score === 4).length; // 部分正确（4分）
    const wrongCount = wordScores.filter(w => w.score === 0 && !w.isQuick).length; // 完全错误（0分，非快速评分）
    const quickNoImpression = wordScores.filter(w => w.score === 0 && w.isQuick).length; // 快速评分：没印象
    const quickSomeImpression = wordScores.filter(w => w.score === 2).length; // 快速评分：有印象
    
    const averageScore = queue.length > 0 ? (totalScore / queue.length).toFixed(1) : 0;
    const totalTime = reviewStartTimeRef.current > 0 ? Math.round((Date.now() - reviewStartTimeRef.current) / 1000) : 0;
    const avgTimePerWord = queue.length > 0 ? Math.round(totalTime / queue.length) : 0;
    
    // 格式化时间
    const formatTime = (seconds: number) => {
      if (seconds < 60) return `${seconds}秒`;
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}分${secs}秒`;
    };

    return (
      <View style={styles.completedContainer}>
        {/* 顶部栏 */}
        <View style={styles.topBar}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.completedScrollContent}>
          {/* 奖杯图标 */}
          <View style={styles.trophyContainer}>
            <FontAwesome6 name="trophy" size={80} color={theme.primary} />
          </View>
          
          {/* 标题 */}
          <ThemedText variant="h2" color={theme.textPrimary} style={styles.completedTitle}>
            复习完成！
          </ThemedText>
          <ThemedText variant="h3" color={theme.primary} style={styles.rating}>
            {rating}
          </ThemedText>
          
          {/* 总体统计卡片 */}
          <ThemedView level="default" style={styles.statsCard}>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <ThemedText variant="h2" color={theme.primary}>{queue.length}</ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>复习单词</ThemedText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <ThemedText variant="h2" color={theme.success}>{masteryRate}%</ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>掌握率</ThemedText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <ThemedText variant="h2" color={theme.accent}>{averageScore}</ThemedText>
                <ThemedText variant="caption" color={theme.textMuted}>平均分</ThemedText>
              </View>
            </View>
          </ThemedView>

          {/* 时间统计 */}
          <ThemedView level="default" style={styles.timeStatsCard}>
            <View style={styles.timeStatsRow}>
              <FontAwesome6 name="clock" size={20} color={theme.textSecondary} />
              <ThemedText variant="body" color={theme.textSecondary}>
                总用时 {formatTime(totalTime)}
              </ThemedText>
            </View>
            <View style={styles.timeStatsRow}>
              <FontAwesome6 name="stopwatch" size={20} color={theme.textSecondary} />
              <ThemedText variant="body" color={theme.textSecondary}>
                平均每个单词 {avgTimePerWord}秒
              </ThemedText>
            </View>
          </ThemedView>

          {/* 分数分布 */}
          <ThemedView level="default" style={styles.scoreDistributionCard}>
            <ThemedText variant="h3" color={theme.textPrimary} style={styles.cardTitle}>
              分数分布
            </ThemedText>
            
            <View style={styles.scoreBar}>
              <View style={[styles.scoreBarSegment, { flex: perfectCount, backgroundColor: theme.success }]}>
                <ThemedText variant="caption" color={theme.buttonPrimaryText} style={styles.scoreBarLabel}>
                  完全正确 {perfectCount}
                </ThemedText>
              </View>
              <View style={[styles.scoreBarSegment, { flex: partialCount, backgroundColor: theme.primary }]}>
                <ThemedText variant="caption" color={theme.buttonPrimaryText} style={styles.scoreBarLabel}>
                  部分正确 {partialCount}
                </ThemedText>
              </View>
              <View style={[styles.scoreBarSegment, { flex: wrongCount, backgroundColor: theme.error }]}>
                <ThemedText variant="caption" color={theme.buttonPrimaryText} style={styles.scoreBarLabel}>
                  完全错误 {wrongCount}
                </ThemedText>
              </View>
              <View style={[styles.scoreBarSegment, { flex: quickSomeImpression, backgroundColor: '#FF69B4' }]}>
                <ThemedText variant="caption" color={theme.buttonPrimaryText} style={styles.scoreBarLabel}>
                  有印象 {quickSomeImpression}
                </ThemedText>
              </View>
              <View style={[styles.scoreBarSegment, { flex: quickNoImpression, backgroundColor: theme.border }]}>
                <ThemedText variant="caption" color={theme.textMuted} style={styles.scoreBarLabel}>
                  没印象 {quickNoImpression}
                </ThemedText>
              </View>
            </View>
          </ThemedView>

          {/* 已掌握单词提示 */}
          {masteredWords.length > 0 && (
            <ThemedView level="tertiary" style={styles.masteredBanner}>
              <FontAwesome6 name="star" size={20} color={theme.success} />
              <View style={styles.masteredBannerContent}>
                <ThemedText variant="h3" color={theme.success} style={styles.masteredTitle}>
                  🎉 恭喜！有 {masteredWords.length} 个单词已掌握
                </ThemedText>
                <ThemedText variant="caption" color={theme.textSecondary}>
                  这些单词将不再出现在复习队列中
                </ThemedText>
              </View>
            </ThemedView>
          )}

          {/* 已掌握单词列表 */}
          {masteredWords.length > 0 && (
            <View style={styles.masteredWordsList}>
              <ThemedText variant="body" color={theme.textMuted} style={styles.masteredListHeader}>
                已掌握的单词：
              </ThemedText>
              {masteredWords.map(word => (
                <ThemedView key={word.id} level="tertiary" style={styles.masteredWordItem}>
                  <View style={styles.masteredWordInfo}>
                    <ThemedText variant="body" color={theme.textPrimary}>
                      {word.word}
                    </ThemedText>
                    <ThemedText variant="caption" color={theme.textMuted}>
                      稳定性：{Math.round(word.stability)} 天
                    </ThemedText>
                  </View>
                  <FontAwesome6 name="circle-check" size={20} color={theme.success} />
                </ThemedView>
              ))}
            </View>
          )}

          {/* 按钮组 */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity 
              style={[styles.completeButton, { backgroundColor: theme.primary }]}
              onPress={() => {
                setCurrentIndex(0);
                setTotalScore(0);
                setMasteredWords([]);
                setWordScores([]);
                reviewStartTimeRef.current = 0;
                loadReviewQueue();
              }}
            >
              <FontAwesome6 name="rotate-right" size={20} color={theme.buttonPrimaryText} style={styles.buttonIcon} />
              <ThemedText variant="h3" color={theme.buttonPrimaryText}>再来一轮</ThemedText>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.secondaryButton, { backgroundColor: theme.backgroundTertiary, borderColor: theme.border }]}
              onPress={() => router.back()}
            >
              <FontAwesome6 name="house" size={20} color={theme.textPrimary} style={styles.buttonIcon} />
              <ThemedText variant="h3" color={theme.textPrimary}>返回首页</ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <ThemedText variant="body" color={theme.textMuted} style={styles.loadingText}>
            加载中...
          </ThemedText>
        </View>
      ) : state === 'idle' && queue.length > 0 ? (
        renderStartScreen()
      ) : state === 'completed' || queue.length === 0 ? (
        renderCompleted()
      ) : (
        renderReviewContent()
      )}
    </Screen>
  );
}
