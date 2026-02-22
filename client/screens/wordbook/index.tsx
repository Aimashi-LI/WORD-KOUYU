import React, { useState, useMemo, useRef } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { useThemeSwitch } from '@/hooks/useThemeSwitch';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { getAllWords, getWordStats, deleteWord } from '@/database/wordDao';
import { getAllWordbooks, createWordbook, getWordbookWithCount, addWordToWordbook, getWordsInWordbook, getWordbookStats, getWordbookNamesByWordId, recalculateAllWordbookCounts } from '@/database/wordbookDao';
import { initDatabase, getDatabase } from '@/database';
import { Wordbook } from '@/database/types';
import { useCallback } from 'react';
import { isWordIncomplete } from '@/utils';
import { sortAndFilterSearchResults } from '@/utils/similarity';

export default function WordbookScreen() {
  const { theme, isDark } = useTheme();
  const { themeChoice, toggleTheme } = useThemeSwitch();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  
  const [stats, setStats] = useState({ total: 0, mastered: 0, pending: 0 });
  const [words, setWords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 词库相关状态
  const [wordbooks, setWordbooks] = useState<Wordbook[]>([]);
  const [currentWordbookId, setCurrentWordbookId] = useState<number | null>(null);
  const [showWordbookModal, setShowWordbookModal] = useState(false);
  const [newWordbookName, setNewWordbookName] = useState('');
  const [newWordbookDesc, setNewWordbookDesc] = useState('');
  
  // 用于跟踪最后一次词库切换的 ID，避免多次更新词库列表
  const lastWordbookIdRef = useRef<number | null>(null);
  // 用于跟踪是否正在更新词库列表
  const isUpdatingRef = useRef(false);
  // 用于记录最后更新时每个词库的单词数
  const lastWordCountsRef = useRef<Map<number, number>>(new Map());
  
  // 批量选择相关状态
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<number>>(new Set());
  const [showBatchActionModal, setShowBatchActionModal] = useState(false);
  const [showMoveToBookModal, setShowMoveToBookModal] = useState(false);
  
  // 搜索相关状态
  const [searchText, setSearchText] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // 搜索功能
  const handleSearch = async (text: string) => {
    setSearchText(text);
    
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      await initDatabase();
      const db = getDatabase();
      
      // 第一步：尝试精确匹配
      const exactResults = await db.getAllAsync<any>(
        `SELECT DISTINCT * FROM words WHERE word = ? COLLATE NOCASE`,
        [text.trim()]
      );
      
      if (exactResults.length > 0) {
        // 有精确匹配结果，直接返回
        setSearchResults(exactResults);
        return;
      }
      
      // 第二步：尝试前缀匹配（单词以查询开头）
      const prefixResults = await db.getAllAsync<any>(
        `SELECT DISTINCT * FROM words WHERE word LIKE ? COLLATE NOCASE ORDER BY created_at DESC LIMIT 50`,
        [`${text.trim()}%`]
      );
      
      if (prefixResults.length > 0) {
        // 有前缀匹配结果，使用相似度算法排序后返回
        const sortedResults = sortAndFilterSearchResults(prefixResults, text.trim());
        setSearchResults(sortedResults);
        return;
      }
      
      // 第三步：模糊匹配（包含查询词）
      const fuzzyResults = await db.getAllAsync<any>(
        `SELECT DISTINCT * FROM words WHERE word LIKE ? OR definition LIKE ? OR split LIKE ? OR mnemonic LIKE ? COLLATE NOCASE ORDER BY created_at DESC LIMIT 100`,
        [`%${text}%`, `%${text}%`, `%${text}%`, `%${text}%`]
      );
      
      // 使用相似度算法对模糊匹配结果进行排序
      const sortedResults = sortAndFilterSearchResults(fuzzyResults, text.trim());
      
      // JavaScript 层面再次去重，确保没有重复的 ID
      const uniqueResults = Array.from(
        new Map(sortedResults.map(word => [word.id, word])).values()
      );
      
      setSearchResults(uniqueResults);
    } catch (error) {
      console.error('搜索失败:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // 添加一个 ref 来跟踪是否已经初始化过
  const isInitializedRef = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (!isInitializedRef.current) {
        isInitializedRef.current = true;
        loadData();
      }
    }, [])
  );

  const loadData = async () => {
    setLoading(true);
    try {
      await initDatabase();
      
      // 重新计算所有词库的单词数，修复数据错误
      await recalculateAllWordbookCounts();
      
      // 加载词库列表（只在初始化时加载一次）
      if (wordbooks.length === 0) {
        console.log('[loadData] 开始加载词库列表...');
        const bookList = await getAllWordbooks();
        console.log('[loadData] 获取到词库列表，数量:', bookList.length);
        console.log('[loadData] 词库ID:', bookList.map(b => b.id));
        
        // 去重：根据 ID 去重，确保每个词库只出现一次
        const uniqueBooks = Array.from(
          new Map(bookList.map(book => [book.id, book])).values()
        );
        console.log('[loadData] 去重后词库数量:', uniqueBooks.length);
        console.log('[loadData] 去重后词库ID:', uniqueBooks.map(b => b.id));
        
        // 记录初始单词数
        uniqueBooks.forEach(book => {
          lastWordCountsRef.current.set(book.id, book.word_count);
        });
        
        setWordbooks(uniqueBooks);
        
        // 如果有词库且没有当前选中的，默认选中第一个
        if (uniqueBooks.length > 0 && currentWordbookId === null) {
          setCurrentWordbookId(uniqueBooks[0].id);
        }
      }
      
      // 加载全局统计（始终显示所有词库的总和）
      const globalStats = await getWordStats();
      setStats(globalStats);
      
      // 加载单词列表（初始化时不调用 loadWordbookData，避免重复设置词库列表）
      if (currentWordbookId) {
        const wordList = await getWordsInWordbook(currentWordbookId);
        setWords(wordList);
      } else {
        // 如果没有词库，加载全部单词
        const wordList = await getAllWords();
        setWords(wordList);
      }
    } catch (error) {
      console.error('加载失败:', error);
      Alert.alert('错误', '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadWordbookData = async (wordbookId: number) => {
    try {
      // 只加载词库中的单词列表
      const wordList = await getWordsInWordbook(wordbookId);
      setWords(wordList);
      
      // 延迟更新词库列表（确保单词数正确）
      // 使用 ref 跟踪最后一次词库切换，避免快速切换时多次更新
      lastWordbookIdRef.current = wordbookId;
      
      setTimeout(async () => {
        // 只有当最后一次切换的 ID 与当前 ID 一致时才更新
        if (lastWordbookIdRef.current === wordbookId && !isUpdatingRef.current) {
          try {
            console.log('[loadWordbookData] 开始更新词库列表，当前ID:', wordbookId);
            isUpdatingRef.current = true;
            
            // 重新计算所有词库的单词数
            await recalculateAllWordbookCounts();
            
            const updatedBooks = await getAllWordbooks();
            console.log('[loadWordbookData] 获取到更新后的词库列表，数量:', updatedBooks.length);
            console.log('[loadWordbookData] 词库ID:', updatedBooks.map(b => b.id));
            
            // 去重：根据 ID 去重，确保每个词库只出现一次
            const uniqueBooks = Array.from(
              new Map(updatedBooks.map(book => [book.id, book])).values()
            );
            console.log('[loadWordbookData] 去重后词库数量:', uniqueBooks.length);
            
            // 检查单词数是否有变化，只有变化时才更新
            const hasChanges = uniqueBooks.some(book => {
              const lastCount = lastWordCountsRef.current.get(book.id);
              return lastCount !== book.word_count;
            });
            
            if (hasChanges) {
              console.log('[loadWordbookData] 检测到单词数变化，更新词库列表');
              
              // 更新最后记录的单词数
              uniqueBooks.forEach(book => {
                lastWordCountsRef.current.set(book.id, book.word_count);
              });
              
              setWordbooks(uniqueBooks);
            } else {
              console.log('[loadWordbookData] 单词数无变化，跳过更新');
            }
          } catch (error) {
            console.error('更新词库列表失败:', error);
          } finally {
            isUpdatingRef.current = false;
          }
        } else {
          console.log('[loadWordbookData] 跳过更新，原因:', {
            currentRef: lastWordbookIdRef.current,
            wordbookId,
            isUpdating: isUpdatingRef.current
          });
        }
      }, 300);
    } catch (error) {
      console.error('加载词库数据失败:', error);
    }
  };

  const handleCreateWordbook = async () => {
    if (!newWordbookName.trim()) {
      Alert.alert('提示', '请输入词库名称');
      return;
    }

    try {
      // 确保数据库已初始化
      await initDatabase();
      
      await createWordbook(newWordbookName.trim(), newWordbookDesc.trim());
      setNewWordbookName('');
      setNewWordbookDesc('');
      setShowWordbookModal(false);
      await loadData();
      Alert.alert('成功', '词库创建成功');
    } catch (error) {
      console.error('创建词库失败:', error);
      Alert.alert('错误', '创建词库失败');
    }
  };

  const handleSwitchWordbook = async (wordbookId: number) => {
    setCurrentWordbookId(wordbookId);
    await loadWordbookData(wordbookId);
  };

  // 长按词库显示操作选项
  const openEditWordbookModal = (wordbook: Wordbook) => {
    Alert.alert(
      `${wordbook.name}`,
      `共 ${wordbook.word_count} 个单词`,
      [
        {
          text: '取消',
          style: 'cancel'
        },
        {
          text: '删除词库',
          style: 'destructive',
          onPress: () => handleDeleteWordbook(wordbook)
        }
      ]
    );
  };

  // 删除词库
  const handleDeleteWordbook = async (wordbook: Wordbook) => {
    Alert.alert(
      '确认删除',
      `确定要删除词库"${wordbook.name}"吗？\n\n这将删除词库本身，但不会删除其中的单词。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await initDatabase();
              const db = getDatabase();

              // 查询该词库中的单词数
              const countRow = await db.getFirstAsync<{ count: number }>(
                'SELECT COUNT(*) as count FROM wordbook_words WHERE wordbook_id = ?',
                [wordbook.id]
              );

              const wordCount = countRow?.count || 0;

              // 删除词库关联
              await db.runAsync(
                'DELETE FROM wordbook_words WHERE wordbook_id = ?',
                [wordbook.id]
              );

              // 删除词库
              await db.runAsync(
                'DELETE FROM wordbooks WHERE id = ?',
                [wordbook.id]
              );

              // 如果删除的是当前词库，切换到"全部单词"
              if (currentWordbookId === wordbook.id) {
                setCurrentWordbookId(null);
              }

              // 重新加载数据
              await loadData();

              Alert.alert('成功', `已删除词库"${wordbook.name}"及其 ${wordCount} 个单词的关联关系`);
            } catch (error) {
              console.error('删除词库失败:', error);
              Alert.alert('错误', '删除词库失败');
            }
          }
        }
      ]
    );
  };

  // 批量选择相关函数
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedWordIds(new Set());
  };

  const toggleWordSelection = (wordId: number) => {
    const newSelection = new Set(selectedWordIds);
    if (newSelection.has(wordId)) {
      newSelection.delete(wordId);
    } else {
      newSelection.add(wordId);
    }
    setSelectedWordIds(newSelection);
  };

  const selectAllWords = () => {
    if (selectedWordIds.size === words.length) {
      // 如果已经全部选中，则取消全选
      setSelectedWordIds(new Set());
    } else {
      // 全选
      setSelectedWordIds(new Set(words.map(w => w.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedWordIds.size === 0) {
      Alert.alert('提示', '请先选择要删除的单词');
      return;
    }

    Alert.alert(
      '确认删除',
      `确定要删除选中的 ${selectedWordIds.size} 个单词吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              for (const wordId of selectedWordIds) {
                await deleteWord(wordId);
              }
              
              setSelectedWordIds(new Set());
              setIsSelectionMode(false);
              await loadData();
              Alert.alert('成功', `已删除 ${selectedWordIds.size} 个单词`);
            } catch (error) {
              console.error('批量删除失败:', error);
              Alert.alert('错误', '批量删除失败');
            }
          }
        }
      ]
    );
  };

  const handleBatchMarkMastered = async (mastered: boolean) => {
    if (selectedWordIds.size === 0) {
      Alert.alert('提示', '请先选择要操作的单词');
      return;
    }

    try {
      const db = (await import('@/database')).getDatabase();
      
      for (const wordId of selectedWordIds) {
        await db.runAsync(
          'UPDATE words SET is_mastered = ? WHERE id = ?',
          [mastered ? 1 : 0, wordId]
        );
      }
      
      setSelectedWordIds(new Set());
      setIsSelectionMode(false);
      await loadData();
      Alert.alert('成功', `${mastered ? '标记为已掌握' : '取消掌握'} ${selectedWordIds.size} 个单词`);
    } catch (error) {
      console.error('批量操作失败:', error);
      Alert.alert('错误', '批量操作失败');
    }
  };

  const handleBatchMoveToBook = async (targetWordbookId: number) => {
    if (selectedWordIds.size === 0) {
      Alert.alert('提示', '请先选择要移动的单词');
      return;
    }

    try {
      for (const wordId of selectedWordIds) {
        await addWordToWordbook(targetWordbookId, wordId);
      }
      
      setSelectedWordIds(new Set());
      setIsSelectionMode(false);
      setShowMoveToBookModal(false);
      await loadData();
      Alert.alert('成功', `已移动 ${selectedWordIds.size} 个单词到词库`);
    } catch (error) {
      console.error('批量移动失败:', error);
      Alert.alert('错误', '批量移动失败');
    }
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 顶部导航栏 */}
        <View style={styles.topBar}>
          <ThemedText variant="h2" color={theme.textPrimary}>单词本</ThemedText>
          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={styles.topBarButton}
              onPress={toggleTheme}
            >
              <FontAwesome6
                name={isDark ? "sun" : "moon"}
                size={24}
                color={theme.textMuted}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.topBarButton}
              onPress={() => router.push('/about')}
            >
              <FontAwesome6 name="circle-info" size={24} color={theme.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.topBarButton}
              onPress={() => setShowSearchModal(true)}
            >
              <FontAwesome6 name="magnifying-glass" size={24} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 顶部统计卡片 */}
        <ThemedView level="default" style={styles.statsCard}>
          <View style={styles.statRow}>
            <View style={styles.statItem}>
              <ThemedText variant="h2" color={theme.primary}>{stats.total}</ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>总单词</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText variant="h2" color={theme.success}>{stats.mastered}</ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>已掌握</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText variant="h2" color={theme.warning}>{stats.pending}</ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>待复习</ThemedText>
            </View>
          </View>
        </ThemedView>

        {/* 词库切换栏 */}
        <View style={styles.wordbookBar}>
          {/* 第一行：标题和添加按钮 */}
          <View style={styles.wordbookBarHeader}>
            <ThemedText variant="body" color={theme.textMuted}>当前词库：</ThemedText>
            <TouchableOpacity 
              style={styles.addWordbookButton}
              onPress={() => setShowWordbookModal(true)}
            >
              <FontAwesome6 name="plus" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
          
          {/* 第二行：词库芯片滚动区域 */}
          <View style={styles.wordbookScrollContainer}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.wordbookScroll}
              contentContainerStyle={styles.wordbookScrollContent}
            >
              <TouchableOpacity 
                key="all"
                style={[styles.wordbookChip, currentWordbookId === null && styles.wordbookChipActive]}
                onPress={() => { setCurrentWordbookId(null); loadData(); }}
              >
                <ThemedText variant="smallMedium" color={currentWordbookId === null ? theme.buttonPrimaryText : theme.textPrimary}>
                  全部单词
                </ThemedText>
              </TouchableOpacity>
              
              {wordbooks.map((book, index) => {
                // 检查是否有重复的 ID
                const duplicateIndex = wordbooks.findIndex((b, i) => b.id === book.id && i !== index);
                if (duplicateIndex !== -1) {
                  console.error(`[词库渲染] 发现重复 ID: ${book.id}，当前索引: ${index}，重复索引: ${duplicateIndex}`);
                }
                
                return (
                <TouchableOpacity 
                  key={book.id}
                  style={[styles.wordbookChip, currentWordbookId === book.id && styles.wordbookChipActive]}
                  onPress={() => handleSwitchWordbook(book.id)}
                  onLongPress={() => openEditWordbookModal(book)}
                >
                  <ThemedText variant="smallMedium" color={currentWordbookId === book.id ? theme.buttonPrimaryText : theme.textPrimary}>
                    {book.name} ({book.word_count})
                  </ThemedText>
                </TouchableOpacity>
              );
              })}
          </ScrollView>
        </View>
        </View>

        {/* 添加按钮组 */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(currentWordbookId ? `/add-word?wordbookId=${currentWordbookId}` : '/add-word')}
          >
            <FontAwesome6 name="plus" size={24} color={theme.buttonPrimaryText} />
            <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>手动添加</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(currentWordbookId ? `/paste-import?wordbookId=${currentWordbookId}` : '/paste-import')}
          >
            <FontAwesome6 name="clipboard" size={24} color={theme.buttonPrimaryText} />
            <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>文本粘贴</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push(currentWordbookId ? `/import-words?wordbookId=${currentWordbookId}` : '/import-words')}
          >
            <FontAwesome6 name="file-import" size={24} color={theme.buttonPrimaryText} />
            <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>批量导入</ThemedText>
          </TouchableOpacity>
        </View>

        {/* 刷单词按钮 */}
        <TouchableOpacity 
          style={styles.brushWordsButton}
          onPress={() => router.push(currentWordbookId ? `/brush-words?projectId=${currentWordbookId}` : '/brush-words')}
        >
          <FontAwesome6 name="fire" size={24} color={theme.buttonPrimaryText} />
          <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>刷单词</ThemedText>
        </TouchableOpacity>

        {/* 单词列表 */}
        <View style={styles.wordListHeader}>
          <ThemedText variant="h3" color={theme.textPrimary}>单词列表</ThemedText>
          <TouchableOpacity 
            style={styles.batchModeButton}
            onPress={toggleSelectionMode}
          >
            <FontAwesome6 
              name={isSelectionMode ? "xmark" : "list-check"} 
              size={18} 
              color={isSelectionMode ? theme.error : theme.primary} 
            />
            <ThemedText 
              variant="caption" 
              color={isSelectionMode ? theme.error : theme.primary}
              style={styles.batchModeButtonText}
            >
              {isSelectionMode ? '退出选择' : '批量选择'}
            </ThemedText>
          </TouchableOpacity>
        </View>
        
        {/* 批量操作按钮栏 */}
        {isSelectionMode && selectedWordIds.size > 0 && (
          <View style={styles.batchActionBar}>
            <TouchableOpacity style={styles.batchActionItem} onPress={selectAllWords}>
              <FontAwesome6 name="check-double" size={20} color={theme.primary} />
              <ThemedText variant="caption" color={theme.textSecondary}>全选</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity style={styles.batchActionItem} onPress={() => setShowBatchActionModal(true)}>
              <FontAwesome6 name="ellipsis" size={20} color={theme.primary} />
              <ThemedText variant="caption" color={theme.textSecondary}>更多操作</ThemedText>
            </TouchableOpacity>
            <View style={styles.selectedCount}>
              <ThemedText variant="caption" color={theme.buttonPrimaryText}>
                已选 {selectedWordIds.size} 个
              </ThemedText>
            </View>
          </View>
        )}
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <ThemedText color={theme.textMuted} style={styles.loadingText}>加载中...</ThemedText>
          </View>
        ) : words.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome6 name="book-open" size={48} color={theme.textMuted} />
            <ThemedText variant="body" color={theme.textMuted} style={styles.emptyText}>
              暂无单词，点击上方按钮添加
            </ThemedText>
          </View>
        ) : (
          words.map((word, index) => {
            // 检查是否有重复的 ID
            const duplicateIndex = words.findIndex((w, i) => w.id === word.id && i !== index);
            if (duplicateIndex !== -1) {
              console.error(`[单词渲染] 发现重复 ID: ${word.id}，当前索引: ${index}，重复索引: ${duplicateIndex}`);
            }
            
            return (
            <TouchableOpacity 
              key={word.id} 
              style={[
                styles.wordCard,
                isSelectionMode && styles.wordCardInSelectionMode,
                selectedWordIds.has(word.id) && styles.wordCardSelected
              ]}
              onPress={() => {
                if (isSelectionMode) {
                  toggleWordSelection(word.id);
                } else {
                  router.push('/word-detail', { id: word.id.toString() });
                }
              }}
              onLongPress={() => {
                if (!isSelectionMode) {
                  setIsSelectionMode(true);
                  setSelectedWordIds(new Set([word.id]));
                }
              }}
            >
              {/* 选择框 */}
              {isSelectionMode && (
                <View style={[styles.checkbox, selectedWordIds.has(word.id) && styles.checkboxChecked]}>
                  {selectedWordIds.has(word.id) && (
                    <FontAwesome6 name="check" size={14} color={theme.buttonPrimaryText} />
                  )}
                </View>
              )}
              <View style={styles.wordHeader}>
                <View style={styles.wordInfoLeft}>
                  <ThemedText variant="h3" color={theme.textPrimary}>{word.word}</ThemedText>
                  {word.phonetic && (
                    <ThemedText variant="caption" color={theme.textMuted}>{word.phonetic}</ThemedText>
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
              
              {/* 显示词库名称 - 只在全部单词视图中显示 */}
              {currentWordbookId === null && word.wordbooks && word.wordbooks.length > 0 && (
                <View style={styles.wordbookTags}>
                  {word.wordbooks.map((book: any, bookIndex: number) => {
                    // 检查词库标签是否有重复的 ID
                    const bookDuplicateIndex = word.wordbooks.findIndex((b: any, i: number) => b.id === book.id && i !== bookIndex);
                    if (bookDuplicateIndex !== -1) {
                      console.error(`[词库标签渲染] 单词 ${word.id} 发现重复词库 ID: ${book.id}，当前索引: ${bookIndex}，重复索引: ${bookDuplicateIndex}`);
                    }
                    
                    return (
                      <View key={book.id} style={styles.wordbookTag}>
                        <FontAwesome6 name="folder" size={12} color={theme.primary} />
                        <ThemedText variant="caption" color={theme.primary} style={styles.wordbookTagText}>
                          {book.name}
                        </ThemedText>
                      </View>
                    );
                  })}
                </View>
              )}
              
              <ThemedText variant="body" color={theme.textSecondary} numberOfLines={2}>
                {word.definition}
              </ThemedText>
              {word.mnemonic && (
                <View style={styles.mnemonicContainer}>
                  <FontAwesome6 name="lightbulb" size={14} color={theme.accent} />
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.mnemonicText}>
                    {word.mnemonic}
                  </ThemedText>
                </View>
              )}
            </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      {/* 批量操作 Modal */}
      <Modal
        visible={showBatchActionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBatchActionModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowBatchActionModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            style={[styles.modalContent, styles.batchActionModal]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.batchActionItems}>
              <TouchableOpacity 
                style={styles.batchActionOption}
                onPress={() => {
                  setShowBatchActionModal(false);
                  setShowMoveToBookModal(true);
                }}
              >
                <FontAwesome6 name="folder-open" size={24} color={theme.primary} />
                <ThemedText variant="body" color={theme.textPrimary}>移动到词库</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.batchActionOption}
                onPress={() => {
                  setShowBatchActionModal(false);
                  handleBatchMarkMastered(true);
                }}
              >
                <FontAwesome6 name="circle-check" size={24} color={theme.success} />
                <ThemedText variant="body" color={theme.textPrimary}>标记为已掌握</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.batchActionOption}
                onPress={() => {
                  setShowBatchActionModal(false);
                  handleBatchMarkMastered(false);
                }}
              >
                <FontAwesome6 name="circle-xmark" size={24} color={theme.warning} />
                <ThemedText variant="body" color={theme.textPrimary}>取消掌握</ThemedText>
              </TouchableOpacity>
              
              <View style={styles.batchActionDivider} />
              
              <TouchableOpacity 
                style={styles.batchActionOption}
                onPress={() => {
                  setShowBatchActionModal(false);
                  handleBatchDelete();
                }}
              >
                <FontAwesome6 name="trash" size={24} color={theme.error} />
                <ThemedText variant="body" color={theme.error}>删除</ThemedText>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 移动到词库 Modal */}
      <Modal
        visible={showMoveToBookModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMoveToBookModal(false)}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowMoveToBookModal(false)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <ThemedText variant="h3" color={theme.textPrimary}>选择目标词库</ThemedText>
                <TouchableOpacity onPress={() => setShowMoveToBookModal(false)}>
                  <FontAwesome6 name="xmark" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.wordbookList}>
                  {wordbooks.filter(book => book.id !== currentWordbookId).map((book) => (
                    <TouchableOpacity
                      key={book.id}
                      style={styles.wordbookListItem}
                      onPress={() => handleBatchMoveToBook(book.id)}
                    >
                      <FontAwesome6 name="folder" size={20} color={theme.primary} />
                      <View style={styles.wordbookListItemContent}>
                        <ThemedText variant="body" color={theme.textPrimary}>{book.name}</ThemedText>
                        <ThemedText variant="caption" color={theme.textMuted}>{book.word_count} 个单词</ThemedText>
                      </View>
                      <FontAwesome6 name="chevron-right" size={16} color={theme.textMuted} />
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* 创建词库 Modal */}
      <Modal
        visible={showWordbookModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowWordbookModal(false)}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowWordbookModal(false)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <ThemedText variant="h3" color={theme.textPrimary}>创建词库</ThemedText>
                <TouchableOpacity onPress={() => setShowWordbookModal(false)}>
                  <FontAwesome6 name="xmark" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                <View style={styles.inputGroup}>
                  <ThemedText variant="body" color={theme.textSecondary} style={styles.inputLabel}>
                    词库名称 <ThemedText color={theme.error}>*</ThemedText>
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                    placeholder="请输入词库名称"
                    placeholderTextColor={theme.textMuted}
                    value={newWordbookName}
                    onChangeText={setNewWordbookName}
                    autoFocus
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText variant="body" color={theme.textSecondary} style={styles.inputLabel}>
                    词库描述
                  </ThemedText>
                  <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                    placeholder="请输入词库描述（可选）"
                    placeholderTextColor={theme.textMuted}
                    value={newWordbookDesc}
                    onChangeText={setNewWordbookDesc}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.backgroundTertiary }]}
                  onPress={() => setShowWordbookModal(false)}
                >
                  <ThemedText variant="body" color={theme.textPrimary}>取消</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.submitButton, { backgroundColor: theme.primary }]}
                  onPress={handleCreateWordbook}
                >
                  <ThemedText variant="body" color={theme.buttonPrimaryText}>创建</ThemedText>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>

      {/* 全局搜索 Modal */}
      <Modal
        visible={showSearchModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSearchModal(false);
          setSearchText('');
          setSearchResults([]);
        }}
      >
        <TouchableOpacity 
          style={styles.searchModalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowSearchModal(false);
            setSearchText('');
            setSearchResults([]);
          }}
        >
          <TouchableOpacity 
            activeOpacity={1}
            style={styles.searchModalContent}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <ThemedText variant="h3" color={theme.textPrimary}>全局搜索</ThemedText>
              <TouchableOpacity onPress={() => {
                setShowSearchModal(false);
                setSearchText('');
                setSearchResults([]);
              }}>
                <FontAwesome6 name="xmark" size={24} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
            
            {/* 搜索输入框 */}
            <View style={styles.searchInputContainer}>
              <FontAwesome6 name="magnifying-glass" size={20} color={theme.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: theme.textPrimary }]}
                value={searchText}
                onChangeText={handleSearch}
                placeholder="搜索单词、释义、拆分、助记"
                placeholderTextColor={theme.textMuted}
                autoFocus
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchText.length > 0 && (
                <TouchableOpacity onPress={() => {
                  setSearchText('');
                  setSearchResults([]);
                }}>
                  <FontAwesome6 name="circle-xmark" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>
            
            {/* 搜索结果 */}
            <ScrollView style={styles.searchResultsContainer}>
              {isSearching ? (
                <View style={styles.searchLoadingContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <ThemedText color={theme.textMuted} style={styles.searchLoadingText}>搜索中...</ThemedText>
                </View>
              ) : searchResults.length > 0 ? (
                searchResults.map((word, index) => {
                  // 检查是否有重复的 ID
                  const duplicateIndex = searchResults.findIndex((w, i) => w.id === word.id && i !== index);
                  if (duplicateIndex !== -1) {
                    console.error(`[搜索结果渲染] 发现重复 ID: ${word.id}，当前索引: ${index}，重复索引: ${duplicateIndex}`);
                  }
                  
                  // 获取匹配类型
                  const matchType = (word.matchType || 'fuzzy') as 'exact' | 'prefix' | 'contains' | 'fuzzy';
                  
                  // 匹配类型标签文本
                  const matchTypeTextMap: Record<string, string> = {
                    exact: '精确',
                    prefix: '前缀',
                    contains: '包含',
                    fuzzy: '相似'
                  };
                  const matchTypeText = matchTypeTextMap[matchType] || '相似';
                  
                  return (
                  <TouchableOpacity
                    key={word.id}
                    style={styles.searchResultItem}
                    onPress={() => {
                      setShowSearchModal(false);
                      router.push('/word-detail', { id: word.id.toString() });
                    }}
                  >
                    <View style={styles.searchResultHeader}>
                      <ThemedText variant="h3" color={theme.primary}>{word.word}</ThemedText>
                      {word.phonetic && (
                        <ThemedText variant="caption" color={theme.textMuted}>{word.phonetic}</ThemedText>
                      )}
                      {/* 匹配类型标签 */}
                      <View style={[
                        styles.searchMatchTypeTag,
                        matchType === 'exact' && styles.searchMatchTypeTagExact,
                        matchType === 'prefix' && styles.searchMatchTypeTagPrefix,
                        matchType === 'fuzzy' && styles.searchMatchTypeTagFuzzy
                      ]}>
                        <ThemedText variant="caption" color={theme.textMuted} style={styles.searchMatchTypeText}>
                          {matchTypeText}
                        </ThemedText>
                      </View>
                    </View>
                    <ThemedText variant="body" color={theme.textSecondary} numberOfLines={2}>
                      {word.definition}
                    </ThemedText>
                    {word.mnemonic && (
                      <View style={styles.mnemonicContainer}>
                        <FontAwesome6 name="lightbulb" size={14} color={theme.accent} />
                        <ThemedText variant="caption" color={theme.textSecondary} style={styles.mnemonicText}>
                          {word.mnemonic}
                        </ThemedText>
                      </View>
                    )}
                  </TouchableOpacity>
                  );
                })
              ) : searchText.length > 0 ? (
                <View style={styles.searchEmptyContainer}>
                  <FontAwesome6 name="magnifying-glass" size={48} color={theme.textMuted} />
                  <ThemedText variant="body" color={theme.textMuted} style={styles.searchEmptyText}>
                    未找到匹配的单词
                  </ThemedText>
                </View>
              ) : null}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </Screen>
  );
}
