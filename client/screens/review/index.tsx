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

// 复习步骤配置
interface ReviewStep {
  word: Word;
  mode: 'type1' | 'type2';
  wordId: number;
}

// 单词完成状态
interface WordCompletion {
  wordId: number;
  completedModes: Set<'type1' | 'type2'>;
  type1Score: number; // 0: 未完成, 1: 正确, 2: 错误
  type2Score: number; // 0: 未完成, 1: 正确, 2: 错误
}

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
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [reviewQueue, setReviewQueue] = useState<ReviewStep[]>([]);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [masteredWords, setMasteredWords] = useState<Word[]>([]);
  
  // 新增：记录每个单词的得分
  const [wordScores, setWordScores] = useState<{ wordId: number; word: string; score: number; isQuick: boolean }[]>([]);
  
  // 新增：记录每个单词的完成状态
  const [wordCompletionStatus, setWordCompletionStatus] = useState<Map<number, WordCompletion>>(new Map());
  
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
      setCurrentStepIndex(0);
      setState('idle');
      
      // 生成所有单词的两种方式的复习步骤
      const steps: ReviewStep[] = [];
      words.forEach(word => {
        steps.push({ word, mode: 'type1', wordId: word.id });
        steps.push({ word, mode: 'type2', wordId: word.id });
      });
      
      // 随机打乱复习步骤
      shuffleArray(steps);
      
      // 确保同一个单词的两种方式不连续出现
      const shuffledSteps = ensureNonConsecutiveSameWord(steps);
      
      setReviewQueue(shuffledSteps);
      
      // 初始化每个单词的完成状态
      const completionMap = new Map<number, WordCompletion>();
      words.forEach(word => {
        completionMap.set(word.id, {
          wordId: word.id,
          completedModes: new Set(),
          type1Score: 0,
          type2Score: 0
        });
      });
      setWordCompletionStatus(completionMap);
      
      console.log('[Review] 生成了', shuffledSteps.length, '个复习步骤');
      shuffledSteps.forEach((step, index) => {
        console.log(`[Review] 步骤 ${index + 1}: ${step.word.word} (${step.mode})`);
      });
    } catch (error) {
      console.error('[Review] 加载复习队列失败:', error);
      Alert.alert('错误', '加载复习队列失败');
    } finally {
      setLoading(false);
    }
  };

  // Fisher-Yates 随机打乱算法
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  // 确保同一个单词的两种方式不连续出现
  const ensureNonConsecutiveSameWord = (steps: ReviewStep[]): ReviewStep[] => {
    // 简单的贪婪算法：如果有相邻的是同一个单词，就交换位置
    const result = [...steps];
    for (let i = 0; i < result.length - 1; i++) {
      if (result[i].wordId === result[i + 1].wordId) {
        // 找到下一个不冲突的位置进行交换
        for (let j = i + 2; j < result.length; j++) {
          if (result[j].wordId !== result[i].wordId && result[j].wordId !== result[i + 1].wordId) {
            [result[i + 1], result[j]] = [result[j], result[i + 1]];
            break;
          }
        }
      }
    }
    return result;
  };

  const handleStartReview = () => {
    if (reviewQueue.length > 0) {
      startReview(reviewQueue[0]);
    }
  };

  const startReview = (step: ReviewStep) => {
    console.log(`[Review] 开始复习步骤: ${step.word.word} (${step.mode})`);
    
    // 检查复习时机（仅在第一个单词检查一次）
    if (currentStepIndex === 0) {
      checkReviewTiming(step.word);
    }
    
    setCurrentWord(step.word);
    setReviewMode(step.mode);
    setType1Answer('');
    setType2Answer('');
    setType1Status('none');
    setType2Status('none');
    setQuickScore(null);
    setIsEditing(false);
    setState('reviewing');
    startTimeRef.current = Date.now();
    
    // 记录复习开始时间（用于统计总耗时）
    if (currentStepIndex === 0) {
      reviewStartTimeRef.current = Date.now();
    }
  };

  // 检查复习时机并提醒用户
  const checkReviewTiming = (word: Word) => {
    if (!word.next_review || !word.last_review) return;

    const scheduledTime = new Date(word.next_review).getTime();
    const currentTime = Date.now();
    const timeDiffHours = (currentTime - scheduledTime) / (1000 * 60 * 60);

    // 提前复习（提前时间 < 6小时）
    if (timeDiffHours < -6) {
      const earlyHours = Math.abs(timeDiffHours).toFixed(1);
      Alert.alert(
        '提前复习提醒',
        `您提前了 ${earlyHours} 小时进行复习。\n\n根据认知心理学研究，过早复习会影响记忆效果，建议按推算时间进行复习。如果继续复习，掌握率的计算将适当调低。`,
        [
          { text: '返回', onPress: () => router.back(), style: 'cancel' },
          { text: '继续复习', style: 'default' }
        ]
      );
    }

    // 延后复习（延后时间 > 6小时）
    if (timeDiffHours > 6) {
      const lateHours = timeDiffHours.toFixed(1);
      Alert.alert(
        '延后复习提醒',
        `您延后了 ${lateHours} 小时进行复习。\n\n由于已超过推算的复习时间，单词的遗忘程度可能很大。根据遗忘曲线，掌握率的计算将适当调低。`,
        [
          { text: '返回', onPress: () => router.back(), style: 'cancel' },
          { text: '继续复习', style: 'default' }
        ]
      );
    }
  };

  // 方式一：根据词性、释义、拆分填写单词
  const handleSubmitType1 = () => {
    if (!currentWord) return;

    // 标准化答案：去除空格，转换为小写
    const userAnswer = type1Answer.trim().toLowerCase();
    const correctAnswer = currentWord.word.trim().toLowerCase();

    const isCorrect = userAnswer === correctAnswer;
    if (isCorrect) {
      setType1Status('correct');
    } else {
      setType1Status('wrong');
    }

    // 记录方式一的得分
    updateWordCompletion(currentWord.id, 'type1', isCorrect ? 1 : 2);

    // 延迟后进入下一个步骤
    setTimeout(() => {
      goToNextStep();
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

    const isCorrect = matchScore >= SIMILARITY_THRESHOLD;
    if (isCorrect) {
      setType2Status('correct');
    } else {
      setType2Status('wrong');
    }

    // 记录方式二的得分
    updateWordCompletion(currentWord.id, 'type2', isCorrect ? 1 : 2);

    // 延迟后进入下一个步骤
    setTimeout(() => {
      goToNextStep();
    }, 1000);
  };

  // 更新单词的完成状态
  const updateWordCompletion = (wordId: number, mode: 'type1' | 'type2', score: number) => {
    setWordCompletionStatus(prev => {
      const newMap = new Map(prev);
      const completion = newMap.get(wordId);
      if (completion) {
        completion.completedModes.add(mode);
        if (mode === 'type1') {
          completion.type1Score = score;
        } else {
          completion.type2Score = score;
        }
        newMap.set(wordId, completion);
      }
      return newMap;
    });
  };

  // 进入下一个步骤
  const goToNextStep = async () => {
    const nextIndex = currentStepIndex + 1;
    
    if (nextIndex >= reviewQueue.length) {
      // 所有步骤都完成了，提交所有单词的分数
      await submitAllScores();
      setState('completed');
    } else {
      // 进入下一个步骤
      setCurrentStepIndex(nextIndex);
      
      // 检查当前单词是否已经完成了两种方式
      const currentStep = reviewQueue[currentStepIndex];
      const currentWordCompletion = wordCompletionStatus.get(currentStep.wordId);
      
      if (currentWordCompletion && currentWordCompletion.completedModes.size === 2) {
        // 当前单词已经完成了两种方式，提交分数
        await submitWordScore(currentWordCompletion.wordId);
      }
      
      // 开始下一个步骤
      startReview(reviewQueue[nextIndex]);
    }
  };

  // 快速评分：没印象（0分）
  const handleNoImpression = () => {
    setQuickScore(SCORING_CONFIG.QUICK_NO_IMPRESSION);
    setIsEditing(false);

    // 延迟提交
    setTimeout(() => {
      submitQuickScore();
    }, 1000);
  };

  // 快速评分：有印象，但想不起来（2分）
  const handleSomeImpression = () => {
    setQuickScore(SCORING_CONFIG.QUICK_SOME_IMPRESSION);
    setIsEditing(false);

    // 延迟提交
    setTimeout(() => {
      submitQuickScore();
    }, 1000);
  };

  // 计算最终分数
  const calculateFinalScore = (completion: WordCompletion): number => {
    // type1Score: 0=未完成, 1=正确, 2=错误
    // type2Score: 0=未完成, 1=正确, 2=错误
    
    const type1Correct = completion.type1Score === 1;
    const type2Correct = completion.type2Score === 1;

    // 两种方式都正确：6分
    // 只有一种方式正确：4分
    // 两种方式都错误：0分
    if (type1Correct && type2Correct) {
      return SCORING_CONFIG.PERFECT_SCORE;
    } else if (type1Correct || type2Correct) {
      return SCORING_CONFIG.PARTIAL_SCORE;
    } else {
      return SCORING_CONFIG.WRONG_SCORE;
    }
  };

  // 提交单词分数
  const submitWordScore = async (wordId: number) => {
    const word = queue.find(w => w.id === wordId);
    if (!word) return;

    const completion = wordCompletionStatus.get(wordId);
    if (!completion || completion.completedModes.size < 2) return;

    const finalScore = calculateFinalScore(completion);
    const responseTime = (Date.now() - startTimeRef.current) / 1000;
    const isQuick = false;

    try {
      // 更新数据库（获取掌握率调整因子）
      const {
        newDifficulty,
        newStability,
        newAvgResponseTime,
        nextReviewDate,
        masteryAdjustmentFactor,
        reviewStatus
      } = await updateWithTimeWeight(word, finalScore, responseTime);

      // 记录复习时机信息到日志
      console.log(`[Review] 单词 ${word.word} 复习时机: ${reviewStatus}, 掌握率调整因子: ${masteryAdjustmentFactor.toFixed(2)}`);

      // 先添加复习日志（确保日志包含当前分数）
      await addReviewLog({
        word_id: word.id,
        score: finalScore,
        response_time: responseTime,
        reviewed_at: new Date().toISOString()
      });

      // 检查是否掌握（使用更新后的稳定性）
      const recentLogs = await getRecentReviewLogs(word.id, MASTERY_CONFIG.consecutiveHighScores);
      const recentScores = recentLogs.map(log => log.score);

      // 使用更新后的单词数据进行判断
      const updatedWord = {
        ...word,
        difficulty: newDifficulty,
        stability: newStability,
        avg_response_time: newAvgResponseTime,
        last_review: new Date().toISOString(),
        next_review: nextReviewDate.toISOString(),
      };

      const isMastered = checkMasteryWithConfig(updatedWord, recentScores);

      console.log(`[Review] 提交单词 ${word.word} 的分数: ${finalScore}`);
      console.log(`[Review]   新稳定性: ${newStability.toFixed(2)} 天`);
      console.log(`[Review]   是否已掌握: ${isMastered}`);

      await updateWord(word.id, {
        difficulty: newDifficulty,
        stability: newStability,
        avg_response_time: newAvgResponseTime,
        last_review: new Date().toISOString(),
        next_review: nextReviewDate.toISOString(),
        is_mastered: isMastered ? 1 : 0
      });

      // 记录单词得分
      setWordScores(prev => [
        ...prev,
        {
          wordId: word.id,
          word: word.word,
          score: finalScore,
          isQuick
        }
      ]);

      // 如果单词已掌握，添加到已掌握列表
      if (isMastered && !word.is_mastered) {
        console.log(`[Review] 单词 ${word.word} 已掌握，添加到已掌握列表`);
        setMasteredWords(prev => [...prev, word]);
      }

      // 累加总分
      setTotalScore(prev => prev + finalScore);
    } catch (error) {
      console.error('提交分数失败:', error);
      Alert.alert('错误', '提交失败，请重试');
    }
  };

  // 提交快速评分分数
  const submitQuickScore = async () => {
    if (!currentWord) return;

    const finalScore = quickScore!;
    const responseTime = (Date.now() - startTimeRef.current) / 1000;
    const isQuick = true;

    try {
      // 更新数据库（获取掌握率调整因子）
      const {
        newDifficulty,
        newStability,
        newAvgResponseTime,
        nextReviewDate,
        masteryAdjustmentFactor,
        reviewStatus
      } = await updateWithTimeWeight(currentWord, finalScore, responseTime);

      // 记录复习时机信息到日志
      console.log(`[Review] 单词 ${currentWord.word} 复习时机: ${reviewStatus}, 掌握率调整因子: ${masteryAdjustmentFactor.toFixed(2)}`);

      // 检查是否掌握（快速评分为0分，不太可能掌握）
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

      // 累加总分
      setTotalScore(prev => prev + finalScore);

      console.log(`[Review] 提交单词 ${currentWord.word} 的快速评分分数: ${finalScore}`);

      // 进入下一个步骤
      const nextIndex = currentStepIndex + 1;
      if (nextIndex >= reviewQueue.length) {
        setState('completed');
      } else {
        setCurrentStepIndex(nextIndex);
        startReview(reviewQueue[nextIndex]);
      }
    } catch (error) {
      console.error('提交分数失败:', error);
      Alert.alert('错误', '提交失败，请重试');
    }
  };

  // 提交所有剩余单词的分数
  const submitAllScores = async () => {
    // 找出所有未提交的单词
    const unsubmittedWords = queue.filter(word => {
      const completion = wordCompletionStatus.get(word.id);
      return completion && completion.completedModes.size === 2 && 
             !wordScores.some(ws => ws.wordId === word.id);
    });

    // 提交每个未提交的单词
    for (const word of unsubmittedWords) {
      await submitWordScore(word.id);
    }

    console.log(`[Review] 所有单词的分数已提交，共 ${unsubmittedWords.length} 个单词`);
  };

  // 使用配置的掌握标准判断
  const checkMasteryWithConfig = (word: Word, recentScores: number[]): boolean => {
    // 条件1：稳定性达到阈值
    const condition1 = word.stability >= MASTERY_CONFIG.stabilityThreshold;

    // 条件2：最近N次得分都≥高分标准
    const condition2 = recentScores.length >= MASTERY_CONFIG.consecutiveHighScores &&
      recentScores.slice(0, MASTERY_CONFIG.consecutiveHighScores).every(s => s >= MASTERY_CONFIG.highScoreThreshold);

    // 调试日志
    console.log(`[checkMasteryWithConfig] 单词: ${word.word}`);
    console.log(`[checkMasteryWithConfig]   稳定性: ${word.stability.toFixed(2)} 天 (阈值: ${MASTERY_CONFIG.stabilityThreshold} 天)`);
    console.log(`[checkMasteryWithConfig]   最近得分: [${recentScores.join(', ')}] (需要: ${MASTERY_CONFIG.consecutiveHighScores}次 ≥ ${MASTERY_CONFIG.highScoreThreshold}分)`);
    console.log(`[checkMasteryWithConfig]   条件1 (稳定性≥阈值): ${condition1}`);
    console.log(`[checkMasteryWithConfig]   条件2 (连续高分): ${condition2}`);
    console.log(`[checkMasteryWithConfig]   是否已掌握: ${condition1 && condition2}`);

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
            {/* 计算已完成的单词数量（两种方式都完成了） */}
            {(() => {
              const completedWordCount = Array.from(wordCompletionStatus.values())
                .filter(comp => comp.completedModes.size === 2).length;
              return (
                <>
                  <ThemedText variant="caption" color={theme.textMuted}>
                    单词 {completedWordCount} / {queue.length}
                  </ThemedText>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${(completedWordCount / queue.length) * 100}%`, backgroundColor: theme.primary }]} />
                  </View>
                </>
              );
            })()}
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
                  style={[styles.input, styles.inputType1, { color: theme.textPrimary }]}
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
                  style={[styles.input, styles.textArea, styles.inputType2, { color: theme.textPrimary }]}
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
                setCurrentStepIndex(0);
                setTotalScore(0);
                setMasteredWords([]);
                setWordScores([]);
                setWordCompletionStatus(new Map());
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
