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
import { createWord, getWordByText } from '@/database/wordDao';
import { addWordToWordbook } from '@/database/wordbookDao';
import { getAllCodes, addCode } from '@/database/codeDao';
import { initDatabase } from '@/database';
import { NewWord, Code } from '@/database/types';
import {
  SplitItem,
  autoSplitByCodeLib,
  autoFillMeaning,
  performSplit,
  validateSplitCompleteness,
  convertSplitItemsToString,
  parseSplitString,
  getCodeSuggestion,
  CodeSuggestion
} from '@/utils/splitHelper';

// 词性列表
const PART_OF_SPEECH_LIST = [
  'n.名词', 'pron.代词', 'v.动词', 'adj.形容词', 'adv.副词',
  'prep.介词', 'conj.连词', 'int.感叹词', 'num.数词', 'art.冠词'
];

export default function AddWordScreen() {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useSafeRouter();
  const { wordbookId } = useSafeSearchParams<{ wordbookId?: string }>();
  
  // 基础字段
  const [word, setWord] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [definition, setDefinition] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('');
  const [sentence, setSentence] = useState('');
  
  // 拆分相关
  const [splitItems, setSplitItems] = useState<SplitItem[]>([{ code: '', content: '' }]);
  const [splitHistory, setSplitHistory] = useState<SplitItem[][]>([]);
  const [codeSuggestions, setCodeSuggestions] = useState<Record<string, CodeSuggestion>>({});
  const [activeCodeIndex, setActiveCodeIndex] = useState(-1);
  
  // 编码库
  const [codes, setCodes] = useState<Code[]>([]);
  
  // UI 状态
  const [loading, setLoading] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');

  // 加载编码库
  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    try {
      await initDatabase();
      const allCodes = await getAllCodes();
      setCodes(allCodes);
    } catch (error) {
      console.error('加载编码库失败:', error);
    }
  };

  // 处理单词输入
  const handleWordChange = (text: string) => {
    // 只允许字母
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
  const handleCodeInput = (index: number, text: string) => {
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
    if (!validateForm()) return;
    
    setLoading(true);
    try {
      await initDatabase();
      
      // 检查单词是否已存在
      const existing = await getWordByText(word.trim());
      if (existing) {
        Alert.alert('提示', '该单词已存在');
        setLoading(false);
        return;
      }

      const splitText = convertSplitItemsToString(splitItems);
      
      const newWord: NewWord = {
        word: word.trim(),
        phonetic: phonetic.trim() || undefined,
        definition: definition.trim(),
        partOfSpeech: partOfSpeech,
        split: splitText || undefined,
        mnemonic: sentence.trim() || undefined, // 助记句子
      };
      
      const wordId = await createWord(newWord);
      
      // 如果有词库ID，将单词添加到词库
      if (wordbookId) {
        await addWordToWordbook(parseInt(wordbookId), wordId);
      }
      
      // 同步新编码到编码库
      await syncNewCodesToLib();
      
      Alert.alert('成功', '单词添加成功', [
        { text: '确定', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('添加失败:', error);
      Alert.alert('错误', '添加失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 同步新编码到编码库
  const syncNewCodesToLib = async () => {
    const codesToSync: { letter: string; chinese: string }[] = [];
    
    splitItems.forEach(item => {
      if (item.code && item.code.trim() !== '' && item.content && item.content.trim() !== '') {
        codesToSync.push({
          letter: item.code.trim(),
          chinese: item.content.trim()
        });
      }
    });

    if (codesToSync.length === 0) return;

    try {
      for (const codeItem of codesToSync) {
        await addCode(codeItem.letter, codeItem.chinese);
      }
    } catch (error) {
      console.error('同步编码失败:', error);
    }
  };

  // 处理批量导入
  const handleImport = async () => {
    if (!importText.trim()) {
      Alert.alert('提示', '请输入导入内容');
      return;
    }

    const lines = importText.split('\n').filter(line => line.trim());
    let successCount = 0;
    let failedCount = 0;
    const importedWordIds: number[] = [];

    for (const line of lines) {
      try {
        const wordData = parseImportLine(line);
        if (wordData) {
          const wordId = await createWord(wordData);
          importedWordIds.push(wordId);
          successCount++;
        } else {
          failedCount++;
        }
      } catch (error) {
        console.error('导入失败:', line, error);
        failedCount++;
      }
    }

    // 如果有词库ID，将导入的单词添加到词库
    if (wordbookId && importedWordIds.length > 0) {
      try {
        for (const wordId of importedWordIds) {
          await addWordToWordbook(parseInt(wordbookId), wordId);
        }
      } catch (error) {
        console.error('添加到词库失败:', error);
      }
    }

    Alert.alert(
      '导入完成',
      `成功: ${successCount}，失败: ${failedCount}`,
      [
        { text: '确定', onPress: () => {
          setShowImportModal(false);
          setImportText('');
          router.back();
        }}
      ]
    );
  };

  // 解析导入行
  const parseImportLine = (line: string): NewWord | null => {
    // 支持格式：word pos definition 或 word,definition
    let parts: string[];
    
    if (line.includes(',')) {
      parts = line.split(',').map(p => p.trim());
    } else if (line.includes('|')) {
      parts = line.split('|').map(p => p.trim());
    } else {
      parts = line.split(/\s+/).filter(p => p);
    }

    if (parts.length < 2) return null;

    const wordText = parts[0].replace(/[^a-z]/gi, '');
    if (!wordText) return null;

    const pos = parts[1] || '';
    const definition = parts[2] || parts[1] || '';

    return {
      word: wordText,
      phonetic: undefined,
      definition: definition,
      partOfSpeech: pos,
      split: undefined,
      sentence: undefined
    };
  };

  return (
    <Screen backgroundColor={theme.backgroundRoot} statusBarStyle={isDark ? 'light' : 'dark'}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 标题栏 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <FontAwesome6 name="arrow-left" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <ThemedText variant="h2" color={theme.textPrimary}>添加单词</ThemedText>
          <TouchableOpacity onPress={() => setShowImportModal(true)} style={styles.importButton}>
            <FontAwesome6 name="file-import" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* 单词输入 */}
        <ThemedView level="tertiary" style={styles.inputContainer}>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.label}>
            单词 *
          </ThemedText>
          <TextInput
            style={styles.input}
            placeholder="输入单词"
            placeholderTextColor={theme.textMuted}
            value={word}
            onChangeText={handleWordChange}
            onBlur={handleWordBlur}
            autoCapitalize="none"
          />
        </ThemedView>

        {/* 词性选择 */}
        <ThemedView level="tertiary" style={styles.inputContainer}>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.label}>
            词性 *
          </ThemedText>
          <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.posScroll}>
              {PART_OF_SPEECH_LIST.map((pos) => (
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
                    color={partOfSpeech === pos ? theme.buttonPrimaryText : theme.textSecondary}
                  >
                    {pos}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </ThemedView>

        {/* 释义输入 */}
        <ThemedView level="tertiary" style={styles.inputContainer}>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.label}>
            释义 *
          </ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="输入释义"
            placeholderTextColor={theme.textMuted}
            value={definition}
            onChangeText={setDefinition}
            multiline
            numberOfLines={2}
          />
        </ThemedView>

        {/* 拆分输入 */}
        <ThemedView level="tertiary" style={styles.inputContainer}>
          <View style={styles.labelRow}>
            <ThemedText variant="body" color={theme.textSecondary} style={styles.label}>
              拆分（可选）
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
              {/* 编码输入 */}
              <View style={styles.splitCodeRow}>
                <TextInput
                  style={styles.splitCodeInput}
                  placeholder="编码"
                  placeholderTextColor={theme.textMuted}
                  value={item.code}
                  onChangeText={(text) => handleCodeInput(index, text)}
                  onFocus={() => setActiveCodeIndex(index)}
                  onBlur={() => setActiveCodeIndex(-1)}
                />
                <ThemedText variant="body" color={theme.textMuted}>-</ThemedText>
                <TextInput
                  style={styles.splitContentInput}
                  placeholder="含义"
                  placeholderTextColor={theme.textMuted}
                  value={item.content}
                  onChangeText={(text) => handleContentChange(index, text)}
                />
                {splitItems.length > 1 && (
                  <TouchableOpacity
                    onPress={() => handleRemoveSplitItem(index)}
                    style={styles.removeButton}
                  >
                    <FontAwesome6 name="xmark" size={16} color={theme.textMuted} />
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
            onPress={handleAddSplitItem}
            style={styles.addSplitButton}
          >
            <FontAwesome6 name="plus" size={16} color={theme.primary} />
            <ThemedText variant="caption" color={theme.primary}>添加拆分项</ThemedText>
          </TouchableOpacity>
        </ThemedView>

        {/* 短句输入 */}
        <ThemedView level="tertiary" style={styles.inputContainer}>
          <ThemedText variant="body" color={theme.textSecondary} style={styles.label}>
            助记句子（可选）
          </ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="输入助记句子，帮助记忆单词"
            placeholderTextColor={theme.textMuted}
            value={sentence}
            onChangeText={setSentence}
            multiline
            numberOfLines={1}
          />
        </ThemedView>

        {/* 保存按钮 */}
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={loading}
        >
          <ThemedText variant="h3" color={theme.buttonPrimaryText}>
            {loading ? '保存中...' : '保存'}
          </ThemedText>
        </TouchableOpacity>

        {/* 提示 */}
        <ThemedText variant="caption" color={theme.textMuted} style={styles.hint}>
          * 为必填项 • 拆分功能可帮助记忆单词
        </ThemedText>
      </ScrollView>

      {/* 批量导入弹窗 */}
      <Modal
        visible={showImportModal}
        transparent
        animationType="slide"
      >
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText variant="h3" color={theme.textPrimary}>批量导入</ThemedText>
                <TouchableOpacity onPress={() => setShowImportModal(false)}>
                  <FontAwesome6 name="xmark" size={24} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <ThemedText variant="body" color={theme.textSecondary} style={styles.importHint}>
                支持格式：每行一个单词，单词和释义用逗号、空格或竖线分隔
              </ThemedText>
              <ThemedText variant="caption" color={theme.textMuted} style={styles.importExample}>
                示例：apple n.苹果, fruit
              </ThemedText>

              <TextInput
                style={styles.importTextarea}
                placeholder="请输入单词列表，每行一个单词"
                placeholderTextColor={theme.textMuted}
                value={importText}
                onChangeText={setImportText}
                multiline
                numberOfLines={10}
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => {
                    setShowImportModal(false);
                    setImportText('');
                  }}
                >
                  <ThemedText variant="body" color={theme.textSecondary}>取消</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleImport}
                >
                  <ThemedText variant="body" color={theme.buttonPrimaryText}>导入</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
