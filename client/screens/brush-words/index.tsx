import React, { useState, useMemo, useRef } from 'react';
import { View, TouchableOpacity, ActivityIndicator, ScrollView, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, Dimensions, Text } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import ViewShot from 'react-native-view-shot';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  useSharedValue,
  useAnimatedScrollHandler,
  interpolate,
  Extrapolation,
  SharedValue,
  useDerivedValue
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
import { initDatabase, getDatabase } from '@/database';
import { Word, Wordbook } from '@/database/types';
import { useCallback } from 'react';
import { formatSplitStringForDisplay } from '@/utils/splitHelper';
import { isWordIncomplete } from '@/utils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* eslint-disable react/prop-types */

// WordCard 的 Props 类型
interface WordCardProps {
  word: Word;
  index: number;
  scrollX: SharedValue<number>;
  cardWidth: number;
  cardSpacing: number;
  styles: any;
  theme: any;
  cardRef: React.RefObject<View | null>;
  router: any;
  isCurrent: boolean;
}

// 单词卡片组件 - 使用 React.memo 优化性能
const WordCard = React.memo<WordCardProps>(({ word, index, scrollX, cardWidth, cardSpacing, styles, theme, cardRef, router, isCurrent }) => {
  const offset = index * (cardWidth + cardSpacing);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      scrollX.value,
      [offset - cardWidth, offset, offset + cardWidth],
      [0.85, 1, 0.85],
      Extrapolation.CLAMP
    );
    const opacity = interpolate(
      scrollX.value,
      [offset - cardWidth, offset, offset + cardWidth],
      [0.3, 1, 0.3],
      Extrapolation.CLAMP
    );

    return {
      transform: [{ scale }],
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        { width: cardWidth },
        animatedStyle,
      ]}
    >
      <View ref={isCurrent ? cardRef : null} collapsable={false}>
        <ThemedView level="default" style={styles.wordCard}>
          {/* 单词和词性 - 同排显示 */}
          <View style={styles.wordPartOfSpeechRow}>
            <View style={styles.wordInfoLeft}>
              <ThemedText variant="h1" color={theme.textPrimary} style={styles.wordText}>
                {word.word}
              </ThemedText>
              {word.partOfSpeech ? (
                <ThemedText variant="smallMedium" color={theme.primary} style={styles.inlinePartOfSpeech}>
                  {word.partOfSpeech}
                </ThemedText>
              ) : (
                <TouchableOpacity
                  onPress={() => router.push('/word-detail', { id: String(word.id) })}
                  style={styles.addPartOfSpeechButton}
                >
                  <ThemedText variant="smallMedium" color={theme.textMuted} style={styles.addPartOfSpeechText}>
                    + 词性
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.statusTags}>
              {/* 已掌握标签 */}
              {word.is_mastered === 1 && (
                <View style={styles.masteredTag}>
                  <FontAwesome6 name="circle-check" size={14} color={theme.success} />
                  <ThemedText variant="caption" color={theme.success} style={styles.masteredTagText}>已掌握</ThemedText>
                </View>
              )}
              {/* 待编辑标签 */}
              {isWordIncomplete(word) && (
                <View style={styles.incompleteTag}>
                  <FontAwesome6 name="pen-to-square" size={14} color={theme.warning} />
                  <ThemedText variant="caption" color={theme.warning} style={styles.incompleteTagText}>待编辑</ThemedText>
                </View>
              )}
            </View>
          </View>

          {/* 音标 */}
          {word.phonetic && (
            <ThemedText variant="body" color={theme.textSecondary} style={styles.phonetic}>
              {word.phonetic}
            </ThemedText>
          )}

          {/* 释义 */}
          <View style={styles.definitionSection}>
            <ThemedText variant="body" color={theme.textPrimary}>
              <ThemedText variant="body" color={theme.textMuted}>释义：</ThemedText>
              {word.definition}
            </ThemedText>
          </View>

          {/* 拆分 */}
          {word.split && (
            <ThemedView level="tertiary" style={styles.splitSection}>
              <FontAwesome6 name="scissors" size={16} color={theme.accent} />
              <View style={styles.splitRow}>
                <ThemedText variant="body" color={theme.textMuted} style={styles.splitLabel}>拆分：</ThemedText>
                <ThemedText variant="body" color={theme.textSecondary} style={styles.splitValue}>
                  {formatSplitStringForDisplay(word.split)}
                </ThemedText>
              </View>
            </ThemedView>
          )}

          {/* 助记句（短句） */}
          {word.mnemonic ? (
            <ThemedView level="tertiary" style={styles.mnemonicSection}>
              <FontAwesome6 name="lightbulb" size={16} color={theme.accent} />
              <ThemedText variant="body" color={theme.textSecondary} style={styles.mnemonicText}>
                <ThemedText variant="body" color={theme.textMuted}>助记：</ThemedText>
                {word.mnemonic}
              </ThemedText>
            </ThemedView>
          ) : (
            <TouchableOpacity onPress={() => router.push('/word-detail', { id: String(word.id) })}>
              <ThemedView level="tertiary" style={styles.mnemonicSection}>
                <FontAwesome6 name="lightbulb" size={16} color={theme.primary} />
                <ThemedText variant="body" color={theme.primary} style={styles.mnemonicText}>
                  + 助记句
                </ThemedText>
              </ThemedView>
            </TouchableOpacity>
          )}

          {/* 例句 */}
          {word.sentence && (
            <ThemedText variant="caption" color={theme.textSecondary} style={styles.sentence}>
              例句：{word.sentence}
            </ThemedText>
          )}
        </ThemedView>
      </View>
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // 自定义比较函数：只有当关键属性变化时才重新渲染
  return (
    prevProps.word.id === nextProps.word.id &&
    prevProps.index === nextProps.index &&
    prevProps.isCurrent === nextProps.isCurrent &&
    prevProps.word === nextProps.word
  );
});

