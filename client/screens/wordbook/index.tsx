import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { getAllWords, getWordStats, deleteWord } from '@/database/wordDao';
import { getAllWordbooks, createWordbook, getWordbookWithCount, addWordToWordbook, getWordsInWordbook, getWordbookStats, getWordbookNamesByWordId } from '@/database/wordbookDao';
import { initDatabase } from '@/database';
import { Wordbook } from '@/database/types';
import { useCallback } from 'react';

export default function WordbookScreen() {
  const { theme, isDark } = useTheme();
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
  
  // 批量选择相关状态
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedWordIds, setSelectedWordIds] = useState<Set<number>>(new Set());
  const [showBatchActionModal, setShowBatchActionModal] = useState(false);
  const [showMoveToBookModal, setShowMoveToBookModal] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      await initDatabase();
      
      // 加载词库列表
      const bookList = await getAllWordbooks();
      setWordbooks(bookList);
      
      // 如果有词库且没有当前选中的，默认选中第一个
      if (bookList.length > 0 && currentWordbookId === null) {
        setCurrentWordbookId(bookList[0].id);
      }
      
      // 加载统计数据和单词列表
      if (currentWordbookId) {
        await loadWordbookData(currentWordbookId);
      } else {
        // 如果没有词库，加载全部单词的统计
        const [wordStats, wordList] = await Promise.all([
          getWordStats(),
          getAllWords()
        ]);
        setStats(wordStats);
        
        // 为每个单词添加词库信息
        const wordsWithBookInfo = await Promise.all(
          wordList.map(async (word) => {
            const bookNames = await getWordbookNamesByWordId(word.id);
            return {
              ...word,
              wordbooks: bookNames,
            };
          })
        );
        setWords(wordsWithBookInfo);
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
      const wordbook = await getWordbookWithCount(wordbookId);
      if (!wordbook) return;
      
      // 更新词库列表（更新单词数）
      const updatedBooks = await getAllWordbooks();
      setWordbooks(updatedBooks);
      
      // 加载统计数据
      const wordStats = await getWordbookStats(wordbookId);
      setStats(wordStats);
      
      // 加载词库中的单词
      const wordList = await getWordsInWordbook(wordbookId);
      setWords(wordList);
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

  const handleAddWordToBook = async (wordId: number) => {
    if (!currentWordbookId) {
      Alert.alert('提示', '请先创建或选择一个词库');
      return;
    }
    
    try {
      await addWordToWordbook(currentWordbookId, wordId);
      await loadData();
      Alert.alert('成功', '单词已添加到词库');
    } catch (error) {
      console.error('添加单词失败:', error);
      Alert.alert('错误', '添加单词失败');
    }
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
                style={[styles.wordbookChip, currentWordbookId === null && styles.wordbookChipActive]}
                onPress={() => { setCurrentWordbookId(null); loadData(); }}
              >
                <ThemedText variant="smallMedium" color={currentWordbookId === null ? theme.buttonPrimaryText : theme.textPrimary}>
                  全部单词
                </ThemedText>
              </TouchableOpacity>
              
              {wordbooks.map((book) => (
                <TouchableOpacity 
                  key={book.id}
                  style={[styles.wordbookChip, currentWordbookId === book.id && styles.wordbookChipActive]}
                  onPress={() => handleSwitchWordbook(book.id)}
                >
                  <ThemedText variant="smallMedium" color={currentWordbookId === book.id ? theme.buttonPrimaryText : theme.textPrimary}>
                    {book.name} ({book.word_count})
                  </ThemedText>
                </TouchableOpacity>
              ))}
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
            onPress={() => router.push(currentWordbookId ? `/import-words?wordbookId=${currentWordbookId}` : '/import-words')}
          >
            <FontAwesome6 name="file-import" size={24} color={theme.buttonPrimaryText} />
            <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>批量导入</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => router.push(currentWordbookId ? `/camera-scan?wordbookId=${currentWordbookId}` : '/camera-scan')}
          >
            <FontAwesome6 name="camera" size={24} color={theme.buttonPrimaryText} />
            <ThemedText variant="smallMedium" color={theme.buttonPrimaryText}>拍照识别</ThemedText>
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

              {/* 已掌握徽章 */}
              {word.is_mastered === 1 && (
                <View style={styles.masteredBadge}>
                  <FontAwesome6 name="circle-check" size={12} color={theme.buttonPrimaryText} />
                  <ThemedText variant="caption" color={theme.buttonPrimaryText} style={styles.masteredBadgeText}>
                    已掌握
                  </ThemedText>
                </View>
              )}

              <View style={styles.wordHeader}>
                <View style={styles.wordInfoLeft}>
                  <ThemedText variant="h3" color={theme.textPrimary}>{word.word}</ThemedText>
                  {word.phonetic && (
                    <ThemedText variant="caption" color={theme.textMuted}>{word.phonetic}</ThemedText>
                  )}
                </View>
                {/* 添加到词库按钮 - 只在非全部单词视图中显示 */}
                {currentWordbookId !== null && (
                  <TouchableOpacity 
                    style={styles.addToBookButton}
                    onPress={() => handleAddWordToBook(word.id)}
                  >
                    <FontAwesome6 name="circle-plus" size={20} color={theme.primary} />
                  </TouchableOpacity>
                )}
              </View>
              
              {/* 显示词库名称 - 只在全部单词视图中显示 */}
              {currentWordbookId === null && word.wordbooks && word.wordbooks.length > 0 && (
                <View style={styles.wordbookTags}>
                  {word.wordbooks.map((book: any) => (
                    <View key={book.id} style={styles.wordbookTag}>
                      <FontAwesome6 name="folder" size={12} color={theme.primary} />
                      <ThemedText variant="caption" color={theme.primary} style={styles.wordbookTagText}>
                        {book.name}
                      </ThemedText>
                    </View>
                  ))}
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
    </Screen>
  );
}
