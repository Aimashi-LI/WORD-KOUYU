import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  TextInput,
  Alert,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { Screen } from '@/components/Screen';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FontAwesome6 } from '@expo/vector-icons';
import { useSafeRouter, useSafeSearchParams } from '@/hooks/useSafeRouter';
import { createStyles } from './styles';
import { getWordById, updateWord, deleteWord } from '@/database/wordDao';
import { getAllCodes } from '@/database/codeDao';
import { initDatabase } from '@/database';
import { Word, Code } from '@/database/types';
import {
  SplitItem,
  autoSplitByCodeLib,
  autoFillMeaning,
  validateSplitCompleteness,
  convertSplitItemsToString,
  parseSplitString,
  performSplit,
  getCodeSuggestion,
  CodeSuggestion
} from '@/utils/splitHelper';
import { PhoneticKeyboard } from '@/components/PhoneticKeyboard';
import { SentenceInput, ShadowText } from '@/components/SentenceInput';
import { fetchPhoneticByWord } from '@/utils';

// 词性列表
const PART_OF_SPEECH_LIST = [
  'n.名词', 'pron.代词', 'v.动词', 'adj.形容词', 'adv.副词',
  'prep.介词', 'conj.连词', 'int.感叹词', 'num.数词', 'art.冠词'
];

type EditMode = 'view' | 'edit';