// 设置组件显示名称（用于调试）
WordCard.displayName = 'WordCard';

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
  const [isSharing, setIsSharing] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // 滑动相关
  const scrollX = useSharedValue(0);
  const scrollViewRef = useRef<Animated.ScrollView>(null);
  const cardRef = useRef<View>(null);
  const shareCardRef = useRef<ViewShot>(null);
  const CARD_WIDTH = SCREEN_WIDTH - 40; // 20 * 2 padding
  const CARD_SPACING = 20;

  // 根据实际单词数量计算精确的吸附偏移量
  const snapOffsets = useMemo(() => {
    return words.map((_, index) => index * (CARD_WIDTH + CARD_SPACING));
  }, [words.length, CARD_WIDTH, CARD_SPACING]);

  useFocusEffect(
    useCallback(() => {
      loadWords();
    }, [projectId])
  );

  const loadWords = async () => {
    setLoading(true);
    try {
      await initDatabase();
      
      // 检查数据库表结构
      const db = getDatabase();
      const tableInfo = await db.getAllAsync<{ name: string, type: string }>(
        'PRAGMA table_info(words)'
      );
      
      const hasPartOfSpeech = tableInfo.some(col => col.name === 'partOfSpeech');
      
      if (!hasPartOfSpeech) {
        try {
          await db.execAsync('ALTER TABLE words ADD COLUMN partOfSpeech TEXT');
        } catch (error) {
          console.error('[loadWords] 添加 partOfSpeech 字段失败:', error);
        }
      }
      
      let wordList: Word[];
      
      if (projectId) {
        // 从指定词库加载单词
        wordList = await getWordsInWordbook(parseInt(projectId));
      } else {
        // 直接查询数据库
        const db = getDatabase();
        const rows = await db.getAllAsync<any>('SELECT * FROM words ORDER BY created_at DESC');

        // 手动映射
        wordList = rows.map(row => ({
          id: row.id,
          word: row.word,
          phonetic: row.phonetic,
          definition: row.definition,
          partOfSpeech: row.partOfSpeech,
          split: row.split,
          mnemonic: row.mnemonic,
          sentence: row.sentence,
          difficulty: row.difficulty || 0,
          stability: row.stability || 0,
          last_review: row.last_review,
          next_review: row.next_review,
          avg_response_time: row.avg_response_time || 0,
          is_mastered: row.is_mastered || 0,
          review_count: row.review_count || 0,
          created_at: row.created_at
        }));
      }
      
      setWords(wordList);
      setCurrentIndex(0);
      setShowDefinition(false);
      // 记录所有单词ID
      setBrowsingWords(wordList.map(w => w.id));
    } catch (error) {
      console.error('[loadWords] 加载单词失败:', error);
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
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setShowDefinition(false);
      scrollViewRef.current?.scrollTo({ x: newIndex * (CARD_WIDTH + CARD_SPACING), animated: true });
    } else {
      // 到达最后一个单词，询问是否创建复习项目
      handleFinishBrowsing();
    }
  };

  const handleSwipeRight = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setShowDefinition(false);
      scrollViewRef.current?.scrollTo({ x: newIndex * (CARD_WIDTH + CARD_SPACING), animated: true });
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

  // 使用 useMemo 优化当前单词计算
  const currentWord = useMemo(() => words[currentIndex] || null, [words, currentIndex]);

  // 滑动处理函数
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  // 实时计算当前索引（用于进度条实时更新）
  const currentProgress = useDerivedValue(() => {
    if (words.length === 0) return 0;
    const rawIndex = scrollX.value / (CARD_WIDTH + CARD_SPACING);
    const clampedIndex = Math.max(0, Math.min(Math.round(rawIndex), words.length - 1));
    return (clampedIndex + 1) / words.length;
  });

  // 进度条动画样式
  const progressAnimatedStyle = useAnimatedStyle(() => {
    return {
      width: `${currentProgress.value * 100}%`,
    };
  });

  // 根据滚动位置更新当前索引
  const onMomentumScrollEnd = (event: any) => {
    const offset = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(offset / (CARD_WIDTH + CARD_SPACING));
    const clampedIndex = Math.max(0, Math.min(newIndex, words.length - 1));
    
    setCurrentIndex(clampedIndex);
    setShowDefinition(false);
  };

  // 分享单词卡片 - 显示选项弹窗
  const handleShare = () => {
    if (!currentWord) return;
    setShowShareModal(true);
  };

  // 图片分享 - 动态生成卡片图片
  const handleShareImage = async () => {
    if (!currentWord || !shareCardRef.current) return;

    try {
      setShowShareModal(false);
      setIsSharing(true);

      console.log('[Share] 开始图片分享...');

      // 使用 ViewShot 捕获卡片
      const capturedUri = await (shareCardRef.current as any).capture();

      console.log('[Share] 捕获的图片 URI:', capturedUri);

      // 使用 FileSystem 将图片复制到可访问的缓存目录
      const cacheDirectory = (FileSystem as any).cacheDirectory;
      const timestamp = Date.now();
      const targetUri = `${cacheDirectory}word_share_${timestamp}.png`;

      console.log('[Share] 目标路径:', targetUri);

      // 读取原始图片并写入到新位置
      const base64Data = await (FileSystem as any).readAsStringAsync(capturedUri, {
        encoding: (FileSystem as any).EncodingType.Base64,
      });

      await (FileSystem as any).writeAsStringAsync(targetUri, base64Data, {
        encoding: (FileSystem as any).EncodingType.Base64,
      });

      console.log('[Share] 图片复制成功');

      // 检查设备是否支持分享
      const isAvailable = await Sharing.isAvailableAsync();
      console.log('[Share] 设备支持分享:', isAvailable);

      if (isAvailable) {
        await Sharing.shareAsync(targetUri, {
          dialogTitle: `分享单词：${currentWord.word}`,
          mimeType: 'image/png',
        });
        console.log('[Share] 分享成功');

        // 分享成功后删除临时文件
        try {
          await (FileSystem as any).deleteAsync(targetUri, { idempotent: true });
          console.log('[Share] 临时文件已删除');
        } catch (deleteError) {
          console.log('[Share] 删除临时文件失败（可忽略）:', deleteError);
        }

        Alert.alert('成功', '图片分享成功');
      } else {
        Alert.alert('提示', '您的设备不支持分享功能');
      }
    } catch (error) {
      console.error('分享失败:', error);
      Alert.alert('错误', `分享失败：${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setIsSharing(false);
    }
  };

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
            <Animated.View style={[styles.progressFill, progressAnimatedStyle]} />
          </View>
        </View>

        {/* 单词卡片 - 支持水平滑动 */}
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          onMomentumScrollEnd={onMomentumScrollEnd}
          scrollEventThrottle={16}
          decelerationRate={0.9}
          snapToOffsets={snapOffsets}
          snapToAlignment="start"
          contentContainerStyle={styles.scrollContainer}
        >
          {words.map((word, index) => (
            <WordCard
              key={word.id}
              word={word}
              index={index}
              scrollX={scrollX}
              cardWidth={CARD_WIDTH}
              cardSpacing={CARD_SPACING}
              styles={styles}
              theme={theme}
              cardRef={cardRef}
              router={router}
              isCurrent={index === currentIndex}
            />
          ))}
          {/* 添加一个占位符，确保最后一个卡片可以完整显示 */}
          <View style={{ width: 20 }} />
        </Animated.ScrollView>

        {/* 分享按钮 */}
        <TouchableOpacity
          style={[styles.shareButton, { backgroundColor: theme.backgroundTertiary }]}
          onPress={handleShare}
          disabled={isSharing}
        >
          <FontAwesome6 name="share-nodes" size={20} color={theme.primary} />
          <ThemedText variant="body" color={theme.primary}>
            {isSharing ? '生成中...' : '分享'}
          </ThemedText>
        </TouchableOpacity>

        {/* 滑动提示 */}
        <View style={styles.hintContainer}>
          <ThemedText variant="caption" color={theme.textMuted}>
            ← 滑动切换单词 →
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

      {/* 分享卡片（隐藏，仅用于截图） */}
      {currentWord && (
        <View style={{ position: 'absolute', left: -9999, top: 0 }}>
          <ViewShot ref={shareCardRef} options={{ format: 'png', quality: 1 }}>
            <View style={styles.shareCardContainer}>
              {/* 单词 */}
              <View style={styles.shareWordContainer}>
                <Text style={styles.shareWord}>{currentWord.word}</Text>
              </View>

              {/* 词性 */}
              {currentWord.partOfSpeech && (
                <View style={styles.sharePartOfSpeechContainer}>
                  <Text style={styles.sharePartOfSpeech}>{currentWord.partOfSpeech}</Text>
                </View>
              )}

              {/* 橙色分隔线 */}
              <View style={styles.shareDivider} />

              {/* 释义 */}
              <View style={styles.shareDefinitionSection}>
                <Text style={styles.shareDefinitionLabel}>释义：</Text>
                <Text style={styles.shareDefinition}>
                  {currentWord.definition || '单词'}
                </Text>
              </View>

              {/* 拆分 */}
              {currentWord.split && (
                <View style={styles.shareSplitSection}>
                  <Text style={styles.shareSectionTitle}>拆分</Text>
                  {(() => {
                    const splitText = formatSplitStringForDisplay(currentWord.split!);
                    const items = splitText.split('\n').filter(item => item.trim());
                    const itemsPerColumn = 4;
                    const numColumns = Math.ceil(items.length / itemsPerColumn);

                    // 将拆分项分组到列中
                    const columns: string[][] = [];
                    for (let col = 0; col < numColumns; col++) {
                      const columnItems: string[] = [];
                      for (let row = 0; row < itemsPerColumn; row++) {
                        const originalIndex = row + col * itemsPerColumn;
                        if (originalIndex < items.length) {
                          columnItems.push(items[originalIndex]);
                        }
                      }
                      columns.push(columnItems);
                    }

                    return (
                      <View style={styles.shareSplitTextContainer}>
                        {columns.map((columnItems, colIndex) => (
                          <React.Fragment key={colIndex}>
                            <View style={[
                              styles.shareSplitColumn,
                              colIndex < numColumns - 1 && styles.shareSplitColumnWithSpacing
                            ]}>
                              {columnItems.map((item, rowIndex) => (
                                <Text key={rowIndex} style={[
                                  styles.shareSplitItem,
                                  numColumns >= 3 && styles.shareSplitItemSmall
                                ]}>
                                  {item}
                                </Text>
                              ))}
                            </View>
                            {/* 列与列之间添加分隔线（除了最后一列） */}
                            {colIndex < numColumns - 1 && (
                              <View style={styles.shareSplitDivider} />
                            )}
                          </React.Fragment>
                        ))}
                      </View>
                    );
                  })()}
                </View>
              )}

              {/* 助记短句 */}
              {currentWord.mnemonic && (
                <View style={styles.shareMnemonicSection}>
                  <Text style={styles.shareMnemonicLabel}>短句：</Text>
                  <Text style={styles.shareMnemonicText}>{currentWord.mnemonic}</Text>
                </View>
              )}

              {/* 例句 */}
              {currentWord.sentence && (
                <View style={styles.shareSentenceSection}>
                  <Text style={styles.shareSentenceLabel}>例句：</Text>
                  <Text style={styles.shareSentenceText}>{currentWord.sentence}</Text>
                </View>
              )}

              {/* 底部信息 */}
              <View style={styles.shareCardFooter}>
                <Text style={styles.shareFooterUser}>来自 编码记忆法 的分享</Text>
                <Text style={styles.shareFooterDate}>{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
              </View>
            </View>
          </ViewShot>
        </View>
      )}

      {/* 分享选项弹窗 */}
      <Modal
        visible={showShareModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowShareModal(false)}
      >
        <TouchableOpacity
          style={styles.alertOverlay}
          activeOpacity={1}
          onPress={() => setShowShareModal(false)}
        >
          <ThemedView level="default" style={styles.shareModalContent}>
            <View style={styles.shareModalHeader}>
              <ThemedText variant="h3" color={theme.textPrimary}>分享单词</ThemedText>
              <TouchableOpacity onPress={() => setShowShareModal(false)}>
                <FontAwesome6 name="xmark" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.shareOptionsContainer}>
              {/* 图片分享 */}
              <TouchableOpacity
                style={styles.shareOption}
                onPress={handleShareImage}
                disabled={isSharing}
              >
                <View style={[styles.shareOptionIcon, { backgroundColor: theme.primary + '20' }]}>
                  <FontAwesome6 name="image" size={24} color={theme.primary} />
                </View>
                <View style={styles.shareOptionInfo}>
                  <ThemedText variant="body" color={theme.textPrimary} style={styles.shareOptionTitle}>
                    分享图片
                  </ThemedText>
                  <ThemedText variant="caption" color={theme.textMuted} style={styles.shareOptionDesc}>
                    分享精美的单词学习卡片
                  </ThemedText>
                </View>
                <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            </View>

            {/* 取消按钮 */}
            <TouchableOpacity
              style={[styles.shareCancelButton, { backgroundColor: theme.backgroundTertiary }]}
              onPress={() => setShowShareModal(false)}
            >
              <ThemedText variant="body" color={theme.textPrimary}>取消</ThemedText>
            </TouchableOpacity>
          </ThemedView>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}
