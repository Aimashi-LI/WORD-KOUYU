import React, { useState, useMemo } from 'react';
import { View, ScrollView, TouchableOpacity, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { getWordById, updateWord, deleteWord, addReviewLog, getRecentReviewLogs } from '@/database/wordDao';
import { initDatabase } from '@/database';
import { Word, NewWord } from '@/database/types';
import { PhoneticKeyboard } from '@/components/PhoneticKeyboard';

type EditMode = 'none' | 'edit';

// 词性列表
const PART_OF_SPEECH_LIST = [
  'n.名词', 'pron.代词', 'v.动词', 'adj.形容词', 'adv.副词',
  'prep.介词', 'conj.连词', 'int.感叹词', 'num.数词', 'art.冠词'
];

export default function WordDetailScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: string }>();

  const [word, setWord] = useState<Word | null>(null);
  const [editMode, setEditMode] = useState<EditMode>('none');
  const [editForm, setEditForm] = useState<Partial<NewWord>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPhoneticKeyboard, setShowPhoneticKeyboard] = useState(false);

  React.useEffect(() => {
    loadWordDetail();
  }, [id]);

  const loadWordDetail = async () => {
    try {
      await initDatabase();
      if (id) {
        const wordData = await getWordById(parseInt(id));
        // 将 null 转换为 undefined
        if (wordData) {
          setWord({
            ...wordData,
            phonetic: wordData.phonetic || undefined,
            partOfSpeech: wordData.partOfSpeech || undefined,
            split: wordData.split || undefined,
            mnemonic: wordData.mnemonic || undefined,
            sentence: wordData.sentence || undefined,
            last_review: wordData.last_review || undefined,
            next_review: wordData.next_review || undefined,
          });
        } else {
          setWord(wordData);
        }
      }
    } catch (error) {
      console.error('加载单词详情失败:', error);
      Alert.alert('错误', '加载单词详情失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    if (!word) return;
    setEditForm({
      word: word.word,
      phonetic: word.phonetic || undefined,
      definition: word.definition,
      partOfSpeech: word.partOfSpeech || undefined,
      mnemonic: word.mnemonic || undefined,
      sentence: word.sentence || undefined,
    });
    setEditMode('edit');
  };

  const handleSave = async () => {
    if (!word || !editForm.word || !editForm.definition) {
      Alert.alert('提示', '单词和释义不能为空');
      return;
    }

    setSaving(true);
    try {
      await updateWord(word.id, {
        word: editForm.word.trim(),
        phonetic: editForm.phonetic?.trim() || undefined,
        definition: editForm.definition.trim(),
        partOfSpeech: editForm.partOfSpeech || undefined,
        mnemonic: editForm.mnemonic?.trim() || undefined,
        sentence: editForm.sentence?.trim() || undefined,
      });
      await loadWordDetail();
      setEditMode('none');
      Alert.alert('成功', '单词已更新');
    } catch (error) {
      console.error('更新单词失败:', error);
      Alert.alert('错误', '更新失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!word) return;

    Alert.alert(
      '确认删除',
      '确定要删除这个单词吗？此操作不可撤销。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteWord(word.id);
              Alert.alert('成功', '单词已删除', [
                { text: '确定', onPress: () => router.back() }
              ]);
            } catch (error) {
              console.error('删除单词失败:', error);
              Alert.alert('错误', '删除失败，请重试');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.loadingContainer}>
          <ThemedText color={theme.textMuted}>加载中...</ThemedText>
        </View>
      </Screen>
    );
  }

  if (!word) {
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <View style={styles.loadingContainer}>
          <ThemedText color={theme.textMuted}>单词不存在</ThemedText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 顶部操作栏 */}
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.headerButton} onPress={handleEdit}>
              <FontAwesome6 name="pen" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton} onPress={handleDelete}>
              <FontAwesome6 name="trash" size={20} color={theme.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 单词展示 */}
        <View style={styles.wordContainer}>
          <ThemedText variant="h1" color={theme.textPrimary}>{word.word}</ThemedText>
          {word.phonetic && (
            <ThemedText variant="h4" color={theme.textMuted} style={styles.phonetic}>
              {word.phonetic}
            </ThemedText>
          )}
        </View>

        {/* 释义卡片 */}
        <ThemedView level="default" style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome6 name="book" size={18} color={theme.primary} />
            <ThemedText variant="h4" color={theme.textPrimary}>释义</ThemedText>
          </View>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.definitionText}>
            {word.definition}
          </ThemedText>
          {word.partOfSpeech && (
            <View style={styles.partOfSpeechTag}>
              <ThemedText variant="caption" color={theme.buttonPrimaryText}>
                {word.partOfSpeech}
              </ThemedText>
            </View>
          )}
        </ThemedView>

        {/* 拆分卡片 */}
        {word.split && (
          <ThemedView level="default" style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome6 name="code" size={18} color={theme.accent} />
              <ThemedText variant="h4" color={theme.textPrimary}>拆分</ThemedText>
            </View>
            <ThemedText variant="body" color={theme.textSecondary}>
              {word.split}
            </ThemedText>
          </ThemedView>
        )}

        {/* 记忆口诀卡片 */}
        {word.mnemonic && (
          <ThemedView level="default" style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome6 name="lightbulb" size={18} color={theme.warning} />
              <ThemedText variant="h4" color={theme.textPrimary}>记忆口诀</ThemedText>
            </View>
            <ThemedText variant="body" color={theme.textSecondary}>
              {word.mnemonic}
            </ThemedText>
          </ThemedView>
        )}

        {/* 短句卡片 */}
        {word.sentence && (
          <ThemedView level="default" style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome6 name="quote-left" size={18} color={theme.success} />
              <ThemedText variant="h4" color={theme.textPrimary}>短句</ThemedText>
            </View>
            <ThemedText variant="body" color={theme.textSecondary}>
              {word.sentence}
            </ThemedText>
          </ThemedView>
        )}

        {/* 复习统计 */}
        <ThemedView level="default" style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome6 name="chart-line" size={18} color={theme.primary} />
            <ThemedText variant="h4" color={theme.textPrimary}>复习统计</ThemedText>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <ThemedText variant="h3" color={theme.primary}>
                {word.difficulty.toFixed(2)}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>难度</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText variant="h3" color={theme.success}>
                {word.stability.toFixed(2)}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>稳定性</ThemedText>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <ThemedText variant="h3" color={theme.accent}>
                {word.avg_response_time.toFixed(2)}
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted}>平均耗时(秒)</ThemedText>
            </View>
          </View>
          {word.last_review && (
            <ThemedText variant="caption" color={theme.textMuted} style={styles.reviewTime}>
              上次复习: {new Date(word.last_review).toLocaleString('zh-CN')}
            </ThemedText>
          )}
        </ThemedView>
      </ScrollView>

      {/* 编辑模态框 */}
      <Modal visible={editMode !== 'none'} animationType="slide" transparent>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              {/* 标题 */}
              <View style={styles.modalHeader}>
                <ThemedText variant="h3" color={theme.textPrimary}>编辑单词</ThemedText>
                <TouchableOpacity onPress={() => setEditMode('none')}>
                  <FontAwesome6 name="xmark" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              {/* 表单 */}
              <ScrollView style={styles.modalBody}>
                <ThemedText variant="caption" color={theme.textMuted} style={styles.label}>
                  单词 *
                </ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
                  value={editForm.word}
                  onChangeText={(text) => setEditForm({ ...editForm, word: text })}
                  placeholder="请输入单词"
                  placeholderTextColor={theme.textMuted}
                />

                <ThemedText variant="caption" color={theme.textMuted} style={styles.label}>
                  音标
                </ThemedText>
                <TextInput
                  style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]}
                  value={editForm.phonetic}
                  onChangeText={(text) => setEditForm({ ...editForm, phonetic: text })}
                  placeholder="点击输入音标"
                  placeholderTextColor={theme.textMuted}
                  onFocus={() => setShowPhoneticKeyboard(true)}
                  onBlur={() => setShowPhoneticKeyboard(false)}
                />

                <ThemedText variant="caption" color={theme.textMuted} style={styles.label}>
                  词性
                </ThemedText>
                <View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.posScroll}>
                    {PART_OF_SPEECH_LIST.map((pos) => (
                      <TouchableOpacity
                        key={pos}
                        style={[
                          styles.posButton,
                          editForm.partOfSpeech === pos && styles.posButtonActive
                        ]}
                        onPress={() => setEditForm({ ...editForm, partOfSpeech: pos })}
                      >
                        <ThemedText
                          variant="caption"
                          color={editForm.partOfSpeech === pos ? theme.buttonPrimaryText : theme.textSecondary}
                        >
                          {pos}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <ThemedText variant="caption" color={theme.textMuted} style={styles.label}>
                  释义 *
                </ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea, { color: theme.textPrimary, borderColor: theme.border }]}
                  value={editForm.definition}
                  onChangeText={(text) => setEditForm({ ...editForm, definition: text })}
                  placeholder="请输入释义"
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={3}
                />

                <ThemedText variant="caption" color={theme.textMuted} style={styles.label}>
                  记忆口诀
                </ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea, { color: theme.textPrimary, borderColor: theme.border }]}
                  value={editForm.mnemonic}
                  onChangeText={(text) => setEditForm({ ...editForm, mnemonic: text })}
                  placeholder="请输入记忆口诀"
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={3}
                />

                <ThemedText variant="caption" color={theme.textMuted} style={styles.label}>
                  短句
                </ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea, { color: theme.textPrimary, borderColor: theme.border }]}
                  value={editForm.sentence}
                  onChangeText={(text) => setEditForm({ ...editForm, sentence: text })}
                  placeholder="请输入短句"
                  placeholderTextColor={theme.textMuted}
                  multiline
                  numberOfLines={3}
                />
              </ScrollView>

              {/* 按钮 */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton, { backgroundColor: theme.backgroundTertiary }]}
                  onPress={() => setEditMode('none')}
                >
                  <ThemedText variant="body" color={theme.textPrimary}>取消</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.saveButton, { backgroundColor: theme.primary }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  <ThemedText variant="body" color={theme.buttonPrimaryText}>
                    {saving ? '保存中...' : '保存'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* 音标键盘 */}
      <Modal
        visible={showPhoneticKeyboard}
        transparent
        animationType="slide"
      >
        <View style={styles.keyboardModalOverlay}>
          <TouchableOpacity
            style={styles.keyboardCloseArea}
            activeOpacity={1}
            onPress={() => setShowPhoneticKeyboard(false)}
          >
            <View style={styles.keyboardDragHandle} />
          </TouchableOpacity>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={0}
          >
            <View style={styles.keyboardContainer}>
              <PhoneticKeyboard
                onKeyPress={(symbol) => setEditForm({ ...editForm, phonetic: (editForm.phonetic || '') + symbol })}
                onDelete={() => setEditForm({ ...editForm, phonetic: (editForm.phonetic || '').slice(0, -1) })}
              />
              <TouchableOpacity
                style={styles.keyboardHideButton}
                onPress={() => setShowPhoneticKeyboard(false)}
              >
                <ThemedText variant="body" color={theme.buttonPrimaryText}>完成</ThemedText>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </Screen>
  );
}