export default function WordDetailScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { id } = useSafeSearchParams<{ id: string }>();

  // 基础字段
  const [word, setWord] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [definition, setDefinition] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [sentence, setSentence] = useState('');
  const [example, setExample] = useState('');
  
  // 音标键盘
  const [showPhoneticKeyboard, setShowPhoneticKeyboard] = useState(false);
  
  // 拆分相关
  const [splitItems, setSplitItems] = useState<SplitItem[]>([{ code: '', content: '' }]);
  const [splitHistory, setSplitHistory] = useState<SplitItem[][]>([]);
  const [codeSuggestions, setCodeSuggestions] = useState<Record<string, CodeSuggestion>>({});
  const [activeCodeIndex, setActiveCodeIndex] = useState(-1);
  
  // 编码库
  const [codes, setCodes] = useState<Code[]>([]);
  
  // UI 状态
  const [editMode, setEditMode] = useState<EditMode>('view');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [originalWord, setOriginalWord] = useState<Word | null>(null);
  const [autoCompleteEnabled, setAutoCompleteEnabled] = useState(true);

  // 助记自动补全功能
  useEffect(() => {
    if (!autoCompleteEnabled || !sentence.trim()) return;

    const validSplits = splitItems.filter(item => item.code && item.content);
    if (validSplits.length === 0) return;

    let newText = sentence;
    let hasChanges = false;

    const escapeRegex = (str: string) => {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    // 检查是否已经补全过的函数
    const isAlreadyCompleted = (text: string, meaning: string, code: string): boolean => {
      const patternWithBrackets = new RegExp(`${escapeRegex(meaning)}[\\(（]${escapeRegex(code)}[\\)）]`);
      return patternWithBrackets.test(text);
    };

    // 检查是否有新增的中文含义需要补全
    for (const split of validSplits) {
      const { code, content } = split;
      if (!code || !content) continue;

      // 将编码的含义按逗号或顿号分割，支持多种含义
      const meanings = content.split(/[、，]/).map(m => m.trim()).filter(m => m);

      // 检查句子中是否包含任何一个含义（尚未补全的）
      for (const meaning of meanings) {
        // 跳过空含义
        if (!meaning) continue;

        // 检查是否已经补全过
        if (isAlreadyCompleted(newText, meaning, code)) {
          continue;
        }

        // 检查句子中是否包含这个含义
        // 使用简单的包含匹配，找到所有出现的位置
        const regex = new RegExp(escapeRegex(meaning), 'g');
        const matches = newText.match(regex);
        
        if (matches && matches.length > 0) {
          // 替换所有匹配的中文为带编码的形式
          newText = newText.replace(regex, `${meaning}（${code}）`);
          hasChanges = true;
        }
      }
    }

    // 如果有变化，更新 sentence 并禁用自动补全（避免重复触发）
    if (hasChanges) {
      setAutoCompleteEnabled(false);
      setSentence(newText);
      // 短暂延迟后重新启用自动补全
      setTimeout(() => setAutoCompleteEnabled(true), 100);
    }
  }, [sentence, splitItems]);

  // 加载单词数据
  useEffect(() => {
    loadWordDetail();
  }, [id]);

  const loadWordDetail = async () => {
    try {
      await initDatabase();
      
      // 加载编码库
      const allCodes = await getAllCodes();
      setCodes(allCodes);
      
      if (id) {
        const wordData = await getWordById(parseInt(id));
        if (wordData) {
          setOriginalWord(wordData);
          
          // 设置表单值
          setWord(wordData.word || '');
          setPhonetic(wordData.phonetic || '');
          setDefinition(wordData.definition || '');
          setPartOfSpeech(wordData.partOfSpeech || '');
          setSentence(wordData.mnemonic || '');
          setExample(wordData.sentence || '');
          
          // 解析拆分数据
          if (wordData.split) {
            const parsedSplits = parseSplitString(wordData.split);
            if (parsedSplits && parsedSplits.length > 0) {
              setSplitItems(parsedSplits);
            }
          }
        } else {
          Alert.alert('错误', '单词不存在');
          router.back();
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
    // 自动识别并拆分单词
    if (word && word.trim()) {
      // 检查当前拆分是否完整
      const splitValidation = validateSplitCompleteness(splitItems, word);
      
      // 如果拆分不完整或者没有拆分数据，则自动拆分
      if (!splitValidation.valid || splitItems.length === 0 || (splitItems.length === 1 && splitItems[0].code === '')) {
        // 尝试自动拆分
        const autoSplitResult = autoSplitByCodeLib(word, codes);
        if (autoSplitResult && autoSplitResult.length > 0) {
          // 拆分成功，使用拆分结果
          setSplitItems(autoSplitResult);
        } else {
          // 拆分失败，使用单个项（编码框显示单词）
          const meaning = autoFillMeaning(word, codes);
          setSplitItems([{ code: word, content: meaning }]);
        }
        // 清空历史记录
        setSplitHistory([]);
      }
    }
    setEditMode('edit');
  };

  const handleCancelEdit = () => {
    // 恢复原始数据
    if (originalWord) {
      setWord(originalWord.word || '');
      setPhonetic(originalWord.phonetic || '');
      setDefinition(originalWord.definition || '');
      setPartOfSpeech(originalWord.partOfSpeech || '');
      setSentence(originalWord.mnemonic || '');
      setExample(originalWord.sentence || '');
      
      if (originalWord.split) {
        const parsedSplits = parseSplitString(originalWord.split);
        if (parsedSplits && parsedSplits.length > 0) {
          setSplitItems(parsedSplits);
        }
      }
      
      setSplitHistory([]);
      setAutoCompleteEnabled(true);
    }
    setEditMode('view');
  };

  // 处理单词输入
  const handleWordChange = async (text: string) => {
    const filteredText = text.replace(/[^a-z]/gi, '');
    if (text !== filteredText) {
      Alert.alert('提示', '仅允许输入英文字母');
    }
    setWord(filteredText);
    
    // 自动填充拆分
    if (filteredText.length > 0) {
      setSplitItems([{ code: filteredText, content: autoFillMeaning(filteredText, codes) }]);
    } else {
      setSplitItems([{ code: '', content: '' }]);
      setSplitHistory([]);
    }
  };

  // 处理单词失焦（触发自动拆分）
  const handleWordBlur = () => {
    if (!word) return;
    
    const autoSplitResult = autoSplitByCodeLib(word, codes);
    if (autoSplitResult && autoSplitResult.length > 0) {
      // 保存历史记录
      setSplitHistory(prev => [...prev, [...splitItems]]);
      setSplitItems(autoSplitResult);
    }
  };

  // 处理编码输入
  const handleCodeChange = (index: number, text: string) => {
    const newSplitItems = [...splitItems];
    newSplitItems[index].code = text;
    setSplitItems(newSplitItems);
    
    // 查找编码建议
    const suggestion = getCodeSuggestion(text, codes);
    if (suggestion) {
      setCodeSuggestions(prev => ({
        ...prev,
        [`code_${index}`]: suggestion
      }));
      
      // 如果完全匹配，自动填充含义
      if (text.toLowerCase() === suggestion.matchedCode.letter.toLowerCase()) {
        newSplitItems[index].content = suggestion.matchedCode.chinese;
        setSplitItems(newSplitItems);
      }
    } else {
      setCodeSuggestions(prev => {
        const newSuggestions = { ...prev };
        delete newSuggestions[`code_${index}`];
        return newSuggestions;
      });
    }
  };

  // 选择编码建议
  const handleSelectSuggestion = (index: number) => {
    const suggestion = codeSuggestions[`code_${index}`];
    if (!suggestion) return;

    const newSplitItems = [...splitItems];
    newSplitItems[index].code = suggestion.matchedCode.letter;
    newSplitItems[index].content = suggestion.matchedCode.chinese;
    setSplitItems(newSplitItems);
    
    setCodeSuggestions(prev => {
      const newSuggestions = { ...prev };
      delete newSuggestions[`code_${index}`];
      return newSuggestions;
    });
  };

  // 处理含义输入
  const handleContentChange = (index: number, text: string) => {
    const newSplitItems = [...splitItems];
    newSplitItems[index].content = text;
    setSplitItems(newSplitItems);
  };

  // 执行拆分
  const handlePerformSplit = (splitIndex: number, charIndex: number) => {
    const splitItem = splitItems[splitIndex];
    if (!splitItem || !splitItem.code) {
      Alert.alert('提示', '请先输入单词');
      return;
    }

    const code = splitItem.code;
    if (charIndex <= 0 || charIndex >= code.length) {
      Alert.alert('提示', '请在单词中间位置拆分');
      return;
    }

    // 保存历史记录
    setSplitHistory(prev => [...prev, [...splitItems]]);

    const result = performSplit(code, charIndex, codes);
    if (result) {
      const [left, right] = result;
      const newSplitItems = [...splitItems];
      newSplitItems.splice(splitIndex, 1, left, right);
      setSplitItems(newSplitItems);
      setActiveCodeIndex(-1);
    }
  };

  // 撤销拆分
  const handleUndoSplit = () => {
    if (splitHistory.length === 0) {
      Alert.alert('提示', '没有可撤销的操作');
      return;
    }

    const lastHistory = splitHistory[splitHistory.length - 1];
    setSplitItems(lastHistory);
    setSplitHistory(prev => prev.slice(0, -1));
    setActiveCodeIndex(-1);
  };

  // 添加新的拆分项
  const handleAddSplitItem = () => {
    setSplitItems([...splitItems, { code: '', content: '' }]);
  };

  // 删除拆分项
  const handleRemoveSplitItem = (index: number) => {
    const newSplitItems = splitItems.filter((_, i) => i !== index);
    setSplitItems(newSplitItems.length > 0 ? newSplitItems : [{ code: '', content: '' }]);
  };

  // 表单验证
  const validateForm = (): boolean => {
    if (!word.trim()) {
      Alert.alert('提示', '请输入单词');
      return false;
    }
    if (!definition.trim()) {
      Alert.alert('提示', '请输入释义');
      return false;
    }
    if (!partOfSpeech) {
      Alert.alert('提示', '请选择词性');
      return false;
    }

    // 验证拆分
    const splitValidation = validateSplitCompleteness(splitItems, word);
    if (!splitValidation.valid) {
      Alert.alert('提示', splitValidation.message);
      return false;
    }

    return true;
  };

  // 保存单词
  const handleSave = async () => {
    if (!originalWord) return;
    
    if (!validateForm()) return;
    
    setSaving(true);
    try {
      const splitText = convertSplitItemsToString(splitItems);
      
      const updateData = {
        word: word.trim(),
        phonetic: phonetic.trim() || undefined,
        definition: definition.trim(),
        partOfSpeech: partOfSpeech,
        split: splitText || undefined,
        mnemonic: sentence.trim() || undefined,
        sentence: example.trim() || undefined,
      };

      await updateWord(originalWord.id, updateData);
      
      // 重新加载数据
      await loadWordDetail();
      
      setEditMode('view');
      Alert.alert('成功', '单词已更新');
    } catch (error) {
      console.error('更新失败:', error);
      Alert.alert('错误', '更新失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!originalWord) return;

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
              await deleteWord(originalWord.id);
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

  if (editMode === 'edit') {
    // 编辑模式 - 使用 add-word 页面的样式
    return (
      <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* 顶部操作栏 */}
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={handleCancelEdit}>
              <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
            </TouchableOpacity>
            <ThemedText variant="h4" color={theme.textPrimary}>编辑单词</ThemedText>
            <TouchableOpacity style={styles.backButton} onPress={handleSave}>
              <FontAwesome6 name="check" size={24} color={theme.primary} />
            </TouchableOpacity>
          </View>

          {/* 单词输入 */}
          <View style={styles.inputContainer}>
            <ThemedText variant="body" color={theme.textPrimary} style={styles.label}>
              单词 *
            </ThemedText>
            <TextInput
              style={styles.input}
              value={word}
              onChangeText={handleWordChange}
              onBlur={handleWordBlur}
              placeholder="请输入单词"
              placeholderTextColor={theme.textMuted}
            />
          </View>

          {/* 音标输入 */}
          <View style={styles.inputContainer}>
            <ThemedText variant="body" color={theme.textPrimary} style={styles.label}>
              音标
            </ThemedText>
            <TextInput
              style={styles.input}
              value={phonetic}
              onChangeText={setPhonetic}
              onFocus={() => setShowPhoneticKeyboard(true)}
              placeholder="请输入音标"
              placeholderTextColor={theme.textMuted}
            />
          </View>

          {/* 释义输入 */}
          <View style={styles.inputContainer}>
            <ThemedText variant="body" color={theme.textPrimary} style={styles.label}>
              释义 *
            </ThemedText>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={definition}
              onChangeText={setDefinition}
              placeholder="请输入释义"
              placeholderTextColor={theme.textMuted}
              multiline
            />
          </View>

          {/* 词性选择 */}
          <View style={styles.inputContainer}>
            <ThemedText variant="body" color={theme.textPrimary} style={styles.label}>
              词性 *
            </ThemedText>
            <View style={styles.posScroll}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {PART_OF_SPEECH_LIST.map(pos => (
                  <TouchableOpacity
                    key={pos}
                    style={[
                      styles.posButton,
                      partOfSpeech === pos && styles.posButtonActive
                    ]}
                    onPress={() => setPartOfSpeech(pos)}
                  >
                    <ThemedText
                      variant="caption"
                      color={partOfSpeech === pos ? theme.buttonPrimaryText : theme.textPrimary}
                    >
                      {pos}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>

          {/* 拆分 */}
          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.label}>
                拆分
              </ThemedText>
              {splitHistory.length > 0 && (
                <TouchableOpacity onPress={handleUndoSplit} style={styles.undoButton}>
                  <FontAwesome6 name="rotate-left" size={16} color={theme.accent} />
                  <ThemedText variant="caption" color={theme.accent} style={styles.undoText}>
                    撤销
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
            {splitItems.map((item, index) => (
              <View key={index} style={styles.splitItemContainer}>
                <View style={styles.splitCodeRow}>
                  <TextInput
                    style={styles.splitCodeInput}
                    value={item.code}
                    onChangeText={text => handleCodeChange(index, text)}
                    onFocus={() => setActiveCodeIndex(index)}
                    onBlur={() => setActiveCodeIndex(-1)}
                    placeholder="编码"
                    placeholderTextColor={theme.textMuted}
                  />
                  <ThemedText variant="body" color={theme.textMuted}>-</ThemedText>
                  <TextInput
                    style={styles.splitContentInput}
                    value={item.content}
                    onChangeText={text => handleContentChange(index, text)}
                    placeholder="含义"
                    placeholderTextColor={theme.textMuted}
                  />
                  {splitItems.length > 1 && (
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => handleRemoveSplitItem(index)}
                    >
                      <FontAwesome6 name="xmark" size={18} color={theme.error} />
                    </TouchableOpacity>
                  )}
                </View>

                {/* 编码建议 */}
                {codeSuggestions[`code_${index}`] && activeCodeIndex === index && (
                  <TouchableOpacity
                    onPress={() => handleSelectSuggestion(index)}
                    style={styles.codeSuggestion}
                  >
                    <ThemedText variant="body" color={theme.textPrimary}>
                      {codeSuggestions[`code_${index}`].userInput}
                    </ThemedText>
                    <ThemedText variant="body" color={theme.primary}>
                      {codeSuggestions[`code_${index}`].completedText}
                    </ThemedText>
                  </TouchableOpacity>
                )}

                {/* 字符拆分按钮 */}
                {item.code && (
                  <View style={styles.splitCharsContainer}>
                    {item.code.split('').map((char, charIndex) => (
                      <TouchableOpacity
                        key={charIndex}
                        onPress={() => handlePerformSplit(index, charIndex)}
                        style={styles.splitCharButton}
                      >
                        <ThemedText variant="h3" color={theme.textPrimary}>
                          {char}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ))}
            <TouchableOpacity
              style={styles.addSplitButton}
              onPress={handleAddSplitItem}
            >
              <FontAwesome6 name="plus" size={16} color={theme.primary} />
              <ThemedText variant="caption" color={theme.primary}>添加拆分项</ThemedText>
            </TouchableOpacity>
          </View>

          {/* 助记句子 */}
          <View style={styles.inputContainer}>
            <View style={styles.labelRow}>
              <ThemedText variant="body" color={theme.textPrimary} style={styles.label}>
                助记句子
              </ThemedText>
              <TouchableOpacity
                onPress={() => setAutoCompleteEnabled(!autoCompleteEnabled)}
                style={styles.autoCompleteToggle}
              >
                <FontAwesome6
                  name={autoCompleteEnabled ? "toggle-on" : "toggle-off"}
                  size={24}
                  color={autoCompleteEnabled ? theme.primary : theme.textMuted}
                />
                <ThemedText variant="caption" color={theme.textSecondary} style={styles.autoCompleteLabel}>
                  自动补全
                </ThemedText>
              </TouchableOpacity>
            </View>
            <SentenceInput
              style={[styles.input, styles.textArea]}
              value={sentence}
              onChange={setSentence}
              onAutoCompleteChange={setAutoCompleteEnabled}
              placeholder="例：编码an对应多个含义（阿牛、一个），填写任一含义即可触发补全"
              placeholderTextColor={theme.textMuted}
              multiline
              numberOfLines={4}
            />
          </View>

          {/* 例句 */}
          <View style={styles.inputContainer}>
            <ThemedText variant="body" color={theme.textPrimary} style={styles.label}>
              例句
            </ThemedText>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={example}
              onChangeText={setExample}
              placeholder="请输入例句"
              placeholderTextColor={theme.textMuted}
              multiline
            />
          </View>

          {/* 保存按钮 */}
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            <ThemedText variant="body" color={theme.buttonPrimaryText}>
              {saving ? '保存中...' : '保存'}
            </ThemedText>
          </TouchableOpacity>
        </ScrollView>

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
                  onKeyPress={(symbol) => setPhonetic(phonetic + symbol)}
                  onDelete={() => setPhonetic(phonetic.slice(0, -1))}
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

  // 查看模式
  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 顶部操作栏 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerButtons}>
            <TouchableOpacity style={styles.backButton} onPress={handleEdit}>
              <FontAwesome6 name="pen" size={20} color={theme.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButton} onPress={handleDelete}>
              <FontAwesome6 name="trash" size={20} color={theme.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* 单词展示 */}
        <View style={styles.wordContainer}>
          <ThemedText variant="h1" color={theme.textPrimary}>{word}</ThemedText>
          {phonetic && (
            <ThemedText variant="h4" color={theme.textMuted} style={styles.phonetic}>
              {phonetic}
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
            {definition}
          </ThemedText>
          {partOfSpeech && (
            <View style={styles.partOfSpeechTag}>
              <ThemedText variant="caption" color={theme.buttonPrimaryText}>
                {partOfSpeech}
              </ThemedText>
            </View>
          )}
        </ThemedView>

        {/* 拆分卡片 */}
        {splitItems.some(item => item.code && item.content) && (
          <ThemedView level="default" style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome6 name="puzzle-piece" size={18} color={theme.primary} />
              <ThemedText variant="h4" color={theme.textPrimary}>拆分</ThemedText>
            </View>
            {splitItems
              .filter(item => item.code && item.content)
              .map((item, index) => (
                <View key={index} style={styles.splitItemView}>
                  <ThemedText variant="body" color={theme.primary} style={styles.splitCode}>
                    {item.code}
                  </ThemedText>
                  <ThemedText variant="body" color={theme.textSecondary} style={styles.splitContent}>
                    {item.content}
                  </ThemedText>
                </View>
              ))}
          </ThemedView>
        )}

        {/* 助记句子卡片 */}
        {sentence && (
          <ThemedView level="default" style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome6 name="lightbulb" size={18} color={theme.primary} />
              <ThemedText variant="h4" color={theme.textPrimary}>助记句子</ThemedText>
            </View>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.definitionText}>
              {sentence}
            </ThemedText>
          </ThemedView>
        )}

        {/* 例句卡片 */}
        {example && (
          <ThemedView level="default" style={styles.card}>
            <View style={styles.cardHeader}>
              <FontAwesome6 name="quote-left" size={18} color={theme.primary} />
              <ThemedText variant="h4" color={theme.textPrimary}>例句</ThemedText>
            </View>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.definitionText}>
              {example}
            </ThemedText>
          </ThemedView>
        )}
      </ScrollView>
    </Screen>
  );
}
