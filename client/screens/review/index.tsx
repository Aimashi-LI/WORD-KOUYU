import React, { useEffect, useState, useRef, useMemo } from 'react';
import { View, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { createStyles } from './styles';
import { getReviewWords, addReviewLog, updateWord } from '@/database/wordDao';
import { getRecentReviewLogs } from '@/database/wordDao';
import { initDatabase } from '@/database';
import { Word, ReviewSession } from '@/database/types';
import { 
  calculateTimeBudget, 
  selectInitialTestType, 
  updateWithTimeWeight,
  checkMastery,
  getTestWeight,
  calculateMasteryRate,
  getRating
} from '@/algorithm/fsrs';

type ReviewState = 'idle' | 'reviewing' | 'completed';

export default function ReviewScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  
  const [state, setState] = useState<ReviewState>('idle');
  const [queue, setQueue] = useState<Word[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    loadReviewQueue();
  }, []);

  const loadReviewQueue = async () => {
    setLoading(true);
    try {
      await initDatabase();
      const words = await getReviewWords(20);
      setQueue(words);
      if (words.length > 0) {
        startReview(words[0]);
      } else {
        setState('completed');
      }
    } catch (error) {
      console.error('加载复习队列失败:', error);
      Alert.alert('错误', '加载复习队列失败');
    } finally {
      setLoading(false);
    }
  };

  const startReview = (word: Word) => {
    const timeBudget = calculateTimeBudget(word);
    const testType = selectInitialTestType(word.difficulty);
    
    setCurrentWord(word);
    setSession({
      wordId: word.id,
      testType,
      timeBudget,
      scores: [],
      responseTimes: []
    });
    setState('reviewing');
    startTimeRef.current = Date.now();
  };

  const submitScore = async (score: number) => {
    if (!currentWord || !session) return;
    
    const responseTime = (Date.now() - startTimeRef.current) / 1000; // 转换为秒
    const newScores = [...session.scores, score];
    const newResponseTimes = [...session.responseTimes, responseTime];
    
    // 计算当前单词的总分
    const currentWordScore = newScores.reduce((sum, s) => sum + s, 0);
    
    // 更新数据库
    const recentLogs = await getRecentReviewLogs(currentWord.id, 3);
    const recentScores = recentLogs.map(log => log.score);
    recentScores.push(score);
    
    const {
      newDifficulty,
      newStability,
      newAvgResponseTime,
      nextReviewDate
    } = await updateWithTimeWeight(currentWord, currentWordScore, responseTime);
    
    const isMastered = checkMastery(currentWord, recentScores);
    
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
      score: currentWordScore,
      response_time: responseTime,
      reviewed_at: new Date().toISOString()
    });
    
    // 累加总分
    setTotalScore(prev => prev + currentWordScore);
    
    // 进入下一个单词
    const nextIndex = currentIndex + 1;
    if (nextIndex < queue.length) {
      setCurrentIndex(nextIndex);
      startReview(queue[nextIndex]);
    } else {
      setState('completed');
    }
  };

  const renderReviewContent = () => {
    if (!currentWord || !session) return null;

    return (
      <View style={styles.reviewContainer}>
        {/* 进度指示 */}
        <View style={styles.progressContainer}>
          <ThemedText variant="caption" color={theme.textMuted}>
            单词 {currentIndex + 1} / {queue.length}
          </ThemedText>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((currentIndex + 1) / queue.length) * 100}%`, backgroundColor: theme.primary }]} />
          </View>
        </View>

        {/* 单词展示 */}
        <ThemedView level="default" style={styles.wordDisplay}>
          <ThemedText variant="h1" color={theme.textPrimary}>{currentWord.word}</ThemedText>
          {currentWord.phonetic && (
            <ThemedText variant="body" color={theme.textMuted}>{currentWord.phonetic}</ThemedText>
          )}
        </ThemedView>

        {/* 助记符 */}
        {currentWord.mnemonic && (
          <ThemedView level="tertiary" style={styles.mnemonicDisplay}>
            <FontAwesome6 name="lightbulb" size={16} color={theme.accent} />
            <ThemedText variant="body" color={theme.textSecondary}>{currentWord.mnemonic}</ThemedText>
          </ThemedView>
        )}

        {/* 释义 */}
        <ThemedView level="tertiary" style={styles.definitionDisplay}>
          <ThemedText variant="h3" color={theme.textPrimary}>释义</ThemedText>
          <ThemedText variant="body" color={theme.textSecondary}>{currentWord.definition}</ThemedText>
        </ThemedView>

        {/* 评分按钮 */}
        <View style={styles.scoreButtons}>
          <TouchableOpacity 
            style={[styles.scoreButton, { backgroundColor: theme.error }]}
            onPress={() => submitScore(0)}
          >
            <ThemedText variant="h3" color={theme.buttonPrimaryText}>0</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.scoreButton, { backgroundColor: theme.warning }]}
            onPress={() => submitScore(2)}
          >
            <ThemedText variant="h3" color={theme.buttonPrimaryText}>2</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.scoreButton, { backgroundColor: theme.primary }]}
            onPress={() => submitScore(4)}
          >
            <ThemedText variant="h3" color={theme.buttonPrimaryText}>4</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.scoreButton, { backgroundColor: theme.success }]}
            onPress={() => submitScore(6)}
          >
            <ThemedText variant="h3" color={theme.buttonPrimaryText}>6</ThemedText>
          </TouchableOpacity>
        </View>

        <ThemedText variant="caption" color={theme.textMuted} style={styles.scoreHint}>
          点击分数提交（0=完全不记得，6=完全记得）
        </ThemedText>
      </View>
    );
  };

  const renderCompleted = () => {
    const masteryRate = calculateMasteryRate(totalScore, queue.length);
    const rating = getRating(masteryRate);

    return (
      <View style={styles.completedContainer}>
        <FontAwesome6 name="trophy" size={80} color={theme.primary} />
        <ThemedText variant="h2" color={theme.textPrimary} style={styles.completedTitle}>
          复习完成！
        </ThemedText>
        <ThemedText variant="h3" color={theme.primary} style={styles.rating}>
          {rating}
        </ThemedText>
        <View style={styles.statsRow}>
          <ThemedText variant="body" color={theme.textSecondary}>
            复习 {queue.length} 个单词
          </ThemedText>
          <ThemedText variant="body" color={theme.textSecondary}>
            掌握率 {masteryRate}%
          </ThemedText>
        </View>
        <TouchableOpacity 
          style={styles.completeButton}
          onPress={() => {
            setCurrentIndex(0);
            setTotalScore(0);
            loadReviewQueue();
          }}
        >
          <ThemedText variant="h3" color={theme.buttonPrimaryText}>再来一轮</ThemedText>
        </TouchableOpacity>
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
      ) : state === 'completed' || queue.length === 0 ? (
        renderCompleted()
      ) : (
        renderReviewContent()
      )}
    </Screen>
  );
}
