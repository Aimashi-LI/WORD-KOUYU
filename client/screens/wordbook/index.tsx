import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/hooks/useTheme';
import { useThemeSwitch } from '@/hooks/useThemeSwitch';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { getAllWords, getWordStats, deleteWord, searchWords, searchWordsInWordbook } from '@/database/wordDao';
import { getAllWordbooks, createWordbook, getWordbookWithCount, addWordToWordbook, getWordsInWordbook, getWordbookStats, getWordbookNamesByWordId, updateWordbook, deleteWordbook } from '@/database/wordbookDao';
import { initDatabase } from '@/database';
import { Wordbook } from '@/database/types';
import { useCallback } from 'react';
import { isWordIncomplete } from '@/utils';

const SPLASH_SHOWN_KEY = '@app:splash_shown';

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
  
  // 记录创建词库后要跳转的页面
  const [pendingNavigateTo, setPendingNavigateTo] = useState<string | null>(null);

  // 判断是否是为了添加单词而创建词库
  const isCreatingForAddingWord = pendingNavigateTo !== null;
  
  // 编辑词库相关状态
  const [showEditWordbookModal, setShowEditWordbookModal] = useState(false);
  const [editingWordbook, setEditingWordbook] = useState<Wordbook | null>(null);
  const [editWordbookName, setEditWordbookName] = useState('');
  const [editWordbookDesc, setEditWordbookDesc] = useState('');
  
  // 批量选择相关状态
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<number>>(new Set());
  const [showBatchActionModal, setShowBatchActionModal] = useState(false);
  const [showMoveToBookModal, setShowMoveToBookModal] = useState(false);
  
  // 搜索相关状态
  const [showSearch, setShowSearch] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showSearchConfirm, setShowSearchConfirm] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // 检查是否需要显示 splash 页面
      const checkAndShowSplash = async () => {
        try {
          const hasShownSplash = await AsyncStorage.getItem(SPLASH_SHOWN_KEY);
          
          // 如果没有显示过，则跳转到 splash 页面
          if (!hasShownSplash) {
            router.replace('/splash');
            return;
          }
          
          // 已经显示过，正常加载数据
          await loadData();
        } catch (error) {
          console.error('检查 splash 页面失败:', error);
          // 出错时仍然加载数据
          await loadData();
        }
      };

      checkAndShowSplash();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      await initDatabase();
      
      // 加载词库列表
      const bookList = await getAllWordbooks();
      console.log('[loadData] 加载到的词库列表:', bookList.map(w => ({ id: w.id, name: w.name, isPreset: w.is_preset })));
      setWordbooks(bookList);
      
      // 确定要加载的词库ID
      const targetWordbookId = currentWordbookId || (bookList.length > 0 ? bookList[0].id : null);
      
      // 如果没有当前选中的词库，设置为第一个词库
      if (!currentWordbookId && bookList.length > 0) {
        setCurrentWordbookId(bookList[0].id);
      }
      
      // 加载当前词库的统计数据和单词列表
      if (targetWordbookId) {
        await loadWordbookData(targetWordbookId);
      }
    } catch (error) {
      console.error('加载失败:', error);
      Alert.alert('错误', '加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadWordbookData = async (wordbookId: number) => {
    console.log('[loadWordbookData] 开始加载词库数据，词库ID:', wordbookId);
    try {
      // 顺序加载所有数据（避免 Web Worker 环境下的并发问题）
      const wordbook = await getWordbookWithCount(wordbookId);
      const updatedBooks = await getAllWordbooks();
      const wordStats = await getWordbookStats(wordbookId);
      const wordList = await getWordsInWordbook(wordbookId);
      
      if (!wordbook) {
        console.log('[loadWordbookData] 词库不存在');
        return;
      }
      
      console.log('[loadWordbookData] 加载完成，单词数:', wordList.length);
      
      // 更新状态（一次性更新所有状态，减少重新渲染次数）
      setWordbooks(updatedBooks);
      setStats(wordStats);
      setWords(wordList);
    } catch (error) {
      console.error('[loadWordbookData] 加载词库数据失败:', error);
      Alert.alert('错误', '加载词库数据失败');
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
      
      // 如果有待跳转的页面，跳转过去
      if (pendingNavigateTo) {
        const newWordbooks = await getAllWordbooks();
        if (newWordbooks.length > 0) {
          const targetWordbookId = newWordbooks[0].id;
          router.push(`${pendingNavigateTo}?wordbookId=${targetWordbookId}`);
          setPendingNavigateTo(null);
        }
      } else {
        Alert.alert('成功', '词库创建成功');
      }
    } catch (error) {
      console.error('创建词库失败:', error);
      Alert.alert('错误', '创建词库失败');
    }
  };

  // 编辑词库
  const handleEditWordbook = (wordbook: Wordbook) => {
    console.log('[handleEditWordbook] 编辑词库:', { id: wordbook.id, name: wordbook.name, is_preset: wordbook.is_preset });
    setEditingWordbook(wordbook);
    setEditWordbookName(wordbook.name);
    setEditWordbookDesc(wordbook.description || '');
    setShowEditWordbookModal(true);
  };

  // 保存词库修改
  const handleSaveWordbookEdit = async () => {
    if (!editingWordbook || !editWordbookName.trim()) {
      Alert.alert('提示', '请输入词库名称');
      return;
    }

    try {
      await updateWordbook(editingWordbook.id, editWordbookName.trim(), editWordbookDesc.trim());
      setShowEditWordbookModal(false);
      setEditingWordbook(null);
      await loadData();
      Alert.alert('成功', '词库修改成功');
    } catch (error) {
      console.error('修改词库失败:', error);
      Alert.alert('错误', '修改词库失败');
    }
  };

  // 删除词库
  const handleDeleteWordbook = async () => {
    if (!editingWordbook) return;

    // 根据是否为预设词库显示不同的提示
    const isPreset = editingWordbook.is_preset === 1;
    
    Alert.alert(
      '确认删除',
      isPreset 
        ? `「${editingWordbook.name}」是系统预设词库，删除后将无法恢复。确定要删除吗？`
        : `确定要删除词库「${editingWordbook.name}」吗？此操作不可撤销。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[handleDeleteWordbook] 准备删除词库:', editingWordbook);
              await deleteWordbook(editingWordbook.id);
              console.log('[handleDeleteWordbook] 删除成功，关闭Modal');
              setShowEditWordbookModal(false);
              setEditingWordbook(null);
              
              // 如果删除的是当前选中的词库，切换到第一个词库
              if (currentWordbookId === editingWordbook.id) {
                console.log('[handleDeleteWordbook] 删除的是当前词库，准备切换');
                const remainingWordbooks = wordbooks.filter(w => w.id !== editingWordbook.id);
                console.log('[handleDeleteWordbook] 剩余词库:', remainingWordbooks.map(w => ({ id: w.id, name: w.name })));
                if (remainingWordbooks.length > 0) {
                  setCurrentWordbookId(remainingWordbooks[0].id);
                  await loadWordbookData(remainingWordbooks[0].id);
                } else {
                  console.log('[handleDeleteWordbook] 没有剩余词库，清空数据');
                  setCurrentWordbookId(null);
                  setWords([]);
                  setStats({ total: 0, mastered: 0, pending: 0 });
                }
              } else {
                console.log('[handleDeleteWordbook] 删除的不是当前词库，重新加载词库列表');
                console.log('[handleDeleteWordbook] 当前词库ID:', currentWordbookId, '删除的词库ID:', editingWordbook.id);
                await loadData();
              }
              
              Alert.alert('成功', '词库删除成功');
            } catch (error) {
              console.error('删除词库失败:', error);
              Alert.alert('错误', '删除词库失败');
            }
          }
        }
      ]
    );
  };

  const handleSwitchWordbook = async (wordbookId: number) => {
    if (wordbookId === currentWordbookId) return;
    
    console.log('[handleSwitchWordbook] 切换词库，从', currentWordbookId, '到', wordbookId);
    setCurrentWordbookId(wordbookId);
    await loadWordbookData(wordbookId);
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

  // 处理搜索输入（实时预览 - 全局搜索）
  const handleSearchInput = async (keyword: string) => {
    setSearchKeyword(keyword);
    
    if (!keyword.trim()) {
      setSearchResults([]);
      setShowSearchConfirm(false);
      return;
    }

    try {
      // 全局搜索：在所有词库中搜索
      const results = await searchWords(keyword);
      setSearchResults(results);
      setShowSearchConfirm(true);
    } catch (error) {
      console.error('搜索失败:', error);
    }
  };

  // 确认搜索结果
  const handleSearchConfirm = () => {
    if (searchResults.length > 0) {
      setWords(searchResults);
      setIsSearching(true);
      setShowSearchConfirm(false);
    }
  };

  // 取消搜索
  const handleSearchCancel = async () => {
    setSearchKeyword('');
    setSearchResults([]);
    setShowSearchConfirm(false);
    setIsSearching(false);
    // 恢复显示当前词库的所有单词
    await loadWordbookData(currentWordbookId || wordbooks[0]?.id);
  };

  const toggleSearch = async () => {
    if (showSearch) {
      // 关闭搜索框，清空搜索
      await handleSearchCancel();
      setShowSearch(false);
    } else {
      // 打开搜索框
      setShowSearch(true);
    }
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
              onPress={toggleSearch}
            >
              <FontAwesome6
                name={showSearch ? "xmark" : "magnifying-glass"}
                size={24}
                color={showSearch ? theme.error : theme.textMuted}
              />
            </TouchableOpacity>
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
          </View>
        </View>

        {/* 搜索框 */}
        {showSearch && (
          <View>
            <View style={styles.searchBar}>
              <FontAwesome6 name="magnifying-glass" size={20} color={theme.textMuted} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.textPrimary }]}
                placeholder="搜索单词或释义..."
                placeholderTextColor={theme.textMuted}
                value={searchKeyword}
                onChangeText={handleSearchInput}
                autoFocus
              />
              {searchKeyword.length > 0 && (
                <TouchableOpacity onPress={toggleSearch}>
                  <FontAwesome6 name="circle-xmark" size={20} color={theme.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* 搜索结果预览和确认按钮 */}
            {showSearchConfirm && searchResults.length > 0 && (
              <View style={styles.searchPreviewBar}>
                <View style={styles.searchPreviewInfo}>
                  <FontAwesome6 name="magnifying-glass" size={16} color={theme.primary} />
                  <ThemedText variant="caption" color={theme.textSecondary} style={styles.searchPreviewText}>
                    全局搜索：找到 {searchResults.length} 个结果
                  </ThemedText>
                </View>
                <View style={styles.searchPreviewActions}>
                  <TouchableOpacity 
                    style={[styles.searchPreviewButton, styles.searchPreviewCancel]}
                    onPress={handleSearchCancel}
                  >
                    <ThemedText variant="caption" color={theme.textPrimary}>取消</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.searchPreviewButton, styles.searchPreviewConfirm]}
                    onPress={handleSearchConfirm}
                  >
                    <ThemedText variant="caption" color={theme.buttonPrimaryText}>确认</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* 搜索结果预览列表 */}
            {showSearchConfirm && searchResults.length > 0 && (
              <View style={styles.searchPreviewList}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.searchPreviewScrollContent}
                >
                  {searchResults.slice(0, 10).map((word) => (
                    <TouchableOpacity 
                      key={word.id} 
                      style={styles.searchPreviewItem}
                      onPress={() => router.push('/word-detail', { id: word.id })}
                    >
                      <ThemedText variant="body" color={theme.textPrimary} style={styles.searchPreviewWord}>
                        {word.word}
                      </ThemedText>
                      <ThemedText variant="caption" color={theme.textMuted} numberOfLines={1}>
                        {word.definition}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                  {searchResults.length > 10 && (
                    <View style={styles.searchPreviewMore}>
                      <ThemedText variant="caption" color={theme.textMuted}>
                        +{searchResults.length - 10} 更多
                      </ThemedText>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}
          </View>
        )}

        {/* 搜索结果提示 */}
        {isSearching && (
          <View style={styles.searchResultHint}>
            <ThemedText variant="caption" color={theme.textMuted}>
              全局搜索结果：找到 {words.length} 个单词
              <TouchableOpacity onPress={handleSearchCancel} style={styles.clearSearchLink}>
                <ThemedText variant="caption" color={theme.primary}>清空</ThemedText>
              </TouchableOpacity>
            </ThemedText>
          </View>
        )}

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
            <ThemedText variant="body" color={theme.textMuted}>
              {wordbooks.length === 0 ? '当前没有词库，请先创建词库' : '当前词库：'}
            </ThemedText>
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
              {wordbooks.map((book) => (
                <TouchableOpacity 
                  key={book.id}
                  style={[styles.wordbookChip, currentWordbookId === book.id && styles.wordbookChipActive]}
                  onPress={() => handleSwitchWordbook(book.id)}
                  onLongPress={() => handleEditWordbook(book)}
                >
                  <ThemedText variant="smallMedium" color={currentWordbookId === book.id ? theme.buttonPrimaryText : theme.textPrimary}>
                    {book.name} ({book.word_count})
                  </ThemedText>
                </TouchableOpacity>
              ))}
          </ScrollView>
        </View>
        </View>

        {/* AI 搜索添加按钮 */}
        <TouchableOpacity
          style={styles.aiSearchButton}
          onPress={() => {
            if (wordbooks.length === 0) {
              // 没有词库，先创建词库
              setPendingNavigateTo('/ai-word-search');
              setShowWordbookModal(true);
            } else {
              router.push(currentWordbookId ? `/ai-word-search?wordbookId=${currentWordbookId}` : '/ai-word-search');
            }
          }}
        >
          <View style={styles.aiSearchButtonContent}>
            <FontAwesome6 name="wand-magic-sparkles" size={28} color={theme.buttonPrimaryText} />
            <View style={styles.aiSearchButtonTextContainer}>
              <ThemedText variant="h3" color={theme.buttonPrimaryText}>添加单词</ThemedText>
              <ThemedText variant="caption" color={theme.buttonPrimaryText}>AI 智能搜索</ThemedText>
            </View>
          </View>
          <FontAwesome6 name="chevron-right" size={20} color={theme.buttonPrimaryText} style={styles.aiSearchButtonArrow} />
        </TouchableOpacity>

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
          words.map((word) => (
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
          ))
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
        onRequestClose={() => {
          setShowWordbookModal(false);
          setPendingNavigateTo(null);
        }}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => {
              setShowWordbookModal(false);
              setPendingNavigateTo(null);
            }}
          >
            <TouchableOpacity 
              activeOpacity={1}
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <ThemedText variant="h3" color={theme.textPrimary}>
                  {isCreatingForAddingWord ? '请先创建词库' : '创建词库'}
                </ThemedText>
                <TouchableOpacity onPress={() => {
                  setShowWordbookModal(false);
                  setPendingNavigateTo(null);
                }}>
                  <FontAwesome6 name="xmark" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {isCreatingForAddingWord && (
                  <View style={styles.hintText}>
                    <FontAwesome6 name="circle-info" size={16} color={theme.primary} />
                    <ThemedText variant="caption" color={theme.textSecondary} style={styles.hintTextContent}>
                      添加单词需要先创建词库
                    </ThemedText>
                  </View>
                )}

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
                  onPress={() => {
                    setShowWordbookModal(false);
                    setPendingNavigateTo(null);
                  }}
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

      {/* 编辑词库 Modal */}
      <Modal
        visible={showEditWordbookModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditWordbookModal(false)}
      >
        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity 
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowEditWordbookModal(false)}
          >
            <TouchableOpacity 
              activeOpacity={1}
              style={styles.modalContent}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.modalHeader}>
                <ThemedText variant="h3" color={theme.textPrimary}>编辑词库</ThemedText>
                <TouchableOpacity onPress={() => setShowEditWordbookModal(false)}>
                  <FontAwesome6 name="xmark" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {isCreatingForAddingWord && (
                  <View style={styles.hintText}>
                    <FontAwesome6 name="circle-info" size={16} color={theme.primary} />
                    <ThemedText variant="caption" color={theme.textSecondary} style={styles.hintTextContent}>
                      添加单词需要先创建词库
                    </ThemedText>
                  </View>
                )}

                <View style={styles.inputGroup}>
                  <ThemedText variant="body" color={theme.textSecondary} style={styles.inputLabel}>
                    词库名称 <ThemedText color={theme.error}>*</ThemedText>
                  </ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundTertiary, color: theme.textPrimary }]}
                    placeholder="请输入词库名称"
                    placeholderTextColor={theme.textMuted}
                    value={editWordbookName}
                    onChangeText={setEditWordbookName}
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
                    value={editWordbookDesc}
                    onChangeText={setEditWordbookDesc}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                {/* 删除词库按钮 */}
                <View style={styles.deleteButtonContainer}>
                  <TouchableOpacity 
                    style={[
                      styles.deleteButton, 
                      { backgroundColor: editingWordbook?.is_preset === 1 ? theme.error : theme.error }
                    ]}
                    onPress={handleDeleteWordbook}
                  >
                    <FontAwesome6 name="trash" size={18} color="#FFFFFF" />
                    <ThemedText variant="body" color="#FFFFFF">删除词库</ThemedText>
                  </TouchableOpacity>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.backgroundTertiary }]}
                  onPress={() => setShowEditWordbookModal(false)}
                >
                  <ThemedText variant="body" color={theme.textPrimary}>取消</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalButton, styles.submitButton, { backgroundColor: theme.primary }]}
                  onPress={handleSaveWordbookEdit}
                >
                  <ThemedText variant="body" color={theme.buttonPrimaryText}>保存</ThemedText>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
