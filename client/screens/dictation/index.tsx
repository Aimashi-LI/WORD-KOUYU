import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
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

type DictationMode = 'select' | 'listening' | 'answering' | 'result';

const MAX_WORDS = 30; // 最多30个单词

export default function DictationScreen() {
  const { theme } = useTheme();
  const { isConnected, checkNetwork, showNetworkError } = useNetwork();
  
  const [mode, setMode] = useState<DictationMode>('select');
  const [words, setWords] = useState<Word[]>([]);
  const [dictationWords, setDictationWords] = useState<DictationWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generatingAudio, setGeneratingAudio] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedRange, setSelectedRange] = useState<'today' | 'all' | 'unmastered'>('today');
  const [wordCount, setWordCount] = useState(10); // 选择的单词数量

  const { generateDictationAudios } = useAI();

  // 清理音频资源
  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

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
        // 今天需要复习的单词
        const today = new Date().toISOString().split('T')[0];
        filteredWords = words.filter(w => {
          if (!w.next_review) return false;
          return w.next_review.split('T')[0] <= today;
        });
        break;
      case 'unmastered':
        // 未掌握的单词
        filteredWords = words.filter(w => w.stability < 30);
        break;
      case 'all':
        filteredWords = words;
        break;
    }

    // 随机打乱并限制数量
    const shuffled = filteredWords.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(wordCount, MAX_WORDS));
  }, [words, selectedRange, wordCount]);

  const startDictation = async () => {
    // 检查网络
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
      // 生成听写音频
      const response = await generateDictationAudios(
        selectedWords.map(w => ({
          word: w.word,
          definition: w.definition || '',
        }))
      );

      if (!response.success || !response.data) {
        throw new Error(response.error || '生成音频失败');
      }

      // 初始化听写单词列表
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
      setMode('listening');
    } catch (error: any) {
      Alert.alert('错误', error.message || '生成听写音频失败');
    } finally {
      setGeneratingAudio(false);
    }
  };

  const playWordAudio = async (audioUri: string) => {
    if (!audioUri) return;

    try {
      setPlaying(true);
      
      // 卸载之前的音频
      if (sound) {
        await sound.unloadAsync();
      }

      // 加载并播放新音频
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true }
      );

      setSound(newSound);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          setPlaying(false);
        }
      });
    } catch (error) {
      console.error('Failed to play audio:', error);
      setPlaying(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < dictationWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 显示结果
      setMode('result');
    }
  };

  const handleCheckAnswer = () => {
    const currentWord = dictationWords[currentIndex];
    const isCorrect = currentWord.userInput.toLowerCase().trim() === currentWord.word.toLowerCase().trim();

    setDictationWords(prev => prev.map((w, i) => 
      i === currentIndex ? { ...w, isCorrect } : w
    ));

    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
    }
  };

  const handleRestart = () => {
    setDictationWords([]);
    setCurrentIndex(0);
    setCorrectCount(0);
    setTotalCount(0);
    setMode('select');
  };

  // 可选单词数量选项
  const countOptions = [5, 10, 15, 20, 25, 30];
  const availableCount = getAvailableWordCount();

  return (
    <Screen>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {mode === 'select' && (
          <View style={styles.selectContainer}>
            <ThemedText variant="h1" style={styles.title}>听写练习</ThemedText>
            <ThemedText variant="body" style={styles.subtitle}>选择听写范围和数量</ThemedText>

            {/* 网络状态提示 */}
            {!isConnected && (
              <View style={[styles.networkWarning, { backgroundColor: theme.error + '20', borderColor: theme.error }]}>
                <FontAwesome6 name="wifi-slash" size={16} color={theme.error} />
                <ThemedText style={{ color: theme.error, flex: 1 }}>
                  网络未连接，听写功能需要网络才能使用
                </ThemedText>
              </View>
            )}

            {/* 听写范围选择 */}
            <View style={styles.rangeOptions}>
              <TouchableOpacity
                style={[styles.rangeOption, { backgroundColor: theme.backgroundDefault }, selectedRange === 'today' && { borderColor: theme.primary, backgroundColor: theme.primary + '15' }]}
                onPress={() => setSelectedRange('today')}
              >
                <ThemedText style={[styles.rangeText, selectedRange === 'today' && { color: theme.primary }]}>
                  📅 今日复习
                </ThemedText>
                <ThemedText style={styles.rangeCount}>
                  {words.filter(w => {
                    if (!w.next_review) return false;
                    return w.next_review.split('T')[0] <= new Date().toISOString().split('T')[0];
                  }).length} 个单词待复习
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rangeOption, { backgroundColor: theme.backgroundDefault }, selectedRange === 'unmastered' && { borderColor: theme.primary, backgroundColor: theme.primary + '15' }]}
                onPress={() => setSelectedRange('unmastered')}
              >
                <ThemedText style={[styles.rangeText, selectedRange === 'unmastered' && { color: theme.primary }]}>
                  📚 未掌握
                </ThemedText>
                <ThemedText style={styles.rangeCount}>
                  {words.filter(w => w.stability < 30).length} 个单词未掌握
                </ThemedText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rangeOption, { backgroundColor: theme.backgroundDefault }, selectedRange === 'all' && { borderColor: theme.primary, backgroundColor: theme.primary + '15' }]}
                onPress={() => setSelectedRange('all')}
              >
                <ThemedText style={[styles.rangeText, selectedRange === 'all' && { color: theme.primary }]}>
                  📖 全部单词
                </ThemedText>
                <ThemedText style={styles.rangeCount}>
                  {words.length} 个单词
                </ThemedText>
              </TouchableOpacity>
            </View>

            {/* 数量选择 */}
            <View style={styles.countSelector}>
              <ThemedText style={styles.countLabel}>
                选择听写数量（最多 {Math.min(availableCount, MAX_WORDS)} 个）
              </ThemedText>
              <View style={styles.countButtons}>
                {countOptions.map(count => (
                  <TouchableOpacity
                    key={count}
                    style={[
                      styles.countButton,
                      { backgroundColor: theme.backgroundDefault, borderColor: theme.border },
                      wordCount === count && { backgroundColor: theme.primary, borderColor: theme.primary },
                      count > availableCount && { opacity: 0.5 }
                    ]}
                    onPress={() => count <= availableCount && setWordCount(count)}
                    disabled={count > availableCount}
                  >
                    <ThemedText style={[
                      styles.countButtonText,
                      wordCount === count && { color: '#FFFFFF' }
                    ]}>
                      {count}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: theme.primary }, (generatingAudio || availableCount === 0) && { backgroundColor: theme.textMuted }]}
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
              <View style={styles.progressContainer}>
                <ThemedText style={styles.progressText}>
                  {currentIndex + 1} / {dictationWords.length}
                </ThemedText>
                <View style={[styles.progressBar, { backgroundColor: theme.backgroundTertiary }]}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { backgroundColor: theme.primary, width: `${((currentIndex + 1) / dictationWords.length) * 100}%` }
                    ]} 
                  />
                </View>
              </View>

              <View style={styles.audioSection}>
                <ThemedText style={styles.instructionText}>点击播放，听写单词</ThemedText>
                
                <TouchableOpacity
                  style={[styles.playButton, { backgroundColor: theme.primary }, playing && { backgroundColor: theme.primary + 'CC' }]}
                  onPress={() => playWordAudio(currentWord.wordAudioUri!)}
                  disabled={playing}
                >
                  <ThemedText style={styles.playIcon}>🔊</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.playFullButton}
                  onPress={() => playWordAudio(currentWord.fullAudioUri!)}
                  disabled={playing}
                >
                  <ThemedText style={{ color: theme.primary, fontSize: 14 }}>播放单词+释义</ThemedText>
                </TouchableOpacity>
              </View>

              <View style={styles.inputSection}>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary, borderColor: theme.border }]}
                  placeholder="输入你听到的单词"
                  placeholderTextColor={theme.textMuted}
                  value={currentWord.userInput}
                  onChangeText={(text) => {
                    setDictationWords(prev => prev.map((w, i) => 
                      i === currentIndex ? { ...w, userInput: text } : w
                    ));
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <TouchableOpacity
                  style={[styles.checkButton, { backgroundColor: theme.success }, !currentWord.userInput.trim() && { opacity: 0.5 }]}
                  onPress={handleCheckAnswer}
                  disabled={!currentWord.userInput.trim()}
                >
                  <ThemedText style={styles.checkButtonText}>确认</ThemedText>
                </TouchableOpacity>
              </View>

              {currentWord.isCorrect !== null && (
                <View style={styles.feedbackSection}>
                  <ThemedText style={[
                    styles.feedbackText, 
                    currentWord.isCorrect ? { color: theme.success } : { color: theme.error }
                  ]}>
                    {currentWord.isCorrect ? '✓ 正确!' : '✗ 错误'}
                  </ThemedText>
                  
                  {!currentWord.isCorrect && (
                    <ThemedText style={styles.correctAnswer}>
                      正确答案: {currentWord.word}
                    </ThemedText>
                  )}

                  <TouchableOpacity
                    style={[styles.nextButton, { backgroundColor: theme.primary }]}
                    onPress={handleNext}
                  >
                    <ThemedText style={styles.nextButtonText}>
                      {currentIndex < dictationWords.length - 1 ? '下一个' : '查看结果'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })()}

        {mode === 'result' && (
          <View style={styles.resultContainer}>
            <ThemedText variant="h1" style={styles.resultTitle}>听写完成!</ThemedText>
            
            <View style={[styles.scoreCard, { backgroundColor: theme.primary + '15' }]}>
              <ThemedText variant="h2" style={styles.scoreText}>
                正确: {correctCount} / {totalCount}
              </ThemedText>
              <ThemedText style={{ color: theme.primary, fontSize: 18 }}>
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
                      { backgroundColor: theme.backgroundDefault },
                      word.isCorrect ? { borderLeftColor: theme.success } : { borderLeftColor: theme.error }
                    ]}
                  >
                    <ThemedText style={styles.resultWord}>{word.word}</ThemedText>
                    {word.isCorrect ? (
                      <ThemedText style={{ color: theme.success, fontSize: 18 }}>✓</ThemedText>
                    ) : (
                      <ThemedText style={{ color: theme.textMuted, fontSize: 14 }}>
                        你的答案: {word.userInput || '(未作答)'}
                      </ThemedText>
                    )}
                  </View>
                ))}
              </ScrollView>
            </View>

            <TouchableOpacity style={[styles.restartButton, { backgroundColor: theme.primary }]} onPress={handleRestart}>
              <ThemedText style={styles.restartButtonText}>再来一次</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  selectContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 20,
  },
  title: {
    marginBottom: 10,
  },
  subtitle: {
    marginBottom: 30,
  },
  networkWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    width: '100%',
  },
  rangeOptions: {
    width: '100%',
    marginBottom: 20,
  },
  rangeOption: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rangeText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  rangeCount: {
    fontSize: 14,
  },
  countSelector: {
    width: '100%',
    marginBottom: 30,
  },
  countLabel: {
    fontSize: 16,
    marginBottom: 10,
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
  },
  countButtonText: {
    fontSize: 16,
  },
  startButton: {
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  dictationContainer: {
    flex: 1,
    paddingVertical: 20,
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressText: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  audioSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  instructionText: {
    fontSize: 16,
    marginBottom: 20,
  },
  playButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  playIcon: {
    fontSize: 40,
  },
  playFullButton: {
    padding: 10,
  },
  inputSection: {
    marginBottom: 20,
  },
  input: {
    borderRadius: 12,
    padding: 15,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 15,
    borderWidth: 1,
  },
  checkButton: {
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  checkButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackSection: {
    alignItems: 'center',
  },
  feedbackText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  correctAnswer: {
    fontSize: 16,
    marginBottom: 20,
  },
  nextButton: {
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    flex: 1,
    paddingVertical: 20,
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
  },
  scoreText: {
    marginBottom: 10,
  },
  resultList: {
    flex: 1,
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
  resultWord: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  restartButton: {
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
  },
  restartButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
