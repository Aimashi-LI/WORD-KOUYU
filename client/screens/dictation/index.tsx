import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Text,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { getAllWords } from '@/database/wordDao';
import { Word } from '@/database/types';
import { Audio } from 'expo-av';
import { useAI } from '@/hooks/useAI';
import { useNetwork } from '@/hooks/useNetwork';
import { useTheme } from '@/hooks/useTheme';
import { FontAwesome6 } from '@expo/vector-icons';

interface DictationWord extends Word {
  userInput: string;
  isCorrect: boolean | null;
  wordAudioUri?: string;
  fullAudioUri?: string;
}

type DictationMode = 'select' | 'listening' | 'result';

// 答题模式
type AnswerMode = 'typing' | 'paper';

// 时间间隔选项（毫秒）
const INTERVAL_OPTIONS = [
  { label: '1秒', value: 1000 },
  { label: '2秒', value: 2000 },
  { label: '3秒', value: 3000 },
];

const MAX_WORDS = 30;

export default function DictationScreen() {
  const { theme } = useTheme();
  const { isConnected, checkNetwork, showNetworkError } = useNetwork();
  
  const [mode, setMode] = useState<DictationMode>('select');
  const [words, setWords] = useState<Word[]>([]);
  const [dictationWords, setDictationWords] = useState<DictationWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedRange, setSelectedRange] = useState<'today' | 'all' | 'unmastered'>('today');
  const [wordCount, setWordCount] = useState(10);
  
  // 新增状态
  const [answerMode, setAnswerMode] = useState<AnswerMode>('typing');
  const [interval, setInterval] = useState(2000); // 默认2秒
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // 使用 ref 管理音频对象和播放状态
  const soundRef = useRef<Audio.Sound | null>(null);
  const isPlayingRef = useRef(false);
  const autoPlayTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  const { generateDictationAudios } = useAI();

  // 清理定时器
  const clearAutoPlayTimer = useCallback(() => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
      autoPlayTimerRef.current = null;
    }
  }, []);

  // 清理音频资源
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      clearAutoPlayTimer();
      if (soundRef.current) {
        soundRef.current.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [clearAutoPlayTimer]);

  // 加载单词
  useFocusEffect(
    useCallback(() => {
      loadWords();
    }, [])
  );

  const loadWords = async () => {
    try {
      const allWords = await getAllWords();
      setWords(allWords);
    } catch (error) {
      console.error('Failed to load words:', error);
    }
  };

  // 获取符合条件的单词数量
  const getAvailableWordCount = useCallback(() => {
    let filteredWords: Word[] = [];

    switch (selectedRange) {
      case 'today':
        const today = new Date().toISOString().split('T')[0];
        filteredWords = words.filter(w => {
          if (!w.next_review) return false;
          return w.next_review.split('T')[0] <= today;
        });
        break;
      case 'unmastered':
        filteredWords = words.filter(w => w.stability < 30);
        break;
      case 'all':
        filteredWords = words;
        break;
    }

    return filteredWords.length;
  }, [words, selectedRange]);

  const getWordsForDictation = useCallback(() => {
    let filteredWords: Word[] = [];

    switch (selectedRange) {
      case 'today':
        const today = new Date().toISOString().split('T')[0];
        filteredWords = words.filter(w => {
          if (!w.next_review) return false;
          return w.next_review.split('T')[0] <= today;
        });
        break;
      case 'unmastered':
        filteredWords = words.filter(w => w.stability < 30);
        break;
      case 'all':
        filteredWords = words;
        break;
    }

    const shuffled = filteredWords.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(wordCount, MAX_WORDS));
  }, [words, selectedRange, wordCount]);

  const startDictation = async () => {
    const hasNetwork = await checkNetwork();
    if (!hasNetwork) {
      showNetworkError();
      return;
    }

    const selectedWords = getWordsForDictation();
    
    if (selectedWords.length === 0) {
      Alert.alert('提示', '当前没有符合条件的单词可以进行听写');
      return;
    }

    setGeneratingAudio(true);
    try {
      const response = await generateDictationAudios(
        selectedWords.map(w => ({
          word: w.word,
          definition: w.definition || '',
        }))
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || '生成音频失败');
      }

      const dictWords: DictationWord[] = selectedWords.map((w, index) => ({
        ...w,
        userInput: '',
        isCorrect: null,
        wordAudioUri: response.data!.audios[index]?.wordAudioUri,
        fullAudioUri: response.data!.audios[index]?.fullAudioUri,
      }));

      setDictationWords(dictWords);
      setCurrentIndex(0);
      setCorrectCount(0);
      setTotalCount(dictWords.length);
      setIsPaused(false);
      setIsAutoPlaying(false);
      setMode('listening');
    } catch (error: any) {
      Alert.alert('错误', error.message || '生成听写音频失败');
    } finally {
      setGeneratingAudio(false);
    }
  };

  // 播放单次音频
  const playAudioOnce = useCallback(async (audioUri: string): Promise<void> => {
    if (!audioUri) return Promise.resolve();

    return new Promise(async (resolve, reject) => {
      try {
        // 先卸载之前的音频
        if (soundRef.current) {
          try {
            await soundRef.current.unloadAsync();
          } catch (e) {
            // 忽略卸载错误
          }
          soundRef.current = null;
        }

        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUri },
          { shouldPlay: true }
        );

        soundRef.current = newSound;

        newSound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            resolve();
          }
        });
      } catch (error) {
        console.error('Failed to play audio:', error);
        reject(error);
      }
    });
  }, []);

  // 播放单词音频（读两遍）
  const playWordAudio = useCallback(async (audioUri: string): Promise<void> => {
    if (!audioUri) return Promise.resolve();
    
    // 防止重复点击
    if (isPlayingRef.current) {
      console.log('[Dictation] Already playing, skip');
      return Promise.resolve();
    }

    isPlayingRef.current = true;
    setPlaying(true);
    
    try {
      // 第一遍
      await playAudioOnce(audioUri);
      // 短暂停顿后第二遍
      await new Promise(resolve => setTimeout(resolve, 500));
      // 第二遍
      await playAudioOnce(audioUri);
    } catch (e) {
      console.error('Play error:', e);
    } finally {
      isPlayingRef.current = false;
      if (isMountedRef.current) {
        setPlaying(false);
      }
    }
  }, [playAudioOnce]);

  // 自动播放下一个单词
  const autoPlayNext = useCallback(async () => {
    if (!isMountedRef.current || isPaused || !isAutoPlaying) return;
    
    const currentWord = dictationWords[currentIndex];
    if (!currentWord?.wordAudioUri) return;
    
    // 等待之前的播放完成
    if (isPlayingRef.current) return;

    // 播放当前单词（读两遍）
    try {
      await playWordAudio(currentWord.wordAudioUri);
    } catch (e) {
      console.error('Play error:', e);
    }

    // 等待间隔时间后自动进入下一个
    if (!isPaused && isAutoPlaying && isMountedRef.current) {
      autoPlayTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current || isPaused || !isAutoPlaying) return;
        
        if (currentIndex < dictationWords.length - 1) {
          setCurrentIndex(prev => prev + 1);
        } else {
          // 播放完毕，显示结果
          setIsAutoPlaying(false);
          setMode('result');
        }
      }, interval);
    }
  }, [currentIndex, dictationWords, isPaused, isAutoPlaying, interval, playWordAudio]);

  // 开始自动播放
  const startAutoPlay = useCallback(() => {
    isPlayingRef.current = false; // 重置播放状态
    setIsAutoPlaying(true);
    setIsPaused(false);
    setCurrentIndex(0);
  }, []);

  // 暂停
  const handlePause = useCallback(() => {
    setIsPaused(true);
    clearAutoPlayTimer();
  }, [clearAutoPlayTimer]);

  // 继续
  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  // 手动上一个
  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      clearAutoPlayTimer();
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex, clearAutoPlayTimer]);

  // 手动下一个
  const handleNext = useCallback(() => {
    clearAutoPlayTimer();
    if (currentIndex < dictationWords.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsAutoPlaying(false);
      setMode('result');
    }
  }, [currentIndex, dictationWords.length, clearAutoPlayTimer]);

  // 播放当前单词音频
  const handlePlayCurrent = useCallback(async () => {
    if (isPlayingRef.current || playing) return; // 防止重复点击
    const currentWord = dictationWords[currentIndex];
    if (currentWord?.wordAudioUri) {
      await playWordAudio(currentWord.wordAudioUri);
    }
  }, [currentIndex, dictationWords, playWordAudio, playing]);

  // 纸上书写模式：用户自评
  const handleSelfGrade = useCallback((isCorrect: boolean) => {
    setDictationWords(prev => prev.map((w, i) => 
      i === currentIndex ? { ...w, isCorrect } : w
    ));
    
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }
    
    // 自动进入下一个
    handleNext();
  }, [currentIndex, handleNext]);

  // 打字模式：检查答案
  const handleCheckAnswer = useCallback(() => {
    const currentWord = dictationWords[currentIndex];
    const isCorrect = currentWord.userInput.toLowerCase().trim() === currentWord.word.toLowerCase().trim();

    setDictationWords(prev => prev.map((w, i) => 
      i === currentIndex ? { ...w, isCorrect } : w
    ));

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }
  }, [currentIndex, dictationWords]);

  const handleRestart = useCallback(() => {
    clearAutoPlayTimer();
    setDictationWords([]);
    setCurrentIndex(0);
    setCorrectCount(0);
    setTotalCount(0);
    setIsAutoPlaying(false);
    setIsPaused(false);
    setMode('select');
  }, [clearAutoPlayTimer]);

  // 当自动播放状态变化时触发播放
  useEffect(() => {
    if (mode === 'listening' && isAutoPlaying && !isPaused) {
      autoPlayNext();
    }
  }, [mode, isAutoPlaying, isPaused, currentIndex, autoPlayNext]);

  const countOptions = [5, 10, 15, 20, 25, 30];
  const availableCount = getAvailableWordCount();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {mode === 'select' && (
          <View style={styles.selectContainer}>
            <ThemedText variant="h1" style={styles.title}>听写练习</ThemedText>
            <ThemedText variant="body" style={styles.subtitle}>选择听写范围和模式</ThemedText>

            {!isConnected && (
              <View style={[styles.networkWarning, { backgroundColor: theme.error + '20', borderColor: theme.error }]}>
                <FontAwesome6 name="wifi-slash" size={16} color={theme.error} />
                <ThemedText style={{ color: theme.error, flex: 1 }}>
                  网络未连接，听写功能需要网络才能使用
                </ThemedText>
              </View>
            )}

            {/* 听写范围选择 */}
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>听写范围</ThemedText>
              <View style={styles.rangeOptions}>
                <TouchableOpacity
                  style={[styles.rangeOption, selectedRange === 'today' && styles.rangeOptionSelected]}
                  onPress={() => setSelectedRange('today')}
                >
                  <ThemedText style={[styles.rangeText, selectedRange === 'today' && styles.rangeTextSelected]}>
                    📅 今日复习
                  </ThemedText>
                  <ThemedText style={styles.rangeCount}>
                    {words.filter(w => {
                      if (!w.next_review) return false;
                      return w.next_review.split('T')[0] <= new Date().toISOString().split('T')[0];
                    }).length} 个单词
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.rangeOption, selectedRange === 'unmastered' && styles.rangeOptionSelected]}
                  onPress={() => setSelectedRange('unmastered')}
                >
                  <ThemedText style={[styles.rangeText, selectedRange === 'unmastered' && styles.rangeTextSelected]}>
                    📚 未掌握
                  </ThemedText>
                  <ThemedText style={styles.rangeCount}>
                    {words.filter(w => w.stability < 30).length} 个单词
                  </ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.rangeOption, selectedRange === 'all' && styles.rangeOptionSelected]}
                  onPress={() => setSelectedRange('all')}
                >
                  <ThemedText style={[styles.rangeText, selectedRange === 'all' && styles.rangeTextSelected]}>
                    📖 全部单词
                  </ThemedText>
                  <ThemedText style={styles.rangeCount}>
                    {words.length} 个单词
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* 答题模式选择 */}
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>答题模式</ThemedText>
              <View style={styles.modeOptions}>
                <TouchableOpacity
                  style={[styles.modeOption, answerMode === 'typing' && styles.modeOptionSelected]}
                  onPress={() => setAnswerMode('typing')}
                >
                  <FontAwesome6 name="keyboard" size={24} color={answerMode === 'typing' ? theme.primary : theme.textSecondary} />
                  <ThemedText style={[styles.modeText, answerMode === 'typing' && styles.modeTextSelected]}>
                    手机打字
                  </ThemedText>
                  <ThemedText style={styles.modeDesc}>系统自动评分</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modeOption, answerMode === 'paper' && styles.modeOptionSelected]}
                  onPress={() => setAnswerMode('paper')}
                >
                  <FontAwesome6 name="pencil" size={24} color={answerMode === 'paper' ? theme.primary : theme.textSecondary} />
                  <ThemedText style={[styles.modeText, answerMode === 'paper' && styles.modeTextSelected]}>
                    纸上书写
                  </ThemedText>
                  <ThemedText style={styles.modeDesc}>自己评分</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* 时间间隔选择 */}
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>播放间隔</ThemedText>
              <View style={styles.intervalOptions}>
                {INTERVAL_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.intervalOption, interval === opt.value && styles.intervalOptionSelected]}
                    onPress={() => setInterval(opt.value)}
                  >
                    <ThemedText style={[styles.intervalText, interval === opt.value && styles.intervalTextSelected]}>
                      {opt.label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
              <ThemedText style={styles.intervalHint}>每个单词播放完毕后的等待时间</ThemedText>
            </View>

            {/* 数量选择 */}
            <View style={styles.sectionContainer}>
              <ThemedText style={styles.sectionTitle}>
                听写数量（最多 {Math.min(availableCount, MAX_WORDS)} 个）
              </ThemedText>
              <View style={styles.countButtons}>
                {countOptions.map(count => (
                  <TouchableOpacity
                    key={count}
                    style={[
                      styles.countButton,
                      wordCount === count && styles.countButtonSelected,
                      count > availableCount && { opacity: 0.5 }
                    ]}
                    onPress={() => count <= availableCount && setWordCount(count)}
                    disabled={count > availableCount}
                  >
                    <ThemedText style={[styles.countButtonText, wordCount === count && styles.countButtonTextSelected]}>
                      {count}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.startButton, (generatingAudio || availableCount === 0) && styles.startButtonDisabled]}
              onPress={startDictation}
              disabled={generatingAudio || availableCount === 0}
            >
              {generatingAudio ? (
                <>
                  <ActivityIndicator color="#FFFFFF" />
                  <ThemedText style={styles.startButtonText}>生成音频中...</ThemedText>
                </>
              ) : (
                <>
                  <FontAwesome6 name="headphones" size={20} color="#FFFFFF" />
                  <ThemedText style={styles.startButtonText}>开始听写</ThemedText>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {mode === 'listening' && (() => {
          const currentWord = dictationWords[currentIndex];
          if (!currentWord) return null;

          return (
            <View style={styles.dictationContainer}>
              {/* 进度条 */}
              <View style={styles.progressContainer}>
                <ThemedText style={styles.progressText}>
                  {currentIndex + 1} / {dictationWords.length}
                </ThemedText>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${((currentIndex + 1) / dictationWords.length) * 100}%` }
                    ]} 
                  />
                </View>
              </View>

              {/* 控制按钮 */}
              <View style={styles.controlSection}>
                {/* 上一个/下一个 */}
                <View style={styles.navButtons}>
                  <TouchableOpacity
                    style={[styles.navButton, currentIndex === 0 && styles.navButtonDisabled]}
                    onPress={handlePrevious}
                    disabled={currentIndex === 0}
                  >
                    <FontAwesome6 name="backward" size={20} color={currentIndex === 0 ? theme.textMuted : theme.primary} />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.navButton}
                    onPress={handleNext}
                  >
                    <FontAwesome6 name="forward" size={20} color={theme.primary} />
                  </TouchableOpacity>
                </View>

                {/* 播放/暂停 */}
                <View style={styles.playControls}>
                  {!isAutoPlaying ? (
                    <TouchableOpacity style={styles.playControlButton} onPress={startAutoPlay}>
                      <FontAwesome6 name="play" size={32} color={theme.buttonPrimaryText} />
                      <ThemedText style={styles.playControlText}>自动播放</ThemedText>
                    </TouchableOpacity>
                  ) : isPaused ? (
                    <TouchableOpacity style={styles.playControlButton} onPress={handleResume}>
                      <FontAwesome6 name="play" size={32} color={theme.buttonPrimaryText} />
                      <ThemedText style={styles.playControlText}>继续</ThemedText>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity style={styles.playControlButton} onPress={handlePause}>
                      <FontAwesome6 name="pause" size={32} color={theme.buttonPrimaryText} />
                      <ThemedText style={styles.playControlText}>暂停</ThemedText>
                    </TouchableOpacity>
                  )}
                </View>

                {/* 重播当前 */}
                <TouchableOpacity style={styles.replayButton} onPress={handlePlayCurrent} disabled={playing}>
                  <FontAwesome6 name="rotate-left" size={20} color={playing ? theme.textMuted : theme.textSecondary} />
                  <ThemedText style={styles.replayText}>重播</ThemedText>
                </TouchableOpacity>
              </View>

              {/* 答题区域 */}
              <View style={styles.answerSection}>
                {answerMode === 'typing' ? (
                  // 打字模式
                  <>
                    <ThemedText style={styles.answerHint}>输入你听到的单词</ThemedText>
                    <TextInput
                      style={[styles.input, currentWord.isCorrect !== null && (
                        currentWord.isCorrect ? styles.inputCorrect : styles.inputWrong
                      )]}
                      placeholder="输入单词..."
                      placeholderTextColor={theme.textMuted}
                      value={currentWord.userInput}
                      onChangeText={(text) => {
                        setDictationWords(prev => prev.map((w, i) => 
                          i === currentIndex ? { ...w, userInput: text, isCorrect: null } : w
                        ));
                      }}
                      autoCapitalize="none"
                      autoCorrect={false}
                      editable={currentWord.isCorrect === null}
                    />

                    {currentWord.isCorrect === null ? (
                      <TouchableOpacity
                        style={[styles.checkButton, !currentWord.userInput.trim() && styles.checkButtonDisabled]}
                        onPress={handleCheckAnswer}
                        disabled={!currentWord.userInput.trim()}
                      >
                        <ThemedText style={styles.checkButtonText}>确认答案</ThemedText>
                      </TouchableOpacity>
                    ) : (
                      <View style={styles.feedbackContainer}>
                        <ThemedText style={currentWord.isCorrect ? styles.feedbackCorrect : styles.feedbackWrong}>
                          {currentWord.isCorrect ? '✓ 正确!' : `✗ 错误，正确答案: ${currentWord.word}`}
                        </ThemedText>
                        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                          <ThemedText style={styles.nextButtonText}>
                            {currentIndex < dictationWords.length - 1 ? '下一个' : '查看结果'}
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                ) : (
                  // 纸上书写模式
                  <>
                    <ThemedText style={styles.answerHint}>在纸上写下答案后自评</ThemedText>
                    
                    <View style={styles.paperModeContainer}>
                      <TouchableOpacity
                        style={styles.showAnswerButton}
                        onPress={() => {
                          Alert.alert('正确答案', currentWord.word);
                        }}
                      >
                        <FontAwesome6 name="eye" size={20} color={theme.primary} />
                        <ThemedText style={styles.showAnswerText}>查看答案</ThemedText>
                      </TouchableOpacity>

                      <ThemedText style={styles.selfGradeHint}>你写对了吗？</ThemedText>
                      
                      <View style={styles.selfGradeButtons}>
                        <TouchableOpacity
                          style={[styles.gradeButton, styles.gradeCorrect]}
                          onPress={() => handleSelfGrade(true)}
                        >
                          <FontAwesome6 name="check" size={24} color="#FFFFFF" />
                          <ThemedText style={styles.gradeButtonText}>对了</ThemedText>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                          style={[styles.gradeButton, styles.gradeWrong]}
                          onPress={() => handleSelfGrade(false)}
                        >
                          <FontAwesome6 name="xmark" size={24} color="#FFFFFF" />
                          <ThemedText style={styles.gradeButtonText}>错了</ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>
          );
        })()}

        {mode === 'result' && (
          <View style={styles.resultContainer}>
            <ThemedText variant="h1" style={styles.resultTitle}>听写完成!</ThemedText>
            
            <View style={styles.scoreCard}>
              <ThemedText variant="h2" style={styles.scoreText}>
                正确: {correctCount} / {totalCount}
              </ThemedText>
              <ThemedText style={styles.scorePercent}>
                正确率: {Math.round((correctCount / totalCount) * 100)}%
              </ThemedText>
            </View>

            <View style={styles.resultList}>
              <ThemedText variant="h3" style={styles.resultListTitle}>详细结果</ThemedText>
              <ScrollView style={{ maxHeight: 300 }}>
                {dictationWords.map((word, index) => (
                  <View
                    key={index}
                    style={[
                      styles.resultItem,
                      word.isCorrect ? styles.resultItemCorrect : styles.resultItemWrong
                    ]}
                  >
                    <View style={styles.resultItemContent}>
                      <ThemedText style={styles.resultWord}>{word.word}</ThemedText>
                      {word.isCorrect ? (
                        <FontAwesome6 name="check" size={18} color={theme.success} />
                      ) : (
                        <View>
                          <FontAwesome6 name="xmark" size={18} color={theme.error} />
                          {word.userInput && (
                            <ThemedText style={styles.wrongAnswer}>
                              你的答案: {word.userInput}
                            </ThemedText>
                          )}
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
              <ThemedText style={styles.restartButtonText}>再来一次</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  selectContainer: {
    flex: 1,
    paddingTop: 10,
  },
  title: {
    marginBottom: 5,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 20,
    textAlign: 'center',
  },
  networkWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  rangeOptions: {
    gap: 10,
  },
  rangeOption: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: theme.backgroundDefault,
  },
  rangeOptionSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primary + '15',
  },
  rangeText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  rangeTextSelected: {
    color: theme.primary,
  },
  rangeCount: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  modeOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  modeOption: {
    flex: 1,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: theme.backgroundDefault,
  },
  modeOptionSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primary + '15',
  },
  modeText: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 8,
  },
  modeTextSelected: {
    color: theme.primary,
  },
  modeDesc: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 4,
  },
  intervalOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  intervalOption: {
    flex: 1,
    borderRadius: 10,
    padding: 14,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: theme.backgroundDefault,
  },
  intervalOptionSelected: {
    borderColor: theme.primary,
    backgroundColor: theme.primary + '15',
  },
  intervalText: {
    fontSize: 16,
    fontWeight: '600',
  },
  intervalTextSelected: {
    color: theme.primary,
  },
  intervalHint: {
    fontSize: 12,
    color: theme.textMuted,
    marginTop: 8,
  },
  countButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  countButton: {
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.backgroundDefault,
  },
  countButtonSelected: {
    backgroundColor: theme.primary,
    borderColor: theme.primary,
  },
  countButtonText: {
    fontSize: 16,
  },
  countButtonTextSelected: {
    color: '#FFFFFF',
  },
  startButton: {
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: theme.primary,
    marginTop: 10,
  },
  startButtonDisabled: {
    backgroundColor: theme.textMuted,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  
  // 听写界面
  dictationContainer: {
    paddingTop: 10,
  },
  progressContainer: {
    marginBottom: 20,
  },
  progressText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
    fontWeight: '600',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.backgroundTertiary,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: theme.primary,
  },
  
  // 控制区域
  controlSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  navButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary + '20',
  },
  navButtonDisabled: {
    backgroundColor: theme.backgroundTertiary,
  },
  playControls: {
    marginBottom: 15,
  },
  playControlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.primary,
  },
  playControlText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  replayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 10,
  },
  replayText: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  
  // 答题区域
  answerSection: {
    backgroundColor: theme.backgroundDefault,
    borderRadius: 16,
    padding: 20,
  },
  answerHint: {
    textAlign: 'center',
    marginBottom: 15,
    color: theme.textSecondary,
  },
  input: {
    borderRadius: 12,
    padding: 15,
    fontSize: 18,
    textAlign: 'center',
    borderWidth: 2,
    borderColor: theme.border,
    backgroundColor: theme.backgroundTertiary,
    color: theme.textPrimary,
    marginBottom: 15,
  },
  inputCorrect: {
    borderColor: theme.success,
    backgroundColor: theme.success + '10',
  },
  inputWrong: {
    borderColor: theme.error,
    backgroundColor: theme.error + '10',
  },
  checkButton: {
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: theme.success,
  },
  checkButtonDisabled: {
    backgroundColor: theme.textMuted,
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackContainer: {
    alignItems: 'center',
  },
  feedbackCorrect: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.success,
    marginBottom: 15,
  },
  feedbackWrong: {
    fontSize: 16,
    color: theme.error,
    marginBottom: 15,
  },
  nextButton: {
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 40,
    backgroundColor: theme.primary,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // 纸上书写模式
  paperModeContainer: {
    alignItems: 'center',
  },
  showAnswerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: theme.primary + '15',
    marginBottom: 20,
  },
  showAnswerText: {
    color: theme.primary,
    fontWeight: '600',
  },
  selfGradeHint: {
    fontSize: 16,
    marginBottom: 15,
    color: theme.textSecondary,
  },
  selfGradeButtons: {
    flexDirection: 'row',
    gap: 20,
  },
  gradeButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeCorrect: {
    backgroundColor: theme.success,
  },
  gradeWrong: {
    backgroundColor: theme.error,
  },
  gradeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 4,
  },
  
  // 结果界面
  resultContainer: {
    paddingTop: 10,
  },
  resultTitle: {
    textAlign: 'center',
    marginBottom: 20,
  },
  scoreCard: {
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: theme.primary + '15',
  },
  scoreText: {
    marginBottom: 10,
  },
  scorePercent: {
    color: theme.primary,
    fontSize: 18,
  },
  resultList: {
    marginBottom: 20,
  },
  resultListTitle: {
    marginBottom: 15,
  },
  resultItem: {
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  resultItemCorrect: {
    backgroundColor: theme.success + '10',
    borderLeftColor: theme.success,
  },
  resultItemWrong: {
    backgroundColor: theme.error + '10',
    borderLeftColor: theme.error,
  },
  resultItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultWord: {
    fontSize: 16,
    fontWeight: '600',
  },
  wrongAnswer: {
    fontSize: 13,
    color: theme.textMuted,
    marginTop: 4,
  },
  restartButton: {
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
    backgroundColor: theme.primary,
  },
  restartButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
