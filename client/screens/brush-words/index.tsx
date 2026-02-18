import React, { useState, useMemo, useRef } from 'react';
import { View, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { PanGestureHandler, GestureHandlerRootView, State } from 'react-native-gesture-handler';
import Animated, { 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  runOnJS,
  useSharedValue 
} from 'react-native-reanimated';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { getAllWords } from '@/database/wordDao';
import { getWordsInWordbook, createWordbook, addWordToWordbook, getAllWordbooks } from '@/database/wordbookDao';
import { initDatabase } from '@/database';
import { Word, Wordbook } from '@/database/types';
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
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [browsingWords, setBrowsingWords] = useState<number[]>([]); // 记录浏览过的单词ID
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [showOverlapAlert, setShowOverlapAlert] = useState(false);
  const [overlapInfo, setOverlapInfo] = useState<{ overlapCount: number; existingWordbookName: string } | null>(null);

  // 手势相关
  const translateX = useSharedValue(0);
  const swipeThreshold = 100;

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
      // 记录所有单词ID
      setBrowsingWords(wordList.map(w => w.id));
    } catch (error) {
      console.error('加载单词失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 检查是否存在相同的复习项目
  const checkDuplicateProject = async (name: string): Promise<Wordbook | null> => {
    try {
      const wordbooks = await getAllWordbooks();
      return wordbooks.find(wb => wb.name === name) || null;
    } catch (error) {
      console.error('检查重复项目失败:', error);
      return null;
    }
  };

  // 检查是否与现有项目高度重合
  const checkProjectOverlap = async (): Promise<{ overlapCount: number; existingWordbookName: string } | null> => {
    try {
      const wordbooks = await getAllWordbooks();
      const currentWordIds = new Set(browsingWords);

      for (const wb of wordbooks) {
        // 获取该项目的单词
        const wbWords = await getWordsInWordbook(wb.id);
        const wbWordIds = new Set(wbWords.map(w => w.id));

        // 计算重合数量
        let overlapCount = 0;
        browsingWords.forEach(wordId => {
          if (wbWordIds.has(wordId)) {
            overlapCount++;
          }
        });

        // 判断是否高度重合：重合率超过 70%
        const overlapRatio = overlapCount / browsingWords.length;
        if (overlapRatio > 0.7) {
          return {
            overlapCount,
            existingWordbookName: wb.name
          };
        }
      }

      return null;
    } catch (error) {
      console.error('检查项目重合失败:', error);
      return null;
    }
  };

  const handleSwipeLeft = () => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShowDefinition(false);
    } else {
      // 到达最后一个单词，询问是否创建复习项目
      handleFinishBrowsing();
    }
  };

  const handleSwipeRight = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setShowDefinition(false);
    }
  };

  const handleFinishBrowsing = () => {
    if (!projectId) {
      // 如果不是在词库中刷单词，询问是否创建项目
      Alert.alert(
        '学习完成',
        '您已浏览完所有单词。是否要将这些单词创建为一个复习项目？',
        [
          { text: '不创建', onPress: () => router.back() },
          { text: '创建项目', onPress: () => showCreateProjectFlow() }
        ]
      );
    } else {
      // 在词库中刷单词，直接返回
      router.back();
    }
  };

  const showCreateProjectFlow = async () => {
    // 先检查是否重复
    const duplicateProject = await checkDuplicateProject(projectName.trim());
    if (duplicateProject) {
      setShowDuplicateAlert(true);
      return;
    }

    // 检查是否高度重合
    const overlap = await checkProjectOverlap();
    if (overlap) {
      setOverlapInfo(overlap);
      setShowOverlapAlert(true);
      return;
    }

    // 没有问题，直接显示创建项目弹窗
    setShowCreateProjectModal(true);
  };

  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      Alert.alert('提示', '请输入项目名称');
      return;
    }

    // 再次检查是否重复
    const duplicateProject = await checkDuplicateProject(projectName.trim());
    if (duplicateProject) {
      Alert.alert('提示', '已存在相同名称的复习项目，请使用其他名称');
      return;
    }

    try {
      const wordbookId = await createWordbook(projectName.trim(), projectDescription.trim());

      // 将浏览过的单词添加到词库
      for (const wordId of browsingWords) {
        await addWordToWordbook(wordbookId, wordId);
      }

      Alert.alert('成功', '复习项目创建成功', [
        { text: '确定', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('创建项目失败:', error);
      Alert.alert('错误', '创建失败，请重试');
    }
  };

  const handleDuplicateAlertConfirm = () => {
    setShowDuplicateAlert(false);
    Alert.alert('提示', '请使用不同的项目名称');
  };

  const handleOverlapAlertContinue = () => {
    setShowOverlapAlert(false);
    setShowCreateProjectModal(true);
  };

  const currentWord = words[currentIndex];

  // 手势处理函数
  const onGestureEvent = (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      translateX.value = event.nativeEvent.translationX;
    }
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;

      if (translationX < -swipeThreshold) {
        // 左滑
        runOnJS(handleSwipeLeft)();
      } else if (translationX > swipeThreshold) {
        // 右滑
        runOnJS(handleSwipeRight)();
      }

      translateX.value = withSpring(0);
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

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
      <GestureHandlerRootView style={styles.container}>
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

          {/* 单词卡片 - 支持左右滑动 */}
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
          >
            <Animated.View style={[styles.cardContainer, animatedStyle]}>
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

                {/* 词性和释义 - 始终显示 */}
                <View style={styles.definitionSection}>
                  {currentWord.partOfSpeech && (
                    <ThemedText variant="smallMedium" color={theme.textMuted} style={styles.partOfSpeech}>
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
                </View>
              </ThemedView>
            </Animated.View>
          </PanGestureHandler>

          {/* 滑动提示 */}
          <View style={styles.hintContainer}>
            <ThemedText variant="caption" color={theme.textMuted}>
              ← 左滑下一个 | 右滑上一个 →
            </ThemedText>
          </View>

          {/* 完成学习按钮 - 只在最后一个单词显示 */}
          {currentIndex === words.length - 1 && (
            <View style={styles.finishButtonContainer}>
              <TouchableOpacity
                style={[styles.finishButton, { backgroundColor: theme.primary }]}
                onPress={handleFinishBrowsing}
              >
                <FontAwesome6 name="circle-check" size={20} color={theme.buttonPrimaryText} />
                <ThemedText variant="body" color={theme.buttonPrimaryText} style={styles.finishButtonText}>
                  完成学习
                </ThemedText>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </GestureHandlerRootView>

      {/* 重复项目提示弹窗 */}
      <Modal
        visible={showDuplicateAlert}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDuplicateAlert(false)}
      >
        <View style={styles.alertOverlay}>
          <ThemedView level="default" style={styles.alertContent}>
            <View style={styles.alertIconContainer}>
              <FontAwesome6 name="triangle-exclamation" size={48} color={theme.primary} />
            </View>
            <ThemedText variant="h3" color={theme.textPrimary} style={styles.alertTitle}>
              项目已存在
            </ThemedText>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.alertMessage}>
              已存在相同名称的复习项目。请使用不同的项目名称。
            </ThemedText>
            <TouchableOpacity
              style={[styles.alertButton, { backgroundColor: theme.primary }]}
              onPress={handleDuplicateAlertConfirm}
            >
              <ThemedText variant="body" color={theme.buttonPrimaryText}>知道了</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </View>
      </Modal>

      {/* 高度重合提示弹窗 */}
      <Modal
        visible={showOverlapAlert}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOverlapAlert(false)}
      >
        <View style={styles.alertOverlay}>
          <ThemedView level="default" style={styles.alertContent}>
            <View style={styles.alertIconContainer}>
              <FontAwesome6 name="circle-info" size={48} color={theme.accent} />
            </View>
            <ThemedText variant="h3" color={theme.textPrimary} style={styles.alertTitle}>
              项目高度重合
            </ThemedText>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.alertMessage}>
              与现有的「{overlapInfo?.existingWordbookName}」项目高度重合（{overlapInfo?.overlapCount} 个单词重复）。建议只选取未重合的单词创建新的复习项目。
            </ThemedText>
            <View style={styles.alertButtons}>
              <TouchableOpacity
                style={[styles.alertButton, styles.alertButtonCancel, { backgroundColor: theme.backgroundTertiary }]}
                onPress={() => {
                  setShowOverlapAlert(false);
                  router.back();
                }}
              >
                <ThemedText variant="body" color={theme.textPrimary}>取消</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.alertButton, { backgroundColor: theme.primary }]}
                onPress={handleOverlapAlertContinue}
              >
                <ThemedText variant="body" color={theme.buttonPrimaryText}>继续创建</ThemedText>
              </TouchableOpacity>
            </View>
          </ThemedView>
        </View>
      </Modal>

      {/* 创建复习项目 Modal */}
      <Modal
        visible={showCreateProjectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCreateProjectModal(false)}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowCreateProjectModal(false)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <ThemedText variant="h3" color={theme.textPrimary}>创建复习项目</ThemedText>
                <TouchableOpacity onPress={() => setShowCreateProjectModal(false)}>
                  <FontAwesome6 name="xmark" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <ThemedText variant="body" color={theme.textSecondary} style={styles.inputLabel}>
                    项目名称 <ThemedText color={theme.error}>*</ThemedText>
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                    placeholder="请输入项目名称"
                    placeholderTextColor={theme.textMuted}
                    value={projectName}
                    onChangeText={setProjectName}
                    autoFocus
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText variant="body" color={theme.textSecondary} style={styles.inputLabel}>
                    项目描述
                  </ThemedText>
                  <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                    placeholder="请输入项目描述（可选）"
                    placeholderTextColor={theme.textMuted}
                    value={projectDescription}
                    onChangeText={setProjectDescription}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <ThemedText variant="caption" color={theme.textMuted}>
                  将本次浏览的 {browsingWords.length} 个单词添加到项目中
                </ThemedText>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.backgroundTertiary }]}
                  onPress={() => setShowCreateProjectModal(false)}
                >
                  <ThemedText variant="body" color={theme.textPrimary}>取消</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.submitButton, { backgroundColor: theme.primary }]}
                  onPress={handleCreateProject}
                >
                  <ThemedText variant="body" color={theme.buttonPrimaryText}>创建</ThemedText>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
