import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Screen } from '@/components/Screen';
import { getAllWords } from '@/database/wordDao';
import { Word } from '@/database/types';
import { Audio } from 'expo-av';
import { useAI } from '@/hooks/useAI';

interface DictationWord extends Word {
  userInput: string;
  isCorrect: boolean | null;
  wordAudioUri?: string;
  fullAudioUri?: string;
}

type DictationMode = 'listening' | 'answering' | 'result';

export default function DictationScreen() {
  const [mode, setMode] = useState<'select' | DictationMode>('select');
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

  const getWordsForDictation = () => {
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
    return shuffled.slice(0, 20); // 最多20个单词
  };

  const startDictation = async () => {
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

  const renderSelectMode = () => (
    <View style={styles.selectContainer}>
      <Text style={styles.title}>听写练习</Text>
      <Text style={styles.subtitle}>选择听写范围</Text>

      <View style={styles.rangeOptions}>
        <TouchableOpacity
          style={[styles.rangeOption, selectedRange === 'today' && styles.rangeOptionActive]}
          onPress={() => setSelectedRange('today')}
        >
          <Text style={[styles.rangeText, selectedRange === 'today' && styles.rangeTextActive]}>
            今日复习
          </Text>
          <Text style={styles.rangeCount}>
            {words.filter(w => {
              if (!w.next_review) return false;
              return w.next_review.split('T')[0] <= new Date().toISOString().split('T')[0];
            }).length} 词
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.rangeOption, selectedRange === 'unmastered' && styles.rangeOptionActive]}
          onPress={() => setSelectedRange('unmastered')}
        >
          <Text style={[styles.rangeText, selectedRange === 'unmastered' && styles.rangeTextActive]}>
            未掌握
          </Text>
          <Text style={styles.rangeCount}>
            {words.filter(w => w.stability < 30).length} 词
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.rangeOption, selectedRange === 'all' && styles.rangeOptionActive]}
          onPress={() => setSelectedRange('all')}
        >
          <Text style={[styles.rangeText, selectedRange === 'all' && styles.rangeTextActive]}>
            全部单词
          </Text>
          <Text style={styles.rangeCount}>
            {words.length} 词
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.startButton}
        onPress={startDictation}
        disabled={generatingAudio}
      >
        {generatingAudio ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.startButtonText}>开始听写</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderListeningMode = () => {
    const currentWord = dictationWords[currentIndex];
    if (!currentWord) return null;

    return (
      <View style={styles.dictationContainer}>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            {currentIndex + 1} / {dictationWords.length}
          </Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${((currentIndex + 1) / dictationWords.length) * 100}%` }
              ]} 
            />
          </View>
        </View>

        <View style={styles.audioSection}>
          <Text style={styles.instructionText}>点击播放，听写单词</Text>
          
          <TouchableOpacity
            style={[styles.playButton, playing && styles.playButtonActive]}
            onPress={() => playWordAudio(currentWord.wordAudioUri!)}
            disabled={playing}
          >
            <Text style={styles.playIcon}>🔊</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playFullButton}
            onPress={() => playWordAudio(currentWord.fullAudioUri!)}
            disabled={playing}
          >
            <Text style={styles.playFullText}>播放单词+释义</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputSection}>
          <TextInput
            style={styles.input}
            placeholder="输入你听到的单词"
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
            style={styles.checkButton}
            onPress={handleCheckAnswer}
            disabled={!currentWord.userInput.trim()}
          >
            <Text style={styles.checkButtonText}>确认</Text>
          </TouchableOpacity>
        </View>

        {currentWord.isCorrect !== null && (
          <View style={styles.feedbackSection}>
            <Text style={[
              styles.feedbackText, 
              currentWord.isCorrect ? styles.correctText : styles.incorrectText
            ]}>
              {currentWord.isCorrect ? '✓ 正确!' : '✗ 错误'}
            </Text>
            
            {!currentWord.isCorrect && (
              <Text style={styles.correctAnswer}>
                正确答案: {currentWord.word}
              </Text>
            )}

            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>
                {currentIndex < dictationWords.length - 1 ? '下一个' : '查看结果'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const renderResultMode = () => (
    <View style={styles.resultContainer}>
      <Text style={styles.resultTitle}>听写完成!</Text>
      
      <View style={styles.scoreCard}>
        <Text style={styles.scoreText}>
          正确: {correctCount} / {totalCount}
        </Text>
        <Text style={styles.scorePercent}>
          正确率: {Math.round((correctCount / totalCount) * 100)}%
        </Text>
      </View>

      <View style={styles.resultList}>
        <Text style={styles.resultListTitle}>详细结果</Text>
        <ScrollView>
          {dictationWords.map((word, index) => (
            <View
              key={index}
              style={[
                styles.resultItem,
                word.isCorrect ? styles.resultItemCorrect : styles.resultItemIncorrect
              ]}
            >
              <Text style={styles.resultWord}>{word.word}</Text>
              {word.isCorrect ? (
                <Text style={styles.resultCorrect}>✓</Text>
              ) : (
                <Text style={styles.resultUserInput}>
                  你的答案: {word.userInput}
                </Text>
              )}
            </View>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity style={styles.restartButton} onPress={handleRestart}>
        <Text style={styles.restartButtonText}>再来一次</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <Screen>
      <ScrollView style={styles.container}>
        {mode === 'select' && renderSelectMode()}
        {mode === 'listening' && renderListeningMode()}
        {mode === 'result' && renderResultMode()}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  selectContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 30,
  },
  rangeOptions: {
    width: '100%',
    marginBottom: 40,
  },
  rangeOption: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rangeOptionActive: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F8FF',
  },
  rangeText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 5,
  },
  rangeTextActive: {
    color: '#007AFF',
  },
  rangeCount: {
    fontSize: 14,
    color: '#888',
  },
  startButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    paddingVertical: 15,
    paddingHorizontal: 50,
  },
  startButtonText: {
    color: '#fff',
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
    color: '#666',
    marginBottom: 10,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#007AFF',
  },
  audioSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  instructionText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  playButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  playButtonActive: {
    backgroundColor: '#0051D5',
  },
  playIcon: {
    fontSize: 40,
  },
  playFullButton: {
    padding: 10,
  },
  playFullText: {
    color: '#007AFF',
    fontSize: 14,
  },
  inputSection: {
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    padding: 15,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 15,
  },
  checkButton: {
    backgroundColor: '#34C759',
    borderRadius: 25,
    paddingVertical: 12,
    alignItems: 'center',
  },
  checkButtonText: {
    color: '#fff',
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
  correctText: {
    color: '#34C759',
  },
  incorrectText: {
    color: '#FF3B30',
  },
  correctAnswer: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  nextButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultContainer: {
    flex: 1,
    paddingVertical: 20,
  },
  resultTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  scoreCard: {
    backgroundColor: '#F0F8FF',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginBottom: 30,
  },
  scoreText: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 10,
  },
  scorePercent: {
    fontSize: 18,
    color: '#007AFF',
  },
  resultList: {
    flex: 1,
    marginBottom: 20,
  },
  resultListTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  resultItem: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
  },
  resultItemCorrect: {
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  resultItemIncorrect: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  resultWord: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  resultCorrect: {
    color: '#34C759',
    fontSize: 18,
  },
  resultUserInput: {
    color: '#888',
    fontSize: 14,
  },
  restartButton: {
    backgroundColor: '#007AFF',
    borderRadius: 25,
    paddingVertical: 15,
    alignItems: 'center',
  },
  restartButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
